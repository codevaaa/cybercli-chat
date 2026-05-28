import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AgentTool } from '../types.js';

export const writeFileTool: AgentTool = {
  schema: {
    name: 'write_file',
    description:
      'Create a new file at the given path with the given UTF-8 content. Fails if the file already exists — use edit for modifications. Parent directories are created.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path.' },
        content: { type: 'string', description: 'Full UTF-8 file content.' },
      },
      required: ['path', 'content'],
    },
  },
  destructive: true,
  async execute(input, ctx) {
    const path = String(input.path ?? '');
    const content = String(input.content ?? '');
    if (!path) throw new Error('write_file requires a path');
    const abs = resolve(ctx.cwd, path);
    if (existsSync(abs)) {
      throw new Error(`Refusing to overwrite existing file ${abs}. Use the edit tool instead.`);
    }
    const dir = dirname(abs);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(abs, content, 'utf8');
    return `Wrote ${Buffer.byteLength(content, 'utf8')} bytes to ${abs}.`;
  },
};
