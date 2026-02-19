import { describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, getSseUrl } from './api';

describe('web api client', () => {
  it('apiGet returns parsed json on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      }),
    );

    await expect(apiGet('/runs')).resolves.toEqual({ ok: true });
  });

  it('apiGet throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    await expect(apiGet('/runs')).rejects.toThrow('GET /runs failed (500)');
  });

  it('apiPost sends body and returns parsed json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ runId: 'run-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const payload = { workflow: 'chain' };
    await expect(apiPost('/runs', payload)).resolves.toEqual({ runId: 'run-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/runs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });

  it('apiPost throws server text when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'bad request',
      }),
    );

    await expect(apiPost('/runs', {})).rejects.toThrow('bad request');
  });

  it('apiPost falls back to status message when no text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => '',
      }),
    );

    await expect(apiPost('/runs', {})).rejects.toThrow('POST /runs failed (503)');
  });

  it('builds SSE URL from API base', () => {
    expect(getSseUrl('/runs/global/events')).toBe('/api/runs/global/events');
  });
});
