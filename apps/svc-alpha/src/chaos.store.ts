import { Injectable } from '@nestjs/common';
import { ChaosConfig } from '@restlab/shared';
import { ChaosConfigDto } from './dto';

@Injectable()
export class ChaosStore {
  private config: ChaosConfig = {
    serviceName: 'svc-alpha',
    mode: 'normal',
    forceStatusCode: null,
    errorProbability: null,
    fixedLatencyMs: null,
    randomLatencyMinMs: null,
    randomLatencyMaxMs: null,
    timeoutProbability: null,
  };

  get(): ChaosConfig {
    return { ...this.config, updatedAt: new Date().toISOString() };
  }

  update(dto: ChaosConfigDto): ChaosConfig {
    this.config = {
      ...this.config,
      ...dto,
    };
    return this.get();
  }

  reset(): ChaosConfig {
    this.config = {
      serviceName: 'svc-alpha',
      mode: 'normal',
      forceStatusCode: null,
      errorProbability: null,
      fixedLatencyMs: null,
      randomLatencyMinMs: null,
      randomLatencyMaxMs: null,
      timeoutProbability: null,
    };
    return this.get();
  }
}
