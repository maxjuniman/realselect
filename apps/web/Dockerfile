FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma
ENV API_PROXY_URL=http://api:3333
ENV DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/realselect
RUN npm ci
RUN npm run build -w web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV API_PROXY_URL=http://api:3333
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
