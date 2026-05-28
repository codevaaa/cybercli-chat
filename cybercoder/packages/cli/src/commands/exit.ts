import type { CommandContext, SlashCommandHandler } from './index.js';

export function buildExitCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'exit',
    description: 'Quit CyberMind.',
    category: 'session',
    aliases: ['quit', 'q'],
    usage: '/exit',
    run: () => {
      ctx.appendMessage({
        id: `exit-${Date.now()}`,
        role: 'system',
        content: 'Goodbye. Run `cybermind` again any time.',
        createdAt: Date.now(),
      });
      // Slight delay so the goodbye message renders before Ink unmounts.
      setTimeout(() => ctx.exit(), 80);
    },
  };
}
