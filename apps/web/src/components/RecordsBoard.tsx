"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import type { ClubRecord, Session } from "@/lib/types";
import { Actions, DangerButton, ErrorText, Field, GhostButton, Muted, PageTitle, PanelHead, PrimaryButton, TextInput } from "@/styles/ui";

type DraftHolder = { key: string; name: string; note: string };
type DraftRecord = { key: string; title: string; value: string; holders: DraftHolder[] };

function key() {
  return Math.random().toString(36).slice(2);
}

function draftFrom(records: ClubRecord[]): DraftRecord[] {
  return records.map((record) => ({
    key: record.id || key(),
    title: record.title,
    value: record.value,
    holders: record.holders.map((holder) => ({ key: key(), name: holder.name, note: holder.note })),
  }));
}

export function RecordsBoard({ initial }: { initial: ClubRecord[] }) {
  const [records, setRecords] = useState(initial);
  const [draft, setDraft] = useState<DraftRecord[] | null>(null);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rs_token")) return;
    clientApi<Session>("/auth/me")
      .then((session) => setAdmin(session.role === "admin"))
      .catch(() => setAdmin(false));
  }, []);

  function update(index: number, next: DraftRecord) {
    setDraft((current) => current?.map((record, item) => (item === index ? next : record)) ?? null);
  }

  async function save() {
    if (!draft) return;
    setError("");
    const recordsToSave = draft.map((record) => ({
      title: record.title.trim(),
      value: record.value.trim(),
      holders: record.holders
        .map((holder) => ({ name: holder.name.trim(), note: holder.note.trim() }))
        .filter((holder) => holder.name),
    }));
    if (recordsToSave.some((record) => record.title.length < 2 || !record.value)) {
      setError("Cada recorde precisa de nome e marca.");
      return;
    }
    setSaving(true);
    try {
      const saved = await clientApi<ClubRecord[]>("/admin/records", {
        method: "PUT",
        body: JSON.stringify({ records: recordsToSave }),
      });
      setRecords(saved);
      setDraft(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar os recordes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PanelHead $flush>
        <div>
          <PageTitle>Recordes</PageTitle>
          <Lead>Recordes a serem batidos.</Lead>
        </div>
        {admin && !draft ? (
          <GhostButton type="button" onClick={() => { setError(""); setDraft(draftFrom(records)); }}>
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
      {draft ? (
        <Editor>
          {draft.map((record, index) => (
            <Card key={record.key}>
              <CardHead>
                <Index>{index + 1}</Index>
                <CardTitle>{record.title.trim() || "Novo recorde"}</CardTitle>
              </CardHead>
              <Section>
                <SectionLabel>A marca</SectionLabel>
                <MarkRow>
                  <Field>
                    Nome do recorde
                    <TextInput aria-label={`Nome do recorde ${index + 1}`} value={record.title} onChange={(event) => update(index, { ...record, title: event.target.value })} />
                  </Field>
                  <Field>
                    Número
                    <TextInput aria-label={`Marca do recorde ${index + 1}`} value={record.value} onChange={(event) => update(index, { ...record, value: event.target.value })} />
                  </Field>
                </MarkRow>
              </Section>
              <Section>
                <SectionLabel>Quem tem essa marca</SectionLabel>
                <People>
                  {record.holders.map((holder, holderIndex) => (
                    <Person key={holder.key}>
                      <Field>
                        Nome
                        <TextInput
                          aria-label={`Nome ${holderIndex + 1} do recorde ${index + 1}`}
                          value={holder.name}
                          onChange={(event) => {
                            const holders = record.holders.map((item, itemIndex) => (itemIndex === holderIndex ? { ...item, name: event.target.value } : item));
                            update(index, { ...record, holders });
                          }}
                        />
                      </Field>
                      <Field>
                        Quando
                        <TextInput
                          aria-label={`Quando ${holderIndex + 1} do recorde ${index + 1}`}
                          value={holder.note}
                          onChange={(event) => {
                            const holders = record.holders.map((item, itemIndex) => (itemIndex === holderIndex ? { ...item, note: event.target.value } : item));
                            update(index, { ...record, holders });
                          }}
                        />
                      </Field>
                      <Remove type="button" aria-label={`Tirar ${holder.name || `nome ${holderIndex + 1}`} de ${record.title || `recorde ${index + 1}`}`} onClick={() => update(index, { ...record, holders: record.holders.filter((item) => item.key !== holder.key) })}>
                        Tirar
                      </Remove>
                    </Person>
                  ))}
                </People>
                <GhostButton type="button" aria-label={`Incluir empate em ${record.title || `recorde ${index + 1}`}`} onClick={() => update(index, { ...record, holders: [...record.holders, { key: key(), name: "", note: "" }] })}>
                  Incluir empate
                </GhostButton>
              </Section>
              <DangerButton type="button" onClick={() => setDraft((current) => current?.filter((item) => item.key !== record.key) ?? null)}>
                Apagar este recorde
              </DangerButton>
            </Card>
          ))}
          <GhostButton
            type="button"
            onClick={() => setDraft((current) => [...(current ?? []), { key: key(), title: "", value: "", holders: [{ key: key(), name: "", note: "" }] }])}
          >
            Novo recorde
          </GhostButton>
        </Editor>
      ) : records.length ? (
        <List>
          {records.map((record) => (
            <Row key={record.id}>
              <div>
                <Title>{record.title}</Title>
                <Holders>
                  {record.holders.map((holder, index) => (
                    <li key={`${holder.name}-${holder.note}-${index}`}>
                      <b>{holder.name}</b>
                      {holder.note ? <span>{holder.note}</span> : null}
                    </li>
                  ))}
                </Holders>
              </div>
              <Mark>{record.value}</Mark>
            </Row>
          ))}
        </List>
      ) : (
        <Muted>Nenhum recorde cadastrado.</Muted>
      )}
    </section>
  );
}

const Lead = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.muted};
`;

const List = styled.div`
  margin-top: 8px;
`;

const Row = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 24px;
  align-items: start;
  padding: 18px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
`;

const Mark = styled.p`
  margin: 0;
  min-width: 3ch;
  text-align: right;
  font-size: clamp(32px, 4vw, 44px);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: ${({ theme }) => theme.purpleDeep};
`;

const Holders = styled.ul`
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  li {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  span {
    color: ${({ theme }) => theme.muted};
  }
`;

const Editor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin-top: 24px;
`;

const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.line};
  border-top: 4px solid ${({ theme }) => theme.purple};
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

const Index = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  background: ${({ theme }) => theme.purpleDeep};
  color: white;
  font-weight: 700;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 22px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionLabel = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.muted};
`;

const MarkRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: 12px;
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const People = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Person = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px auto;
  gap: 12px;
  align-items: end;
  padding: 12px;
  background: ${({ theme }) => theme.paper};
  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Remove = styled.button`
  height: 44px;
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
