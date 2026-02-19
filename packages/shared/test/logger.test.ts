import { describe, expect, it, vi } from 'vitest';
import { logError, logInfo, logWarn } from '../src/logger';

describe('shared logger', () => {
  it('emits info logs as JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logInfo({ service: 'svc-alpha', msg: 'hello' });
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe('info');
    expect(payload.service).toBe('svc-alpha');
    expect(payload.msg).toBe('hello');
    expect(payload.timestamp).toBeTruthy();
    spy.mockRestore();
  });

  it('emits warn and error levels', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logWarn({ service: 'svc-alpha', msg: 'warn' });
    logError({ service: 'svc-alpha', msg: 'err' });
    const warn = JSON.parse(spy.mock.calls[0][0] as string);
    const error = JSON.parse(spy.mock.calls[1][0] as string);
    expect(warn.level).toBe('warn');
    expect(error.level).toBe('error');
    spy.mockRestore();
  });
});
