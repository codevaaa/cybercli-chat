import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentTool } from '../types.js';

export const editTool: AgentTool = {
  schema: {
    name: 'edit',
    description:
      'Replace an exact string in a file with a new string. The old_string must appear exactly once unless replace_all is true. Use for surgical code edits; create new files with write_file instead.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        old_string: { type: 'string', description: 'Exact text to replace, including indentation.' },
        new_string: { type: 'string', description: 'Replacement text.' },
        replace_all: { type: 'boolean', default: false },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  destructive: true,
  async execute(input, ctx) {
    const path = String(input.path ?? '');
    const oldStr = String(input.old_string ?? '');
    const newStr = String(input.new_string ?? '');
    const replaceAll = Boolean(input.replace_all);

    if (!path) throw new Error('edit requires a path');
    if (!oldStr) throw new Error('edit requires a non-empty old_string');
    if (oldStr === newStr) throw new Error('edit requires old_string !== new_string');

    const abs = resolve(ctx.cwd, path);
    const original = readFileSync(abs, 'utf8');

    if (replaceAll) {
      const count = occurrenceCount(original, oldStr);
      if (count === 0) throw new Error(`No occurrences of old_string found in ${abs}`);
      const next = original.split(oldStr).join(newStr);
      writeFileSync(abs, next, 'utf8');
      return `Replaced ${count} occurrence(s) in ${abs}.`;
    }

    const idx = original.indexOf(oldStr);
    if (idx === -1) throw new Error(`old_string not found in ${abs}`);
    if (original.indexOf(oldStr, idx + 1) !== -1) {
      throw new Error(
        `old_string is not unique in ${abs}; provide a longer surrounding snippet or set replace_all=true.`,
      );
    }
    const next = original.slice(0, idx) + newStr + original.slice(idx + oldStr.length);
    writeFileSync(abs, next, 'utf8');
    return `Edited ${abs} (${original.length - next.length > 0 ? '-' : '+'}${Math.abs(original.length - next.length)} bytes).`;
  },
};

function occurrenceCount(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = haystack.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}
