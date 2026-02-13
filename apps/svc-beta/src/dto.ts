import { IsIn, IsInt, IsNumber, IsObject, IsOptional, Max, Min } from 'class-validator';
import { ChaosMode } from '@restlab/shared';

export class WorkDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  payloadSize?: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(100)
  clientTimeoutMs?: number;

  @IsOptional()
  @IsIn(['chain', 'fanout', 'fanout-fanin', 'random'])
  workflow?: 'chain' | 'fanout' | 'fanout-fanin' | 'random';
}

export class ChaosConfigDto {
  @IsIn(['normal', 'forceStatus', 'probabilisticError', 'latency', 'timeout'])
  mode!: ChaosMode;

  @IsOptional()
  @IsInt()
  @Min(400)
  @Max(599)
  forceStatusCode?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  errorProbability?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixedLatencyMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  randomLatencyMinMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  randomLatencyMaxMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  timeoutProbability?: number;
}

export class TerminateDto {
  @IsOptional()
  @IsIn(['SIGTERM'])
  signal?: 'SIGTERM';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30000)
  delayMs?: number;
}
