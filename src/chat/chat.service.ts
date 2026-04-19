import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager, ILike, In } from 'typeorm';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ApproveNewExerciseDto } from './dto/approve-new-exercise.dto';
import { ExerciseRagService } from './services/exercise-rag.service';
import { GeminiService } from './services/gemini.service';
import {
  ExerciseNameResolverService,
  ResolvedExercise,
} from './services/exercise-name-resolver.service';
import { ExerciseMetaInferenceService } from './services/exercise-meta-inference.service';
import { WorkoutContextService } from './services/workout-context.service';
import { ExerciseService } from '../workout/exercise.service';
import { RoutineService } from '../workout/routine.service';
import { Exercise } from '../workout/entities/exercise.entity';
import { MuscleGroup } from '../workout/entities/muscle-group.entity';
import {
  buildWorkoutDraftResponseSchema,
  WorkoutDraftZ,
  WorkoutDraft,
} from './schemas/workout-draft.schema';

const BASE_SYSTEM_PROMPT = `너는 Jealth 운동 기록 어시스턴트다.
사용자의 한국어 메시지를 분석해 운동 기록 JSON 을 생성한다.

전달하는 운동명은 **헬스 운동의 종목명**이다. 한국어 오타(자·모음 혼동, 받침 누락, 유사 발음) 와
영문·외래어 표기 차이가 흔하다. 아래 예시처럼 한두 글자 차이의 오타는 반드시 공식 종목명으로 보정하라.

운동명 교정 예시 (오타/변형 → 정식 종목명):
- 덤젤프레스 → 덤벨프레스
- 덜벨프레스 → 덤벨프레스
- 밴치프레스 → 벤치프레스
- 벤취프레스 → 벤치프레스
- 덷리프트 → 데드리프트
- 데드리프드 → 데드리프트
- 스콰트 → 스쿼트
- 스쿼드 → 스쿼트
- 풀엎 → 풀업
- 풀립 → 풀업
- 레그프레쓰 → 레그프레스
- 레그컬 → 레그컬 (변경 없음)
- 랫풀다운 → 랫풀다운 (변경 없음)
- 렛풀다운 → 랫풀다운
- 오버헤드프래스 → 오버헤드프레스
- 밀리터리프레스 → 밀리터리프레스 (변경 없음)
- 바벨로우 → 바벨로우 (변경 없음)
- 바벨로오 → 바벨로우
- 체스트프레스 → 체스트프레스 (변경 없음)
- 핵스쿼트 → 핵스쿼트 (변경 없음)

규칙:
1. 제공된 Exercise 후보 이름 목록을 힌트로 사용한다. 사용자 입력이 후보 중 하나와 같거나
   한두 글자 차이의 오타/별칭이면 **반드시** 후보의 정식 이름으로 정규화해 name 에 반환하라.
   후보에 없더라도 위 예시 같은 흔한 종목명 오타는 보정하라.
2. name: 정규화·보정된 공식 운동명.
   rawName: 사용자가 메시지에 입력한 운동명 단어를 그대로 (오타/별칭 유지).
   둘 다 반드시 반환. 실제로 보정하지 않은 경우엔 name === rawName 로 동일하게 채움.
3. 세트·reps·weight 는 사용자 메시지에 명시된 숫자를 그대로. 추측 금지.
4. weightUnit 은 사용자가 'lbs' 를 명시하지 않으면 'kg'.
5. reply 는 "X 종목 Y세트 맞나요?" 같은 짧은 컨펌 한국어.
6. 사용자 메시지에 운동명이 없고 '직전 승인 운동' 힌트가 제공되면, 그 운동명을 name·rawName 에 그대로 사용하라.
7. 운동 외 질문이거나 파싱이 불가능하면 name='알 수 없음', confidence='low', reply 로 안내
   ("운동 기록만 도와드려요" 또는 "어떤 운동인지 모르겠어요. 다시 말씀해주세요.").
8. 숫자·단위 해석이 모호하면 confidence='low'.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly rag: ExerciseRagService,
    private readonly gemini: GeminiService,
    private readonly resolver: ExerciseNameResolverService,
    private readonly metaInfer: ExerciseMetaInferenceService,
    private readonly workoutCtx: WorkoutContextService,
    private readonly exerciseSvc: ExerciseService,
    private readonly routineService: RoutineService,
    private readonly dataSource: DataSource,
  ) {}

  async approveNewExercise(dto: ApproveNewExerciseDto, userId: string) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const exerciseRepo = manager.getRepository(Exercise);
      const trimmedName = dto.name.trim();

      let exercise = await exerciseRepo.findOne({
        where: { name: ILike(trimmedName) },
        relations: ['muscleGroups'],
      });

      if (!exercise) {
        const muscleRepo = manager.getRepository(MuscleGroup);
        const muscleGroups = await muscleRepo.findBy({
          id: In(dto.muscleGroupIds),
        });
        if (muscleGroups.length !== dto.muscleGroupIds.length) {
          throw new BadRequestException('invalid muscle group id');
        }
        const built = manager.create(Exercise, {
          name: trimmedName,
          equipment: dto.equipment,
          muscleGroups,
          createdBy: { id: userId } as any,
        });
        exercise = await exerciseRepo.save(built);
      }

      const finalExercise = exercise!;
      const routine = await this.routineService.appendExerciseWithSetsTx(
        manager,
        {
          userId,
          date: dto.date,
          exerciseId: finalExercise.id,
          sets: dto.sets,
        },
      );

      return { exercise: finalExercise, routine };
    });
  }

  async processMessage(
    req: ChatRequestDto,
    userId: string,
  ): Promise<ChatResponseDto> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const userText = lastUser?.content ?? '';

    const [candidateNames, lastApprovedName] = await Promise.all([
      this.rag.findCandidateNames(userText),
      this.workoutCtx.getLastApprovedExerciseName(userId, req.date),
    ]);

    const draft = await this.callFlashWithRetries(
      req,
      candidateNames,
      lastApprovedName,
    );

    const hasUnknown = draft.draft.exercises.some(
      (e) => e.name === '알 수 없음',
    );
    if (draft.confidence === 'low' || hasUnknown) {
      return {
        reply: draft.reply,
        confidence: 'low',
        parseSuccess: false,
        kind: 'existing',
        draft: { exercises: [] },
      };
    }

    const resolved: ResolvedExercise[] = await Promise.all(
      draft.draft.exercises.map((e) => this.resolver.resolveName(e.name)),
    );

    const newCount = resolved.filter((r) => r.kind === 'new').length;

    if (newCount === 0) {
      return {
        reply: draft.reply,
        confidence: 'high',
        parseSuccess: true,
        kind: 'existing',
        draft: {
          exercises: draft.draft.exercises.map((e, i) => {
            const r = resolved[i] as { kind: 'existing'; id: string; name: string };
            return {
              exerciseId: r.id,
              name: r.name,
              sets: e.sets,
            };
          }),
        },
      };
    }

    if (newCount > 1 || resolved.length > 1) {
      this.logger.log(
        `multi-new fallback: userId=${userId} newCount=${newCount} total=${resolved.length}`,
      );
      return {
        reply: '새 운동은 한 번에 하나씩 입력해주세요.',
        confidence: 'low',
        parseSuccess: false,
        kind: 'existing',
        draft: { exercises: [] },
      };
    }

    const newEntry = resolved[0] as { kind: 'new'; name: string };
    const rawEntry = draft.draft.exercises[0];
    const startedAt = Date.now();
    const [meta, allMuscleGroups] = await Promise.all([
      this.metaInfer.inferNewExerciseMeta(newEntry.name),
      this.exerciseSvc.findAllMuscleGroups(),
    ]);
    const originalName =
      rawEntry.rawName && rawEntry.rawName !== newEntry.name
        ? rawEntry.rawName
        : undefined;

    this.logger.log(
      `new-exercise branch: userId=${userId} name=${newEntry.name} ` +
        `proMs=${Date.now() - startedAt} suggested=${meta.muscleGroupIds.length} ` +
        `equipment=${meta.equipment ?? 'none'} original=${originalName ?? 'none'}`,
    );

    return {
      reply: draft.reply,
      confidence: 'high',
      parseSuccess: false,
      kind: 'new_exercise',
      draft: {
        exercises: [
          {
            exerciseId: '',
            name: newEntry.name,
            sets: rawEntry.sets,
          },
        ],
      },
      suggestedMuscleGroupIds: meta.muscleGroupIds,
      suggestedEquipment: meta.equipment,
      muscleGroups: allMuscleGroups.map((g: { id: string; name: string }) => ({
        id: g.id,
        name: g.name,
      })),
      ...(originalName ? { originalName } : {}),
    };
  }

  private async callFlashWithRetries(
    req: ChatRequestDto,
    candidateNames: string[],
    lastApprovedName: string | null,
  ): Promise<WorkoutDraft> {
    const responseSchema = buildWorkoutDraftResponseSchema();
    const candidateBlock =
      candidateNames.length > 0
        ? candidateNames.map((n) => `- ${n}`).join('\n')
        : '(후보 없음)';
    const baseInstruction =
      BASE_SYSTEM_PROMPT +
      '\n\nExercise 후보 (정규 이름):\n' +
      candidateBlock +
      (lastApprovedName ? `\n\n직전 승인 운동: ${lastApprovedName}` : '');

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const systemInstruction =
        baseInstruction +
        (lastError
          ? `\n\n이전 응답이 다음 이유로 실패했다: ${lastError}\n반드시 스키마에 맞춰 다시 답하라.`
          : '');
      try {
        const text = await this.gemini.generateJson({
          systemInstruction,
          contents: req.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          responseSchema,
        });
        const parsed: unknown = JSON.parse(text);
        return WorkoutDraftZ.parse(parsed);
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Flash attempt ${attempt + 1} failed: ${lastError}`);
      }
    }
    throw new ServiceUnavailableException({
      message: 'AI 응답을 처리하지 못했습니다',
      reason: lastError ?? 'unknown',
    });
  }
}
