FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci
RUN npm run build -w api
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/realselect.db
VOLUME ["/data"]
EXPOSE 3333
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
