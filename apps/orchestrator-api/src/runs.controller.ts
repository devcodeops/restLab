import {
  Inject,
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CreateRunDto, PaginationDto } from './dto';
import { RunsService } from './runs.service';
import { StreamService } from './stream.service';

@Controller()
export class RunsController {
  constructor(
    @Inject(RunsService) private readonly runsService: RunsService,
    @Inject(StreamService) private readonly streamService: StreamService,
  ) {}

  @Post('/runs')
  async createRun(@Body() body: CreateRunDto) {
    return this.runsService.createRun(body);
  }

  @Get('/runs')
  async listRuns(@Query() query: PaginationDto) {
    return this.runsService.listRuns(
      toPositiveInt(query.page, 1),
      toPositiveInt(query.pageSize, 20),
    );
  }

  @Post('/runs/clear')
  async clearRuns() {
    return this.runsService.clearRuns();
  }

  @Sse('/runs/global/events')
  globalEvents(): Observable<MessageEvent> {
    return this.streamService.getGlobalRunsStream();
  }

  @Get('/runs/:runId')
  async getRun(@Param('runId') runId: string) {
    return this.runsService.getRun(runId);
  }

  @Sse('/runs/:runId/events')
  events(@Param('runId') runId: string): Observable<MessageEvent> {
    return this.streamService.getRunStream(runId);
  }

  @Get('/metrics')
  metrics() {
    return { status: 'ok', note: 'add Prometheus exporter later' };
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'orchestrator-api', time: new Date().toISOString() };
  }
}

function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}
