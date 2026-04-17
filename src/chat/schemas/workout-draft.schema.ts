import { Type } from '@google/genai';
import { z } from 'zod';

/**
 * Gemini responseSchema 빌더.
 *
 * @param candidateIds - RAG 결과 Exercise id 목록
 *
 * 주의: candidateIds 가 빈 배열이면 `exerciseId.enum` 에 sentinel `'__none__'` 이 주입된다.
 * 이는 Gemini 가 어떤 값이라도 반환해야 스키마 검증을 통과할 수 있도록 하기 위한 안전장치.
 *
 * **호출 측 책임 (예: ChatService):** 응답에서 `exerciseId === '__none__'` 인 항목은 반드시
 * 필터링하고, 그 결과 `exercises` 가 비면 `confidence: 'low'` 로 처리해야 한다.
 * 이 sentinel 이 그대로 저장 단계로 흘러가면 무효한 운동 기록이 DB 에 들어간다.
 */
export const WORKOUT_SENTINEL_ID = '__none__';

export const buildWorkoutDraftResponseSchema = (candidateIds: string[]) => {
  const enumValues =
    candidateIds.length > 0 ? candidateIds : [WORKOUT_SENTINEL_ID];
  return {
    type: Type.OBJECT,
    properties: {
      reply: {
        type: Type.STRING,
        description: '사용자에게 보여줄 컨펌 메시지(한국어)',
        minLength: '1',
      },
      confidence: { type: Type.STRING, enum: ['high', 'low'] },
      draft: {
        type: Type.OBJECT,
        properties: {
          exercises: {
            type: Type.ARRAY,
            minItems: '1',
            items: {
              type: Type.OBJECT,
              properties: {
                exerciseId: {
                  type: Type.STRING,
                  enum: enumValues,
                  minLength: '1',
                },
                name: { type: Type.STRING, minLength: '1' },
                sets: {
                  type: Type.ARRAY,
                  minItems: '1',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      round: { type: Type.INTEGER, minimum: 1 },
                      reps: { type: Type.INTEGER, minimum: 0 },
                      weight: { type: Type.NUMBER, minimum: 0 },
                      weightUnit: { type: Type.STRING, enum: ['kg', 'lbs'] },
                    },
                    required: ['round', 'reps', 'weight', 'weightUnit'],
                    propertyOrdering: ['round', 'reps', 'weight', 'weightUnit'],
                  },
                },
              },
              required: ['exerciseId', 'name', 'sets'],
              propertyOrdering: ['exerciseId', 'name', 'sets'],
            },
          },
        },
        required: ['exercises'],
      },
    },
    required: ['reply', 'confidence', 'draft'],
    propertyOrdering: ['reply', 'confidence', 'draft'],
  } as const;
};

const WorkoutSetZ = z.object({
  round: z.number().int().positive(),
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  weightUnit: z.enum(['kg', 'lbs']),
});

const WorkoutExerciseZ = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  sets: z.array(WorkoutSetZ).min(1),
});

export const WorkoutDraftZ = z.object({
  reply: z.string().min(1),
  confidence: z.enum(['high', 'low']),
  draft: z.object({
    exercises: z.array(WorkoutExerciseZ).min(1),
  }),
});

export type WorkoutDraft = z.infer<typeof WorkoutDraftZ>;
