import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { ChaosStore } from '../src/chaos.store';

const evaluateChaosMock = vi.fn();
const waitMock = vi.fn(async () => {});

vi.mock('@restlab/shared', () => ({
  evaluateChaos: (...args: unknown[]) => evaluateChaosMock(...args),
  wait: (...args: unknown[]) => waitMock(...args),
}));

import { AppController } from '../src/app.controller';

describe('svc-gamma AppController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evaluateChaosMock.mockReturnValue({
      simulatedLatencyMs: 0,
      shouldTimeout: false,
      shouldFail: false,
    });
  });

  it('handles health and chaos config', () => {
    const store = new ChaosStore();
    const controller = new AppController(store);
    expect(controller.health().service).toBe('svc-gamma');
    expect(controller.getChaos().mode).toBe('normal');
    expect(controller.setChaos({ mode: 'timeout', timeoutProbability: 1 } as never).mode).toBe('timeout');
    expect(controller.resetChaos().mode).toBe('normal');
  });

  it('returns echo from data when payloadSize is missing', async () => {
    const controller = new AppController(new ChaosStore());
    const result = await controller.work({ data: { hello: 'world' } } as never);
    expect(result.ok).toBe(true);
    expect(result.echo).toEqual({ hello: 'world' });
  });

  it('throws on forced failure and handles timeout wait', async () => {
    const controller = new AppController(new ChaosStore());
    evaluateChaosMock.mockReturnValueOnce({
      simulatedLatencyMs: 0,
      shouldTimeout: false,
      shouldFail: true,
      statusCode: 400,
      errorMessage: 'forced fail',
    });
    await expect(controller.work({} as never)).rejects.toBeInstanceOf(HttpException);

    evaluateChaosMock.mockReturnValueOnce({
      simulatedLatencyMs: 5,
      shouldTimeout: true,
      shouldFail: false,
    });
    await controller.work({ clientTimeoutMs: 700 } as never);
    expect(waitMock).toHaveBeenCalled();
  });

  it('terminates with delayed signal', () => {
    vi.useFakeTimers();
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as never);
    const controller = new AppController(new ChaosStore());
    const result = controller.terminate({ signal: 'SIGTERM', delayMs: 1 } as never);
    expect(result.accepted).toBe(true);
    vi.runAllTimers();
    expect(killSpy).toHaveBeenCalled();
    killSpy.mockRestore();
    vi.useRealTimers();
  });

  it('falls back to process pid when pid 1 kill fails and uses defaults', () => {
    vi.useFakeTimers();
    const killSpy = vi
      .spyOn(process, 'kill')
      .mockImplementationOnce(() => {
        throw new Error('pid 1 not allowed');
      })
      .mockImplementation(() => true as never);

    const controller = new AppController(new ChaosStore());
    const result = controller.terminate({} as never);
    expect(result.signal).toBe('SIGTERM');
    expect(result.delayMs).toBe(250);

    vi.runAllTimers();
    expect(killSpy).toHaveBeenNthCalledWith(1, 1, 'SIGTERM');
    expect(killSpy).toHaveBeenNthCalledWith(2, process.pid, 'SIGTERM');

    killSpy.mockRestore();
    vi.useRealTimers();
  });
});
