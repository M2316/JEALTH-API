import { Type } from '@google/genai';
import { z } from 'zod';

export const buildWorkoutDraftResponseSchema = (candidateIds: string[]) => {
  const enumValues = candidateIds.length > 0 ? candidateIds : ['__none__'];
  return {
    type: Type.OBJECT,
    properties: {
      reply: {
        type: Type.STRING,
        description: '사용자에게 보여줄 컨펌 메시지(한국어)',
      },
      confidence: { type: Type.STRING, enum: ['high', 'low'] },
      draft: {
        type: Type.OBJECT,
        properties: {
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                exerciseId: { type: Type.STRING, enum: enumValues },
                name: { type: Type.STRING },
                sets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      round: { type: Type.INTEGER },
                      reps: { type: Type.INTEGER },
                      weight: { type: Type.NUMBER },
                      weightUnit: { type: Type.STRING, enum: ['kg', 'lbs'] },
                    },
                    required: ['round', 'reps', 'weight', 'weightUnit'],
                    propertyOrdering: [
                      'round',
                      'reps',
                      'weight',
                      'weightUnit',
                    ],
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
  sets: z.array(WorkoutSetZ),
});

export const WorkoutDraftZ = z.object({
  reply: z.string(),
  confidence: z.enum(['high', 'low']),
  draft: z.object({
    exercises: z.array(WorkoutExerciseZ),
  }),
});

export type WorkoutDraft = z.infer<typeof WorkoutDraftZ>;
