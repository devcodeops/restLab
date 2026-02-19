FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/svc-gamma/package.json ./apps/svc-gamma/package.json
COPY packages/shared/package.json ./packages/shared/package.json

FROM base AS deps-dev
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-factor 2 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm install --frozen-lockfile=false --prefer-offline --filter svc-gamma...

FROM base AS deps-prod
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm config set fetch-retries 5 && \
    pnpm config set fetch-retry-factor 2 && \
    pnpm config set fetch-retry-mintimeout 10000 && \
    pnpm config set fetch-retry-maxtimeout 120000 && \
    pnpm install --frozen-lockfile=true --prefer-offline --filter svc-gamma...

FROM deps-dev AS dev
COPY packages ./packages
COPY apps/svc-gamma ./apps/svc-gamma
EXPOSE 3013
CMD ["pnpm", "--filter", "svc-gamma", "dev"]

FROM deps-prod AS prod
COPY packages ./packages
COPY apps/svc-gamma ./apps/svc-gamma
RUN pnpm --filter @restlab/shared build && pnpm --filter svc-gamma build
EXPOSE 3013
CMD ["pnpm", "--filter", "svc-gamma", "start"]
