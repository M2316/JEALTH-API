import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, defer, tap } from 'rxjs';
import type { Request, Response } from 'express';

type AuthedRequest = Request & { user?: { id?: string } };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const res = http.getResponse<Response>();
    const started = Date.now();

    const method = req.method;
    const url = req.originalUrl ?? req.url;
    const userPart = req.user?.id ? ` user=${req.user.id}` : '';

    return defer(() => next.handle()).pipe(
      tap({
        next: () => {
          const duration = Date.now() - started;
          this.logger.log(
            `${method} ${url} -> ${res.statusCode} ${duration}ms${userPart}`,
          );
        },
        error: (err: unknown) => {
          const duration = Date.now() - started;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `${method} ${url} -> ERROR ${duration}ms${userPart} :: ${msg}`,
          );
        },
      }),
    );
  }
}
