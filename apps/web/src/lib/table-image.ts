import { formatDiff, formatPercent, formatShortDate } from "./format";
import { seasonBands, type HistoryColumn, type HistoryRow } from "./history";
import { drawBanner, drawFooter, fitText, paintSheet, sheet } from "./share-image";
import type { StandingRow } from "./types";

export function standingsImage(seasonName: string, rows: StandingRow[]) {
  return drawStandings(seasonName, rows);
}

export function professorsImage(seasonName: string, rows: ProfessorImageRow[]) {
  return drawProfessors(seasonName, rows);
}

export function historyImage(title: string, columns: HistoryColumn[], rows: HistoryRow[]) {
  return drawHistory(title, columns, rows);
}

export type ProfessorImageRow = {
  name: string;
  date: string;
  season: string;
  saldo: number | null;
  placar: string;
  tone: "verde" | "roxo" | "empate";
};

const ranks = ["", "#008000", "#8e95a3", "#a56a34"];

async function drawStandings(seasonName: string, rows: StandingRow[]) {
  const width = 1080;
  const rowH = 48;
  const head = 168;
  const height = head + 52 + rows.length * rowH + 64;
  const columns = [52, 292, 70, 70, 70, 70, 70, 78, 108, 160];
  const labels = ["#", "Jogador", "P", "J", "V", "E", "D", "SG", "Aprov.", "Última vitória"];
  return paintSheet(width, height, (ctx) => {
    drawBanner(ctx, width, "Classificação", seasonName);
    let x = 40;
    ctx.font = "700 18px Segoe UI, sans-serif";
    ctx.fillStyle = sheet.ink;
    ctx.textBaseline = "middle";
    labels.forEach((label, index) => {
      ctx.textAlign = index < 2 ? "left" : "right";
      ctx.fillText(label, x + (index < 2 ? 8 : columns[index] - 8), head + 26);
      x += columns[index];
    });
    rows.forEach((row, index) => {
      const y = head + 52 + index * rowH;
      ctx.fillStyle = index % 2 ? sheet.paper : sheet.card;
      ctx.fillRect(40, y, width - 80, rowH);
      if (row.position <= 3) {
        ctx.fillStyle = ranks[row.position];
        ctx.fillRect(40, y, 6, rowH);
      }
      const values = [
        String(row.position),
        row.player.guest ? `${row.player.name} suplente` : row.player.name,
        String(row.points),
        String(row.games),
        String(row.wins),
        String(row.draws),
        String(row.losses),
        formatDiff(row.goalDiff),
        formatPercent(row.utilization),
        row.lastWin ? formatShortDate(row.lastWin) : "—",
      ];
      let cell = 40;
      ctx.fillStyle = sheet.ink;
      ctx.font = "600 20px Segoe UI, sans-serif";
      values.forEach((value, column) => {
        ctx.textAlign = column < 2 ? "left" : "right";
        const shown = column === 1 ? fitText(ctx, value, columns[column] - 16) : value;
        ctx.fillText(shown, cell + (column < 2 ? 14 : columns[column] - 8), y + rowH / 2);
        cell += columns[column];
      });
    });
    ctx.textAlign = "left";
    drawFooter(ctx, height);
  });
}

async function drawProfessors(seasonName: string, rows: ProfessorImageRow[]) {
  const width = 1080;
  const rowH = 52;
  const head = 168;
  const height = head + 52 + Math.max(rows.length, 1) * rowH + 64;
  const columns = [280, 180, 180, 140, 220];
  const labels = ["Professor", "Data", "Semestre", "Saldo", "Placar"];
  return paintSheet(width, height, (ctx) => {
    drawBanner(ctx, width, "Professores", seasonName);
    let x = 40;
    ctx.font = "700 18px Segoe UI, sans-serif";
    ctx.fillStyle = sheet.ink;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    labels.forEach((label, index) => {
      ctx.fillText(label, x + 8, head + 26);
      x += columns[index];
    });
    if (!rows.length) {
      ctx.fillStyle = sheet.muted;
      ctx.font = "600 22px Segoe UI, sans-serif";
      ctx.fillText("Nenhum jogo neste semestre.", 48, head + 52 + rowH / 2);
    }
    rows.forEach((row, index) => {
      const y = head + 52 + index * rowH;
      ctx.fillStyle = index % 2 ? sheet.paper : sheet.card;
      ctx.fillRect(40, y, width - 80, rowH);
      const values = [row.name, row.date, row.season, row.saldo === null ? "—" : formatDiff(row.saldo), row.placar || "—"];
      let cell = 40;
      ctx.font = "600 22px Segoe UI, sans-serif";
      values.forEach((value, column) => {
        ctx.fillStyle = sheet.ink;
        if (column === 3 && row.saldo !== null) ctx.fillStyle = row.saldo > 0 ? "#008000" : row.saldo < 0 ? "#b4233a" : sheet.ink;
        if (column === 4 && row.placar) ctx.fillStyle = row.tone === "verde" ? "#008000" : row.tone === "roxo" ? "#993aa2" : sheet.ink;
        ctx.fillText(fitText(ctx, value, columns[column] - 16), cell + 8, y + rowH / 2);
        cell += columns[column];
      });
    });
    drawFooter(ctx, height);
  });
}

async function drawHistory(title: string, columns: HistoryColumn[], rows: HistoryRow[]) {
  const nameW = 220;
  const cellW = 42;
  const ptsW = 64;
  const pad = 32;
  const several = seasonBands(columns);
  const bandH = several.length > 1 ? 34 : 0;
  const dateH = 128;
  const rowH = 36;
  const head = 156;
  const legend = 48;
  const width = Math.max(1080, pad * 2 + nameW + columns.length * cellW + ptsW);
  const height = head + legend + bandH + dateH + rows.length * rowH + 64;
  const colors = {
    win: { fill: "#c9efd6", ink: "#14663a" },
    loss: { fill: "#f8cfd6", ink: "#9d2438" },
    draw: { fill: "#ffe59a", ink: "#6d5308" },
  };
  return paintSheet(width, height, (ctx) => {
    drawBanner(ctx, width, "Histórico", title);
    const legendY = head + 24;
    const items = [
      { fill: colors.win.fill, label: "3 vitória" },
      { fill: colors.draw.fill, label: "1 empate" },
      { fill: colors.loss.fill, label: "0 derrota" },
      { fill: "#ffffff", label: "em branco, não jogou" },
    ];
    let legendX = pad;
    ctx.font = "600 18px Segoe UI, sans-serif";
    ctx.textBaseline = "middle";
    items.forEach((item) => {
      ctx.fillStyle = item.fill;
      ctx.strokeStyle = sheet.line;
      ctx.fillRect(legendX, legendY - 10, 18, 18);
      ctx.strokeRect(legendX, legendY - 10, 18, 18);
      ctx.fillStyle = sheet.ink;
      ctx.fillText(item.label, legendX + 26, legendY);
      legendX += ctx.measureText(item.label).width + 52;
    });

    const top = head + legend;
    const gridTop = top + bandH;
    ctx.fillStyle = sheet.ink;
    ctx.fillRect(pad, top, nameW, bandH + dateH);
    ctx.fillRect(pad + nameW + columns.length * cellW, top, ptsW, bandH + dateH);
    if (several.length > 1) {
      let bandX = pad + nameW;
      several.forEach((band, index) => {
        const bandW = band.count * cellW;
        ctx.fillStyle = index % 2 ? sheet.purple : sheet.ink;
        ctx.fillRect(bandX, top, bandW, bandH + dateH);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 16px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(fitText(ctx, band.name, bandW - 12), bandX + 8, top + bandH / 2);
        bandX += bandW;
      });
    } else if (columns.length) {
      ctx.fillStyle = sheet.ink;
      ctx.fillRect(pad + nameW, top, columns.length * cellW, dateH);
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 18px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Jogador", pad + 12, gridTop + dateH - 18);
    ctx.textAlign = "center";
    ctx.fillText("Pts", pad + nameW + columns.length * cellW + ptsW / 2, gridTop + dateH - 18);
    ctx.font = "600 15px Segoe UI, sans-serif";
    columns.forEach((column, index) => {
      const x = pad + nameW + index * cellW + cellW / 2;
      ctx.save();
      ctx.translate(x, gridTop + 14);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(column.label, 0, 0);
      ctx.restore();
    });

    rows.forEach((row, index) => {
      const y = gridTop + dateH + index * rowH;
      ctx.fillStyle = sheet.card;
      ctx.fillRect(pad, y, nameW, rowH);
      ctx.fillStyle = sheet.paper;
      ctx.fillRect(pad + nameW + columns.length * cellW, y, ptsW, rowH);
      ctx.strokeStyle = sheet.line;
      ctx.strokeRect(pad, y, nameW, rowH);
      ctx.fillStyle = sheet.ink;
      ctx.font = "700 16px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(fitText(ctx, row.name, nameW - 20), pad + 10, y + rowH / 2);
      row.cells.forEach((cell, cellIndex) => {
        const x = pad + nameW + cellIndex * cellW;
        const tone = cell ? colors[cell.result] : null;
        ctx.fillStyle = tone ? tone.fill : "#ffffff";
        ctx.fillRect(x, y, cellW, rowH);
        ctx.strokeStyle = "rgba(28, 16, 34, 0.08)";
        ctx.strokeRect(x, y, cellW, rowH);
        if (!cell || !tone) return;
        ctx.fillStyle = tone.ink;
        ctx.font = "700 16px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(cell.points), x + cellW / 2, y + rowH / 2);
      });
      ctx.fillStyle = sheet.ink;
      ctx.font = "700 16px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(row.points), pad + nameW + columns.length * cellW + ptsW / 2, y + rowH / 2);
    });
    ctx.textAlign = "left";
    drawFooter(ctx, height);
  });
}
