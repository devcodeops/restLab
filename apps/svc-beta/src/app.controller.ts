import {
  Inject,
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { evaluateChaos, wait } from '@restlab/shared';
import { ChaosStore } from './chaos.store';
import { ChaosConfigDto, TerminateDto, WorkDto } from './dto';

@Controller()
export class AppController {
  constructor(@Inject(ChaosStore) private readonly chaosStore: ChaosStore) {}

  @Get('/health')
  health() {
    return { status: 'ok', service: 'svc-beta', time: new Date().toISOString() };
  }

  @Get('/config/chaos')
  getChaos() {
    return this.chaosStore.get();
  }

  @Post('/config/chaos')
  setChaos(@Body() body: ChaosConfigDto) {
    return this.chaosStore.update(body);
  }

  @Post('/config/chaos/reset')
  resetChaos() {
    return this.chaosStore.reset();
  }

  @Post('/chaos/terminate')
  @HttpCode(202)
  terminate(@Body() body: TerminateDto) {
    const signal = body.signal ?? 'SIGTERM';
    const delayMs = body.delayMs ?? 250;
    setTimeout(() => {
      try {
        process.kill(1, signal);
      } catch {
        process.kill(process.pid, signal);
      }
    }, delayMs);

    return {
      accepted: true,
      service: 'svc-beta',
      signal,
      delayMs,
      pid: process.pid,
      killTargetPid: 1,
    };
  }

  @Post('/work')
  async work(@Body() body: WorkDto) {
    const timeoutMs = body.clientTimeoutMs ?? 2000;
    const config = this.chaosStore.get();
    const outcome = evaluateChaos(config, timeoutMs);

    if (outcome.simulatedLatencyMs > 0) {
      await wait(outcome.simulatedLatencyMs);
    }

    if (outcome.shouldTimeout) {
      await wait(timeoutMs + 1500);
    }

    if (outcome.shouldFail) {
      throw new HttpException(
        {
          ok: false,
          service: 'svc-beta',
          error: outcome.errorMessage ?? 'forced failure',
        },
        outcome.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const payloadBytes = body.payloadSize ?? 0;
    const echo = payloadBytes > 0 ? 'x'.repeat(Math.min(payloadBytes, 2048)) : body.data ?? null;

    return {
      ok: true,
      service: 'svc-beta',
      echo,
      durationSimulatedMs: outcome.simulatedLatencyMs,
    };
  }
}
