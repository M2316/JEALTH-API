import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ChatService } from '../chat.service';
import { ExerciseRagService } from '../services/exercise-rag.service';
import { GeminiService } from '../services/gemini.service';
import { ExerciseNameResolverService } from '../services/exercise-name-resolver.service';
import { WorkoutContextService } from '../services/workout-context.service';
import { WorkoutParserService } from '../services/workout-parser.service';
import { ExerciseService } from '../../workout/exercise.service';
import { RoutineService } from '../../workout/routine.service';

describe('ChatService', () => {
  let service: ChatService;
  let rag: { findCandidateNames: jest.Mock };
  let gemini: { generateJson: jest.Mock };
  let resolver: { resolveName: jest.Mock };
  let workoutCtx: { getLastApprovedExerciseName: jest.Mock };
  let exerciseSvc: { findAllMuscleGroups: jest.Mock };
  let parser: { tryParse: jest.Mock };

  beforeEach(async () => {
    rag = { findCandidateNames: jest.fn().mockResolvedValue([]) };
    gemini = { generateJson: jest.fn() };
    resolver = { resolveName: jest.fn() };
    workoutCtx = {
      getLastApprovedExerciseName: jest.fn().mockResolvedValue(null),
    };
    exerciseSvc = { findAllMuscleGroups: jest.fn().mockResolvedValue([]) };
    parser = { tryParse: jest.fn().mockResolvedValue(null) };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ExerciseRagService, useValue: rag },
        { provide: GeminiService, useValue: gemini },
        { provide: ExerciseNameResolverService, useValue: resolver },
        { provide: WorkoutContextService, useValue: workoutCtx },
        { provide: WorkoutParserService, useValue: parser },
        { provide: ExerciseService, useValue: exerciseSvc },
        { provide: RoutineService, useValue: { appendExerciseWithSetsTx: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  const flashJson = (
    name: string,
    opts: {
      replyOverride?: string;
      suggestedMuscleGroupIds?: string[];
      suggestedEquipment?: string;
    } = {},
  ) =>
    JSON.stringify({
      reply: opts.replyOverride ?? '맞나요?',
      confidence: 'high',
      draft: {
        exercises: [
          {
            name,
            rawName: name,
            sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }],
          },
        ],
      },
      ...(opts.suggestedMuscleGroupIds
        ? { suggestedMuscleGroupIds: opts.suggestedMuscleGroupIds }
        : {}),
      ...(opts.suggestedEquipment
        ? { suggestedEquipment: opts.suggestedEquipment }
        : {}),
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
  });

  it('new-exercise branch: uses Flash suggestedMuscleGroupIds (no Pro call)', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      flashJson('스쿼트', {
        suggestedMuscleGroupIds: ['mg-leg', 'mg-quad'],
        suggestedEquipment: '바벨',
      }),
    );
    resolver.resolveName.mockResolvedValueOnce({ kind: 'new', name: '스쿼트' });
    exerciseSvc.findAllMuscleGroups.mockResolvedValueOnce([
      { id: 'mg-leg', name: '하체' },
      { id: 'mg-quad', name: '대퇴사두' },
    ]);
    const r = await service.processMessage(req(), 'user-1');
    expect(r.kind).toBe('new_exercise');
    expect(r.suggestedMuscleGroupIds).toEqual(['mg-leg', 'mg-quad']);
    expect(r.suggestedEquipment).toBe('바벨');
    expect(gemini.generateJson).toHaveBeenCalledTimes(1);
  });

  it('new-exercise branch: Flash 가 suggested 필드 누락 시 빈 배열 fallback', async () => {
    gemini.generateJson.mockResolvedValueOnce(flashJson('스쿼트'));
    resolver.resolveName.mockResolvedValueOnce({ kind: 'new', name: '스쿼트' });
    exerciseSvc.findAllMuscleGroups.mockResolvedValueOnce([
      { id: 'mg-leg', name: '하체' },
    ]);
    const r = await service.processMessage(req(), 'user-1');
    expect(r.suggestedMuscleGroupIds).toEqual([]);
    expect(r.suggestedEquipment).toBeUndefined();
  });

  it('sets originalName when rawName differs from name (new branch)', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({
        reply: '푸쉬업 1세트 0kg 100개 맞나요?',
        confidence: 'high',
        draft: {
          exercises: [{
            name: '푸쉬업', rawName: '푸귀업',
            sets: [{ round: 1, reps: 100, weight: 0, weightUnit: 'kg' }],
          }],
        },
        suggestedMuscleGroupIds: ['mg-chest'],
        suggestedEquipment: '맨몸',
      }),
    );
    resolver.resolveName.mockResolvedValueOnce({ kind: 'new', name: '푸쉬업' });
    exerciseSvc.findAllMuscleGroups.mockResolvedValueOnce([
      { id: 'mg-chest', name: '가슴' },
    ]);
    const r = await service.processMessage(
      { date: '2026-04-19', messages: [{ role: 'user', content: '푸귀업 100개 0키로' }] },
      'user-1',
    );
    expect(r.kind).toBe('new_exercise');
    expect(r.originalName).toBe('푸귀업');
    expect(r.suggestedEquipment).toBe('맨몸');
    expect(r.suggestedMuscleGroupIds).toEqual(['mg-chest']);
  });

  it('omits originalName when rawName equals name', async () => {
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({
        reply: '스쿼트 맞나요?',
        confidence: 'high',
        draft: {
          exercises: [{
            name: '스쿼트',
            rawName: '스쿼트',
            sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }],
          }],
        },
        suggestedMuscleGroupIds: ['mg-leg'],
      }),
    );
    resolver.resolveName.mockResolvedValueOnce({ kind: 'new', name: '스쿼트' });
    exerciseSvc.findAllMuscleGroups.mockResolvedValueOnce([
      { id: 'mg-leg', name: '하체' },
    ]);
    const r = await service.processMessage(
      { date: '2026-04-19', messages: [{ role: 'user', content: '스쿼트 100kg 10개' }] },
      'user-1',
    );
    expect(r.originalName).toBeUndefined();
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
              rawName: '알 수 없음',
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
            { name: '스쿼트', rawName: '스쿼트', sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }] },
            { name: '벤치프레스', rawName: '벤치프레스', sets: [{ round: 1, reps: 8, weight: 80, weightUnit: 'kg' }] },
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

  it('systemInstruction 은 핵심 규칙과 RAG 후보를 포함', async () => {
    rag.findCandidateNames.mockResolvedValueOnce(['스쿼트']);
    exerciseSvc.findAllMuscleGroups.mockResolvedValueOnce([
      { id: 'mg-leg', name: '하체' },
    ]);
    gemini.generateJson.mockResolvedValueOnce(
      JSON.stringify({
        reply: 'ok',
        confidence: 'high',
        draft: {
          exercises: [{
            name: '스쿼트', rawName: '스쿼트',
            sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }],
          }],
        },
      }),
    );
    resolver.resolveName.mockResolvedValueOnce({
      kind: 'existing', id: 'ex-1', name: '스쿼트',
    });
    await service.processMessage(
      { date: '2026-04-19', messages: [{ role: 'user', content: '스쿼트 100kg 10개' }] },
      'user-1',
    );
    const sys = gemini.generateJson.mock.calls[0][0].systemInstruction as string;
    expect(sys).toMatch(/Jealth 운동 기록/);
    expect(sys).toMatch(/한두 글자 차이/);
    expect(sys).toMatch(/- 스쿼트/);
    expect(sys).toMatch(/근육 그룹/);
    expect(sys).toMatch(/mg-leg: 하체/);
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

  describe('parser fast path', () => {
    it('parser 성공 시 Flash/RAG 미호출, kind=existing 응답', async () => {
      parser.tryParse.mockResolvedValueOnce({
        exerciseId: 'ex-dl',
        exerciseName: '데드리프트',
        sets: [{ round: 1, reps: 10, weight: 100, weightUnit: 'kg' }],
        reply: '데드리프트 1세트 맞나요?',
      });
      const r = await service.processMessage(
        { date: '2026-04-19', messages: [{ role: 'user', content: '데드리프트 100키로 10개' }] },
        'user-1',
      );
      expect(r.kind).toBe('existing');
      expect(r.parseSuccess).toBe(true);
      expect(r.draft.exercises[0].exerciseId).toBe('ex-dl');
      expect(r.draft.exercises[0].name).toBe('데드리프트');
      expect(gemini.generateJson).not.toHaveBeenCalled();
      expect(rag.findCandidateNames).not.toHaveBeenCalled();
    });

    it('parser null 반환 시 Flash 경로 진입', async () => {
      parser.tryParse.mockResolvedValueOnce(null);
      gemini.generateJson.mockResolvedValueOnce(flashJson('스쿼트'));
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing', id: 'ex-1', name: '스쿼트',
      });
      await service.processMessage(req(), 'user-1');
      expect(gemini.generateJson).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry policy', () => {
    it('Zod 실패는 재시도 없이 즉시 503', async () => {
      gemini.generateJson.mockResolvedValueOnce(
        JSON.stringify({ reply: 'x', confidence: 'high', draft: { exercises: [] } }),
      );
      await expect(service.processMessage(req(), 'user-1')).rejects.toThrow();
      expect(gemini.generateJson).toHaveBeenCalledTimes(1);
    });

    it('JSON 파싱 실패는 1회 재시도 후 503', async () => {
      gemini.generateJson
        .mockResolvedValueOnce('not json')
        .mockResolvedValueOnce('still garbage');
      await expect(service.processMessage(req(), 'user-1')).rejects.toThrow();
      expect(gemini.generateJson).toHaveBeenCalledTimes(2);
    });
  });
});
