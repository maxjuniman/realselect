"""Extrai a planilha Controle Futibas de Terça para o seed do Real Select."""

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

XLSX = Path(r"C:\Users\Max\AppData\Local\Temp\futibas.xlsx")
OUT = Path(__file__).resolve().parents[1] / "apps" / "api" / "prisma" / "seed-data.json"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def excel_date(value: float):
    return datetime(1899, 12, 30) + timedelta(days=int(value))


def col_index(ref: str):
    col = ""
    row = ""
    for char in ref:
        if char.isalpha():
            col += char
        else:
            row += char
    index = 0
    for char in col:
        index = index * 26 + ord(char) - 64
    return index, int(row)


def load_strings(archive: zipfile.ZipFile):
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall(NS + "si"):
        strings.append("".join((node.text or "") for node in item.iter(NS + "t")))
    return strings


def sheet_rows(archive: zipfile.ZipFile, path: str, strings: list[str]):
    root = ET.fromstring(archive.read(path))
    rows: dict[int, dict[int, str]] = defaultdict(dict)
    for cell in root.iter(NS + "c"):
        ref = cell.attrib.get("r")
        if not ref:
            continue
        column, row = col_index(ref)
        value_node = cell.find(NS + "v")
        if value_node is None or value_node.text is None:
            continue
        raw = value_node.text
        if cell.attrib.get("t") == "s":
            raw = strings[int(raw)]
        rows[row][column] = raw.strip()
    return rows


def season_code(raw: str) -> str:
    if re.fullmatch(r"\d+\.0", raw):
        return str(int(float(raw)))
    return raw


def season_meta(code: str):
    match = re.fullmatch(r"0([12])_(\d{4})", code)
    if match:
        half = int(match.group(1))
        year = int(match.group(2))
        return {
            "code": code,
            "name": f"{half}º semestre {year}",
            "year": year,
            "half": half,
        }
    if re.fullmatch(r"\d{4}", code):
        year = int(code)
        return {"code": code, "name": f"Temporada {year}", "year": year, "half": 0}
    return {"code": code, "name": code, "year": 0, "half": 0}


def key_name(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip().casefold()


def is_guest(name: str) -> bool:
    folded = key_name(name)
    return "aluguel" in folded or folded == "gol contra"


def main():
    archive = zipfile.ZipFile(XLSX)
    strings = load_strings(archive)
    detail = sheet_rows(archive, "xl/worksheets/sheet2.xml", strings)
    professors = sheet_rows(archive, "xl/worksheets/sheet5.xml", strings)
    scorers = sheet_rows(archive, "xl/worksheets/sheet4.xml", strings)

    grouped = {}
    name_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for row_number, row in detail.items():
        if row_number == 1 or 1 not in row or 4 not in row:
            continue
        try:
            played_on = excel_date(float(row[1])).date().isoformat()
        except ValueError:
            continue
        code = season_code(row.get(2, ""))
        team = row.get(3, "").upper()
        player = re.sub(r"\s+", " ", row.get(4, "")).strip()
        if team not in {"A", "B"} or not player or not code:
            continue
        try:
            saldo = int(float(row.get(9, "0") or 0))
        except ValueError:
            saldo = 0
        bucket = grouped.setdefault((code, played_on), {"A": {}, "B": {}, "saldoA": [], "saldoB": []})
        bucket[team][key_name(player)] = player
        bucket["saldoA" if team == "A" else "saldoB"].append(saldo)
        name_counts[key_name(player)][player] += 1

    canonical = {
        folded: max(spellings.items(), key=lambda item: (item[1], len(item[0])))[0]
        for folded, spellings in name_counts.items()
    }

    professor_rows = []
    for row_number, row in professors.items():
        if row_number == 1 or not row.get(1) or not row.get(2):
            continue
        raw_date = row[2]
        played_on = None
        try:
            played_on = excel_date(float(raw_date)).date().isoformat()
        except ValueError:
            parsed = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", raw_date)
            if parsed:
                day, month, year = map(int, parsed.groups())
                try:
                    played_on = datetime(year, month, day).date().isoformat()
                except ValueError:
                    played_on = None
        if not played_on:
            continue
        resultado = None
        if row.get(4):
            try:
                resultado = int(float(row[4]))
            except ValueError:
                resultado = None
        professor_rows.append(
            {
                "name": re.sub(r"\s+", " ", row[1]).strip(),
                "date": played_on,
                "season": season_code(row.get(3, "")),
                "diff": resultado,
                "placar": row.get(5, ""),
            }
        )

    goal_columns = []
    header = scorers.get(2, {})
    for column, raw_date in header.items():
        if column % 2 == 1:
            continue
        try:
            numeric = float(raw_date)
        except ValueError:
            continue
        if numeric < 20000 or numeric > 80000:
            continue
        goal_columns.append((column, excel_date(numeric).date().isoformat()))

    goals_by_date = defaultdict(list)
    for row_number, row in scorers.items():
        if row_number < 3 or not row.get(1):
            continue
        player = re.sub(r"\s+", " ", row[1]).strip()
        if not player:
            continue
        for column, played_on in goal_columns:
            goals = int(float(row[column])) if row.get(column) else 0
            assists = int(float(row.get(column + 1, "0") or 0)) if row.get(column + 1) else 0
            if goals:
                goals_by_date[played_on].append({"player": player, "type": "goal", "count": goals})
            if assists:
                goals_by_date[played_on].append({"player": player, "type": "assist", "count": assists})

    matches = []
    scored = 0
    for (code, played_on), bucket in sorted(grouped.items(), key=lambda item: item[0][1]):
        saldo_a = bucket["saldoA"][0] if bucket["saldoA"] else 0
        if bucket["saldoB"]:
            saldo_from_b = -bucket["saldoB"][0]
            if not bucket["saldoA"]:
                saldo_a = saldo_from_b
        team_a = [canonical.get(folded, name) for folded, name in sorted(bucket["A"].items())]
        team_b = [canonical.get(folded, name) for folded, name in sorted(bucket["B"].items())]
        roster = {key_name(name): name for name in team_a + team_b}

        candidates = [
            row
            for row in professor_rows
            if row["date"] == played_on and (not row["season"] or row["season"] == code)
        ]

        def professor_score(row):
            folded = key_name(row["name"])
            on_pitch = 1 if folded in roster or any(name.startswith(folded) or folded.startswith(name) for name in roster) else 0
            return (1 if row["placar"] else 0, on_pitch, 1 if row["diff"] is not None else 0)

        professor = max(candidates, key=professor_score) if candidates else None
        score_a = score_b = None
        score_label = None
        professor_name = None
        if professor:
            professor_name = professor["name"]
            score_label = professor["placar"] or None
            parsed = re.fullmatch(r"(\d+)\s*x\s*(\d+)", professor["placar"].strip(), flags=re.IGNORECASE)
            folded = key_name(professor["name"])
            team = None
            if folded in {key_name(name) for name in team_a}:
                team = "A"
            elif folded in {key_name(name) for name in team_b}:
                team = "B"
            else:
                hits = []
                for side, names in (("A", team_a), ("B", team_b)):
                    for name in names:
                        folded_player = key_name(name)
                        if folded_player.startswith(folded) or folded.startswith(folded_player):
                            hits.append(side)
                if len(set(hits)) == 1:
                    team = hits[0]
            if parsed and team:
                left, right = int(parsed.group(1)), int(parsed.group(2))
                team_diff = saldo_a if team == "A" else -saldo_a
                if left - right == team_diff:
                    score_a, score_b = (left, right) if team == "A" else (right, left)
                elif right - left == team_diff:
                    score_a, score_b = (right, left) if team == "A" else (left, right)
                elif abs(left - right) == abs(team_diff):
                    winner, loser = max(left, right), min(left, right)
                    if team_diff > 0:
                        score_a, score_b = (winner, loser) if team == "A" else (loser, winner)
                    elif team_diff < 0:
                        score_a, score_b = (loser, winner) if team == "A" else (winner, loser)
                    else:
                        score_a = score_b = left
            if score_a is not None:
                scored += 1

        events = []
        for event in goals_by_date.get(played_on, []):
            folded = key_name(event["player"])
            if folded == "gol contra" or event["type"] == "goal" and folded == "gol contra":
                events.append({"player": None, "type": "own_goal", "count": event["count"]})
                continue
            resolved = None
            if folded in roster:
                resolved = roster[folded]
            else:
                hits = [
                    name
                    for name in roster.values()
                    if key_name(name).startswith(folded) or folded.startswith(key_name(name))
                ]
                if len({key_name(name) for name in hits}) == 1:
                    resolved = hits[0]
            if resolved:
                kind = "own_goal" if key_name(resolved) == "gol contra" else event["type"]
                events.append(
                    {
                        "player": None if kind == "own_goal" else resolved,
                        "type": kind,
                        "count": event["count"],
                    }
                )

        matches.append(
            {
                "season": code,
                "date": played_on,
                "goalDiffA": saldo_a,
                "scoreA": score_a,
                "scoreB": score_b,
                "scoreLabel": score_label,
                "professor": professor_name,
                "teams": {"A": team_a, "B": team_b},
                "events": events,
            }
        )

    extra_names = {key_name(row["name"]): row["name"] for row in professor_rows}
    for folded, name in extra_names.items():
        name_counts[folded].setdefault(name, 0)

    players = []
    seen = set()
    for folded, spellings in sorted(name_counts.items()):
        display = canonical.get(folded) or max(spellings.items(), key=lambda item: (item[1], len(item[0])))[0]
        if folded in seen:
            continue
        seen.add(folded)
        players.append({"name": display, "guest": is_guest(display)})

    seasons = [season_meta(code) for code in sorted({match["season"] for match in matches})]
    payload = {"seasons": seasons, "players": players, "matches": matches}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    appearances = sum(len(match["teams"]["A"]) + len(match["teams"]["B"]) for match in matches)
    events = sum(len(match["events"]) for match in matches)
    print(f"seasons={len(seasons)} players={len(players)} matches={len(matches)} appearances={appearances} events={events} scored={scored}")
    print("last", matches[-1]["date"], matches[-1]["season"], matches[-1]["goalDiffA"], matches[-1]["scoreA"], matches[-1]["professor"])


if __name__ == "__main__":
    main()
