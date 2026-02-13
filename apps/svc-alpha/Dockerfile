FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/svc-alpha ./apps/svc-alpha
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @restlab/shared build && pnpm --filter svc-alpha build
EXPOSE 3011
CMD ["pnpm", "--filter", "svc-alpha", "start"]
