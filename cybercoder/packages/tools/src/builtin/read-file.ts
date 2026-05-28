import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentTool } from '../types.js';

const MAX_BYTES = 1_000_000; // 1 MB safety cap

export const readFileTool: AgentTool = {
  schema: {
    name: 'read_file',
    description:
      'Read the contents of a file at the given path. Returns up to ~1MB of UTF-8 text with 1-indexed line numbers. Use an absolute path or one relative to the current working directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path.' },
        offset: { type: 'integer', minimum: 1, description: 'Optional 1-indexed line to start at.' },
        limit: { type: 'integer', minimum: 1, description: 'Optional number of lines to read.' },
      },
      required: ['path'],
    },
  },
  destructive: false,
  async execute(input, ctx) {
    const path = String(input.path ?? '');
    if (!path) throw new Error('read_file requires a non-empty path');
    const abs = resolve(ctx.cwd, path);

    const raw = readFileSync(abs);
    if (raw.byteLength > MAX_BYTES) {
      const truncated = raw.subarray(0, MAX_BYTES).toString('utf8');
      return numberLines(truncated, input.offset as number | undefined, input.limit as number | undefined) +
        `\n\n[truncated: file is ${raw.byteLength} bytes, only first ${MAX_BYTES} shown]`;
    }
    return numberLines(raw.toString('utf8'), input.offset as number | undefined, input.limit as number | undefined);
  },
};

function numberLines(text: string, offset?: number, limit?: number): string {
  const lines = text.split('\n');
  const start = Math.max(1, offset ?? 1);
  const end = limit ? Math.min(lines.length, start + limit - 1) : lines.length;
  const slice = lines.slice(start - 1, end);
  const width = String(end).length;
  return slice.map((l, i) => `${String(start + i).padStart(width, ' ')}\t${l}`).join('\n');
}
