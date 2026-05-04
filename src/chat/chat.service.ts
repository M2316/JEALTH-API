import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager, ILike, In } from 'typeorm';
import { ZodError } from 'zod';
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
import { WorkoutParserService } from './services/workout-parser.service';
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

규칙:
1. 운동명 정규화: 아래 Exercise 후보 목록에 입력과 한두 글자 차이의 이름이 있으면 그 후보의 정식 이름을 name 에 반환하라. rawName 에는 사용자가 입력한 단어 그대로 넣고, 실제 보정이 없으면 name === rawName.
2. 세트·reps·weight 는 메시지에 명시된 숫자를 그대로 써라. 추측 금지.
3. weightUnit 은 사용자가 'lbs' 를 명시하지 않으면 'kg'.
4. reply 는 "X 종목 Y세트 맞나요?" 같은 짧은 컨펌 한국어.
5. 메시지에 운동명이 없고 '직전 승인 운동' 힌트가 있으면 그 이름을 name·rawName 에 사용하라.
6. 운동 외 질문이거나 파싱 불가면 name='알 수 없음', confidence='low', reply 로 안내.
7. 숫자·단위가 모호하면 confidence='low'.`;

function classifyFlashError(
  err: unknown,
): 'timeout' | 'api_error' | 'json_parse' | 'zod_fail' | 'other' {
  if (err instanceof ZodError) return 'zod_fail';
  if (err instanceof SyntaxError) return 'json_parse';
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('aborted')) return 'timeout';
    if (msg.includes('fetch') || msg.includes('api') || /\b[45]\d\d\b/.test(msg))
      return 'api_error';
  }
  return 'other';
}

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
    private readonly parser: WorkoutParserService,
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

    const lastApprovedName = await this.workoutCtx.getLastApprovedExerciseName(
      userId,
      req.date,
    );

    const parsed = await this.parser.tryParse(userText, lastApprovedName);
    if (parsed) {
      return {
        reply: parsed.reply,
        confidence: 'high',
        parseSuccess: true,
        kind: 'existing',
        draft: {
          exercises: [
            {
              exerciseId: parsed.exerciseId,
              name: parsed.exerciseName,
              sets: parsed.sets,
            },
          ],
        },
      };
    }

    const candidateNames = await this.rag.findCandidateNames(userText);

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
    let lastReason: 'timeout' | 'api_error' | 'json_parse' | 'zod_fail' | 'other' =
      'other';
    let rawPreview: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const systemInstruction =
        baseInstruction +
        (lastError && attempt > 0
          ? `\n\n이전 응답이 다음 이유로 실패했다: ${lastError}\n반드시 스키마에 맞춰 다시 답하라.`
          : '');
      let text = '';
      try {
        text = await this.gemini.generateJson({
          systemInstruction,
          contents: req.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          responseSchema,
          temperature: attempt === 0 ? 0.2 : 0.1,
        });
        rawPreview = text.slice(0, 200);
        const parsed: unknown = JSON.parse(text);
        return WorkoutDraftZ.parse(parsed);
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        lastReason = classifyFlashError(e);
        this.logger.warn({
          msg: 'flash_attempt_failed',
          attempt: attempt + 1,
          reason: lastReason,
          errorMessage: lastError,
          promptLength: systemInstruction.length,
          candidateCount: candidateNames.length,
          rawResponsePreview: rawPreview,
        });
        // Zod 실패는 같은 프롬프트로 재시도해도 같은 결과 → 즉시 중단
        if (lastReason === 'zod_fail') break;
      }
    }
    this.logger.error({
      msg: 'flash_final_failure',
      reason: lastReason,
      errorMessage: lastError,
      candidateCount: candidateNames.length,
      rawResponsePreview: rawPreview,
    });
    throw new ServiceUnavailableException({
      message: 'AI 응답을 처리하지 못했습니다',
      reason: lastError ?? 'unknown',
    });
  }
}
