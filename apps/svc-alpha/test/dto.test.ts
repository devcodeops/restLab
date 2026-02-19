import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChaosConfigDto, TerminateDto, WorkDto } from '../src/dto';

describe('svc-alpha dto', () => {
  it('accepts valid work/chaos/terminate payloads', () => {
    expect(validateSync(plainToInstance(WorkDto, { payloadSize: 10, workflow: 'chain', clientTimeoutMs: 500 }))).toHaveLength(0);
    expect(validateSync(plainToInstance(ChaosConfigDto, { mode: 'forceStatus', forceStatusCode: 503 }))).toHaveLength(0);
    expect(validateSync(plainToInstance(TerminateDto, { signal: 'SIGTERM', delayMs: 100 }))).toHaveLength(0);
  });

  it('rejects invalid values', () => {
    const invalid = plainToInstance(ChaosConfigDto, { mode: 'bad', errorProbability: 3 });
    expect(validateSync(invalid).length).toBeGreaterThan(0);
  });
});

