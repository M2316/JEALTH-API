import { Test } from '@nestjs/testing';
import { WorkoutParserService } from '../workout-parser.service';
import { ExerciseNameResolverService } from '../exercise-name-resolver.service';

describe('WorkoutParserService', () => {
  let service: WorkoutParserService;
  let resolver: { resolveName: jest.Mock };

  beforeEach(async () => {
    resolver = { resolveName: jest.fn() };
    const mod = await Test.createTestingModule({
      providers: [
        WorkoutParserService,
        { provide: ExerciseNameResolverService, useValue: resolver },
      ],
    }).compile();
    service = mod.get(WorkoutParserService);
  });

  describe('단일 운동 + 단일 세트', () => {
    it('데드리프트 100키로 10개 → existing', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-dl',
        name: '데드리프트',
      });
      const r = await service.tryParse('데드리프트 100키로 10개', null);
      expect(r).not.toBeNull();
      expect(r!.exerciseId).toBe('ex-dl');
      expect(r!.exerciseName).toBe('데드리프트');
      expect(r!.sets).toEqual([
        { round: 1, reps: 10, weight: 100, weightUnit: 'kg' },
      ]);
      expect(r!.reply).toMatch(/맞나요/);
    });

    it('스쿼트 80kg 5회 → existing', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-sq',
        name: '스쿼트',
      });
      const r = await service.tryParse('스쿼트 80kg 5회', null);
      expect(r!.sets[0]).toEqual({
        round: 1,
        reps: 5,
        weight: 80,
        weightUnit: 'kg',
      });
    });

    it('lbs 단위 보존', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-bp',
        name: '벤치프레스',
      });
      const r = await service.tryParse('벤치프레스 80lbs 8', null);
      expect(r!.sets[0].weightUnit).toBe('lbs');
    });

    it('소수점 weight', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-sq',
        name: '스쿼트',
      });
      const r = await service.tryParse('스쿼트 100.5키로 5개', null);
      expect(r!.sets[0].weight).toBe(100.5);
    });

    it('단위 생략 시 kg', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-db',
        name: '덤벨컬',
      });
      const r = await service.tryParse('덤벨컬 15 12', null);
      expect(r!.sets[0].weightUnit).toBe('kg');
    });

    it('공백 여러 개 허용', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-sq',
        name: '스쿼트',
      });
      const r = await service.tryParse('   스쿼트    80   5   ', null);
      expect(r).not.toBeNull();
    });
  });

  describe('N세트 반복', () => {
    it('벤치프레스 80키로 8개 5세트 → 5개 세트', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-bp',
        name: '벤치프레스',
      });
      const r = await service.tryParse('벤치프레스 80키로 8개 5세트', null);
      expect(r!.sets).toHaveLength(5);
      expect(r!.sets.map((s) => s.round)).toEqual([1, 2, 3, 4, 5]);
      expect(r!.sets.every((s) => s.weight === 80 && s.reps === 8)).toBe(true);
      expect(r!.reply).toMatch(/5\s*세트/);
    });

    it('풀업 0 10개 4세트 → weight=0 허용', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-pu',
        name: '풀업',
      });
      const r = await service.tryParse('풀업 0 10개 4세트', null);
      expect(r!.sets).toHaveLength(4);
      expect(r!.sets[0].weight).toBe(0);
    });

    it('세트 수가 MAX_ROUNDS 초과면 양보(null)', async () => {
      const r = await service.tryParse('스쿼트 80 5 30세트', null);
      expect(r).toBeNull();
      expect(resolver.resolveName).not.toHaveBeenCalled();
    });
  });

  describe('lastApprovedName 결합', () => {
    it('운동명 없이 "80 5" + lastApproved="스쿼트" → 스쿼트로 resolve', async () => {
      resolver.resolveName.mockResolvedValueOnce({
        kind: 'existing',
        id: 'ex-sq',
        name: '스쿼트',
      });
      const r = await service.tryParse('80 5', '스쿼트');
      expect(r!.exerciseName).toBe('스쿼트');
      expect(r!.sets[0]).toEqual({
        round: 1,
        reps: 5,
        weight: 80,
        weightUnit: 'kg',
      });
      expect(resolver.resolveName).toHaveBeenCalledWith('스쿼트');
    });

    it('운동명 없이 lastApproved=null → 양보(null)', async () => {
      const r = await service.tryParse('80 5', null);
      expect(r).toBeNull();
      expect(resolver.resolveName).not.toHaveBeenCalled();
    });
  });
});
