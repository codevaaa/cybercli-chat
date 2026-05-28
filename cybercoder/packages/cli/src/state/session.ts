export type SessionRole = 'user' | 'assistant' | 'system' | 'tool';

export interface SessionMessage {
  id: string;
  role: SessionRole;
  content: string;
  createdAt: number;
}

export type SessionStatus = 'idle' | 'thinking' | 'awaiting-approval' | 'error';
