import { describe, expect, it, vi } from 'vitest';
import { callJson } from '../src/http-client';

describe('callJson', () => {
  it('returns ok result for successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      }),
    );

    const result = await callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 1000,
      correlation: { requestId: 'req-1' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({ ok: true });
    }
  });

  it('normalizes non-2xx responses as http_error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ message: 'down' }),
      }),
    );

    const result = await callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 1000,
      correlation: { requestId: 'req-2' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorType).toBe('http_error');
      expect(result.statusCode).toBe(503);
    }
  });

  it('normalizes network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const result = await callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 1000,
      correlation: { requestId: 'req-3' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorType).toBe('network');
    }
  });

  it('handles ok responses with invalid json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('invalid json');
        },
      }),
    );

    const result = await callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 1000,
      correlation: { requestId: 'req-4' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  it('normalizes abort error as timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));

    const result = await callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 1000,
      correlation: { requestId: 'req-5' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorType).toBe('timeout');
    }
  });

  it('normalizes unknown errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));

    const result = await callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 1000,
      correlation: { requestId: 'req-6' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorType).toBe('unknown');
      expect(result.errorMessage).toContain('boom');
    }
  });

  it('normalizes hard timeout when fetch never settles', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const promise = callJson({
      url: 'http://svc/test',
      method: 'GET',
      timeoutMs: 10,
      correlation: { requestId: 'req-7' },
    });

    await vi.advanceTimersByTimeAsync(1100);
    const result = await promise;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorType).toBe('timeout');
      expect(result.errorMessage).toContain('hard timeout');
    }
    vi.useRealTimers();
  });
});
