import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentTool } from '../types.js';

const MAX_ENTRIES = 200;

export const listDirTool: AgentTool = {
  schema: {
    name: 'list_dir',
    description:
      'List files and directories at the given absolute or relative path. Returns up to 200 entries with type and size.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory to list.' },
      },
      required: ['path'],
    },
  },
  destructive: false,
  async execute(input, ctx) {
    const path = String(input.path ?? '.');
    const abs = resolve(ctx.cwd, path);
    const entries = readdirSync(abs, { withFileTypes: true }).slice(0, MAX_ENTRIES);
    const lines: string[] = [];
    for (const e of entries) {
      const full = join(abs, e.name);
      let size = '';
      try {
        if (e.isFile()) size = `${statSync(full).size}b`;
        else if (e.isDirectory()) size = 'dir';
        else if (e.isSymbolicLink()) size = 'symlink';
      } catch {
        size = '?';
      }
      lines.push(`${size.padEnd(10)} ${e.name}`);
    }
    return lines.length === 0 ? '(empty directory)' : lines.join('\n');
  },
};
