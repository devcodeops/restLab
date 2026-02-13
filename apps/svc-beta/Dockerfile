FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/svc-beta ./apps/svc-beta
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @restlab/shared build && pnpm --filter svc-beta build
EXPOSE 3012
CMD ["pnpm", "--filter", "svc-beta", "start"]
