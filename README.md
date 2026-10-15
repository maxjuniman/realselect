# Real Select FC

Campeonato de pontos corridos do Futibas de Terça. O site mostra a classificação, o painel lança o jogo da semana e a API guarda tudo. No celular, o site pode ser instalado como aplicativo.

## Regras

- Um jogo por terça, times A e B montados na hora.
- Vitória 3, empate 1, derrota 0.
- Temporada dividida em semestre (`01_2026`, `02_2026`).
- Desempate, igual à planilha: pontos, quantidade de jogos, saldo de gols e vitória mais recente.

## Rodar neste computador

```bash
npm install
npm run dev
```

- Site: http://localhost:3000
- API: http://localhost:3333
- Painel: http://localhost:3000/admin/login
- Login inicial: `admin@realselect.fc` / `realselect2026`

Na primeira subida, a API importa o histórico da planilha (desde 2021). Para importar de novo, apagando jogos lançados depois:

```bash
npm run db:seed
```

Troque a senha em `apps/api/.env` antes de publicar.

## Publicar na VPS

É preciso Docker na VPS. Na pasta do projeto:

```bash
docker compose up -d --build
```

O site fica na porta 3000 e a API na 3333. Aponte o domínio para a porta 3000. O banco fica no volume `realselect-data`.

Defina senha e segredo no ambiente da VPS:

```bash
JWT_SECRET=um-segredo-longo ADMIN_PASSWORD=sua-senha docker compose up -d --build
```

## O que ficou de fora

A planilha também controla mensalidades e a caixinha (churrasco, goleiro, bola). Isso não entrou nesta primeira versão, porque mistura dado financeiro com a tabela do campeonato. A artilharia antiga, antes de junho de 2026, também não estava jogo a jogo — só o semestre atual foi importado.
