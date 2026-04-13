# jealth_api (JEALTH-API repo)

NestJS 백엔드. 이 파일은 `jealth_api/` 내부 작업 시 자동 로드된다.

## 언어

사용자와의 소통은 한국어.

## 주요 명령어

```bash
npm install              # 의존성 설치
npm run start:dev        # 개발 서버 (watch)
npm run build            # 빌드
npm run lint             # ESLint (auto-fix)
npm run format           # Prettier
npm test                 # Jest 단위 테스트
npm run test:e2e         # E2E 테스트
```

## API 문서

서버 실행 후 `http://localhost:3000/docs` 에서 Swagger UI 확인. 앱 연동 시 반드시 Swagger 스키마 기준으로 작업.

## 아키텍처

- **DB**: PostgreSQL + TypeORM. `synchronize: true` (개발 전용 — 스키마 자동 동기화)
- **인증**: JWT (7일 만료) + Passport. `JwtAuthGuard` 보호. bcrypt 해싱
- **공개 엔드포인트**: `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`
- **보호 엔드포인트**: `/users`, `/exercises`, `/routines`, `/stats`
- **모듈**:
  - `AuthModule` — 로그인·회원가입·비밀번호 재설정
  - `UsersModule` — 사용자 CRUD
  - `WorkoutModule` — Exercise·Routine·Stats 통합
- **엔티티**: User → WorkoutRoutine(날짜별) → WorkoutExercise → WorkoutSet. Exercise ↔ MuscleGroup (다대다)
- **트랜잭션**: 루틴 생성/수정 시 QueryRunner 트랜잭션
- **파일 업로드**: 운동 이미지 → `./uploads/exercises/` (정적 서빙)
- **환경 변수**: `.env` — `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`
- **공통 인터셉터**: `src/common/interceptors/logging.interceptor.ts` — 모든 요청을 `[HTTP] METHOD URL -> STATUS DURATION` 로 기록

## 기술 스택

NestJS 11, TypeORM, PostgreSQL, Passport-JWT, class-validator, RxJS.

## Worktree 규칙

- 기능 작업은 **이 repo 내부** `.worktrees/<feature-name>/` 에서 진행 (루트 `jealth/`에 생성 금지).
- 기준 브랜치는 `stage` 우선, 없으면 `main`.
- 생성 예: `git worktree add .worktrees/<name> -b <name> stage`

## 개발 서버

- 포트 충돌 확인 후 빈 포트로 실행.
- `cmd /c "start ..."` 패턴 사용 금지.

## 참고 문서

- `docs/superpowers/plans/` — API 관련 구현 계획서
- Swagger UI: `http://localhost:3000/docs`
