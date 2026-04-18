import { Type } from '@google/genai';
import { z } from 'zod';

export const buildWorkoutDraftResponseSchema = () => ({
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
            required: ['name', 'sets'],
            propertyOrdering: ['name', 'sets'],
          },
        },
      },
      required: ['exercises'],
    },
  },
  required: ['reply', 'confidence', 'draft'],
  propertyOrdering: ['reply', 'confidence', 'draft'],
} as const);

const WorkoutSetZ = z.object({
  round: z.number().int().positive(),
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  weightUnit: z.enum(['kg', 'lbs']),
});

const WorkoutExerciseZ = z.object({
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
