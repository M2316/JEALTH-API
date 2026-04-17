import { Logger } from '@nestjs/common';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function buildContext(
  overrides: Partial<{
    method: string;
    url: string;
    ip: string;
    userId: string | undefined;
    statusCode: number;
  }> = {},
): ExecutionContext {
  const {
    method = 'GET',
    url = '/routines',
    ip = '127.0.0.1',
    userId,
    statusCode = 200,
  } = overrides;

  const req: any = {
    method,
    originalUrl: url,
    url,
    ip,
    user: userId ? { id: userId } : undefined,
  };
  const res: any = { statusCode };

  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs method, url, status and duration on success', async () => {
    const ctx = buildContext({
      method: 'POST',
      url: '/routines',
      statusCode: 201,
    });
    const next: CallHandler = { handle: () => of({ id: '1' }) };

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain('POST /routines');
    expect(message).toContain('201');
    expect(message).toMatch(/\d+ms/);
  });

  it('includes user id when request is authenticated', async () => {
    const ctx = buildContext({
      method: 'PATCH',
      url: '/routines/abc',
      userId: 'user-42',
    });
    const next: CallHandler = { handle: () => of({}) };

    await lastValueFrom(interceptor.intercept(ctx, next));

    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain('user=user-42');
  });

  it('logs an error entry when the handler throws', async () => {
    const ctx = buildContext({ method: 'DELETE', url: '/routines/zzz' });
    const boom = new Error('boom');
    const next: CallHandler = {
      handle: () => {
        throw boom;
      },
    };

    await expect(lastValueFrom(interceptor.intercept(ctx, next))).rejects.toBe(
      boom,
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toContain('DELETE /routines/zzz');
    expect(message).toContain('boom');
  });
});
