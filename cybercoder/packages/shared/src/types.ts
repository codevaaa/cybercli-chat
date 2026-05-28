import { z } from 'zod';

/**
 * Core message types used by the agent loop and UI.
 */
export const RoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type Role = z.infer<typeof RoleSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: RoleSchema,
  content: z.string(),
  createdAt: z.number().int().positive(),
  /** Optional tool call payload when role === 'assistant' issued a tool call. */
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        input: z.record(z.unknown()),
      }),
    )
    .optional(),
  /** Optional reference back to a tool call when role === 'tool'. */
  toolCallId: z.string().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

/** Session messages are the subset used for checkpoints. */
export type SessionMessage = Pick<Message, 'id' | 'role' | 'content' | 'createdAt'>;

/**
 * Slash command descriptor — used by the CLI and `/help`.
 */
export interface SlashCommand {
  name: string;
  description: string;
  /** Optional usage string shown by `/help <name>`. */
  usage?: string;
  /** Category for grouping in `/help`. */
  category?:
    | 'session'
    | 'agent'
    | 'skills'
    | 'auth'
    | 'config'
    | 'safety'
    | 'collab'
    | 'cyber'
    | 'utility';
  /** Hidden from `/help` listing but still executable. */
  hidden?: boolean;
}

/**
 * Provider identifiers.
 */
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'cybermind-cloud' | 'ollama';

/**
 * Approval modes for tool execution.
 */
export type ApprovalMode = 'always-ask' | 'session-bypass' | 'persistent-bypass';

/**
 * Project profile names.
 */
export type ProfileName = 'default' | 'strict-ts' | 'hobby' | 'paranoid';
