import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { ChaosStore } from '../src/chaos.store';

const callJsonMock = vi.fn();
const evaluateChaosMock = vi.fn();
const waitMock = vi.fn(async () => {});
const getCorrelationFromHeadersMock = vi.fn(() => ({ requestId: 'req-1' }));

vi.mock('@restlab/shared', () => ({
  callJson: (...args: unknown[]) => callJsonMock(...args),
  evaluateChaos: (...args: unknown[]) => evaluateChaosMock(...args),
  wait: (...args: unknown[]) => waitMock(...args),
  getCorrelationFromHeaders: (...args: unknown[]) => getCorrelationFromHeadersMock(...args),
}));

import { AppController } from '../src/app.controller';

describe('svc-alpha AppController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateChaosMock.mockReturnValue({
      simulatedLatencyMs: 0,
      shouldTimeout: false,
      shouldFail: false,
    });
  });

  it('handles health and chaos config endpoints', () => {
    const store = new ChaosStore();
    const controller = new AppController(store);
    expect(controller.health().service).toBe('svc-alpha');
    expect(controller.getChaos().mode).toBe('normal');
    expect(controller.setChaos({ mode: 'timeout', timeoutProbability: 0.5 } as never).mode).toBe('timeout');
    expect(controller.resetChaos().mode).toBe('normal');
  });

  it('runs chain workflow with downstream calls', async () => {
    const store = new ChaosStore();
    const controller = new AppController(store);
    callJsonMock
      .mockResolvedValueOnce({ ok: true, callId: 'beta-call', statusCode: 200, durationMs: 10 })
      .mockResolvedValueOnce({ ok: true, callId: 'gamma-call', statusCode: 200, durationMs: 12 });

    const result = await controller.work(
      { headers: {} },
      { workflow: 'chain', data: { x: 1 }, clientTimeoutMs: 2000 } as never,
    );

    expect(result.ok).toBe(true);
    expect(result.downstream).toHaveLength(2);
    expect(callJsonMock).toHaveBeenCalledTimes(2);
  });

  it('runs fanout-fanin and random workflows', async () => {
    const store = new ChaosStore();
    const controller = new AppController(store);

    callJsonMock
      .mockResolvedValueOnce({ ok: true, callId: 'b1', statusCode: 200, durationMs: 8 })
      .mockResolvedValueOnce({ ok: true, callId: 'g1', statusCode: 200, durationMs: 9 })
      .mockResolvedValueOnce({ ok: true, callId: 'bj', statusCode: 200, durationMs: 7 });
    const fanin = await controller.work({ headers: {} }, { workflow: 'fanout-fanin', clientTimeoutMs: 2000 } as never);
    expect(fanin.downstream).toHaveLength(3);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    callJsonMock.mockResolvedValue({ ok: true, callId: 'r1', statusCode: 200, durationMs: 5 });
    const random = await controller.work({ headers: {} }, { workflow: 'random', clientTimeoutMs: 2000 } as never);
    expect(random.downstream.length).toBeGreaterThan(0);
    randomSpy.mockRestore();
  });

  it('fails and times out when chaos says so', async () => {
    const store = new ChaosStore();
    const controller = new AppController(store);

    evaluateChaosMock.mockReturnValueOnce({
      simulatedLatencyMs: 0,
      shouldTimeout: false,
      shouldFail: true,
      statusCode: 503,
      errorMessage: 'forced',
    });
    await expect(controller.work({ headers: {} }, {} as never)).rejects.toBeInstanceOf(HttpException);

    evaluateChaosMock.mockReturnValueOnce({
      simulatedLatencyMs: 25,
      shouldTimeout: true,
      shouldFail: false,
    });
    await controller.work({ headers: {} }, { clientTimeoutMs: 1000 } as never);
    expect(waitMock).toHaveBeenCalled();
  });

  it('returns terminate payload', () => {
    vi.useFakeTimers();
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as never);
    const store = new ChaosStore();
    const controller = new AppController(store);
    const result = controller.terminate({ signal: 'SIGTERM', delayMs: 1 } as never);
    expect(result.accepted).toBe(true);
    vi.runAllTimers();
    expect(killSpy).toHaveBeenCalled();
    killSpy.mockRestore();
    vi.useRealTimers();
  });
});

