FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/svc-gamma ./apps/svc-gamma
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @restlab/shared build && pnpm --filter svc-gamma build
EXPOSE 3013
CMD ["pnpm", "--filter", "svc-gamma", "start"]
