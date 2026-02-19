FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/orchestrator-api/package.json ./apps/orchestrator-api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json

FROM base AS deps-dev
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-factor 2 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm install --frozen-lockfile=false --prefer-offline --filter orchestrator-api...

FROM base AS deps-prod
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-factor 2 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm install --frozen-lockfile=true --prefer-offline --filter orchestrator-api...

FROM deps-dev AS dev
COPY prisma ./prisma
COPY packages ./packages
COPY apps/orchestrator-api ./apps/orchestrator-api
EXPOSE 3001
CMD ["pnpm", "--filter", "orchestrator-api", "dev"]

FROM deps-prod AS prod
COPY prisma ./prisma
COPY packages ./packages
COPY apps/orchestrator-api ./apps/orchestrator-api
RUN pnpm exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @restlab/shared build && pnpm --filter @restlab/db build && pnpm --filter orchestrator-api build
EXPOSE 3001
CMD ["sh", "-c", "pnpm prisma:deploy || true; pnpm --filter orchestrator-api start"]
