# API 전역 HTTP 로깅 인터셉터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NestJS 백엔드에 모든 API 호출을 기록하는 전역 로깅 인터셉터를 추가한다.

**Architecture:** 각 컨트롤러에 중복 코드를 넣는 대신, NestJS 글로벌 `LoggingInterceptor` 로 모든 요청에 대해 `METHOD /path -> status (duration ms)` 형식의 Nest `Logger` 출력을 통일 적용한다. TDD로 테스트 먼저 작성 후 구현.

**Tech Stack:** NestJS 11, Jest, RxJS.

---

## 파일 구조

**신규:**
- `jealth_api/src/common/interceptors/logging.interceptor.ts` — 전역 요청/응답 로깅 인터셉터
- `jealth_api/src/common/interceptors/logging.interceptor.spec.ts` — 유닛 테스트

**수정:**
- `jealth_api/src/main.ts` — `LoggingInterceptor` 전역 등록

---

## Task 1: LoggingInterceptor 실패 테스트 작성

**Files:**
- Create: `jealth_api/src/common/interceptors/logging.interceptor.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`jealth_api/src/common/interceptors/logging.interceptor.spec.ts` 에 다음 내용으로 파일을 생성한다.

```typescript
import { Logger } from '@nestjs/common';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function buildContext(overrides: Partial<{
  method: string;
  url: string;
  ip: string;
  userId: string | undefined;
  statusCode: number;
}> = {}): ExecutionContext {
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
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs method, url, status and duration on success', async () => {
    const ctx = buildContext({ method: 'POST', url: '/routines', statusCode: 201 });
    const next: CallHandler = { handle: () => of({ id: '1' }) };

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(logSpy).toHaveBeenCalledTimes(1);
    const message = logSpy.mock.calls[0][0] as string;
    expect(message).toContain('POST /routines');
    expect(message).toContain('201');
    expect(message).toMatch(/\d+ms/);
  });

  it('includes user id when request is authenticated', async () => {
    const ctx = buildContext({ method: 'PATCH', url: '/routines/abc', userId: 'user-42' });
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

    await expect(
      lastValueFrom(interceptor.intercept(ctx, next)),
    ).rejects.toBe(boom);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toContain('DELETE /routines/zzz');
    expect(message).toContain('boom');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd jealth_api && npm test -- logging.interceptor.spec`
Expected: FAIL — `Cannot find module './logging.interceptor'` (아직 구현 없음)

---

## Task 2: LoggingInterceptor 구현

**Files:**
- Create: `jealth_api/src/common/interceptors/logging.interceptor.ts`

- [ ] **Step 1: 최소 구현 작성**

`jealth_api/src/common/interceptors/logging.interceptor.ts` 파일을 다음 내용으로 생성한다.

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
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

    return next.handle().pipe(
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
```

- [ ] **Step 2: 테스트 통과 확인**

Run: `cd jealth_api && npm test -- logging.interceptor.spec`
Expected: PASS — 3개 테스트 모두 통과

- [ ] **Step 3: 커밋**

```bash
git add src/common/interceptors/logging.interceptor.ts src/common/interceptors/logging.interceptor.spec.ts
git commit -m "feat(api): add global HTTP logging interceptor"
```

---

## Task 3: 전역 인터셉터 등록

**Files:**
- Modify: `jealth_api/src/main.ts`

- [ ] **Step 1: `main.ts` 에 인터셉터 등록**

`jealth_api/src/main.ts:15` 근처의 `useGlobalInterceptors` 호출을 수정한다. 기존:

```typescript
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
```

다음으로 교체한다:

```typescript
app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new ClassSerializerInterceptor(app.get(Reflector)),
);
```

그리고 파일 상단 import 블록에 다음 한 줄을 추가한다(기존 import 아래에 위치):

```typescript
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
```

**주의:** 인터셉터는 배열 순서대로 실행되므로 `LoggingInterceptor` 를 `ClassSerializerInterceptor` 앞에 두어 직렬화 이후의 최종 응답 상태를 관측하도록 한다.

- [ ] **Step 2: 빌드 검증**

Run: `cd jealth_api && npm run build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 3: 서버 기동으로 로그 확인**

Run: `cd jealth_api && npm run start:dev`
로컬에서 `curl -i http://localhost:3000/` 또는 Swagger UI(`http://localhost:3000/docs`)에서 아무 엔드포인트 호출.
Expected: 콘솔에 `[HTTP] GET / -> 200 3ms` 형식의 로그 출력 확인 후 `Ctrl+C` 종료.

- [ ] **Step 4: 커밋**

```bash
git add src/main.ts
git commit -m "feat(api): register LoggingInterceptor globally"
```

---

## Task 4: 통합 점검

- [ ] **Step 1: 전체 유닛 테스트 실행**

Run: `cd jealth_api && npm test`
Expected: 전부 통과 (기존 테스트 + 새 `LoggingInterceptor` 테스트)

- [ ] **Step 2: 프론트 end-to-end 로그 확인 (연동 검증)**

백엔드를 `npm run start:dev` 로 띄운 상태에서 프론트 앱(`jealth-app`)을 실행하여 로그인 → 운동 추가 → 세트 값 변경 시나리오를 수행한다.

Expected: 백엔드 콘솔에 아래와 유사한 순서로 로그가 찍힌다.
```
[HTTP] POST /auth/login -> 200 42ms
[HTTP] GET /routines?date=2026-04-13 -> 200 11ms user=<id>
[HTTP] POST /routines -> 201 27ms user=<id>
[HTTP] PATCH /routines/<rid> -> 200 14ms user=<id>
```

- [ ] **Step 3: 병합 전 최종 확인**

본 플랜은 여기서 종료. 이후 병합/PR 절차는 `superpowers:finishing-a-development-branch` 스킬을 사용한다.

---

## Self-Review 결과

- **Spec coverage:** "각 API 호출 로그 찍는 로직 추가" → Task 1–3 에서 전역 `LoggingInterceptor` 로 커버. DRY 원칙에 따라 전역 인터셉터 한 곳에서 모든 라우트를 관측.
- **Placeholder scan:** TBD/TODO/"적절히 처리" 없음. 모든 코드 블록 완결.
- **Type consistency:** `AuthedRequest` 의 `req.user.id` 필드는 기존 `JwtStrategy.validate` 의 반환값이 사용자 엔티티임을 전제로 한다.
