import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RetryPolicyDto {
  @IsInt()
  @Min(0)
  @Max(5)
  retries!: number;

  @IsInt()
  @Min(0)
  @Max(5000)
  backoffMs!: number;
}

export class CreateRunDto {
  @IsIn(['chain', 'fanout', 'fanout-fanin', 'random'])
  workflow!: 'chain' | 'fanout' | 'fanout-fanin' | 'random';

  @IsInt()
  @Min(1)
  @Max(1000)
  iterations!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  concurrency!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10240)
  payloadSize?: number;

  @IsInt()
  @Min(100)
  @Max(20000)
  clientTimeoutMs!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class ChaosConfigUpdateDto {
  @IsIn(['normal', 'forceStatus', 'probabilisticError', 'latency', 'timeout'])
  mode!: 'normal' | 'forceStatus' | 'probabilisticError' | 'latency' | 'timeout';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(400)
  @Max(599)
  forceStatusCode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  errorProbability?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fixedLatencyMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  randomLatencyMinMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  randomLatencyMaxMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  timeoutProbability?: number;

  @IsOptional()
  @IsObject()
  _meta?: Record<string, unknown>;
}

export class TerminateServiceDto {
  @IsOptional()
  @IsIn(['SIGTERM'])
  signal?: 'SIGTERM';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30000)
  delayMs?: number;
}
