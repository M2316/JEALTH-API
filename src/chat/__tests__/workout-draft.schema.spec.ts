import {
  buildWorkoutDraftResponseSchema,
  WorkoutDraftZ,
} from '../schemas/workout-draft.schema';

describe('workout-draft schema', () => {
  describe('buildWorkoutDraftResponseSchema', () => {
    it('does not expose exerciseId field on items', () => {
      const schema = buildWorkoutDraftResponseSchema();
      const itemProps =
        schema.properties.draft.properties.exercises.items.properties;
      expect(itemProps).not.toHaveProperty('exerciseId');
      expect(itemProps).toHaveProperty('name');
      expect(itemProps).toHaveProperty('sets');
    });
    it('requires name, rawName, and sets on items', () => {
      const schema = buildWorkoutDraftResponseSchema();
      const required =
        schema.properties.draft.properties.exercises.items.required;
      expect([...required].sort()).toEqual(['name', 'rawName', 'sets'].sort());
    });
    it('items.required includes rawName', () => {
      const schema = buildWorkoutDraftResponseSchema();
      const required =
        schema.properties.draft.properties.exercises.items.required;
      expect(required).toContain('rawName');
    });
  });

  describe('WorkoutDraftZ', () => {
    it('parses a valid response without exerciseId', () => {
      const result = WorkoutDraftZ.parse({
        reply: '벤치프레스 4세트 맞나요?',
        confidence: 'high',
        draft: {
          exercises: [
            {
              name: '벤치프레스',
              rawName: '벤치프레스',
              sets: [{ round: 1, reps: 10, weight: 20, weightUnit: 'kg' }],
            },
          ],
        },
      });
      expect(result.draft.exercises).toHaveLength(1);
      expect(result.draft.exercises[0].name).toBe('벤치프레스');
    });

    it('rejects invalid weightUnit', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x', confidence: 'high',
          draft: {
            exercises: [{ name: 'x', rawName: 'x', sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'pounds' }] }],
          },
        }),
      ).toThrow();
    });

    it('rejects zero round', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x', confidence: 'high',
          draft: {
            exercises: [{ name: 'x', rawName: 'x', sets: [{ round: 0, reps: 1, weight: 1, weightUnit: 'kg' }] }],
          },
        }),
      ).toThrow();
    });

    it('rejects empty sets / empty exercises / empty name', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x', confidence: 'high',
          draft: { exercises: [{ name: 'x', rawName: 'x', sets: [] }] },
        }),
      ).toThrow();
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x', confidence: 'high', draft: { exercises: [] },
        }),
      ).toThrow();
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x', confidence: 'high',
          draft: {
            exercises: [{ name: '', rawName: 'x', sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }] }],
          },
        }),
      ).toThrow();
    });

    it('rejects missing rawName', () => {
      expect(() =>
        WorkoutDraftZ.parse({
          reply: 'x', confidence: 'high',
          draft: {
            exercises: [{ name: 'x', sets: [{ round: 1, reps: 1, weight: 1, weightUnit: 'kg' }] }],
          },
        }),
      ).toThrow();
    });

    it('accepts rawName differing from name', () => {
      const result = WorkoutDraftZ.parse({
        reply: 'x', confidence: 'high',
        draft: {
          exercises: [{
            name: '푸쉬업',
            rawName: '푸귀업',
            sets: [{ round: 1, reps: 10, weight: 0, weightUnit: 'kg' }],
          }],
        },
      });
      expect(result.draft.exercises[0].name).toBe('푸쉬업');
      expect(result.draft.exercises[0].rawName).toBe('푸귀업');
    });
  });
});
