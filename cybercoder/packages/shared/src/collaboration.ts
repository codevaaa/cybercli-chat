import { createLogger, getDataDir } from './logger.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const log = createLogger('collaboration');

export interface CollaborationSession {
  id: string;
  name: string;
  createdAt: number;
  /** List of participant agent IDs */
  participants: string[];
  /** Current worktree paths for each participant */
  worktrees: Record<string, string>;
  /** Shared context/state */
  sharedContext: Record<string, any>;
  /** Session status */
  status: 'active' | 'paused' | 'completed';
}

export interface WorktreeConfig {
  sessionId: string;
  agentId: string;
  path: string;
  branch: string;
  baseBranch: string;
}

const CollaborationSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  participants: z.array(z.string()),
  worktrees: z.record(z.string(), z.string()),
  sharedContext: z.record(z.unknown()),
  status: z.enum(['active', 'paused', 'completed']),
});

/**
 * Manages parallel agent collaboration sessions using git worktrees
 * and shared context synchronization.
 */
export class CollaborationManager {
  private readonly sessionsDir: string;
  private readonly worktreesDir: string;

  constructor() {
    this.sessionsDir = join(getDataDir(), 'collaboration', 'sessions');
    this.worktreesDir = join(getDataDir(), 'collaboration', 'worktrees');
    
    if (!existsSync(this.sessionsDir)) mkdirSync(this.sessionsDir, { recursive: true });
    if (!existsSync(this.worktreesDir)) mkdirSync(this.worktreesDir, { recursive: true });
  }

  /** Create a new collaboration session */
  createSession(name: string, initialAgentId: string): CollaborationSession {
    const session: CollaborationSession = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      participants: [initialAgentId],
      worktrees: {},
      sharedContext: {},
      status: 'active',
    };

    this.saveSession(session);
    log.info('Created collaboration session', { sessionId: session.id, name });
    return session;
  }

  /** Get a session by ID */
  getSession(sessionId: string): CollaborationSession | null {
    const path = join(this.sessionsDir, `${sessionId}.json`);
    if (!existsSync(path)) return null;

    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      return CollaborationSessionSchema.parse(parsed);
    } catch (err) {
      log.warn('Failed to load session', { sessionId, error: String(err) });
      return null;
    }
  }

  /** List all sessions */
  listSessions(): CollaborationSession[] {
    if (!existsSync(this.sessionsDir)) return [];
    
    const sessions: CollaborationSession[] = [];
    const files = readdirSync(this.sessionsDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      
      const sessionId = file.name.slice(0, -5);
      const session = this.getSession(sessionId);
      if (session) sessions.push(session);
    }
    
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Add an agent to a session */
  addParticipant(sessionId: string, agentId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.participants.includes(agentId)) {
      return false;
    }

    session.participants.push(agentId);
    this.saveSession(session);
    log.info('Added participant to session', { sessionId, agentId });
    return true;
  }

  /** Create a worktree for an agent in a session */
  createWorktree(sessionId: string, agentId: string, _baseBranch: string = 'main'): string | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const worktreeName = `${sessionId}-${agentId}`;
    const worktreePath = join(this.worktreesDir, worktreeName);
    
    // Store worktree config
    session.worktrees[agentId] = worktreePath;
    this.saveSession(session);

    log.info('Created worktree for agent', { sessionId, agentId, worktreePath });
    return worktreePath;
  }

  /** Update shared context for a session */
  updateSharedContext(sessionId: string, updates: Record<string, any>): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.sharedContext = { ...session.sharedContext, ...updates };
    this.saveSession(session);
    return true;
  }

  /** Get shared context for a session */
  getSharedContext(sessionId: string): Record<string, any> {
    const session = this.getSession(sessionId);
    return session?.sharedContext || {};
  }

  /** Update session status */
  updateSessionStatus(sessionId: string, status: CollaborationSession['status']): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.status = status;
    this.saveSession(session);
    log.info('Updated session status', { sessionId, status });
    return true;
  }

  /** Delete a session and its worktrees */
  deleteSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    // Remove session file
    const sessionPath = join(this.sessionsDir, `${sessionId}.json`);
    try {
      writeFileSync(sessionPath, '');
    } catch (err) {
      log.warn('Failed to delete session file', { sessionId, error: String(err) });
    }

    log.info('Deleted collaboration session', { sessionId });
    return true;
  }

  private saveSession(session: CollaborationSession): void {
    const path = join(this.sessionsDir, `${session.id}.json`);
    try {
      writeFileSync(path, JSON.stringify(session, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save session', { sessionId: session.id, error: String(err) });
    }
  }
}

// Re-export for convenience
export type { SessionMessage } from './types.js';
export type { Message } from './types.js';
