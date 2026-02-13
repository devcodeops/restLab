# REST Lab - Microservices Traffic Control Center

Laboratorio local con microservicios Node/TypeScript para generar trafico (ok, errores, latencia, timeout) y visualizar resultados con un dashboard. Esta base esta lista para conectar mas adelante service mesh y stack de observabilidad.

## Stack
- Frontend: Next.js App Router + Tailwind
- Backend: NestJS (`orchestrator-api`, `svc-alpha`, `svc-beta`, `svc-gamma`)
- DB: Postgres + Prisma
- Infra: Docker Compose

## Estructura
- `apps/web`: Centro de Control web
- `apps/orchestrator-api`: API para runs, query de resultados, SSE y proxy chaos
- `apps/svc-alpha`: servicio con llamadas reales a beta/gamma
- `apps/svc-beta`: microservicio de trabajo
- `apps/svc-gamma`: microservicio de trabajo
- `packages/shared`: tipos, logger JSON, correlacion, wrapper HTTP, chaos utils
- `packages/db`: Prisma client singleton
- `prisma`: schema, migraciones, seed

## Arranque rapido
1. `cd restLab`
2. `pnpm install`
3. `docker compose up --build`

## Dev mode (hot reload)
Para desarrollo sin recompilar imagen en cada cambio, usa el compose override de dev:

1. `cd restLab`
2. `pnpm docker:dev`

Esto levanta:
- Next.js en modo `dev` (hot reload en frontend)
- APIs NestJS en modo watch con `tsx` usando el `tsconfig` de cada app (incluyendo decorators) para `orchestrator-api`, `svc-alpha`, `svc-beta`, `svc-gamma`
- Postgres en el mismo stack

Notas:
- El primer arranque instala dependencias dentro de cada contenedor; luego se reutilizan via volumen.
- Los cambios en archivos del repo se reflejan automaticamente sin `docker compose up --build`.
- En dev mode Swagger se desactiva para las APIs Nest para evitar conflictos de metadata con el transpile en caliente.
- Para apagar dev mode: `pnpm docker:dev:down`

## URLs
- Web: `http://localhost:3000`
- Orchestrator API: `http://localhost:3001`
- Swagger Orchestrator: `http://localhost:3001/docs`
- svc-alpha docs: `http://localhost:3011/docs`
- svc-beta docs: `http://localhost:3012/docs`
- svc-gamma docs: `http://localhost:3013/docs`

## Uso
1. Abrir Dashboard en `http://localhost:3000`.
2. Crear un run seleccionando workflow, iteraciones, concurrencia, timeout y retry opcional.
3. Ir al detalle del run para ver stats, call graph, calls y streaming en vivo.
4. Abrir `Services` y modificar chaos config por servicio.
5. Abrir `SigKill` para enviar `SIGTERM` a `web`, `orchestrator-api` y `svc-*`.
6. Ejecutar nuevos runs para comprobar impacto de errores/latencia/timeout/caidas.

## Chaos config
Cada servicio expone:
- `GET /health`
- `GET /config/chaos`
- `POST /config/chaos`
- `POST /config/chaos/reset`
- `POST /chaos/terminate` (acepta `signal` y `delayMs`)
- `POST /work`

Modos soportados:
- `normal`
- `forceStatus` (400/500/503)
- `probabilisticError` (p.ej. `errorProbability=0.2`)
- `latency` (`fixedLatencyMs` o random min/max)
- `timeout` (`timeoutProbability`)

## SigKill
- La tab `SigKill` permite enviar senales de proceso:
  - `SIGTERM`: terminacion ordenada
- Endpoints expuestos por orchestrator:
  - `GET /services/kill-targets`
  - `POST /services/:name/terminate`

## Correlacion y logs
Headers propagados:
- `X-Request-Id`
- `X-Run-Id`
- `X-Call-Id`
- `X-Parent-Call-Id`

Todos los servicios emiten logs JSON a stdout con campos:
- `timestamp`, `level`, `service`, `requestId`, `runId`, `callId`, `parentCallId`, `route`, `method`, `statusCode`, `durationMs`, `msg`, `errorType`, `errorMessage`

Ejemplo:
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

## Scripts principales
- Root:
  - `pnpm build`
  - `pnpm dev`
  - `pnpm docker:up`
  - `pnpm docker:dev`
  - `pnpm docker:dev:down`
  - `pnpm prisma:generate`
  - `pnpm prisma:deploy`
  - `pnpm prisma:seed`
- Apps:
  - `pnpm --filter orchestrator-api dev`
  - `pnpm --filter svc-alpha dev`
  - `pnpm --filter svc-beta dev`
  - `pnpm --filter svc-gamma dev`
  - `pnpm --filter web dev`

## Troubleshooting
- Error de puertos ocupados:
  - liberar `3000,3001,3011,3012,3013,5432`.
- Error Prisma/DB:
  - verificar `DATABASE_URL` en `.env`.
  - correr `pnpm prisma:generate`.
- Servicios no alcanzables:
  - revisar estado con `docker compose ps` y healthchecks.
