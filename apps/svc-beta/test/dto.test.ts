import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChaosConfigDto, TerminateDto, WorkDto } from '../src/dto';

describe('svc-beta dto', () => {
  it('accepts valid payloads', () => {
    expect(validateSync(plainToInstance(WorkDto, { data: { ok: true }, workflow: 'random', clientTimeoutMs: 700 }))).toHaveLength(0);
    expect(validateSync(plainToInstance(ChaosConfigDto, { mode: 'timeout', timeoutProbability: 0.4 }))).toHaveLength(0);
    expect(validateSync(plainToInstance(TerminateDto, { delayMs: 0 }))).toHaveLength(0);
  });

  it('rejects invalid payloads', () => {
    const invalid = plainToInstance(WorkDto, { payloadSize: -1, clientTimeoutMs: 50, workflow: 'x' });
    expect(validateSync(invalid).length).toBeGreaterThan(0);
  });
});

