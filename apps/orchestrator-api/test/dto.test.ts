import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ChaosConfigUpdateDto, CreateRunDto, PaginationDto, RetryPolicyDto, TerminateServiceDto } from '../src/dto';

describe('orchestrator dto', () => {
  it('validates create run payload', () => {
    const dto = plainToInstance(CreateRunDto, {
      workflow: 'chain',
      iterations: 5,
      concurrency: 2,
      clientTimeoutMs: 1000,
      retryPolicy: plainToInstance(RetryPolicyDto, { retries: 1, backoffMs: 100 }),
    });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid payload values', () => {
    const dto = plainToInstance(CreateRunDto, {
      workflow: 'bad',
      iterations: 0,
      concurrency: 0,
      clientTimeoutMs: 50,
    });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('supports pagination and chaos/terminate dto', () => {
    const pagination = plainToInstance(PaginationDto, { page: '2', pageSize: '20' });
    expect(validateSync(pagination)).toHaveLength(0);

    const chaos = plainToInstance(ChaosConfigUpdateDto, { mode: 'latency', fixedLatencyMs: 100 });
    expect(validateSync(chaos)).toHaveLength(0);

    const terminate = plainToInstance(TerminateServiceDto, { signal: 'SIGTERM', delayMs: 1000 });
    expect(validateSync(terminate)).toHaveLength(0);
  });
});
