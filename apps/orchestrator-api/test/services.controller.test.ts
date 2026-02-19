import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/runs.service', () => ({
  RunsService: class RunsService {},
}));

import { ServicesController } from '../src/services.controller';

describe('ServicesController', () => {
  it('returns services and kill targets', async () => {
    const runsService = {
      getServices: vi.fn().mockResolvedValue({ services: [] }),
      getKillTargets: vi.fn().mockResolvedValue({ items: [] }),
      updateChaos: vi.fn(),
      resetChaos: vi.fn(),
      terminateService: vi.fn(),
    };

    const controller = new ServicesController(runsService as never);
    await expect(controller.getServices()).resolves.toEqual({ services: [] });
    await expect(controller.getKillTargets()).resolves.toEqual({ items: [] });
  });

  it('throws BadRequestException when chaos update/reset/terminate fail', async () => {
    const runsService = {
      getServices: vi.fn(),
      getKillTargets: vi.fn(),
      updateChaos: vi.fn().mockResolvedValue({ ok: false, errorType: 'http_error', errorMessage: 'boom' }),
      resetChaos: vi.fn().mockResolvedValue({ ok: false, errorType: 'http_error', errorMessage: 'boom' }),
      terminateService: vi.fn().mockResolvedValue({ ok: false, errorType: 'http_error', errorMessage: 'boom' }),
    };

    const controller = new ServicesController(runsService as never);

    await expect(controller.setChaos('svc-alpha', { mode: 'normal' } as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.resetChaos('svc-alpha')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.terminate('svc-alpha', {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns payload when service operations succeed', async () => {
    const runsService = {
      getServices: vi.fn(),
      getKillTargets: vi.fn(),
      updateChaos: vi.fn().mockResolvedValue({ ok: true, data: { mode: 'normal' } }),
      resetChaos: vi.fn().mockResolvedValue({ ok: true, data: { mode: 'normal' } }),
      terminateService: vi.fn().mockResolvedValue({ ok: true, data: { accepted: true } }),
    };

    const controller = new ServicesController(runsService as never);
    await expect(controller.setChaos('svc-alpha', { mode: 'normal' } as never)).resolves.toEqual({ mode: 'normal' });
    await expect(controller.resetChaos('svc-alpha')).resolves.toEqual({ mode: 'normal' });
    await expect(controller.terminate('svc-alpha', { signal: 'SIGTERM', delayMs: 100 } as never)).resolves.toEqual({
      accepted: true,
    });
    expect(runsService.terminateService).toHaveBeenCalledWith('svc-alpha', 'SIGTERM', 100);
  });
});
