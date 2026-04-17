import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import {
  ExerciseRagService,
  ExerciseCandidate,
} from './services/exercise-rag.service';
import { GeminiService } from './services/gemini.service';
import {
  buildWorkoutDraftResponseSchema,
  WorkoutDraftZ,
  WorkoutDraft,
  WORKOUT_SENTINEL_ID,
} from './schemas/workout-draft.schema';

const SYSTEM_PROMPT = `너는 Jealth 운동 기록 어시스턴트다.
사용자의 한국어 메시지를 분석해 운동 기록 JSON을 생성한다.

규칙:
1. 제공된 Exercise 후보 목록 중에서만 exerciseId 를 선택하라.
2. 세트 수, reps, weight 는 사용자 메시지에 명시된 숫자를 그대로 사용하라. 추측 금지.
3. weightUnit 은 사용자가 'lbs' 를 명시하지 않으면 'kg'.
4. reply 필드에는 사용자가 확인할 수 있게 "X 종목 Y세트 이렇게 맞나요?" 형식으로 간결히.
5. 운동 외 질문이거나 후보에서 매칭할 운동을 찾을 수 없으면 다음 형식으로 답하라:
   - draft.exercises: [{ exerciseId: '__none__', name: '알 수 없음', sets: [{ round: 1, reps: 0, weight: 0, weightUnit: 'kg' }] }]
   - confidence: 'low'
   - reply: 운동 외 질문이면 '운동 기록만 도와드려요', 매칭 실패면 '어떤 운동인지 모르겠어요. 다시 말씀해주세요.'
6. 숫자·단위 해석이 모호하면 confidence 를 'low' 로 설정하라.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly rag: ExerciseRagService,
    private readonly gemini: GeminiService,
  ) {}

  async processMessage(req: ChatRequestDto): Promise<ChatResponseDto> {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const userText = lastUser?.content ?? '';
    const candidates = await this.rag.findCandidates(userText);
    const responseSchema = buildWorkoutDraftResponseSchema(
      candidates.map((c) => c.id),
    );
    const candidateBlock = this.formatCandidates(candidates);

    let draft: WorkoutDraft | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const systemInstruction =
        SYSTEM_PROMPT +
        '\n\nExercise 후보:\n' +
        candidateBlock +
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
        draft = WorkoutDraftZ.parse(parsed);
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        this.logger.warn(`attempt ${attempt + 1} failed: ${lastError}`);
      }
    }

    if (!draft) {
      throw new ServiceUnavailableException({
        message: 'AI 응답을 처리하지 못했습니다',
        reason: lastError ?? 'unknown',
      });
    }

    const filteredExercises = draft.draft.exercises.filter(
      (e) => e.exerciseId !== WORKOUT_SENTINEL_ID,
    );
    const sentinelDetected =
      filteredExercises.length !== draft.draft.exercises.length;
    const finalConfidence: 'high' | 'low' =
      sentinelDetected || filteredExercises.length === 0
        ? 'low'
        : draft.confidence;

    return {
      reply: draft.reply,
      confidence: finalConfidence,
      draft: { exercises: filteredExercises },
      candidates: finalConfidence === 'low' ? candidates : undefined,
    };
  }

  private formatCandidates(candidates: ExerciseCandidate[]): string {
    if (candidates.length === 0) return '(후보 없음)';
    return candidates.map((c) => `- ${c.id}: ${c.name}`).join('\n');
  }
}
