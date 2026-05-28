import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { CommandContext, SlashCommandHandler } from './index.js';

const WORKFLOW_DIR = '.cybermind/workflows';

const StepSchema = z.object({
  prompt: z.string().min(1),
  /** Optional human-readable label for the step (shown in transcript). */
  name: z.string().optional(),
});
const WorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  steps: z.array(StepSchema).min(1),
});

/**
 * `/workflow` — run a multi-step YAML workflow from `.cybermind/workflows/`.
 *
 *   /workflow                 — list available workflows in this project
 *   /workflow run <name>      — execute every step sequentially via the agent
 *
 * A workflow file is a YAML document like:
 *
 *   ```yaml
 *   name: nightly-review
 *   description: Run the code-review skill on yesterday's commits.
 *   steps:
 *     - name: pull-diff
 *       prompt: "Use run_command to get `git diff HEAD~1..HEAD` and read it."
 *     - prompt: "Use spawn_subagent with skill='code-review' on the diff above."
 *   ```
 *
 * For M5 the runner is fire-and-forget — each step's prompt is dispatched as
 * a synthesized user message; the user must wait for the agent to finish one
 * step before the next is sent. Proper checkpointed workflows land in M10.
 */
export function buildWorkflowCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'workflow',
    description: 'Run a YAML workflow from .cybermind/workflows/.',
    category: 'utility',
    usage: '/workflow [run <name>]',
    run: async (args: string) => {
      const trimmed = args.trim();
      const reply = (content: string) =>
        ctx.appendMessage({ id: `wf-${Date.now()}`, role: 'system', content, createdAt: Date.now() });
      const workflowsDir = resolve(process.cwd(), WORKFLOW_DIR);

      if (!trimmed || trimmed === 'list') {
        if (!existsSync(workflowsDir)) {
          reply(`No workflows directory at ${workflowsDir}. Create one and add <name>.yml files.`);
          return;
        }
        const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
        if (files.length === 0) {
          reply(`No workflows in ${workflowsDir}.`);
          return;
        }
        reply(`Available workflows:\n  ${files.map((f) => f.replace(/\.(ya?ml)$/, '')).join('\n  ')}`);
        return;
      }

      const spaceIdx = trimmed.indexOf(' ');
      const sub = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const name = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
      if (sub !== 'run' || !name) {
        reply('Usage: /workflow run <name>  (or /workflow to list)');
        return;
      }

      // Resolve `.yml` or `.yaml`.
      let path = '';
      for (const ext of ['.yml', '.yaml']) {
        const candidate = join(workflowsDir, name + ext);
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          path = candidate;
          break;
        }
      }
      if (!path) {
        reply(`Workflow '${name}' not found in ${workflowsDir}.`);
        return;
      }

      let parsed: z.infer<typeof WorkflowSchema>;
      try {
        const raw = readFileSync(path, 'utf8');
        const doc = parseYaml(raw);
        parsed = WorkflowSchema.parse(doc);
      } catch (err) {
        reply(`Failed to parse workflow '${name}': ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      if (!ctx.submitUserPrompt) {
        reply('Workflow execution requires the chat runtime; not available in this context.');
        return;
      }

      reply(
        `Running workflow '${parsed.name ?? name}' (${parsed.steps.length} step(s))…\n` +
          'Note: each step is dispatched sequentially as a synthesized user prompt; ' +
          'the agent runs them one at a time. Checkpointed runs ship in M10.',
      );

      // Fire steps sequentially. Each submitUserPrompt enqueues against the
      // ref-held driveChat which awaits the previous run before starting the
      // next, so steps run serially without us managing a queue here.
      for (let i = 0; i < parsed.steps.length; i++) {
        const step = parsed.steps[i]!;
        reply(`→ step ${i + 1}/${parsed.steps.length}${step.name ? `: ${step.name}` : ''}`);
        ctx.submitUserPrompt(step.prompt);
      }
    },
  };
}
