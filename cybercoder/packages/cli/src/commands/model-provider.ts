import { getRouter } from '../runtime/chat.js';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/model` — show or switch the active model for this session.
 *
 *   /model           — show current model + first few available from the active provider
 *   /model <name>    — set the active model (used by the next agent turn)
 *
 * The new model takes effect on the next chat turn. Persisting across sessions
 * lands with /profile in M10.
 */
export function buildModelCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'model',
    description: 'Show or switch the active model for this session.',
    category: 'agent',
    usage: '/model [name]',
    run: async (args: string) => {
      const name = args.trim();
      const reply = (content: string) =>
        ctx.appendMessage({ id: `model-${Date.now()}`, role: 'system', content, createdAt: Date.now() });

      if (!name) {
        const current = ctx.getModel?.() ?? '(unknown)';
        let available: string[] = [];
        try {
          available = await getRouter().listModels();
        } catch {
          // Provider may not expose listModels in offline mode.
        }
        const preview = available.slice(0, 8).join(', ');
        reply(
          `Current model: ${current}\n` +
            (preview ? `Available (first 8): ${preview}\n` : '') +
            'Use /model <name> to switch.',
        );
        return;
      }
      if (!ctx.setModel) {
        reply('Model switching is not available in this context.');
        return;
      }
      ctx.setModel(name);
      reply(`Model set to '${name}'. Takes effect on the next message.`);
    },
  };
}

/**
 * `/provider` — show or switch the active LLM provider (cybermind-cloud,
 * anthropic, ollama). Switching here just changes the label the UI shows;
 * the router already auto-falls-back when a provider isn't ready, so the
 * common case is "/provider" with no args to inspect the preferred order.
 */
export function buildProviderCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'provider',
    description: 'Show or switch the active LLM provider (cybermind-cloud, anthropic, ollama).',
    category: 'agent',
    usage: '/provider [id]',
    run: (args: string) => {
      const id = args.trim();
      const reply = (content: string) =>
        ctx.appendMessage({ id: `provider-${Date.now()}`, role: 'system', content, createdAt: Date.now() });

      const router = getRouter();
      const active = router.activeProvider();
      if (!id) {
        reply(
          `Active provider: ${active.info.id} (${active.info.displayName})\n` +
            `Tip: set CYBERMIND_API_KEY or ANTHROPIC_API_KEY in your env for hosted providers; ` +
            `Ollama is the auto-fallback.\nUse /provider <id> to override.`,
        );
        return;
      }
      if (!ctx.setProvider) {
        reply('Provider switching is not available in this context.');
        return;
      }
      ctx.setProvider(id);
      reply(`Preferred provider set to '${id}'. Router still falls back to Ollama if unavailable.`);
    },
  };
}
