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

O banco `realselect` fica no Postgres que já roda no container `maxfoot-postgres`. A API entra na mesma rede Docker. O site escuta só em `127.0.0.1:3000`, para não disputar a porta 3333 do Maxfoot.

O código fica em `/opt/realselect/app/docker`, no mesmo formato de `/opt/maxfoot/app/docker`. O Nginx fica em `/etc/nginx/sites-enabled/realselect`, ao lado do arquivo `maxfoot`. Até existir domínio, o site responde em `http://167.233.239.13:8082`. A porta 80 continua com o site que já usa esse IP.

Na VPS, o `.env` dessa pasta fica assim:

```bash
DATABASE_URL=postgresql://realselect:SENHA@maxfoot-postgres:5432/realselect
POSTGRES_NETWORK=maxfoot_maxfoot
JWT_SECRET=um-segredo-longo
```

`SENHA` é a senha do usuário `realselect` no Postgres. `JWT_SECRET` é um texto longo só da API. Gere com `openssl rand -hex 32`. Quem entra no painel fica na tabela `User`, com a senha criptografada. O primeiro usuário, e os próximos, são criados assim, com o container no ar:

```bash
docker exec -it realselect-api node dist/create-user.js "Seu Nome" "seu@email.com" "senha-do-painel"
```

`POSTGRES_NETWORK` é o nome que aparece em:

```bash
docker inspect maxfoot-postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{println}}{{end}}'
```

Cada push na `master` faz o build e, em seguida, o deploy por SSH. Na primeira subida, a API cria as tabelas e importa o histórico da planilha.

## O que ficou de fora

A planilha também controla mensalidades e a caixinha (churrasco, goleiro, bola). Isso não entrou nesta primeira versão, porque mistura dado financeiro com a tabela do campeonato. A artilharia antiga, antes de junho de 2026, também não estava jogo a jogo — só o semestre atual foi importado.
