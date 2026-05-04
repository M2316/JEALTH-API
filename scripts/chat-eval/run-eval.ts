/* eslint-disable no-console */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { ChatService } from '../../src/chat/chat.service';
import { CASES, EvalCase } from './cases';

interface EvalResult {
  caseId: string;
  category: EvalCase['category'];
  text: string;
  success: boolean;
  kind?: 'existing' | 'new_exercise';
  confidence?: 'high' | 'low';
  parseSuccess?: boolean;
  latencyMs: number;
  failureReason:
    | 'none'
    | 'timeout'
    | 'api_error'
    | 'json_parse'
    | 'zod_fail'
    | 'low_confidence'
    | 'service_unavailable'
    | 'other';
  errorMessage?: string;
  muscleGroupNames?: string[];
  exerciseName?: string;
}

function classifyError(err: unknown): EvalResult['failureReason'] {
  if (!(err instanceof Error)) return 'other';
  const name = err.name;
  const msg = err.message.toLowerCase();
  if (name === 'ServiceUnavailableException') return 'service_unavailable';
  if (name === 'ZodError') return 'zod_fail';
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('json') || msg.includes('unexpected token'))
    return 'json_parse';
  if (msg.includes('api') || msg.includes('fetch')) return 'api_error';
  return 'other';
}

async function main(): Promise<void> {
  const testUserId = process.env.EVAL_USER_ID;
  if (!testUserId) {
    console.error('EVAL_USER_ID env is required (existing user uuid).');
    process.exit(1);
  }
  const testDate =
    process.env.EVAL_DATE ?? new Date().toISOString().slice(0, 10);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const chat = app.get(ChatService);
  const results: EvalResult[] = [];

  Logger.log(
    `Running ${CASES.length} cases (user=${testUserId}, date=${testDate})`,
    'Eval',
  );

  for (const c of CASES) {
    const started = Date.now();
    try {
      const res = await chat.processMessage(
        { date: testDate, messages: [{ role: 'user', content: c.text }] },
        testUserId,
      );
      const latencyMs = Date.now() - started;
      const failureReason: EvalResult['failureReason'] =
        res.confidence === 'low' ? 'low_confidence' : 'none';
      results.push({
        caseId: c.id,
        category: c.category,
        text: c.text,
        success: res.confidence === 'high' && res.parseSuccess !== false,
        kind: res.kind,
        confidence: res.confidence,
        parseSuccess: res.parseSuccess,
        latencyMs,
        failureReason,
        muscleGroupNames: res.muscleGroups
          ?.filter((g) =>
            (res.suggestedMuscleGroupIds ?? []).includes(g.id),
          )
          .map((g) => g.name),
        exerciseName: res.draft.exercises[0]?.name,
      });
    } catch (err) {
      const latencyMs = Date.now() - started;
      results.push({
        caseId: c.id,
        category: c.category,
        text: c.text,
        success: false,
        latencyMs,
        failureReason: classifyError(err),
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(__dirname, 'results', stamp);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'results.json'),
    JSON.stringify(results, null, 2),
  );
  console.log(`Wrote ${results.length} results to ${outDir}`);

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
