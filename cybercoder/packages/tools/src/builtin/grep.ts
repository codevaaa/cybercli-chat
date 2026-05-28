import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentTool } from '../types.js';

const MAX_MATCHES = 200;
const MAX_FILE_BYTES = 2_000_000;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.next', '.cache']);

export const grepTool: AgentTool = {
  schema: {
    name: 'grep',
    description:
      'Search files for a regex pattern (case-insensitive by default). Returns up to 200 matching lines with file:line prefix. Skips node_modules and other build dirs.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression to search for.' },
        path: { type: 'string', description: 'Directory or file to search. Defaults to cwd.' },
        case_sensitive: { type: 'boolean', default: false },
        include: { type: 'string', description: 'Optional glob-like extension filter, e.g. "*.ts".' },
      },
      required: ['pattern'],
    },
  },
  destructive: false,
  async execute(input, ctx) {
    const pattern = String(input.pattern ?? '');
    if (!pattern) throw new Error('grep requires a pattern');
    const flags = input.case_sensitive ? 'g' : 'gi';
    const re = new RegExp(pattern, flags);

    const root = resolve(ctx.cwd, String(input.path ?? '.'));
    const include = typeof input.include === 'string' ? extToRegex(input.include) : null;
    const matches: string[] = [];

    walk(root, (file) => {
      if (matches.length >= MAX_MATCHES) return false;
      if (include && !include.test(file)) return true;
      try {
        const stat = statSync(file);
        if (stat.size > MAX_FILE_BYTES) return true;
        const text = readFileSync(file, 'utf8');
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && matches.length < MAX_MATCHES; i++) {
          const line = lines[i] ?? '';
          if (re.test(line)) {
            matches.push(`${file}:${i + 1}: ${line}`);
          }
        }
      } catch {
        // ignore unreadable files
      }
      return true;
    });

    if (matches.length === 0) return `(no matches for /${pattern}/${flags})`;
    return matches.join('\n');
  },
};

function extToRegex(glob: string): RegExp {
  // Convert a simple "*.ts" / "*.{ts,tsx}" pattern to a regex.
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`${escaped}$`, 'i');
}

function walk(root: string, visit: (file: string) => boolean): void {
  const stack = [root];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let stat;
    try {
      stat = statSync(cur);
    } catch {
      continue;
    }
    if (stat.isFile()) {
      if (!visit(cur)) return;
      continue;
    }
    if (!stat.isDirectory()) continue;
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
      stack.push(join(cur, e.name));
    }
  }
}
