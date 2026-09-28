# API image (NestJS + Prisma) for Render. Build context: repository root.
FROM node:22-slim

# openssl: required by Prisma's migration engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Install only the API and the shared package (not the web app).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter "@clientready/api..."

RUN pnpm --filter @clientready/shared build && pnpm --filter @clientready/api build

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 10000
# Apply pending migrations, then start. Nothing is written to the (ephemeral) local disk.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
