FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/orchestrator-api ./apps/orchestrator-api
RUN pnpm install --frozen-lockfile=false
RUN pnpm prisma:generate
RUN pnpm --filter @restlab/shared build && pnpm --filter @restlab/db build && pnpm --filter orchestrator-api build
EXPOSE 3001
CMD ["sh", "-c", "pnpm prisma:deploy || true; pnpm --filter orchestrator-api start"]
