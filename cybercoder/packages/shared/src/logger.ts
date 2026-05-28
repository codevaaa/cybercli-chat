import chalk from 'chalk';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getLogsDir, getDataDir, getSettingsPath } from './paths.js';

// Re-export getDataDir for checkpoint module
export { getDataDir };

// Re-export getSettingsPath for profiles module
export { getSettingsPath };

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const COLOR: Record<Level, (s: string) => string> = {
  debug: (s) => chalk.gray(s),
  info: (s) => chalk.cyan(s),
  warn: (s) => chalk.yellow(s),
  error: (s) => chalk.red(s),
};

const envLevel = (process.env.CYBERMIND_LOG_LEVEL ?? 'info').toLowerCase() as Level;
const minLevel = LEVEL_ORDER[envLevel] ?? LEVEL_ORDER.info;
const writeToFile = process.env.CYBERMIND_LOG_FILE !== 'false';

let logFilePath: string | null = null;

function ensureLogFile(): string {
  if (logFilePath) return logFilePath;
  const dir = getLogsDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  logFilePath = join(dir, `cybermind-${stamp}.log`);
  return logFilePath;
}

function emit(level: Level, scope: string, message: string, data?: unknown): void {
  if (LEVEL_ORDER[level] < minLevel) return;

  const ts = new Date().toISOString();
  const tag = `[${level.toUpperCase()}]`.padEnd(7);
  const head = `${chalk.dim(ts)} ${COLOR[level](tag)} ${chalk.dim(`(${scope})`)}`;
  const dataStr = data !== undefined ? ` ${safeStringify(data)}` : '';

  // Stderr so we never pollute stdout (which may be piped to other tools).
  if (level === 'error' || level === 'warn' || process.env.CYBERMIND_LOG_STDERR === 'true') {
    process.stderr.write(`${head} ${message}${dataStr}\n`);
  }

  if (writeToFile) {
    try {
      const file = ensureLogFile();
      appendFileSync(file, `${ts} ${level.toUpperCase()} (${scope}) ${message}${dataStr}\n`, {
        encoding: 'utf8',
      });
    } catch {
      // Never crash on logging failures.
    }
  }
}

function safeStringify(data: unknown): string {
  try {
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch {
    return String(data);
  }
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  child: (subScope: string) => Logger;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (m, d) => emit('debug', scope, m, d),
    info: (m, d) => emit('info', scope, m, d),
    warn: (m, d) => emit('warn', scope, m, d),
    error: (m, d) => emit('error', scope, m, d),
    child: (sub) => createLogger(`${scope}:${sub}`),
  };
}
