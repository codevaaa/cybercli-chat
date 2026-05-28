import { runConsensus } from '@cybermind/core';
import { getRouter } from '../runtime/chat.js';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/consensus N <prompt>` — fan the same prompt out to N providers in parallel
 * and print each response plus a merged digest.
 *
 *   /consensus 3 explain how the agent loop handles tool errors
 *
 * N defaults to 2. The router contributes its available providers (currently
 * cybermind-cloud, anthropic, ollama) up to N. Useful as a sanity check
 * before making a contentious decision.
 */
export function buildConsensusCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'consensus',
    description: 'Run the next prompt across N providers in parallel and merge the answers.',
    category: 'agent',
    usage: '/consensus [N] <prompt>',
    run: async (args: string) => {
      const trimmed = args.trim();
      const reply = (content: string) =>
        ctx.appendMessage({ id: `consensus-${Date.now()}`, role: 'system', content, createdAt: Date.now() });

      if (!trimmed) {
        reply('Usage: /consensus [N] <prompt>. Example: /consensus 3 explain JWT vs sessions.');
        return;
      }

      // Parse leading integer as N; default 2.
      const firstSpace = trimmed.indexOf(' ');
      let n = 2;
      let prompt = trimmed;
      if (firstSpace !== -1) {
        const head = trimmed.slice(0, firstSpace);
        const parsed = Number.parseInt(head, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          n = parsed;
          prompt = trimmed.slice(firstSpace + 1).trim();
        }
      }
      if (!prompt) {
        reply('Usage: /consensus [N] <prompt>. The prompt is required.');
        return;
      }

      const router = getRouter();
      // The router *is* a provider but we want the underlying providers for
      // genuine multi-model consensus. Try the canonical 3 ids.
      const candidates = ['cybermind-cloud', 'anthropic', 'ollama'] as const;
      const providers = candidates
        .map((id) => router.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p && p.info.ready))
        .slice(0, n);

      if (providers.length === 0) {
        reply(
          'No ready providers found. Set CYBERMIND_API_KEY or ANTHROPIC_API_KEY, ' +
            'or make sure Ollama is running on 127.0.0.1:11434.',
        );
        return;
      }

      reply(`Running consensus across ${providers.length} provider(s): ${providers.map((p) => p.info.id).join(', ')}…`);

      try {
        const result = await runConsensus([{ role: 'user', content: prompt }], { providers });
        const sections: string[] = [];
        for (const r of result.perProvider) {
          sections.push(`## ${r.provider} (${r.model})${r.error ? ' — ERROR' : ''}\n${r.error ?? r.text}`);
        }
        sections.push(`## Merged\n${result.merged || '(empty)'}`);
        reply(sections.join('\n\n'));
      } catch (err) {
        reply(`/consensus failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
