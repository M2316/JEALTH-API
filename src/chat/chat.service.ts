import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { ExerciseRagService } from './services/exercise-rag.service';
import { GeminiService } from './services/gemini.service';
import {
  ExerciseNameResolverService,
  ResolvedExercise,
} from './services/exercise-name-resolver.service';
import { MuscleGroupInferenceService } from './services/muscle-group-inference.service';
import { WorkoutContextService } from './services/workout-context.service';
import { ExerciseService } from '../workout/exercise.service';
import {
  buildWorkoutDraftResponseSchema,
  WorkoutDraftZ,
  WorkoutDraft,
} from './schemas/workout-draft.schema';

const BASE_SYSTEM_PROMPT = `너는 Jealth 운동 기록 어시스턴트다.
사용자의 한국어 메시지를 분석해 운동 기록 JSON 을 생성한다.

규칙:
1. 제공된 Exercise 후보 이름 목록을 힌트로 사용한다. 사용자가 입력한 운동명이 후보 중 하나와 같거나 오타/별칭이면 후보의 정식 이름으로 정규화해 name 에 반환하라.
2. 후보에 매칭이 없다고 판단되면, 사용자가 입력한 이름을 그대로 name 에 반환해도 된다 (서버가 신규 운동으로 처리).
3. 세트·reps·weight 는 사용자 메시지에 명시된 숫자를 그대로. 추측 금지.
4. weightUnit 은 사용자가 'lbs' 를 명시하지 않으면 'kg'.
5. reply 는 "X 종목 Y세트 맞나요?" 같은 짧은 컨펌 한국어.
6. 사용자 메시지에 운동명이 없고 '직전 승인 운동' 힌트가 제공되면, 그 운동명을 name 에 그대로 사용하라.
7. 운동 외 질문이거나 파싱이 불가능하면 name='알 수 없음', confidence='low', reply 로 안내 ("운동 기록만 도와드려요" 또는 "어떤 운동인지 모르겠어요. 다시 말씀해주세요.").
8. 숫자·단위 해석이 모호하면 confidence='low'.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly rag: ExerciseRagService,
    private readonly gemini: GeminiService,
    private readonly resolver: ExerciseNameResolverService,
    private readonly muscleInfer: MuscleGroupInferenceService,
    private readonly workoutCtx: WorkoutContextService,
    private readonly exerciseSvc: ExerciseService,
  ) {}

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
    const startedAt = Date.now();
    const [suggestedMuscleGroupIds, allMuscleGroups] = await Promise.all([
      this.muscleInfer.inferMuscleGroups(newEntry.name),
      this.exerciseSvc.findAllMuscleGroups(),
    ]);
    this.logger.log(
      `new-exercise branch: userId=${userId} name=${newEntry.name} ` +
        `proMs=${Date.now() - startedAt} suggested=${suggestedMuscleGroupIds.length}`,
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
            sets: draft.draft.exercises[0].sets,
          },
        ],
      },
      suggestedMuscleGroupIds,
      muscleGroups: allMuscleGroups.map((g: { id: string; name: string }) => ({
        id: g.id,
        name: g.name,
      })),
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
