FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
ENV DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/realselect
RUN npm ci
RUN npm run build -w api
RUN mkdir -p /etc/crontabs \
  && cp /app/apps/api/crontab /etc/crontabs/root \
  && cp /app/apps/api/cron-lista.sh /usr/local/bin/cron-lista \
  && sed -i 's/\r$//' /etc/crontabs/root /usr/local/bin/cron-lista \
  && chmod 600 /etc/crontabs/root \
  && chmod 755 /usr/local/bin/cron-lista
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
EXPOSE 3333
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/write-cron-env.js && /usr/sbin/crond -b -l 2 && node dist/index.js"]
