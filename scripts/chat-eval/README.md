# Chat eval harness

실제 Gemini API 를 호출해 `/chat/workout` 파이프라인 성공률·지연·실패 원인을 측정.

## 실행 전 준비

- `.env` 에 `GEMINI_API_KEY` 설정
- DB 접속 가능 상태 (pg_trgm 인덱스 설치됨)
- 테스트용 사용자 UUID 확보 (기존 user 아무나)

## 실행

```bash
EVAL_USER_ID=<uuid> \
EVAL_DATE=2026-04-21 \
npx ts-node --project scripts/chat-eval/tsconfig.json scripts/chat-eval/run-eval.ts

# 리포트
npx ts-node --project scripts/chat-eval/tsconfig.json scripts/chat-eval/report.ts \
  scripts/chat-eval/results/<timestamp>/results.json \
  scripts/chat-eval/results/<baseline-timestamp>/results.json
```

`results/` 는 `.gitignore` 에 포함되어 커밋되지 않는다.

## 예산

케이스 약 40개, 약 $0.05/회 (Flash 기준). 개선 전후 4회 실행해도 $5 미만.
