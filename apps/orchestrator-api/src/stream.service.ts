import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class StreamService {
  private subjects = new Map<string, Subject<MessageEvent>>();
  private globalSubject = new Subject<MessageEvent>();

  getRunStream(runId: string): Observable<MessageEvent> {
    if (!this.subjects.has(runId)) {
      this.subjects.set(runId, new Subject<MessageEvent>());
    }
    return this.subjects.get(runId)!.asObservable();
  }

  emit(runId: string, payload: unknown): void {
    if (!this.subjects.has(runId)) {
      this.subjects.set(runId, new Subject<MessageEvent>());
    }
    this.subjects.get(runId)!.next({ data: JSON.stringify(payload) });
  }

  complete(runId: string): void {
    const subject = this.subjects.get(runId);
    if (!subject) return;
    subject.complete();
    this.subjects.delete(runId);
  }

  getGlobalRunsStream(): Observable<MessageEvent> {
    return this.globalSubject.asObservable();
  }

  emitGlobal(payload: unknown): void {
    this.globalSubject.next({ data: JSON.stringify(payload) });
  }
}
