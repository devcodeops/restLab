import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/runs.service', () => ({
  RunsService: class RunsService {},
}));

import { RunsController } from '../src/runs.controller';

describe('RunsController', () => {
  it('maps endpoints to service calls and normalizes pagination', async () => {
    const runsService = {
      createRun: vi.fn().mockResolvedValue({ runId: 'r1' }),
      listRuns: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
      clearRuns: vi.fn().mockResolvedValue({ ok: true }),
      getRun: vi.fn().mockResolvedValue({ run: { id: 'r1' }, calls: [], callGraph: [] }),
    };
    const streamService = {
      getGlobalRunsStream: vi.fn().mockReturnValue({}),
      getRunStream: vi.fn().mockReturnValue({}),
    };

    const controller = new RunsController(runsService as never, streamService as never);
    await expect(controller.createRun({ workflow: 'chain' } as never)).resolves.toEqual({ runId: 'r1' });
    await controller.listRuns({ page: 'x', pageSize: '20' } as never);
    await controller.listRuns({ page: '3', pageSize: '15' } as never);
    await controller.clearRuns();
    await controller.getRun('r1');
    controller.globalEvents();
    controller.events('r1');

    expect(runsService.listRuns).toHaveBeenNthCalledWith(1, 1, 20);
    expect(runsService.listRuns).toHaveBeenNthCalledWith(2, 3, 15);
    expect(streamService.getGlobalRunsStream).toHaveBeenCalled();
    expect(streamService.getRunStream).toHaveBeenCalledWith('r1');
    expect(controller.metrics().status).toBe('ok');
    expect(controller.health().service).toBe('orchestrator-api');
  });
});
