export interface ChatResponseDto {
  reply: string;
  confidence: 'high' | 'low';
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
