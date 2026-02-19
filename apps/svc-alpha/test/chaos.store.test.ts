import { describe, expect, it } from 'vitest';
import { ChaosStore } from '../src/chaos.store';

describe('svc-alpha ChaosStore', () => {
  it('updates and resets config', () => {
    const store = new ChaosStore();
    const updated = store.update({ mode: 'latency', fixedLatencyMs: 123 });
    expect(updated.mode).toBe('latency');
    expect(updated.fixedLatencyMs).toBe(123);

    const reset = store.reset();
    expect(reset.mode).toBe('normal');
    expect(reset.fixedLatencyMs).toBeNull();
    expect(reset.serviceName).toBe('svc-alpha');
  });
});

