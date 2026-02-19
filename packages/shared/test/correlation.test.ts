import { describe, expect, it } from 'vitest';
import {
  CALL_ID_HEADER,
  PARENT_CALL_ID_HEADER,
  REQUEST_ID_HEADER,
  RUN_ID_HEADER,
  getCorrelationFromHeaders,
  toHttpHeaders,
} from '../src/correlation';

describe('correlation', () => {
  it('maps correlation object to http headers', () => {
    const headers = toHttpHeaders({
      requestId: 'req-1',
      runId: 'run-1',
      callId: 'call-1',
      parentCallId: 'parent-1',
    });

    expect(headers[REQUEST_ID_HEADER]).toBe('req-1');
    expect(headers[RUN_ID_HEADER]).toBe('run-1');
    expect(headers[CALL_ID_HEADER]).toBe('call-1');
    expect(headers[PARENT_CALL_ID_HEADER]).toBe('parent-1');
  });

  it('reads correlation from incoming header object', () => {
    const correlation = getCorrelationFromHeaders({
      [REQUEST_ID_HEADER]: 'req-2',
      [RUN_ID_HEADER]: 'run-2',
      [CALL_ID_HEADER]: 'call-2',
    });

    expect(correlation.requestId).toBe('req-2');
    expect(correlation.runId).toBe('run-2');
    expect(correlation.callId).toBe('call-2');
  });

  it('generates request id when missing', () => {
    const correlation = getCorrelationFromHeaders({});
    expect(correlation.requestId).toBeTruthy();
  });

  it('reads first value from array headers and supports Web Headers', () => {
    const correlationFromNode = getCorrelationFromHeaders({
      [REQUEST_ID_HEADER]: ['req-a', 'req-b'],
      [RUN_ID_HEADER]: 'run-a',
    });
    expect(correlationFromNode.requestId).toBe('req-a');
    expect(correlationFromNode.runId).toBe('run-a');

    const webHeaders = new Headers();
    webHeaders.set(REQUEST_ID_HEADER, 'req-web');
    webHeaders.set(CALL_ID_HEADER, 'call-web');
    const correlationFromWeb = getCorrelationFromHeaders(webHeaders);
    expect(correlationFromWeb.requestId).toBe('req-web');
    expect(correlationFromWeb.callId).toBe('call-web');
  });
});
