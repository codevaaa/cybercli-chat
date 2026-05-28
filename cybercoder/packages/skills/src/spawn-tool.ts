import type { AgentTool, ToolContext } from '@cybermind/core';
import type { LLMProvider } from '@cybermind/providers';
import type { SkillRegistry } from './registry.js';
import { spawnSubagent } from './runner.js';

export interface SpawnToolDeps {
  registry: SkillRegistry;
  provider: LLMProvider;
  /** All tools that *could* be exposed to a sub-agent; the sub-agent will see only the subset its skill declares. */
  toolPool: AgentTool[];
}

/**
 * The `spawn_subagent` tool registered with the *main* agent loop. When the
 * model calls this tool, we run the referenced skill as an isolated sub-agent
 * and return its final summary as the tool's result.
 *
 * This is the canonical way the main agent delegates work to skills like
 * `research`, `plan`, and `code-review`.
 */
export function buildSpawnSubagentTool(deps: SpawnToolDeps): AgentTool {
  return {
    schema: {
      name: 'spawn_subagent',
      description:
        'Spawn an isolated sub-agent that runs the named skill against the given prompt. Use this for read-only exploration (research), planning (plan), code review (code-review), or any other installed skill. Returns the sub-agent\'s final summary as the tool result.',
      inputSchema: {
        type: 'object',
        properties: {
          skill: {
            type: 'string',
            description: 'Name of the skill to invoke. Must match an installed SKILL.md name.',
          },
          prompt: {
            type: 'string',
            description: 'The task description / user prompt to give the sub-agent.',
          },
        },
        required: ['skill', 'prompt'],
      },
    },
    async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
      const name = String(input.skill ?? '').trim();
      const prompt = String(input.prompt ?? '').trim();
      if (!name) return 'Error: spawn_subagent requires a non-empty "skill" name.';
      if (!prompt) return 'Error: spawn_subagent requires a non-empty "prompt".';

      const skill = deps.registry.get(name);
      if (!skill) {
        const available = deps.registry
          .list()
          .map((s) => s.frontmatter.name)
          .join(', ');
        return `Error: skill "${name}" is not installed. Available skills: ${available || '(none)'}`;
      }

      const result = await spawnSubagent({
        skill,
        prompt,
        provider: deps.provider,
        toolPool: deps.toolPool,
      });

      if (result.reason === 'error') {
        return `[sub-agent ${name} failed: ${result.error ?? 'unknown'}]`;
      }
      if (result.reason === 'max_iterations') {
        return `[sub-agent ${name} hit iteration cap]\n\n${result.summary}`;
      }
      return result.summary || `[sub-agent ${name} completed with no output]`;
    },
  };
}
