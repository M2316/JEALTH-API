export interface ChatResponseDto {
  reply: string;
  confidence: 'high' | 'low';
  /**
   * AI 가 사용자 메시지를 운동 기록으로 정확히 파싱했는지 여부.
   * true: 클라이언트는 승인 버튼 노출 가능
   * false: 클라이언트는 승인 버튼 숨기고 재입력을 요청해야 함
   * 산출 규칙: confidence === 'high' && draft.exercises.length > 0
   */
  parseSuccess: boolean;
  draft: {
    exercises: Array<{
      exerciseId: string;
      name: string;
      sets: Array<{
        round: number;
        reps: number;
        weight: number;
        weightUnit: 'kg' | 'lbs';
      }>;
    }>;
  };
  candidates?: Array<{ id: string; name: string }>;
}
