import { ChaosConfig } from './types';

export interface ChaosOutcome {
  shouldFail: boolean;
  statusCode?: number;
  errorMessage?: string;
  simulatedLatencyMs: number;
  shouldTimeout: boolean;
}

function randomBool(probability?: number | null): boolean {
  if (probability == null) return false;
  return Math.random() < probability;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function evaluateChaos(config: ChaosConfig, timeoutMs: number): ChaosOutcome {
  let simulatedLatencyMs = 0;

  if (config.fixedLatencyMs && config.fixedLatencyMs > 0) {
    simulatedLatencyMs = config.fixedLatencyMs;
  }

  if (
    config.randomLatencyMinMs != null &&
    config.randomLatencyMaxMs != null &&
    config.randomLatencyMaxMs >= config.randomLatencyMinMs
  ) {
    simulatedLatencyMs = randomInt(config.randomLatencyMinMs, config.randomLatencyMaxMs);
  }

  if (config.mode === 'latency') {
    return {
      shouldFail: false,
      simulatedLatencyMs,
      shouldTimeout: false,
    };
  }

  if (config.mode === 'forceStatus') {
    return {
      shouldFail: true,
      statusCode: config.forceStatusCode ?? 500,
      errorMessage: `forced status ${config.forceStatusCode ?? 500}`,
      simulatedLatencyMs,
      shouldTimeout: false,
    };
  }

  if (config.mode === 'probabilisticError') {
    const fail = randomBool(config.errorProbability ?? 0.2);
    return {
      shouldFail: fail,
      statusCode: fail ? 500 : 200,
      errorMessage: fail ? 'probabilistic failure' : undefined,
      simulatedLatencyMs,
      shouldTimeout: false,
    };
  }

  if (config.mode === 'timeout') {
    return {
      shouldFail: false,
      simulatedLatencyMs: timeoutMs + 1000,
      shouldTimeout: randomBool(config.timeoutProbability ?? 1),
    };
  }

  return {
    shouldFail: false,
    simulatedLatencyMs,
    shouldTimeout: false,
  };
}

export async function wait(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
