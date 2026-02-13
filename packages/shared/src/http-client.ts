import { randomUUID } from 'crypto';
import { CorrelationHeaders, HttpCallResult } from './types';
import { toHttpHeaders } from './correlation';

interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  timeoutMs: number;
  correlation: CorrelationHeaders;
  parentCallId?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callJson<T = unknown>(options: HttpRequestOptions): Promise<HttpCallResult<T> & { callId: string }> {
  const controller = new AbortController();
  const callId = randomUUID();
  const startedAt = Date.now();
  const abortTimeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const hardTimeoutMs = options.timeoutMs + 1000;
  let hardTimeoutHandle: NodeJS.Timeout | null = null;

  try {
    const fetchPromise = fetch(options.url, {
      method: options.method ?? 'POST',
      headers: {
        'content-type': 'application/json',
        ...toHttpHeaders({
          requestId: options.correlation.requestId,
          runId: options.correlation.runId,
          callId,
          parentCallId: options.parentCallId ?? options.correlation.callId,
        }),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const hardTimeoutPromise = new Promise<Response>((_, reject) => {
      hardTimeoutHandle = setTimeout(() => {
        controller.abort();
        reject(new Error('__hard_timeout__'));
      }, hardTimeoutMs);
    });

    const response = await Promise.race([fetchPromise, hardTimeoutPromise]);

    const durationMs = Date.now() - startedAt;
    let data: T | undefined;

    try {
      data = (await response.json()) as T;
    } catch {
      data = undefined;
    }

    if (!response.ok) {
      return {
        ok: false,
        callId,
        statusCode: response.status,
        durationMs,
        data,
        errorType: 'http_error',
        errorMessage: `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      callId,
      statusCode: response.status,
      durationMs,
      data,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    if (err instanceof Error && err.message === '__hard_timeout__') {
      return {
        ok: false,
        callId,
        durationMs,
        errorType: 'timeout',
        errorMessage: `hard timeout after ${hardTimeoutMs}ms`,
      };
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        ok: false,
        callId,
        durationMs,
        errorType: 'timeout',
        errorMessage: `timeout after ${options.timeoutMs}ms`,
      };
    }

    if (err instanceof Error && err.message.includes('fetch')) {
      return {
        ok: false,
        callId,
        durationMs,
        errorType: 'network',
        errorMessage: err.message,
      };
    }

    return {
      ok: false,
      callId,
      durationMs,
      errorType: 'unknown',
      errorMessage: err instanceof Error ? err.message : 'unknown error',
    };
  } finally {
    clearTimeout(abortTimeout);
    if (hardTimeoutHandle) {
      clearTimeout(hardTimeoutHandle);
    }
    await sleep(0);
  }
}
