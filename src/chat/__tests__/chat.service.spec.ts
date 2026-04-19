import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChatService } from '../chat.service';
import { ExerciseRagService } from '../services/exercise-rag.service';
import { GeminiService } from '../services/gemini.service';
import { ExerciseNameResolverService } from '../services/exercise-name-resolver.service';
import { MuscleGroupInferenceService } from '../services/muscle-group-inference.service';
import { WorkoutContextService } from '../services/workout-context.service';
import { ExerciseService } from '../../workout/exercise.service';
import { RoutineService } from '../../workout/routine.service';

describe('ChatService', () => {
  let service: ChatService;
  let rag: { findCandidateNames: jest.Mock };
  let gemini: { generateJson: jest.Mock };
  let resolver: { resolveName: jest.Mock };
  let muscleInfer: { inferMuscleGroups: jest.Mock };
  let workoutCtx: { getLastApprovedExerciseName: jest.Mock };
  let exerciseSvc: { findAllMuscleGroups: jest.Mock };

  beforeEach(async () => {
    rag = { findCandidateNames: jest.fn().mockResolvedValue([]) };
    gemini = { generateJson: jest.fn() };
    resolver = { resolveName: jest.fn() };
    muscleInfer = { inferMuscleGroups: jest.fn() };
    workoutCtx = {
      getLastApprovedExerciseName: jest.fn().mockResolvedValue(null),
    };
    exerciseSvc = { findAllMuscleGroups: jest.fn().mockResolvedValue([]) };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ExerciseRagService, useValue: rag },
        { provide: GeminiService, useValue: gemini },
        { provide: ExerciseNameResolverService, useValue: resolver },
        { provide: MuscleGroupInferenceService, useValue: muscleInfer },
        { provide: WorkoutContextService, useValue: workoutCtx },
        { provide: ExerciseService, useValue: exerciseSvc },
        { provide: RoutineService, useValue: { appendExerciseWithSetsTx: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  const flashJson = (name: string, replyOverride = '맞나요?') =>
    JSON.stringify({
      reply: replyOverride,
      confidence: 'high',
      draft: {
        exercises: [
          {
            name,
            sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }],
          },
        ],
      },
    });

  const req = (text = '스쿼트 100kg 10개') => ({
    date: '2026-04-19',
    messages: [{ role: 'user' as const, content: text }],
  });

  it('existing branch: fills exerciseId and returns kind=existing', async () => {
    gemini.generateJson.mockResolvedValueOnce(flashJson('스쿼트'));
    resolver.resolveName.mockResolvedValueOnce({
      kind: 'existing', id: 'ex-1', name: '스쿼트',
    });
    const r = await service.processMessage(req(), 'user-1');
    expect(r.kind).toBe('existing');
    expect(r.parseSuccess).toBe(true);
    expect(r.draft.exercises[0].exerciseId).toBe('ex-1');
    expect(r.draft.exercises[0].name).toBe('스쿼트');
    expect(muscleInfer.inferMuscleGroups).not.toHaveBeenCalled();
  });

  it('new-exercise branch: calls Pro inference and returns suggestedMuscleGroupIds', async () => {
    gemini.generateJson.mockResolvedValueOnce(flashJson('스쿼트'));
    resolver.resolveName.mockResolvedValueOnce({
      kind: 'new', name: '스쿼트',
    });
    muscleInfer.inferMuscleGroups.mockResolvedValueOnce(['mg-leg', 'mg-quad']);
    exerciseSvc.findAllMuscleGroups.mockResolvedValueOnce([
      { id: 'mg-leg', name: '하체' },
      { id: 'mg-quad', name: '대퇴사두' },
      { id: 'mg-chest', name: '가슴' },
    ]);
    const r = await service.processMessage(req(), 'user-1');
    expect(r.kind).toBe('new_exercise');
    expect(r.parseSuccess).toBe(false);
    expect(r.draft.exercises[0].exerciseId).toBe('');
    expect(r.draft.exercises[0].name).toBe('스쿼트');
    expect(r.suggestedMuscleGroupIds).toEqual(['mg-leg', 'mg-quad']);
    expect(r.muscleGroups).toHaveLength(3);
  });

  it('low confidence: returns kind=existing, parseSuccess=false, no draft exercises', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({
        reply: '운동 외 질문만 도와드려요',
        confidence: 'low',
        draft: {
          exercises: [
            {
              name: '알 수 없음',
              sets: [{ round: 1, reps: 0, weight: 0, weightUnit: 'kg' }],
            },
          ],
        },
      }),
    );
    const r = await service.processMessage(
      { date: '2026-04-19', messages: [{ role: 'user', content: '날씨 어때' }] },
      'user-1',
    );
    expect(r.confidence).toBe('low');
    expect(r.kind).toBe('existing');
    expect(r.parseSuccess).toBe(false);
    expect(r.draft.exercises).toEqual([]);
    expect(resolver.resolveName).not.toHaveBeenCalled();
  });

  it('multi-exercise with any new: low-confidence fallback', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({
        reply: 'x',
        confidence: 'high',
        draft: {
          exercises: [
            { name: '스쿼트', sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }] },
            { name: '벤치프레스', sets: [{ round: 1, reps: 8, weight: 80, weightUnit: 'kg' }] },
          ],
        },
      }),
    );
    resolver.resolveName
      .mockResolvedValueOnce({ kind: 'new', name: '스쿼트' })
      .mockResolvedValueOnce({ kind: 'existing', id: 'ex-2', name: '벤치프레스' });
    const r = await service.processMessage(req('스쿼트 100 10 벤치프레스 80 8'), 'user-1');
    expect(r.kind).toBe('existing');
    expect(r.parseSuccess).toBe(false);
    expect(r.reply).toMatch(/한\s*번에\s*하나씩/);
    expect(muscleInfer.inferMuscleGroups).not.toHaveBeenCalled();
  });

  it('injects RAG candidate names and lastApprovedName into systemInstruction', async () => {
    rag.findCandidateNames.mockResolvedValueOnce(['스쿼트', '벤치프레스']);
    workoutCtx.getLastApprovedExerciseName.mockResolvedValueOnce('스쿼트');
    gemini.generateJson.mockResolvedValueOnce(flashJson('스쿼트'));
    resolver.resolveName.mockResolvedValueOnce({
      kind: 'existing', id: 'ex-1', name: '스쿼트',
    });
    await service.processMessage(req(), 'user-1');
    const sys = gemini.generateJson.mock.calls[0][0].systemInstruction as string;
    expect(sys).toMatch(/- 스쿼트/);
    expect(sys).toMatch(/- 벤치프레스/);
    expect(sys).toMatch(/직전 승인 운동:\s*스쿼트/);
  });

  it('retries Flash on parse failure and eventually fails with ServiceUnavailable', async () => {
    gemini.generateJson
      .mockResolvedValueOnce('not json')
      .mockResolvedValueOnce('still garbage');
    await expect(service.processMessage(req(), 'user-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(gemini.generateJson).toHaveBeenCalledTimes(2);
  });

  it('maps assistant→model role in contents', async () => {
    gemini.generateJson.mockResolvedValueOnce(flashJson('스쿼트'));
    resolver.resolveName.mockResolvedValueOnce({
      kind: 'existing', id: 'ex-1', name: '스쿼트',
    });
    await service.processMessage(
      {
        date: '2026-04-19',
        messages: [
          { role: 'user', content: 'q1' },
          { role: 'assistant', content: 'a1' },
          { role: 'user', content: 'q2' },
        ],
      },
      'user-1',
    );
    const contents = gemini.generateJson.mock.calls[0][0].contents;
    expect(contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user']);
  });
});
