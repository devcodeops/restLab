import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { prisma } from '@restlab/db';
import { callJson, logError, logInfo } from '@restlab/shared';
import { ChaosMode } from '@prisma/client';
import { CreateRunDto } from './dto';
import { StreamService } from './stream.service';

interface CallRecord {
  id: string;
  runId: string;
  parentCallId?: string;
  requestId: string;
  fromService: string;
  toService: string;
  route: string;
  method: string;
  statusCode?: number;
  durationMs: number;
  errorType?: string;
  errorMessage?: string;
}

@Injectable()
export class RunsService implements OnModuleDestroy {
  constructor(@Inject(StreamService) private readonly streamService: StreamService) {}

  async onModuleDestroy(): Promise<void> {
    await prisma.$disconnect();
  }

  async createRun(dto: CreateRunDto): Promise<{ runId: string }> {
    const run = await prisma.run.create({
      data: {
        workflowName: dto.workflow,
        status: 'running',
        iterations: dto.iterations,
        concurrency: dto.concurrency,
        payloadSize: dto.payloadSize,
        clientTimeoutMs: dto.clientTimeoutMs,
        retries: dto.retryPolicy?.retries ?? 0,
        backoffMs: dto.retryPolicy?.backoffMs ?? 0,
      },
    });

    this.streamService.emitGlobal({
      type: 'run_created',
      run,
    });

    this.executeRun(run.id, dto).catch(async (err) => {
      logError({
        service: 'orchestrator-api',
        runId: run.id,
        msg: 'run execution failed',
        errorType: 'unknown',
        errorMessage: err instanceof Error ? err.message : 'unknown',
      });
      const failedRun = await prisma.run.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
        },
      });
      this.streamService.emitGlobal({
        type: 'run_updated',
        run: failedRun,
      });
      this.streamService.complete(run.id);
    });

    return { runId: run.id };
  }

  async listRuns(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.run.findMany({
        orderBy: { startedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.run.count(),
    ]);

    return { items, total, page, pageSize };
  }

  async getRun(runId: string) {
    const run = await prisma.run.findUnique({ where: { id: runId } });
    const calls = await prisma.call.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });

    return { run, calls, callGraph: this.buildGraph(calls) };
  }

  async clearRuns() {
    const [deletedCalls, deletedRuns] = await prisma.$transaction([
      prisma.call.deleteMany({}),
      prisma.run.deleteMany({}),
    ]);

    this.streamService.emitGlobal({
      type: 'runs_cleared',
      deletedRuns: deletedRuns.count,
      deletedCalls: deletedCalls.count,
    });

    return {
      ok: true,
      deletedRuns: deletedRuns.count,
      deletedCalls: deletedCalls.count,
    };
  }

  private buildGraph(calls: Awaited<ReturnType<typeof prisma.call.findMany>>) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const call of calls) {
      map.set(call.id, { ...call, children: [] });
    }

    for (const call of calls) {
      const node = map.get(call.id);
      if (call.parentCallId && map.has(call.parentCallId)) {
        map.get(call.parentCallId).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private async executeRun(runId: string, dto: CreateRunDto): Promise<void> {
    const startedAt = Date.now();
    const durations: number[] = [];
    let totalCalls = 0;
    let successCalls = 0;
    let errorCalls = 0;
    let timeoutCalls = 0;

    const pending = Array.from({ length: dto.iterations }, (_, i) => i);

    const worker = async () => {
      while (pending.length > 0) {
        const iteration = pending.shift();
        if (iteration == null) return;
        const requestId = randomUUID();
        const rootCallId = randomUUID();

        const rootCall: CallRecord = {
          id: rootCallId,
          runId,
          requestId,
          fromService: 'orchestrator-api',
          toService: 'svc-alpha',
          route: '/work',
          method: 'POST',
          durationMs: 0,
        };

        const body = {
          payloadSize: dto.payloadSize,
          data: { iteration },
          workflow: dto.workflow,
          clientTimeoutMs: dto.clientTimeoutMs,
        };

        let result: Awaited<ReturnType<typeof this.callWithRetry>>;
        try {
          result = await withTimeout(
            this.callWithRetry(
              `${process.env.SVC_ALPHA_URL ?? 'http://svc-alpha:3011'}/work`,
              body,
              dto,
              {
                requestId,
                runId,
                callId: rootCallId,
              },
            ),
            maxIterationTimeoutMs(dto),
          );
        } catch (error) {
          result = {
            ok: false,
            callId: rootCallId,
            durationMs: maxIterationTimeoutMs(dto),
            errorType: 'timeout',
            errorMessage: error instanceof Error ? error.message : 'iteration timeout',
          };
        }

        totalCalls += 1;
        rootCall.statusCode = result.statusCode;
        rootCall.durationMs = result.durationMs;
        rootCall.errorType = result.errorType;
        rootCall.errorMessage = result.errorMessage;
        durations.push(result.durationMs);

        if (result.ok) {
          successCalls += 1;
        } else {
          errorCalls += 1;
          if (result.errorType === 'timeout') timeoutCalls += 1;
        }

        await prisma.call.create({ data: rootCall });

        const downstream = this.collectDownstreamCalls(
          runId,
          requestId,
          rootCallId,
          result.data as Record<string, unknown> | undefined,
        );

        for (const item of downstream) {
          totalCalls += 1;
          durations.push(item.durationMs);
          if (item.statusCode && item.statusCode >= 200 && item.statusCode < 400) {
            successCalls += 1;
          } else {
            errorCalls += 1;
            if (item.errorType === 'timeout') timeoutCalls += 1;
          }
        }

        if (downstream.length > 0) {
          await prisma.call.createMany({ data: downstream });
        }

        this.streamService.emit(runId, {
          type: 'call_completed',
          iteration,
          call: rootCall,
          downstream,
          stats: {
            totalCalls,
            successCalls,
            errorCalls,
            timeoutCalls,
          },
        });
      }
    };

    await Promise.all(Array.from({ length: dto.concurrency }, () => worker()));

    const p50LatencyMs = percentile(durations, 50);
    const p95LatencyMs = percentile(durations, 95);

    const completedRun = await prisma.run.update({
      where: { id: runId },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        totalCalls,
        successCalls,
        errorCalls,
        timeoutCalls,
        p50LatencyMs,
        p95LatencyMs,
      },
    });
    this.streamService.emitGlobal({
      type: 'run_updated',
      run: completedRun,
    });

    logInfo({
      service: 'orchestrator-api',
      runId,
      durationMs: Date.now() - startedAt,
      msg: 'run completed',
      totalCalls,
      successCalls,
      errorCalls,
      timeoutCalls,
      p50LatencyMs,
      p95LatencyMs,
    });

    this.streamService.emit(runId, {
      type: 'run_completed',
      runId,
      totalCalls,
      successCalls,
      errorCalls,
      timeoutCalls,
      p50LatencyMs,
      p95LatencyMs,
    });
    this.streamService.complete(runId);
  }

  private collectDownstreamCalls(
    runId: string,
    requestId: string,
    parentCallId: string,
    rootData?: Record<string, unknown>,
  ): CallRecord[] {
    const list = Array.isArray(rootData?.downstream)
      ? (rootData.downstream as Array<Record<string, any>>)
      : [];

    return list.map((item) => {
      const result = item.result ?? {};
      return {
        id: result.callId ?? randomUUID(),
        runId,
        parentCallId,
        requestId,
        fromService: 'svc-alpha',
        toService: String(item.service ?? item.target ?? 'unknown'),
        route: '/work',
        method: 'POST',
        statusCode: result.statusCode,
        durationMs: result.durationMs ?? 0,
        errorType: result.errorType,
        errorMessage: result.errorMessage,
      };
    });
  }

  private async callWithRetry(
    url: string,
    body: Record<string, unknown>,
    dto: CreateRunDto,
    correlation: { requestId: string; runId: string; callId: string },
  ) {
    const retries = dto.retryPolicy?.retries ?? 0;
    const backoffMs = dto.retryPolicy?.backoffMs ?? 0;

    let attempt = 0;
    let lastResult: Awaited<ReturnType<typeof callJson>> | null = null;

    while (attempt <= retries) {
      lastResult = await callJson({
        url,
        method: 'POST',
        timeoutMs: dto.clientTimeoutMs,
        body,
        correlation,
      });

      if (lastResult.ok || attempt === retries) {
        return lastResult;
      }

      attempt += 1;
      if (backoffMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return (
      lastResult ?? {
        ok: false,
        callId: correlation.callId,
        durationMs: 0,
        errorType: 'unknown',
        errorMessage: 'retry loop exhausted',
      }
    );
  }

  async getServices() {
    const services = [
      { name: 'svc-alpha', url: process.env.SVC_ALPHA_URL ?? 'http://svc-alpha:3011' },
      { name: 'svc-beta', url: process.env.SVC_BETA_URL ?? 'http://svc-beta:3012' },
      { name: 'svc-gamma', url: process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013' },
    ];

    const results = await Promise.all(
      services.map(async (svc) => {
        const [health, chaos] = await Promise.all([
          callJson({
            url: `${svc.url}/health`,
            method: 'GET',
            timeoutMs: 1000,
            correlation: { requestId: randomUUID() },
          }),
          callJson({
            url: `${svc.url}/config/chaos`,
            method: 'GET',
            timeoutMs: 1000,
            correlation: { requestId: randomUUID() },
          }),
        ]);

        const chaosData = (chaos.ok ? chaos.data : { mode: 'unknown' }) as Record<string, unknown>;

        if (chaos.ok) {
          await prisma.serviceChaosConfig.upsert({
            where: { serviceName: svc.name },
            update: {
              mode: parseChaosMode(chaosData.mode),
              forceStatusCode: numberOrNull(chaosData.forceStatusCode),
              errorProbability: floatOrNull(chaosData.errorProbability),
              fixedLatencyMs: numberOrNull(chaosData.fixedLatencyMs),
              randomLatencyMinMs: numberOrNull(chaosData.randomLatencyMinMs),
              randomLatencyMaxMs: numberOrNull(chaosData.randomLatencyMaxMs),
              timeoutProbability: floatOrNull(chaosData.timeoutProbability),
            },
            create: {
              serviceName: svc.name,
              mode: parseChaosMode(chaosData.mode),
              forceStatusCode: numberOrNull(chaosData.forceStatusCode),
              errorProbability: floatOrNull(chaosData.errorProbability),
              fixedLatencyMs: numberOrNull(chaosData.fixedLatencyMs),
              randomLatencyMinMs: numberOrNull(chaosData.randomLatencyMinMs),
              randomLatencyMaxMs: numberOrNull(chaosData.randomLatencyMaxMs),
              timeoutProbability: floatOrNull(chaosData.timeoutProbability),
            },
          });
        }

        return {
          name: svc.name,
          url: svc.url,
          health: health.ok ? health.data : { status: 'down' },
          chaos: chaosData,
        };
      }),
    );

    return { services: results };
  }

  async updateChaos(serviceName: string, payload: Record<string, unknown>) {
    const map: Record<string, string> = {
      'svc-alpha': process.env.SVC_ALPHA_URL ?? 'http://svc-alpha:3011',
      'svc-beta': process.env.SVC_BETA_URL ?? 'http://svc-beta:3012',
      'svc-gamma': process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013',
    };

    const url = map[serviceName];
    if (!url) {
      throw new Error(`unknown service ${serviceName}`);
    }

    const result = await callJson({
      url: `${url}/config/chaos`,
      method: 'POST',
      timeoutMs: 1500,
      body: payload,
      correlation: { requestId: randomUUID() },
    });

    if (result.ok && result.data) {
      const data = result.data as Record<string, unknown>;
      await prisma.serviceChaosConfig.upsert({
        where: { serviceName },
        update: {
          mode: parseChaosMode(data.mode),
          forceStatusCode: numberOrNull(data.forceStatusCode),
          errorProbability: floatOrNull(data.errorProbability),
          fixedLatencyMs: numberOrNull(data.fixedLatencyMs),
          randomLatencyMinMs: numberOrNull(data.randomLatencyMinMs),
          randomLatencyMaxMs: numberOrNull(data.randomLatencyMaxMs),
          timeoutProbability: floatOrNull(data.timeoutProbability),
        },
        create: {
          serviceName,
          mode: parseChaosMode(data.mode),
          forceStatusCode: numberOrNull(data.forceStatusCode),
          errorProbability: floatOrNull(data.errorProbability),
          fixedLatencyMs: numberOrNull(data.fixedLatencyMs),
          randomLatencyMinMs: numberOrNull(data.randomLatencyMinMs),
          randomLatencyMaxMs: numberOrNull(data.randomLatencyMaxMs),
          timeoutProbability: floatOrNull(data.timeoutProbability),
        },
      });
    }

    return result;
  }

  async resetChaos(serviceName: string) {
    const map: Record<string, string> = {
      'svc-alpha': process.env.SVC_ALPHA_URL ?? 'http://svc-alpha:3011',
      'svc-beta': process.env.SVC_BETA_URL ?? 'http://svc-beta:3012',
      'svc-gamma': process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013',
    };

    const url = map[serviceName];
    if (!url) {
      throw new Error(`unknown service ${serviceName}`);
    }

    const result = await callJson({
      url: `${url}/config/chaos/reset`,
      method: 'POST',
      timeoutMs: 1500,
      correlation: { requestId: randomUUID() },
    });

    if (result.ok && result.data) {
      const data = result.data as Record<string, unknown>;
      await prisma.serviceChaosConfig.upsert({
        where: { serviceName },
        update: {
          mode: parseChaosMode(data.mode),
          forceStatusCode: numberOrNull(data.forceStatusCode),
          errorProbability: floatOrNull(data.errorProbability),
          fixedLatencyMs: numberOrNull(data.fixedLatencyMs),
          randomLatencyMinMs: numberOrNull(data.randomLatencyMinMs),
          randomLatencyMaxMs: numberOrNull(data.randomLatencyMaxMs),
          timeoutProbability: floatOrNull(data.timeoutProbability),
        },
        create: {
          serviceName,
          mode: parseChaosMode(data.mode),
          forceStatusCode: numberOrNull(data.forceStatusCode),
          errorProbability: floatOrNull(data.errorProbability),
          fixedLatencyMs: numberOrNull(data.fixedLatencyMs),
          randomLatencyMinMs: numberOrNull(data.randomLatencyMinMs),
          randomLatencyMaxMs: numberOrNull(data.randomLatencyMaxMs),
          timeoutProbability: floatOrNull(data.timeoutProbability),
        },
      });
    }

    return result;
  }

  async getKillTargets() {
    const webUrl = process.env.WEB_URL ?? 'http://web:3000';
    const orchestratorUrl = process.env.ORCHESTRATOR_SELF_URL ?? 'http://orchestrator-api:3001';
    const targets: Array<{ name: string; url: string; healthPath: string }> = [
      { name: 'web', url: webUrl, healthPath: '/api/internal/health' },
      { name: 'orchestrator-api', url: orchestratorUrl, healthPath: '/health' },
      { name: 'svc-alpha', url: process.env.SVC_ALPHA_URL ?? 'http://svc-alpha:3011', healthPath: '/health' },
      { name: 'svc-beta', url: process.env.SVC_BETA_URL ?? 'http://svc-beta:3012', healthPath: '/health' },
      { name: 'svc-gamma', url: process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013', healthPath: '/health' },
    ];

    const items = await Promise.all(
      targets.map(async (target) => {
        const result = await callJson({
          url: `${target.url}${target.healthPath}`,
          method: 'GET',
          timeoutMs: 1200,
          correlation: { requestId: randomUUID() },
        });

        const normalized =
          result.ok && isHealthyPayload(result.data)
            ? 'ok'
            : result.ok && result.data == null
              ? 'ok'
              : 'down';

        return {
          name: target.name,
          url: target.url,
          status: normalized as 'ok' | 'down',
        };
      }),
    );

    return {
      items,
    };
  }

  async terminateService(serviceName: string, signal: 'SIGTERM', delayMs: number) {
    if (serviceName === 'orchestrator-api') {
      setTimeout(() => {
        try {
          process.kill(1, signal);
        } catch {
          process.kill(process.pid, signal);
        }
      }, delayMs);

      return {
        ok: true as const,
        data: {
          accepted: true,
          service: serviceName,
          signal,
          delayMs,
          pid: process.pid,
          killTargetPid: 1,
        },
      };
    }

    const map: Record<string, string> = {
      web: process.env.WEB_URL ?? 'http://web:3000',
      'svc-alpha': process.env.SVC_ALPHA_URL ?? 'http://svc-alpha:3011',
      'svc-beta': process.env.SVC_BETA_URL ?? 'http://svc-beta:3012',
      'svc-gamma': process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013',
    };

    const url = map[serviceName];
    if (!url) {
      return {
        ok: false as const,
        errorType: 'unknown',
        errorMessage: `unknown service ${serviceName}`,
      };
    }

    const path = serviceName === 'web' ? '/api/internal/terminate' : '/chaos/terminate';
    return callJson({
      url: `${url}${path}`,
      method: 'POST',
      timeoutMs: 1500,
      correlation: { requestId: randomUUID() },
      body: { signal, delayMs },
    });
  }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function floatOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function parseChaosMode(value: unknown): ChaosMode {
  switch (value) {
    case 'normal':
      return ChaosMode.normal;
    case 'forceStatus':
      return ChaosMode.forceStatus;
    case 'probabilisticError':
      return ChaosMode.probabilisticError;
    case 'latency':
      return ChaosMode.latency;
    case 'timeout':
      return ChaosMode.timeout;
    default:
      return ChaosMode.normal;
  }
}

function healthStatus(health: unknown): 'ok' | 'down' {
  if (!health || typeof health !== 'object') return 'down';
  const status = (health as Record<string, unknown>).status;
  return status === 'ok' ? 'ok' : 'down';
}

function isHealthyPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const status = (payload as Record<string, unknown>).status;
  return status === 'ok' || status === 'OK' || status === 'up' || status === 'UP';
}

function maxIterationTimeoutMs(dto: CreateRunDto): number {
  const retries = dto.retryPolicy?.retries ?? 0;
  const backoffMs = dto.retryPolicy?.backoffMs ?? 0;
  return (retries + 1) * dto.clientTimeoutMs + retries * backoffMs + 3000;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let handle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    handle = setTimeout(() => reject(new Error(`iteration exceeded ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (handle) clearTimeout(handle);
  }
}
