import { describe, expect, it } from 'vitest';
import { ChaosStore } from '../src/chaos.store';

describe('svc-beta ChaosStore', () => {
  it('updates and resets config', () => {
    const store = new ChaosStore();
    expect(store.get().serviceName).toBe('svc-beta');
    store.update({ mode: 'probabilisticError', errorProbability: 0.4 } as never);
    expect(store.get().mode).toBe('probabilisticError');
    expect(store.reset().mode).toBe('normal');
  });
});

