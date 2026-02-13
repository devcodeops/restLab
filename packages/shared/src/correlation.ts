import { randomUUID } from 'crypto';
import { IncomingHttpHeaders } from 'http';
import { CorrelationHeaders } from './types';

export const REQUEST_ID_HEADER = 'x-request-id';
export const RUN_ID_HEADER = 'x-run-id';
export const CALL_ID_HEADER = 'x-call-id';
export const PARENT_CALL_ID_HEADER = 'x-parent-call-id';

function readHeader(headers: IncomingHttpHeaders | Headers, key: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }

  const value = headers[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function getCorrelationFromHeaders(headers: IncomingHttpHeaders | Headers): CorrelationHeaders {
  const requestId = readHeader(headers, REQUEST_ID_HEADER) ?? randomUUID();
  const runId = readHeader(headers, RUN_ID_HEADER);
  const callId = readHeader(headers, CALL_ID_HEADER);
  const parentCallId = readHeader(headers, PARENT_CALL_ID_HEADER);

  return { requestId, runId, callId, parentCallId };
}

export function toHttpHeaders(correlation: CorrelationHeaders): Record<string, string> {
  const headers: Record<string, string> = {
    [REQUEST_ID_HEADER]: correlation.requestId,
  };

  if (correlation.runId) headers[RUN_ID_HEADER] = correlation.runId;
  if (correlation.callId) headers[CALL_ID_HEADER] = correlation.callId;
  if (correlation.parentCallId) headers[PARENT_CALL_ID_HEADER] = correlation.parentCallId;

  return headers;
}
