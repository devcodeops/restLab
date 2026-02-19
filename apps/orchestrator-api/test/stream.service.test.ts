import { describe, expect, it } from 'vitest';
import { StreamService } from '../src/stream.service';

describe('StreamService', () => {
  it('emits run events and completes streams', () => {
    const svc = new StreamService();
    const events: string[] = [];
    let completed = false;

    svc.getRunStream('run-1').subscribe({
      next: (event) => events.push(String(event.data)),
      complete: () => {
        completed = true;
      },
    });

    svc.emit('run-1', { type: 'call_completed' });
    svc.complete('run-1');
    svc.complete('run-1');

    expect(events).toHaveLength(1);
    expect(events[0]).toContain('call_completed');
    expect(completed).toBe(true);
  });

  it('emits global events', () => {
    const svc = new StreamService();
    const events: string[] = [];
    svc.getGlobalRunsStream().subscribe((event) => events.push(String(event.data)));
    svc.emitGlobal({ type: 'run_created' });
    expect(events[0]).toContain('run_created');
  });
});

