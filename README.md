# REST Lab - Microservices Traffic Control Center

A local Node/TypeScript microservices lab to generate traffic (ok, errors, latency, timeout) and visualize results with a dashboard. This foundation is ready to integrate a service mesh and observability stack later.

## Stack
- Frontend: Next.js App Router + Tailwind
- Backend: NestJS (`orchestrator-api`, `svc-alpha`, `svc-beta`, `svc-gamma`)
- DB: Postgres + Prisma
- Infra: Docker Compose

## Structure
- `apps/web`: Web Control Center
- `apps/orchestrator-api`: API for runs, result queries, SSE, and chaos proxying
- `apps/svc-alpha`: service with real calls to beta/gamma
- `apps/svc-beta`: worker microservice
- `apps/svc-gamma`: worker microservice
- `packages/shared`: types, JSON logger, correlation, HTTP wrapper, chaos utils
- `packages/db`: Prisma client singleton
- `prisma`: schema, migrations, seed

## Quick start
1. `cd restLab`
2. `pnpm install`
3. `pnpm docker:up:build`

## Dev mode (hot reload)
For development without rebuilding images on every change, use the dev compose override:

1. `cd restLab`
2. `pnpm docker:dev:build` (first run)
3. Next runs: `pnpm docker:dev` (without rebuild)

This starts:
- Next.js in `dev` mode (frontend hot reload)
- NestJS APIs in watch mode with `tsx` using each app's `tsconfig` (including decorators) for `orchestrator-api`, `svc-alpha`, `svc-beta`, `svc-gamma`
- Postgres in the same stack

Notes:
- Use `pnpm docker:dev` for iterative development; it avoids image rebuilds.
- Use `pnpm docker:dev:build` only when Dockerfiles, lockfile, or dependencies change.
- Dockerfiles are optimized for layer caching: dependency install runs from package manifests before app source copy.
- File changes in the repo are reflected automatically without `docker compose up --build`.
- In dev mode, Swagger is disabled for Nest APIs to avoid metadata conflicts with hot transpilation.
- Each app now has a single multi-stage Dockerfile with two targets:
  - `prod`: frozen lockfile + build output for runtime
  - `dev`: non-frozen lockfile + development runtime
- `docker-compose.yml` builds `target: prod`.
- `docker-compose.dev.yml` overrides build to `target: dev`.
- To stop dev mode: `pnpm docker:dev:down`

## URLs
- Web: `http://localhost:3000`
- Orchestrator API: `http://localhost:3001`
- Swagger Orchestrator: `http://localhost:3001/docs`
- svc-alpha docs: `http://localhost:3011/docs`
- svc-beta docs: `http://localhost:3012/docs`
- svc-gamma docs: `http://localhost:3013/docs`

## Usage
1. Open Dashboard at `http://localhost:3000`.
2. Create a run by selecting workflow, iterations, concurrency, timeout, and optional retry.
3. Open run details to inspect stats, call graph, calls, and live streaming.
4. Open `Services` and modify chaos config per service.
5. Open `SigKill` to send `SIGTERM` to `web`, `orchestrator-api`, and `svc-*`.
6. Run new tests to verify the impact of errors/latency/timeouts/outages.

## Chaos config
Each service exposes:
- `GET /health`
- `GET /config/chaos`
- `POST /config/chaos`
- `POST /config/chaos/reset`
- `POST /chaos/terminate` (accepts `signal` and `delayMs`)
- `POST /work`

Supported modes:
- `normal`
- `forceStatus` (400/500/503)
- `probabilisticError` (e.g. `errorProbability=0.2`)
- `latency` (`fixedLatencyMs` or random min/max)
- `timeout` (`timeoutProbability`)

## SigKill
- The `SigKill` tab lets you send process signals:
  - `SIGTERM`: graceful termination
- Endpoints exposed by orchestrator:
  - `GET /services/kill-targets`
  - `POST /services/:name/terminate`

## Correlation and logs
Propagated headers:
- `X-Request-Id`
- `X-Run-Id`
- `X-Call-Id`
- `X-Parent-Call-Id`

All services emit JSON logs to stdout with these fields:
- `timestamp`, `level`, `service`, `requestId`, `runId`, `callId`, `parentCallId`, `route`, `method`, `statusCode`, `durationMs`, `msg`, `errorType`, `errorMessage`

Example:
```json
{
  "timestamp": "2026-02-10T12:00:00.000Z",
  "level": "info",
  "service": "svc-alpha",
  "requestId": "9b77d9fa-...",
  "runId": "3f4d4a2a-...",
  "callId": "4b5b2f3d-...",
  "parentCallId": "8f1d4c2d-...",
  "route": "/work",
  "method": "POST",
  "statusCode": 200,
  "durationMs": 87,
  "msg": "request completed"
}
```

## Main scripts
- Root:
  - `pnpm docker:up`
  - `pnpm docker:up:build`
  - `pnpm docker:down`
  - `pnpm docker:dev`
  - `pnpm docker:dev:build`
  - `pnpm docker:dev:down`
  - `pnpm prisma:deploy`
- Service folders:
  - execute CI/testing/lint/typecheck from each app directory (`apps/web`, `apps/orchestrator-api`, `apps/svc-alpha`, `apps/svc-beta`, `apps/svc-gamma`).

## Service-level CI/CD
Each app can now run tests from its own directory, enabling isolated pipelines:

- `apps/web`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm ci` (`lint + typecheck + coverage + build`)
- `apps/orchestrator-api`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm ci` (`typecheck + coverage + build`)
- `apps/svc-alpha`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm ci` (`typecheck + coverage + build`)
- `apps/svc-beta`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm ci` (`typecheck + coverage + build`)
- `apps/svc-gamma`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm ci` (`typecheck + coverage + build`)

Pipeline example (per service):
1. `cd apps/<service-name>`
2. `pnpm install --frozen-lockfile`
3. `pnpm ci`

## Troubleshooting
- Port already in use:
  - free `3000,3001,3011,3012,3013,5432`.
- Prisma/DB error:
  - check `DATABASE_URL` in `.env`.
  - run `pnpm prisma:deploy`.
- Services unreachable:
  - check status with `docker compose ps` and healthchecks.
- Registry/network timeouts while building:
  - rerun with `pnpm docker:dev:build` (Dockerfile retries and cache are enabled).
  - if your network is unstable, avoid repeated rebuilds and use `pnpm docker:dev` for normal edit-run cycles.
