import { Type } from '@google/genai';
import { z } from 'zod';

const EQUIPMENT_ENUM = ['바벨', '덤벨', '머신', '맨몸'] as const;

export const buildWorkoutDraftResponseSchema = (muscleGroupIds: string[]) => ({
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
              name: { type: Type.STRING, minLength: '1' },
              rawName: { type: Type.STRING, minLength: '1' },
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
            required: ['name', 'rawName', 'sets'],
            propertyOrdering: ['name', 'rawName', 'sets'],
          },
        },
      },
      required: ['exercises'],
    },
    suggestedMuscleGroupIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING, enum: muscleGroupIds },
    },
    suggestedEquipment: { type: Type.STRING, enum: [...EQUIPMENT_ENUM] },
  },
  required: ['reply', 'confidence', 'draft'],
  propertyOrdering: [
    'reply',
    'confidence',
    'draft',
    'suggestedMuscleGroupIds',
    'suggestedEquipment',
  ],
} as const);

const WorkoutSetZ = z.object({
  round: z.number().int().positive(),
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  weightUnit: z.enum(['kg', 'lbs']),
});

const WorkoutExerciseZ = z.object({
  name: z.string().min(1),
  rawName: z.string().min(1),
  sets: z.array(WorkoutSetZ).min(1),
});

// confidence='low' 인 경우 exercises 가 비어있어도 허용한다. ChatService 가
// low-confidence/empty 케이스를 별도 분기로 처리하므로, Zod 단계에서 빈 배열을
// 거부하면 "안녕" 같은 운동 외 입력이 503 으로 떨어지는 회귀가 생긴다.
export const WorkoutDraftZ = z
  .object({
    reply: z.string().min(1),
    confidence: z.enum(['high', 'low']),
    draft: z.object({
      exercises: z.array(WorkoutExerciseZ),
    }),
    suggestedMuscleGroupIds: z.array(z.string()).optional(),
    suggestedEquipment: z.enum(EQUIPMENT_ENUM).optional(),
  })
  .refine(
    (d) => d.confidence === 'low' || d.draft.exercises.length >= 1,
    { message: 'high confidence requires at least one exercise' },
  );

export type WorkoutDraft = z.infer<typeof WorkoutDraftZ>;
