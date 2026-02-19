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

describe('svc-beta AppController', () => {
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
    expect(controller.health().service).toBe('svc-beta');
    expect(controller.getChaos().mode).toBe('normal');
    expect(controller.setChaos({ mode: 'latency', fixedLatencyMs: 100 } as never).mode).toBe('latency');
    expect(controller.resetChaos().mode).toBe('normal');
  });

  it('creates echo payload respecting payloadSize cap', async () => {
    const controller = new AppController(new ChaosStore());
    const result = await controller.work({ payloadSize: 9999, data: { a: 1 } } as never);
    expect(result.ok).toBe(true);
    expect(typeof result.echo).toBe('string');
    expect((result.echo as string).length).toBe(2048);
  });

  it('throws when chaos forces failure and handles timeout wait', async () => {
    const controller = new AppController(new ChaosStore());
    evaluateChaosMock.mockReturnValueOnce({
      simulatedLatencyMs: 0,
      shouldTimeout: false,
      shouldFail: true,
      statusCode: 500,
      errorMessage: 'forced fail',
    });
    await expect(controller.work({} as never)).rejects.toBeInstanceOf(HttpException);

    evaluateChaosMock.mockReturnValueOnce({
      simulatedLatencyMs: 20,
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
});

