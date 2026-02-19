import { describe, expect, it } from 'vitest';
import * as shared from '../src/index';

describe('shared index exports', () => {
  it('re-exports core utilities', () => {
    expect(typeof shared.evaluateChaos).toBe('function');
    expect(typeof shared.wait).toBe('function');
    expect(typeof shared.logInfo).toBe('function');
    expect(typeof shared.getCorrelationFromHeaders).toBe('function');
    expect(typeof shared.callJson).toBe('function');
  });
});
