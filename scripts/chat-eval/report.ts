/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

interface EvalResult {
  caseId: string;
  category: string;
  text: string;
  success: boolean;
  kind?: string;
  confidence?: string;
  parseSuccess?: boolean;
  latencyMs: number;
  failureReason: string;
  errorMessage?: string;
  muscleGroupNames?: string[];
  exerciseName?: string;
}

function loadJson(p: string): EvalResult[] {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as EvalResult[];
}

function summarize(
  rs: EvalResult[],
): { total: number; success: number; p50: number; p95: number; byReason: Record<string, number> } {
  const latencies = rs.map((r) => r.latencyMs).sort((a, b) => a - b);
  const pct = (p: number) => {
    if (latencies.length === 0) return 0;
    const idx = Math.min(
      latencies.length - 1,
      Math.max(0, Math.ceil((p / 100) * latencies.length) - 1),
    );
    return latencies[idx];
  };
  const byReason: Record<string, number> = {};
  for (const r of rs) byReason[r.failureReason] = (byReason[r.failureReason] ?? 0) + 1;
  return {
    total: rs.length,
    success: rs.filter((r) => r.success).length,
    p50: pct(50),
    p95: pct(95),
    byReason,
  };
}

function main(): void {
  const [currentPath, baselinePath] = process.argv.slice(2);
  if (!currentPath) {
    console.error('Usage: ts-node report.ts <current.json> [baseline.json]');
    process.exit(1);
  }
  const current = loadJson(currentPath);
  const curSum = summarize(current);

  const lines: string[] = [];
  lines.push(`# Chat eval report`);
  lines.push(``);
  lines.push(`Source: \`${currentPath}\``);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`- Total: ${curSum.total}`);
  lines.push(`- Success: ${curSum.success} (${((curSum.success / curSum.total) * 100).toFixed(1)}%)`);
  lines.push(`- Latency p50: ${curSum.p50}ms, p95: ${curSum.p95}ms`);
  lines.push(`- By reason:`);
  for (const [k, v] of Object.entries(curSum.byReason)) {
    lines.push(`  - ${k}: ${v}`);
  }
  lines.push(``);

  if (baselinePath) {
    const base = loadJson(baselinePath);
    const baseSum = summarize(base);
    lines.push(`## Baseline diff`);
    lines.push(``);
    lines.push(
      `- Success: ${baseSum.success} → ${curSum.success} ` +
        `(${curSum.success - baseSum.success >= 0 ? '+' : ''}${curSum.success - baseSum.success})`,
    );
    lines.push(`- Latency p50: ${baseSum.p50}ms → ${curSum.p50}ms`);
    lines.push(`- Latency p95: ${baseSum.p95}ms → ${curSum.p95}ms`);
    lines.push(``);
  }

  lines.push(`## Cases`);
  lines.push(``);
  lines.push(`| id | category | success | reason | ms | exercise |`);
  lines.push(`| --- | --- | --- | --- | --- | --- |`);
  for (const r of current) {
    lines.push(
      `| ${r.caseId} | ${r.category} | ${r.success ? '✓' : '✗'} | ${r.failureReason} | ${r.latencyMs} | ${r.exerciseName ?? ''} |`,
    );
  }
  lines.push(``);

  lines.push(`## Failures detail`);
  lines.push(``);
  for (const r of current.filter((x) => !x.success)) {
    lines.push(`- **${r.caseId}** (${r.category}): "${r.text}"`);
    lines.push(`  - reason: ${r.failureReason}`);
    if (r.errorMessage) lines.push(`  - error: ${r.errorMessage}`);
  }

  const outPath = path.join(path.dirname(currentPath), 'report.md');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${outPath}`);
}

main();
