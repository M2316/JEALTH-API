# Gemini API 연동 셋업 가이드

> Jealth의 **채팅 기반 운동 기록 기능** — NestJS(`jealth_api`)가 Google Gemini API를 직접 호출해 사용자 메시지를 구조화된 JSON으로 변환한다.
>
> **별도 추론 서버 PC 없음.** Nest 서버에서 HTTPS 직접 호출.

---

## 0. 아키텍처 한눈에

```
[Client(jealth-app)]
   │  POST /chat/workout  { message, history, date }
   ▼
[NestJS(jealth_api)]
   ├─ Exercise RAG (pg_trgm으로 후보 top-N 추림)
   ├─ Gemini API 호출 (responseSchema + Exercise enum 동적 주입)
   ├─ Zod 후검증
   └─ 응답: { reply, draft, confidence, candidates? }
   ▼
[Client] 채팅 버블 + 미리보기 카드 → 승인 시 기존 /routines POST 재사용
```

---

## 1. API 키 발급

1. https://aistudio.google.com 접속 → Google 계정 로그인
2. 좌측 **"Get API key"** 클릭
3. **"Create API key"** → 프로젝트 선택 (없으면 신규 GCP 프로젝트 자동 생성)
4. 발급된 키를 안전한 곳에 보관 (1회만 노출)

### 결제 활성화 (선택)
- 무료 티어로도 개발 가능 (분당 요청 제한, 일일 토큰 제한 있음)
- 운영 단계에서는 GCP 콘솔 → Billing 연결 → "Pay-as-you-go" 활성화 필요
- 결제 활성화 후 Rate Limit 대폭 상향됨

---

## 2. NestJS 의존성 / 환경변수

### 패키지 설치
```bash
cd jealth_api
npm install @google/genai
# (선택) zod 가 없다면
npm install zod
```

> `@google/generative-ai` 는 deprecated. 신규 통합 SDK인 **`@google/genai`** 사용.

### `.env.local` 추가
```bash
# Gemini API
GEMINI_API_KEY=AIzaSy...                # 발급받은 키
GEMINI_MODEL=gemini-2.5-flash           # 기본값. 정확도 더 필요하면 gemini-2.5-pro
GEMINI_TIMEOUT_MS=15000                 # 호출 타임아웃
GEMINI_MAX_OUTPUT_TOKENS=512            # 응답 상한 (비용 안전망)

# (선택) Exercise 후보 RAG top-K
EXERCISE_RAG_TOP_K=10
```

### `.env.local` 은 `.gitignore` 에 포함되어 있어야 함
```bash
grep -E "^\.env" jealth_api/.gitignore
# .env.local 이 포함되어 있는지 확인
```

---

## 3. 모델 선택 가이드

| 모델 | 응답속도 | 비용 | 한국어 | JSON 추출 정확도 | 권장 용도 |
|---|---|---|---|---|---|
| `gemini-2.5-flash` | 빠름 (1~2초) | 매우 저렴 | 우수 | 우수 | **기본값** |
| `gemini-2.5-pro` | 보통 (2~4초) | 약 10배 | 매우 우수 | 매우 우수 | 모호한 입력 많을 때 |
| `gemini-2.5-flash-lite` | 매우 빠름 | 가장 저렴 | 양호 | 양호 | 비용 극도로 민감할 때 |

> 출시 시점에 따라 `gemini-3-*` 등 신규 모델이 있을 수 있음. https://ai.google.dev/gemini-api/docs/models 에서 최신 확인 후 환경변수로만 교체.

**추천 시작점**: `gemini-2.5-flash` 로 시작 → 정확도 부족 시 `gemini-2.5-pro` 로 fallback 라우팅 도입.

---

## 4. Structured Output — `responseSchema`

Gemini는 OpenAPI Schema 기반의 **네이티브 구조화 출력**을 지원. Anthropic의 `tool_use` 와 동등한 신뢰도. 별도 GBNF/RAG 하네스 불필요.

### 운동 기록 스키마 정의 (NestJS 코드 예시)
```ts
// jealth_api/src/chat/schemas/workout-draft.schema.ts
import { Type } from '@google/genai';

export const buildWorkoutDraftSchema = (exerciseEnum: string[]) => ({
  type: Type.OBJECT,
  properties: {
    reply:      { type: Type.STRING, description: '사용자에게 보여줄 컨펌 메시지 (한국어)' },
    confidence: { type: Type.STRING, enum: ['high', 'low'] },
    draft: {
      type: Type.OBJECT,
      properties: {
        exercises: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              exerciseId: { type: Type.STRING, enum: exerciseEnum }, // RAG top-K 결과 동적 주입
              name:       { type: Type.STRING },
              sets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    round:      { type: Type.INTEGER },
                    reps:       { type: Type.INTEGER },
                    weight:     { type: Type.NUMBER },
                    weightUnit: { type: Type.STRING, enum: ['kg', 'lbs'] },
                  },
                  required: ['round', 'reps', 'weight', 'weightUnit'],
                  propertyOrdering: ['round', 'reps', 'weight', 'weightUnit'],
                },
              },
            },
            required: ['exerciseId', 'name', 'sets'],
          },
        },
      },
      required: ['exercises'],
    },
  },
  required: ['reply', 'confidence', 'draft'],
  propertyOrdering: ['reply', 'confidence', 'draft'],
});
```

> 💡 `propertyOrdering` 명시 권장 — Gemini가 응답 순서 일관성을 위해 사용.

### 호출 예시
```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL,
  contents: [
    { role: 'user', parts: [{ text: userMessage }] },
  ],
  config: {
    systemInstruction: SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    responseSchema: buildWorkoutDraftSchema(candidateIds),
    maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS),
    temperature: 0.2,
  },
});

const parsed = JSON.parse(response.text);  // 항상 유효 JSON 보장
const validated = WorkoutDraftZ.parse(parsed); // Zod 후검증
```

---

## 5. 테스트 — curl 한 방으로 검증

```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -d '{
    "systemInstruction": {
      "parts": [{ "text": "너는 운동 기록 어시스턴트다. 사용자의 운동 내용을 분석해 JSON 스키마에 맞춰 답하라." }]
    },
    "contents": [
      { "role": "user", "parts": [{ "text": "오늘 벤치프레스 4세트 했어. 10개 20kg, 10개 25kg, 8개 30kg, 6개 35kg" }] }
    ],
    "generationConfig": {
      "responseMimeType": "application/json",
      "temperature": 0.2,
      "maxOutputTokens": 512,
      "responseSchema": {
        "type": "OBJECT",
        "properties": {
          "reply":      { "type": "STRING" },
          "confidence": { "type": "STRING", "enum": ["high", "low"] },
          "draft": {
            "type": "OBJECT",
            "properties": {
              "exercises": {
                "type": "ARRAY",
                "items": {
                  "type": "OBJECT",
                  "properties": {
                    "name": { "type": "STRING" },
                    "sets": {
                      "type": "ARRAY",
                      "items": {
                        "type": "OBJECT",
                        "properties": {
                          "round":      { "type": "INTEGER" },
                          "reps":       { "type": "INTEGER" },
                          "weight":     { "type": "NUMBER" },
                          "weightUnit": { "type": "STRING", "enum": ["kg", "lbs"] }
                        },
                        "required": ["round", "reps", "weight", "weightUnit"]
                      }
                    }
                  },
                  "required": ["name", "sets"]
                }
              }
            },
            "required": ["exercises"]
          }
        },
        "required": ["reply", "confidence", "draft"]
      }
    }
  }'
```

응답의 `candidates[0].content.parts[0].text` 가 유효한 JSON 문자열이면 셋업 성공.

---

## 6. Context Caching — Exercise 목록 비용 최적화 (선택)

Exercise 2000개 ≈ 20~40K 토큰. 매 요청마다 system 컨텍스트로 보내면 비용 누적.

Gemini는 **Context Caching API** 로 반복 컨텍스트를 캐시 가능 (최소 토큰 수 충족 필요).

```ts
// 1회만 캐시 생성
const cache = await ai.caches.create({
  model: 'gemini-2.5-flash',
  config: {
    contents: [
      { role: 'user', parts: [{ text: `Exercise 목록:\n${exerciseListText}` }] },
    ],
    ttl: '3600s',
  },
});

// 이후 요청에 cachedContent 만 참조 — 캐시된 토큰은 75% 할인
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [...],
  config: {
    cachedContent: cache.name,
    responseSchema: ...,
  },
});
```

> ⚠️ 단순 RAG (top-K 후보만 enum으로 주입) 만 써도 충분히 저렴. **컨텍스트 캐싱은 운영 단계에서 비용 측정 후 도입**. 초기엔 RAG-only 권장.

---

## 7. 비용 / 쿼터 / 안전망

### 무료 티어 한계 (gemini-2.5-flash 기준 — 변동 가능)
- 분당 요청 수(RPM): 제한
- 일일 요청 수(RPD): 제한
- 월간 토큰: 제한

→ 개발/테스트는 충분, 베타 사용자 풀리면 유료 결제 활성화 권장. 최신 한도는 https://ai.google.dev/gemini-api/docs/rate-limits 에서 확인.

### NestJS 측 안전망 (반드시 구현)
- `maxOutputTokens` 환경변수로 응답 토큰 상한
- `GEMINI_TIMEOUT_MS` 로 호출 타임아웃 (axios/fetch AbortController)
- **유저별 분당 호출 제한** — Redis 또는 in-memory throttle (운영 단계)
- **에러 시 대체 응답**: "지금은 채팅 모드를 사용할 수 없어요, 잠시 후 다시 시도해주세요"

---

## 8. 에러 처리 매트릭스

| 상황 | 처리 |
|---|---|
| 401 (잘못된 API 키) | 서버 로그 alert, 클라엔 일반 에러. **키 즉시 회전** |
| 429 (Rate limit) | 1회 retry (지수 백오프), 그래도 실패 시 폴리시 응답 |
| 5xx (Gemini 서버 장애) | 1회 retry, 실패 시 폴리시 응답 |
| 네트워크 타임아웃 | retry 없이 즉시 폴리시 응답 |
| Zod 검증 실패 | 1회 재요청 (스키마 재강조 system 메시지 추가). 2회 실패 시 "이해 못했어요" |
| Exercise enum 매칭 실패 | `confidence: 'low'` 응답 + 클라에서 후보 선택 UI 노출 |

---

## 9. 체크리스트 — 완료 판정

- [ ] Google AI Studio에서 API 키 발급
- [ ] `jealth_api/.env.local` 에 `GEMINI_API_KEY`, `GEMINI_MODEL` 추가
- [ ] `.env.local` 이 `.gitignore` 에 포함되어 있음을 재확인
- [ ] `npm install @google/genai` 완료
- [ ] 섹션 5의 curl 테스트로 유효 JSON 응답 수신
- [ ] NestJS에서 동일한 호출 성공 (단위 테스트 1개라도 작성)
- [ ] 타임아웃·`maxOutputTokens`·에러 핸들링 구현
- [ ] 운영 배포 전: 결제 활성화 + 유저별 throttle 도입

위 항목 모두 체크되면 채팅 엔드포인트(`POST /chat/workout`) 본격 구현으로 진입.

## 신규 운동 근육 그룹 추론

신규 운동(후보에 없는 운동) 의 근육 그룹·장비 추론은 Flash 응답 스키마의
`suggestedMuscleGroupIds` / `suggestedEquipment` 필드로 통합되어 단일 호출에서 함께
반환된다. (이전 버전에서는 `gemini-3-pro-preview` 별도 호출을 썼지만, 호출 수와 지연을
줄이기 위해 Flash 단일 호출로 통합했다.)
