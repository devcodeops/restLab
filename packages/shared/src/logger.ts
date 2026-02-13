import { LogFields } from './types';

function emit(level: 'info' | 'warn' | 'error', fields: LogFields): void {
  const payload: LogFields = {
    timestamp: new Date().toISOString(),
    level,
    ...fields,
  };

  console.log(JSON.stringify(payload));
}

export function logInfo(fields: LogFields): void {
  emit('info', fields);
}

export function logWarn(fields: LogFields): void {
  emit('warn', fields);
}

export function logError(fields: LogFields): void {
  emit('error', fields);
}
