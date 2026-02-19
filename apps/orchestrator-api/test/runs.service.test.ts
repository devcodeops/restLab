import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamService } from '../src/stream.service';

const {
  prismaMock,
  callJsonMock,
  logInfoMock,
  logErrorMock,
} = vi.hoisted(() => ({
  prismaMock: {
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    run: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    call: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    serviceChaosConfig: {
      upsert: vi.fn(),
    },
  },
  callJsonMock: vi.fn(),
  logInfoMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('@restlab/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@prisma/client', () => ({
  ChaosMode: {
    normal: 'normal',
    forceStatus: 'forceStatus',
    probabilisticError: 'probabilisticError',
    latency: 'latency',
    timeout: 'timeout',
  },
}));

vi.mock('@restlab/shared', () => ({
  callJson: (...args: unknown[]) => callJsonMock(...args),
  logInfo: (...args: unknown[]) => logInfoMock(...args),
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

// import after mocks
import { RunsService } from '../src/runs.service';

describe('RunsService', () => {
  let service: RunsService;
  let streamService: StreamService;

  beforeEach(() => {
    vi.clearAllMocks();
    streamService = new StreamService();
    service = new RunsService(streamService);
  });

  it('lists runs with pagination', async () => {
    prismaMock.run.findMany.mockResolvedValueOnce([{ id: 'r1' }]);
    prismaMock.run.count.mockResolvedValueOnce(1);

    const result = await service.listRuns(2, 10);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(prismaMock.run.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  it('returns run detail and graph', async () => {
    prismaMock.run.findUnique.mockResolvedValueOnce({ id: 'r1' });
    prismaMock.call.findMany.mockResolvedValueOnce([
      { id: 'c1', parentCallId: null },
      { id: 'c2', parentCallId: 'c1' },
    ]);

    const result = await service.getRun('r1');
    expect(result.run.id).toBe('r1');
    expect(result.callGraph).toHaveLength(1);
    expect(result.callGraph[0].children).toHaveLength(1);
  });

  it('clears runs and emits global event', async () => {
    prismaMock.$transaction.mockResolvedValueOnce([{ count: 3 }, { count: 2 }]);
    const events: string[] = [];
    streamService.getGlobalRunsStream().subscribe((ev) => events.push(String(ev.data)));

    const result = await service.clearRuns();
    expect(result).toEqual({ ok: true, deletedRuns: 2, deletedCalls: 3 });
    expect(events[0]).toContain('runs_cleared');
  });

  it('gets services status and persists chaos config when available', async () => {
    callJsonMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.endsWith('/health')) return { ok: true, data: { status: 'ok' } };
      return {
        ok: true,
        data: {
          mode: 'latency',
          fixedLatencyMs: 50,
          randomLatencyMinMs: 10,
          randomLatencyMaxMs: 90,
        },
      };
    });

    const result = await service.getServices();
    expect(result.services).toHaveLength(3);
    expect(prismaMock.serviceChaosConfig.upsert).toHaveBeenCalledTimes(3);
    expect(result.services[0].health).toEqual({ status: 'ok' });
  });

  it('handles partial service failures and unknown chaos mode mapping', async () => {
    callJsonMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('svc-alpha') && url.endsWith('/health')) return { ok: true, data: { status: 'ok' } };
      if (url.includes('svc-alpha') && url.endsWith('/config/chaos')) {
        return { ok: true, data: { mode: 'forceStatus', forceStatusCode: 503 } };
      }

      if (url.includes('svc-beta') && url.endsWith('/health')) return { ok: true, data: { status: 'ok' } };
      if (url.includes('svc-beta') && url.endsWith('/config/chaos')) {
        return { ok: true, data: { mode: 'unexpected-mode' } };
      }

      if (url.includes('svc-gamma') && url.endsWith('/health')) return { ok: false, errorType: 'network' };
      return { ok: false, errorType: 'timeout' };
    });

    const result = await service.getServices();
    expect(result.services).toHaveLength(3);
    expect(prismaMock.serviceChaosConfig.upsert).toHaveBeenCalledTimes(2);
    expect(result.services.find((item) => item.name === 'svc-gamma')?.health).toEqual({ status: 'down' });
  });

  it('updates and resets chaos, and handles unknown service', async () => {
    callJsonMock.mockResolvedValue({ ok: true, data: { mode: 'normal' } });

    await expect(service.updateChaos('svc-alpha', { mode: 'normal' })).resolves.toMatchObject({ ok: true });
    await expect(service.resetChaos('svc-beta')).resolves.toMatchObject({ ok: true });
    expect(prismaMock.serviceChaosConfig.upsert).toHaveBeenCalledTimes(2);

    await expect(service.updateChaos('unknown', {})).rejects.toThrow(/unknown service/i);
    await expect(service.resetChaos('unknown')).rejects.toThrow(/unknown service/i);
  });

  it('does not persist chaos when upstream response has no data', async () => {
    callJsonMock.mockResolvedValue({ ok: true, data: null });

    await expect(service.updateChaos('svc-alpha', { mode: 'normal' })).resolves.toMatchObject({ ok: true });
    await expect(service.resetChaos('svc-beta')).resolves.toMatchObject({ ok: true });
    expect(prismaMock.serviceChaosConfig.upsert).not.toHaveBeenCalled();
  });

  it('returns kill targets and normalizes down statuses', async () => {
    callJsonMock.mockImplementation(async ({ url }: { url: string }) => {
      if (url.includes('svc-gamma')) return { ok: false, errorType: 'network' };
      if (url.includes('/api/internal/health')) return { ok: true, data: null };
      return { ok: true, data: { status: 'ok' } };
    });

    const result = await service.getKillTargets();
    expect(result.items).toHaveLength(5);
    expect(result.items.find((item) => item.name === 'svc-gamma')?.status).toBe('down');
    expect(result.items.find((item) => item.name === 'web')?.status).toBe('ok');
  });

  it('terminates orchestrator and other services', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as never);
    vi.useFakeTimers();

    const self = await service.terminateService('orchestrator-api', 'SIGTERM', 1);
    expect(self.ok).toBe(true);
    await vi.advanceTimersByTimeAsync(2);
    expect(killSpy).toHaveBeenCalled();

    callJsonMock.mockResolvedValueOnce({ ok: true, data: { accepted: true } });
    const remote = await service.terminateService('svc-alpha', 'SIGTERM', 100);
    expect(remote).toMatchObject({ ok: true });
    expect(callJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('/chaos/terminate') }),
    );

    const unknown = await service.terminateService('unknown', 'SIGTERM', 100);
    expect(unknown.ok).toBe(false);

    vi.useRealTimers();
    killSpy.mockRestore();
  });

  it('uses fallback kill target for orchestrator and web terminate path', async () => {
    vi.useFakeTimers();
    const killSpy = vi
      .spyOn(process, 'kill')
      .mockImplementationOnce(() => {
        throw new Error('pid 1 not available');
      })
      .mockImplementation(() => true as never);

    await service.terminateService('orchestrator-api', 'SIGTERM', 1);
    await vi.advanceTimersByTimeAsync(2);
    expect(killSpy).toHaveBeenNthCalledWith(1, 1, 'SIGTERM');
    expect(killSpy).toHaveBeenNthCalledWith(2, process.pid, 'SIGTERM');

    callJsonMock.mockResolvedValueOnce({ ok: true, data: { accepted: true } });
    await service.terminateService('web', 'SIGTERM', 100);
    expect(callJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('/api/internal/terminate') }),
    );

    vi.useRealTimers();
    killSpy.mockRestore();
  });

  it('disconnects prisma on module destroy', async () => {
    await service.onModuleDestroy();
    expect(prismaMock.$disconnect).toHaveBeenCalled();
  });

  it('creates and executes a run successfully', async () => {
    prismaMock.run.create.mockResolvedValueOnce({ id: 'run-1' });
    prismaMock.call.create.mockResolvedValue({});
    prismaMock.call.createMany.mockResolvedValue({});
    prismaMock.run.update.mockResolvedValue({ id: 'run-1', status: 'completed' });
    callJsonMock.mockResolvedValue({
      ok: true,
      callId: 'root-call',
      statusCode: 200,
      durationMs: 12,
      data: {
        downstream: [
          {
            service: 'svc-beta',
            result: { callId: 'child-1', statusCode: 200, durationMs: 6 },
          },
        ],
      },
    });

    const result = await service.createRun({
      workflow: 'chain',
      iterations: 1,
      concurrency: 1,
      payloadSize: 32,
      clientTimeoutMs: 300,
      retryPolicy: { retries: 0, backoffMs: 0 },
    });

    expect(result.runId).toBe('run-1');
    for (let i = 0; i < 20; i += 1) {
      if (prismaMock.run.update.mock.calls.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(prismaMock.call.create).toHaveBeenCalled();
    expect(prismaMock.call.createMany).toHaveBeenCalled();
    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
  });

  it('marks run as failed when execution crashes', async () => {
    prismaMock.run.create.mockResolvedValueOnce({ id: 'run-fail' });
    prismaMock.call.create.mockRejectedValueOnce(new Error('db write failed'));
    prismaMock.run.update.mockResolvedValue({ id: 'run-fail', status: 'failed' });
    callJsonMock.mockResolvedValue({
      ok: true,
      callId: 'root-call',
      statusCode: 200,
      durationMs: 12,
    });

    await service.createRun({
      workflow: 'chain',
      iterations: 1,
      concurrency: 1,
      clientTimeoutMs: 300,
    } as never);

    for (let i = 0; i < 20; i += 1) {
      if (prismaMock.run.update.mock.calls.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(logErrorMock).toHaveBeenCalledWith(expect.objectContaining({ msg: 'run execution failed' }));
    expect(prismaMock.run.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-fail' },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('counts downstream errors and timeouts in run metrics', async () => {
    prismaMock.run.create.mockResolvedValueOnce({ id: 'run-metrics' });
    prismaMock.call.create.mockResolvedValue({});
    prismaMock.call.createMany.mockResolvedValue({});
    prismaMock.run.update.mockResolvedValue({ id: 'run-metrics', status: 'completed' });
    callJsonMock.mockResolvedValue({
      ok: true,
      callId: 'root-call',
      statusCode: 200,
      durationMs: 9,
      data: {
        downstream: [
          {
            target: 'svc-beta',
            result: { statusCode: 500, durationMs: 4, errorType: 'timeout', errorMessage: 'timeout' },
          },
          {
            result: {},
          },
        ],
      },
    });

    await service.createRun({
      workflow: 'chain',
      iterations: 1,
      concurrency: 1,
      clientTimeoutMs: 200,
    } as never);

    for (let i = 0; i < 20; i += 1) {
      if (prismaMock.run.update.mock.calls.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const updateCall = prismaMock.run.update.mock.calls.at(-1)?.[0];
    expect(updateCall?.data.errorCalls).toBeGreaterThan(0);
    expect(updateCall?.data.timeoutCalls).toBeGreaterThan(0);
    expect(prismaMock.call.createMany).toHaveBeenCalled();
  });
});
