import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { getCorrelationFromHeaders, logInfo } from '@restlab/shared';

@Injectable()
export class JsonLoggingInterceptor implements NestInterceptor {
  constructor(private readonly service: string) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();
    const correlation = getCorrelationFromHeaders(req.headers);

    return next.handle().pipe(
      tap({
        next: () => {
          logInfo({
            service: this.service,
            requestId: correlation.requestId,
            runId: correlation.runId,
            callId: correlation.callId,
            parentCallId: correlation.parentCallId,
            route: req.url,
            method: req.method,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            msg: 'request completed',
          });
        },
        error: (error: Error) => {
          logInfo({
            service: this.service,
            requestId: correlation.requestId,
            runId: correlation.runId,
            callId: correlation.callId,
            parentCallId: correlation.parentCallId,
            route: req.url,
            method: req.method,
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            msg: 'request failed',
            errorType: 'http_error',
            errorMessage: error.message,
          });
        },
      }),
    );
  }
}
