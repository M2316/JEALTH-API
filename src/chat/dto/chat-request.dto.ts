export class ChatRequestDto {
  date!: string;
  messages!: Array<{ role: 'user' | 'assistant'; content: string }>;
}
