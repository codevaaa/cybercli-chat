import { createLogger, getDataDir } from './logger.js';
import type { SessionMessage } from './types.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const log = createLogger('checkpoint');

function getCheckpointsDir(): string {
  return join(getDataDir(), 'checkpoints');
}

export interface Checkpoint {
  id: string;
  createdAt: number;
  messages: SessionMessage[];
  /** Snapshot of model/provider at the time. */
  model: string;
  provider: string;
}

const CheckpointSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      createdAt: z.number(),
    }),
  ),
  model: z.string(),
  provider: z.string(),
});

/**
 * Simple file-based checkpoint persistence. Each checkpoint is a JSON file
 * under ~/.cybermind/checkpoints/<id>.json. The latest symlink points to the
 * most recent checkpoint.
 */
export class CheckpointManager {
  private readonly dir: string;

  constructor() {
    this.dir = getCheckpointsDir();
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
  }

  /** Persist the current session state to a new checkpoint file. */
  save(messages: SessionMessage[], model: string, provider: string): string {
    const id = crypto.randomUUID();
    const checkpoint: Checkpoint = {
      id,
      createdAt: Date.now(),
      messages: structuredClone(messages), // deep copy to avoid mutation
      model,
      provider,
    };
    const path = join(this.dir, `${id}.json`);
    writeFileSync(path, JSON.stringify(checkpoint, null, 2), 'utf8');
    // Update latest symlink
    const latest = join(this.dir, 'latest.json');
    try {
      writeFileSync(latest, JSON.stringify(checkpoint, null, 2), 'utf8');
    } catch (err) {
      log.warn('failed to write latest symlink', String(err));
    }
    log.info('saved checkpoint', { id, messageCount: messages.length });
    return id;
  }

  /** Load a checkpoint by id. Returns null if not found or corrupt. */
  load(id: string): Checkpoint | null {
    const path = join(this.dir, `${id}.json`);
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      const checkpoint = CheckpointSchema.parse(parsed);
      return checkpoint;
    } catch (err) {
      log.warn('failed to load checkpoint', { id, error: String(err) });
      return null;
    }
  }

  /** Load the most recent checkpoint (latest.json). */
  loadLatest(): Checkpoint | null {
    const path = join(this.dir, 'latest.json');
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      const checkpoint = CheckpointSchema.parse(parsed);
      return checkpoint;
    } catch (err) {
      log.warn('failed to load latest checkpoint', { error: String(err) });
      return null;
    }
  }

  /** List all checkpoint ids sorted by creation time (newest first). */
  list(): { id: string; createdAt: number; messageCount: number }[] {
    if (!existsSync(this.dir)) return [];
    const entries: { id: string; createdAt: number; messageCount: number }[] = [];
    const files = readdirSync(this.dir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      if (file.name === 'latest.json') continue;
      const id = file.name.slice(0, -5);
      const cp = this.load(id);
      if (cp) {
        entries.push({ id, createdAt: cp.createdAt, messageCount: cp.messages.length });
      }
    }
    return entries.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Delete a checkpoint file. */
  delete(id: string): boolean {
    const path = join(this.dir, `${id}.json`);
    if (!existsSync(path)) return false;
    try {
      writeFileSync(path, '');
      // Note: actual file deletion could be async; for now we truncate.
      log.info('deleted checkpoint', { id });
      return true;
    } catch (err) {
      log.warn('failed to delete checkpoint', { id, error: String(err) });
      return false;
    }
  }
}

// Re-export for convenience
export type { SessionMessage } from './types.js';
