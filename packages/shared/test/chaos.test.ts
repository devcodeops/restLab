import { describe, expect, it, vi } from 'vitest';
import { evaluateChaos, wait } from '../src/chaos';

describe('evaluateChaos', () => {
  it('returns normal outcome by default', () => {
    const result = evaluateChaos({ mode: 'normal' }, 2000);
    expect(result.shouldFail).toBe(false);
    expect(result.shouldTimeout).toBe(false);
  });

  it('forces status on forceStatus mode', () => {
    const result = evaluateChaos({ mode: 'forceStatus', forceStatusCode: 503 }, 2000);
    expect(result.shouldFail).toBe(true);
    expect(result.statusCode).toBe(503);
  });

  it('uses fixed latency when configured', () => {
    const result = evaluateChaos({ mode: 'normal', fixedLatencyMs: 250 }, 2000);
    expect(result.simulatedLatencyMs).toBe(250);
  });

  it('uses random latency range', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = evaluateChaos({ mode: 'latency', randomLatencyMinMs: 100, randomLatencyMaxMs: 300 }, 2000);
    expect(result.simulatedLatencyMs).toBeGreaterThanOrEqual(100);
    expect(result.simulatedLatencyMs).toBeLessThanOrEqual(300);
    spy.mockRestore();
  });

  it('returns probabilistic error when random threshold matches', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = evaluateChaos({ mode: 'probabilisticError', errorProbability: 0.2 }, 2000);
    expect(result.shouldFail).toBe(true);
    expect(result.statusCode).toBe(500);
    spy.mockRestore();
  });

  it('returns timeout behavior on timeout mode', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = evaluateChaos({ mode: 'timeout', timeoutProbability: 1 }, 1500);
    expect(result.shouldTimeout).toBe(true);
    expect(result.simulatedLatencyMs).toBe(2500);
    spy.mockRestore();
  });

  it('wait resolves immediately for non-positive ms', async () => {
    await expect(wait(0)).resolves.toBeUndefined();
    await expect(wait(-5)).resolves.toBeUndefined();
  });
});
