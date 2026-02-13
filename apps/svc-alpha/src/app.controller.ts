import {
  Inject,
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  callJson,
  evaluateChaos,
  getCorrelationFromHeaders,
  wait,
} from '@restlab/shared';
import { ChaosStore } from './chaos.store';
import { ChaosConfigDto, TerminateDto, WorkDto } from './dto';

@Controller()
export class AppController {
  constructor(@Inject(ChaosStore) private readonly chaosStore: ChaosStore) {}

  @Get('/health')
  health() {
    return { status: 'ok', service: 'svc-alpha', time: new Date().toISOString() };
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
      service: 'svc-alpha',
      signal,
      delayMs,
      pid: process.pid,
      killTargetPid: 1,
    };
  }

  @Post('/work')
  async work(@Req() req: { headers: Record<string, string | string[] | undefined> }, @Body() body: WorkDto) {
    const timeoutMs = body.clientTimeoutMs ?? 2000;
    const config = this.chaosStore.get();
    const outcome = evaluateChaos(config, timeoutMs);
    const correlation = getCorrelationFromHeaders(req.headers);
    const workflow = body.workflow ?? 'chain';
    const downstreamTimeoutMs = getDownstreamTimeoutMs(timeoutMs, workflow);

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
          service: 'svc-alpha',
          error: outcome.errorMessage ?? 'forced failure',
        },
        outcome.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const downstream: Record<string, unknown>[] = [];

    if (workflow === 'chain') {
      const beta = await callJson({
        url: `${process.env.SVC_BETA_URL ?? 'http://svc-beta:3012'}/work`,
        timeoutMs: downstreamTimeoutMs,
        body: { ...body, workflow },
        correlation,
      });
      downstream.push({ service: 'svc-beta', result: beta });
      const gamma = await callJson({
        url: `${process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013'}/work`,
        timeoutMs: downstreamTimeoutMs,
        body: { ...body, workflow },
        correlation,
        parentCallId: beta.callId,
      });
      downstream.push({ service: 'svc-gamma', result: gamma });
    }

    if (workflow === 'fanout' || workflow === 'fanout-fanin') {
      const [beta, gamma] = await Promise.all([
        callJson({
          url: `${process.env.SVC_BETA_URL ?? 'http://svc-beta:3012'}/work`,
          timeoutMs: downstreamTimeoutMs,
          body,
          correlation,
        }),
        callJson({
          url: `${process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013'}/work`,
          timeoutMs: downstreamTimeoutMs,
          body,
          correlation,
        }),
      ]);
      downstream.push({ service: 'svc-beta', result: beta });
      downstream.push({ service: 'svc-gamma', result: gamma });

      if (workflow === 'fanout-fanin') {
        const betaJoin = await callJson({
          url: `${process.env.SVC_BETA_URL ?? 'http://svc-beta:3012'}/work`,
          timeoutMs: downstreamTimeoutMs,
          body: { data: { join: true } },
          correlation,
        });
        downstream.push({ service: 'svc-beta-join', result: betaJoin });
      }
    }

    if (workflow === 'random') {
      const picks = [
        `${process.env.SVC_BETA_URL ?? 'http://svc-beta:3012'}/work`,
        `${process.env.SVC_GAMMA_URL ?? 'http://svc-gamma:3013'}/work`,
      ];
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i += 1) {
        const target = picks[Math.floor(Math.random() * picks.length)];
        const res = await callJson({
          url: target,
          timeoutMs: downstreamTimeoutMs,
          body,
          correlation,
        });
        downstream.push({ target, result: res });
      }
    }

    return {
      ok: true,
      service: 'svc-alpha',
      echo: body.data ?? null,
      durationSimulatedMs: outcome.simulatedLatencyMs,
      downstream,
    };
  }
}

function getDownstreamTimeoutMs(
  timeoutMs: number,
  workflow: 'chain' | 'fanout' | 'fanout-fanin' | 'random',
): number {
  const maxHops = workflow === 'fanout-fanin' ? 3 : workflow === 'random' ? 3 : workflow === 'chain' ? 2 : 2;
  const budget = Math.floor((timeoutMs - 200) / maxHops);
  return Math.max(150, budget);
}
