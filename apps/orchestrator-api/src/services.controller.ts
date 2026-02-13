import { BadRequestException, Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ChaosConfigUpdateDto, TerminateServiceDto } from './dto';
import { RunsService } from './runs.service';

@Controller('/services')
export class ServicesController {
  constructor(@Inject(RunsService) private readonly runsService: RunsService) {}

  @Get()
  async getServices() {
    return this.runsService.getServices();
  }

  @Get('/kill-targets')
  async getKillTargets() {
    return this.runsService.getKillTargets();
  }

  @Post('/:name/chaos')
  async setChaos(@Param('name') name: string, @Body() body: ChaosConfigUpdateDto) {
    const result = await this.runsService.updateChaos(name, body as unknown as Record<string, unknown>);
    if (!result.ok) {
      throw new BadRequestException({
        service: name,
        errorType: result.errorType,
        message: result.errorMessage,
      });
    }
    return result.data;
  }

  @Post('/:name/chaos/reset')
  async resetChaos(@Param('name') name: string) {
    const result = await this.runsService.resetChaos(name);
    if (!result.ok) {
      throw new BadRequestException({
        service: name,
        errorType: result.errorType,
        message: result.errorMessage,
      });
    }
    return result.data;
  }

  @Post('/:name/terminate')
  async terminate(@Param('name') name: string, @Body() body: TerminateServiceDto) {
    const result = await this.runsService.terminateService(
      name,
      body.signal ?? 'SIGTERM',
      body.delayMs ?? 250,
    );

    if (!result.ok) {
      throw new BadRequestException({
        service: name,
        errorType: result.errorType,
        message: result.errorMessage,
      });
    }

    return result.data;
  }
}
