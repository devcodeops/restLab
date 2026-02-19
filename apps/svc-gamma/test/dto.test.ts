import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChaosConfigDto, TerminateDto, WorkDto } from '../src/dto';

describe('svc-gamma dto', () => {
  it('accepts valid payloads', () => {
    expect(validateSync(plainToInstance(WorkDto, { payloadSize: 1, workflow: 'fanout', clientTimeoutMs: 800 }))).toHaveLength(0);
    expect(validateSync(plainToInstance(ChaosConfigDto, { mode: 'latency', fixedLatencyMs: 10 }))).toHaveLength(0);
    expect(validateSync(plainToInstance(TerminateDto, { signal: 'SIGTERM', delayMs: 10 }))).toHaveLength(0);
  });

  it('rejects invalid payloads', () => {
    const invalid = plainToInstance(TerminateDto, { signal: 'SIGKILL', delayMs: 999999 });
    expect(validateSync(invalid).length).toBeGreaterThan(0);
  });
});

