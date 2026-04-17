import {
  buildWorkoutDraftResponseSchema,
  WorkoutDraftZ,
} from '../schemas/workout-draft.schema';

describe('workout-draft schema', () => {
  describe('buildWorkoutDraftResponseSchema', () => {
    it('injects exerciseId enum from candidate ids', () => {
      const schema = buildWorkoutDraftResponseSchema(['id-a', 'id-b']);
      const exerciseIdProp =
        schema.properties.draft.properties.exercises.items.properties
          .exerciseId;
      expect(exerciseIdProp.enum).toEqual(['id-a', 'id-b']);
    });

    it('uses sentinel id when candidates empty', () => {
      const schema = buildWorkoutDraftResponseSchema([]);
      const exerciseIdProp =
        schema.properties.draft.properties.exercises.items.properties
          .exerciseId;
      expect(exerciseIdProp.enum).toEqual(['__none__']);
    });
  });

  describe('WorkoutDraftZ', () => {
    it('parses a valid response', () => {
      const result = WorkoutDraftZ.parse({
        reply: '벤치프레스 4세트 맞나요?',
        confidence: 'high',
        draft: {
          exercises: [
            {
              exerciseId: 'id-a',
              name: '벤치프레스',
              sets: [{ round: 1, reps: 10, weight: 20, weightUnit: 'kg' }],
            },
          ],
        },
      });
      expect(result.draft.exercises).toHaveLength(1);
    });

    it('rejects invalid weightUnit', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x',
          confidence: 'high',
          draft: {
            exercises: [
              {
                exerciseId: 'id-a',
                name: 'x',
                sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'pounds' }],
              },
            ],
          },
        }),
      ).toThrow();
    });

    it('rejects zero round', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x',
          confidence: 'high',
          draft: {
            exercises: [
              {
                exerciseId: 'id-a',
                name: 'x',
                sets: [{ round: 0, reps: 1, weight: 1, weightUnit: 'kg' }],
              },
            ],
          },
        }),
      ).toThrow();
    });

    it('rejects negative weight', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x',
          confidence: 'high',
          draft: {
            exercises: [
              {
                exerciseId: 'id-a',
                name: 'x',
                sets: [{ round: 1, reps: 1, weight: -1, weightUnit: 'kg' }],
              },
            ],
          },
        }),
      ).toThrow();
    });

    it('rejects empty sets array', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x',
          confidence: 'high',
          draft: {
            exercises: [{ exerciseId: 'id-a', name: 'x', sets: [] }],
          },
        }),
      ).toThrow();
    });

    it('rejects empty exercises array', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x',
          confidence: 'high',
          draft: { exercises: [] },
        }),
      ).toThrow();
    });

    it('rejects empty exerciseId / name', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x',
          confidence: 'high',
          draft: {
            exercises: [
              {
                exerciseId: '',
                name: 'x',
                sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }],
              },
            ],
          },
        }),
      ).toThrow();
    });
  });
});
