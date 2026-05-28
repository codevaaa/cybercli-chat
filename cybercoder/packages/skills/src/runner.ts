import { runAgentLoop, type AgentEvent, type AgentTool } from '@cybermind/core';
import type { LLMProvider, ProviderMessage } from '@cybermind/providers';
import { createLogger } from '@cybermind/shared';
import type { Skill } from './types.js';

const log = createLogger('skills:runner');

export interface SpawnSubagentOptions {
  /** The skill to invoke. */
  skill: Skill;
  /** The user prompt to give the sub-agent. */
  prompt: string;
  /** Provider used by the sub-agent. Usually the main session's router. */
  provider: LLMProvider;
  /** Pool of tools available to the sub-agent before filtering by skill.requires.tools. */
  toolPool: AgentTool[];
  /** Optional sub-agent model override. */
  model?: string;
  /** Forward sub-agent events to the caller (e.g. for UI streaming). */
  onEvent?: (evt: AgentEvent) => void;
  /** Hard cap on iterations the sub-agent may run. */
  maxIterations?: number;
  /** Abort signal for the entire sub-agent run. */
  signal?: AbortSignal;
}

export interface SubagentResult {
  /** Concatenated assistant text output by the sub-agent — its "answer". */
  summary: string;
  /** Number of tool calls the sub-agent issued. */
  toolCalls: number;
  /** Token usage if any provider reported it. */
  usage: { inputTokens: number; outputTokens: number };
  /** Final loop status. */
  reason: 'end_turn' | 'max_iterations' | 'error';
  error?: string;
}

/**
 * Build the system prompt that frames a sub-agent. Combines the skill body
 * with a strict instruction to keep its work isolated and produce a concise
 * final summary.
 */
function buildSubagentSystemPrompt(skill: Skill): string {
  return [
    `You are the "${skill.frontmatter.name}" sub-agent inside CyberMind CLI.`,
    skill.frontmatter.description,
    '',
    skill.body,
    '',
    'Rules:',
    '- You run in an isolated context; the user only sees your final summary.',
    '- Be concise. Prefer code/path references over prose.',
    '- When you have completed the task, stop calling tools and emit one final',
    '  message summarising what you found / did.',
  ].join('\n');
}

/**
 * Filter the available tool pool to only the tools this skill declared it
 * needs. If `requires.tools` is empty the skill gets *no* tools (pure-LLM mode),
 * which keeps untrusted skills safe by default.
 */
function selectTools(skill: Skill, pool: AgentTool[]): AgentTool[] {
  const allowed = new Set(skill.frontmatter.requires.tools);
  if (allowed.size === 0) return [];
  return pool.filter((t) => allowed.has(t.schema.name));
}

/**
 * Spawn a sub-agent that runs the given skill with the given user prompt.
 * Returns once the sub-agent emits end_turn (or hits max iterations).
 */
export async function spawnSubagent(opts: SpawnSubagentOptions): Promise<SubagentResult> {
  const { skill, prompt, provider, toolPool } = opts;
  const tools = selectTools(skill, toolPool);
  const systemPrompt = buildSubagentSystemPrompt(skill);

  const messages: ProviderMessage[] = [{ role: 'user', content: prompt }];

  let summary = '';
  let toolCalls = 0;
  let usage = { inputTokens: 0, outputTokens: 0 };
  let reason: SubagentResult['reason'] = 'end_turn';
  let error: string | undefined;

  log.debug('spawning subagent', {
    skill: skill.frontmatter.name,
    tools: tools.map((t) => t.schema.name),
  });

  for await (const evt of runAgentLoop(messages, {
    provider,
    systemPrompt,
    model: opts.model ?? 'auto',
    tools,
    maxIterations: opts.maxIterations ?? 6,
    signal: opts.signal,
  })) {
    opts.onEvent?.(evt);
    if (evt.type === 'text') summary += evt.text;
    else if (evt.type === 'tool_call') toolCalls++;
    else if (evt.type === 'usage') {
      usage.inputTokens += evt.inputTokens;
      usage.outputTokens += evt.outputTokens;
    } else if (evt.type === 'done') {
      reason = evt.reason === 'max_iterations' ? 'max_iterations' : evt.reason === 'error' ? 'error' : 'end_turn';
      error = evt.error;
    }
  }

  return { summary: summary.trim(), toolCalls, usage, reason, error };
}
