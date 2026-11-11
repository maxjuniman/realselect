"use client";

import { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { useSession } from "@/components/Session";
import { clientApi } from "@/lib/client";
import { formatMoney, moneyInput, parseMoney } from "@/lib/format";
import type { FeeMonth } from "@/lib/types";
import { Actions, ErrorText, GhostButton, Muted, PageTitle, PanelHead, PrimaryButton, Table, TableWrap, Td, Th } from "@/styles/ui";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const FLOW = [
  { key: "paid", label: "Mensal pago" },
  { key: "goalkeeper", label: "Goleiro" },
  { key: "missing", label: "Jogador faltante" },
  { key: "gear", label: "Bola/Medalhas" },
  { key: "extra", label: "Sup jogo/Churrasco" },
  { key: "fee", label: "Mensalidade/Filmagem" },
  { key: "barbecue", label: "Churras Mensal" },
] as const;

type FlowKey = (typeof FLOW)[number]["key"];
type Draft = { key: string; year: number; month: number; carried: string } & Record<FlowKey, string>;
type Shown = {
  key: string;
  year: number;
  month: number;
  texts: { carried: string } & Record<FlowKey, string>;
  carried: number;
  balance: number;
  values: Record<FlowKey, number>;
  carriedLocked: boolean;
  invalid: boolean;
};

function monthLabel(year: number, month: number) {
  return `${MONTHS[month - 1]}/${String(year).slice(2)}`;
}

function seasonOf(year: number, month: number) {
  const half = month <= 6 ? 1 : 2;
  return { code: `0${half}_${year}`, name: `${half}º semestre ${year}` };
}

function blank(year: number, month: number): Draft {
  const zeros = Object.fromEntries(FLOW.map((column) => [column.key, "0,00"])) as Record<FlowKey, string>;
  return { key: `${year}-${month}`, year, month, carried: "0,00", ...zeros };
}

function draftFrom(months: FeeMonth[]): Draft[] {
  return months.map((month) => {
    const texts = Object.fromEntries(FLOW.map((column) => [column.key, moneyInput(month[column.key])])) as Record<FlowKey, string>;
    return { key: `${month.year}-${month.month}`, year: month.year, month: month.month, carried: moneyInput(month.carried), ...texts };
  });
}

function lined(draft: Draft[]): Shown[] {
  const sorted = [...draft].sort((a, b) => a.year - b.year || a.month - b.month);
  let previous = 0;
  return sorted.map((row, index) => {
    const carried = index === 0 ? parseMoney(row.carried) : previous;
    const parsed = Object.fromEntries(FLOW.map((column) => [column.key, parseMoney(row[column.key])])) as Record<FlowKey, number | null>;
    const values = Object.fromEntries(FLOW.map((column) => [column.key, parsed[column.key] ?? 0])) as Record<FlowKey, number>;
    const balance = (carried ?? 0) + FLOW.reduce((total, column) => total + values[column.key], 0);
    previous = balance;
    return {
      key: row.key,
      year: row.year,
      month: row.month,
      texts: { carried: row.carried, ...Object.fromEntries(FLOW.map((column) => [column.key, row[column.key]])) } as Shown["texts"],
      carried: carried ?? 0,
      balance,
      values,
      carriedLocked: index > 0,
      invalid: (index === 0 && carried === null) || FLOW.some((column) => parsed[column.key] === null),
    };
  });
}

function shownFrom(months: FeeMonth[]): Shown[] {
  return months.map((month, index) => ({
    key: month.id,
    year: month.year,
    month: month.month,
    texts: { carried: "", ...Object.fromEntries(FLOW.map((column) => [column.key, ""])) } as Shown["texts"],
    carried: month.carried,
    balance: month.balance,
    values: Object.fromEntries(FLOW.map((column) => [column.key, month[column.key]])) as Record<FlowKey, number>,
    carriedLocked: index > 0,
    invalid: false,
  }));
}

function groupsOf(rows: Shown[]) {
  const groups: { code: string; name: string; rows: Shown[] }[] = [];
  for (const row of rows) {
    const season = seasonOf(row.year, row.month);
    const last = groups.at(-1);
    if (!last || last.code !== season.code) groups.push({ ...season, rows: [row] });
    else last.rows.push(row);
  }
  return groups;
}

export function FeesBoard() {
  const session = useSession();
  const admin = session?.role === "admin";
  const [months, setMonths] = useState<FeeMonth[] | null>(null);
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clientApi<FeeMonth[]>("/fees")
      .then(setMonths)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível abrir a mensalidade."));
  }, []);

  const rows = draft ? lined(draft) : months ? shownFrom(months) : [];
  const groups = groupsOf(rows);

  function change(key: string, field: "carried" | FlowKey, value: string) {
    setDraft((current) => current?.map((row) => (row.key === key ? { ...row, [field]: value } : row)) ?? null);
  }

  async function save() {
    if (!draft) return;
    const next = lined(draft);
    if (next.some((row) => row.invalid)) {
      setError("Confira os valores. Use o formato 1.300,00 ou -76,98.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await clientApi<FeeMonth[]>("/admin/fees", {
        method: "PUT",
        body: JSON.stringify({
          months: next.map((row) => ({
            year: row.year,
            month: row.month,
            carried: row.carried,
            ...row.values,
          })),
        }),
      });
      setMonths(saved);
      setDraft(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a mensalidade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PanelHead $flush>
        <div>
          <PageTitle>Mensalidade</PageTitle>
          <Lead>Caixa do mês, separado por temporada. A sobra é o saldo do mês anterior. Arraste a tabela para o lado para ver sup jogo, mensalidade e churrasco.</Lead>
        </div>
        {admin && months && !draft ? (
          <GhostButton type="button" onClick={() => { setError(""); setDraft(draftFrom(months)); }}>
            Editar
          </GhostButton>
        ) : null}
        {draft ? (
          <Actions>
            <GhostButton type="button" disabled={saving} onClick={() => { setError(""); setDraft(null); }}>
              Cancelar
            </GhostButton>
            <PrimaryButton type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Salvando..." : "Salvar"}
            </PrimaryButton>
          </Actions>
        ) : null}
      </PanelHead>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!months && !error ? <Muted>Abrindo a mensalidade...</Muted> : null}
      {groups.map((group) => (
        <SeasonBlock key={group.code}>
          <SeasonTitle>{group.name}</SeasonTitle>
          <TableWrap>
            <FeeTable>
              <thead>
                <tr>
                  <PinHead $edge="left">Mês/Ano</PinHead>
                  <Th $num>Sobra mês passado</Th>
                  {FLOW.map((column) => (
                    <Th key={column.key} $num>{column.label}</Th>
                  ))}
                  {draft ? <Th /> : null}
                  <PinHead $edge="right" $num>Saldo</PinHead>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.key}>
                    <PinCell $edge="left">{monthLabel(row.year, row.month)}</PinCell>
                    <Td $num>
                      {draft && !row.carriedLocked ? (
                        <CellInput aria-label={`Sobra mês passado de ${monthLabel(row.year, row.month)}`} value={row.texts.carried} onChange={(event) => change(row.key, "carried", event.target.value)} />
                      ) : (
                        <Amount value={row.carried} />
                      )}
                    </Td>
                    {FLOW.map((column) => (
                      <Td key={column.key} $num>
                        {draft ? (
                          <CellInput aria-label={`${column.label} de ${monthLabel(row.year, row.month)}`} value={row.texts[column.key]} onChange={(event) => change(row.key, column.key, event.target.value)} />
                        ) : (
                          <Amount value={row.values[column.key]} />
                        )}
                      </Td>
                    ))}
                    {draft ? (
                      <Td>
                        <Remove type="button" aria-label={`Tirar ${monthLabel(row.year, row.month)}`} onClick={() => setDraft((current) => current?.filter((item) => item.key !== row.key) ?? null)}>
                          Tirar
                        </Remove>
                      </Td>
                    ) : null}
                    <PinCell $edge="right" $num>
                      <Amount value={row.balance} $strong />
                    </PinCell>
                  </tr>
                ))}
              </tbody>
            </FeeTable>
          </TableWrap>
        </SeasonBlock>
      ))}
      {months && !groups.length ? <Muted>Nenhum mês cadastrado.</Muted> : null}
      {draft ? (
        <Add
          type="button"
          onClick={() =>
            setDraft((current) => {
              const last = lined(current ?? []).at(-1);
              const next = last ? new Date(last.year, last.month, 1) : new Date();
              return [...(current ?? []), blank(next.getFullYear(), next.getMonth() + 1)];
            })
          }
        >
          Incluir mês
        </Add>
      ) : null}
    </section>
  );
}

function Amount({ value, $strong }: { value: number; $strong?: boolean }) {
  return (
    <Money $neg={value < 0} $strong={$strong}>
      {formatMoney(value)}
    </Money>
  );
}

const Lead = styled.p`
  margin: 8px 0 0;
  max-width: 62ch;
  color: ${({ theme }) => theme.muted};
`;

const SeasonBlock = styled.section`
  margin-top: 28px;
  border-top: 4px solid ${({ theme }) => theme.purple};
`;

const SeasonTitle = styled.h2`
  margin: 14px 0;
  font-size: 22px;
`;

const pin = css<{ $edge: "left" | "right" }>`
  position: sticky;
  ${({ $edge }) => ($edge === "left" ? "left: 0;" : "right: 0;")}
  z-index: 1;
  background: ${({ theme }) => theme.paper};
  box-shadow: ${({ $edge }) => ($edge === "left" ? "8px 0 8px -8px rgba(28, 16, 34, 0.28)" : "-8px 0 8px -8px rgba(28, 16, 34, 0.28)")};
`;

const FeeTable = styled(Table)`
  th,
  td {
    min-width: 108px;
  }
  th {
    white-space: normal;
    vertical-align: bottom;
    line-height: 1.15;
  }
`;

const PinHead = styled(Th)<{ $edge: "left" | "right" }>`
  ${pin}
`;

const PinCell = styled(Td)<{ $edge: "left" | "right" }>`
  ${pin}
  font-weight: 700;
`;

const Money = styled.span<{ $neg?: boolean; $strong?: boolean }>`
  color: ${({ $neg, theme }) => ($neg ? theme.loss : "inherit")};
  font-weight: ${({ $strong }) => ($strong ? 700 : 500)};
`;

const CellInput = styled.input`
  width: 118px;
  border: 1px solid ${({ theme }) => theme.line};
  background: ${({ theme }) => theme.card};
  border-radius: 0;
  padding: 8px;
  min-height: 40px;
  text-align: right;
  font: inherit;
  font-variant-numeric: tabular-nums;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

const Remove = styled.button`
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.loss};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

const Add = styled(GhostButton)`
  margin-top: 20px;
`;
