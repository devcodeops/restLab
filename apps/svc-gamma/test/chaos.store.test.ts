import { describe, expect, it } from 'vitest';
import { ChaosStore } from '../src/chaos.store';

describe('svc-gamma ChaosStore', () => {
  it('updates and resets config', () => {
    const store = new ChaosStore();
    expect(store.get().serviceName).toBe('svc-gamma');
    store.update({ mode: 'forceStatus', forceStatusCode: 503 } as never);
    expect(store.get().forceStatusCode).toBe(503);
    expect(store.reset().mode).toBe('normal');
  });
});

