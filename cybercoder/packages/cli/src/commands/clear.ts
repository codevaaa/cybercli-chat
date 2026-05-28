import type { CommandContext, SlashCommandHandler } from './index.js';

export function buildClearCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'clear',
    description: 'Clear the current conversation and hide the welcome card.',
    category: 'session',
    usage: '/clear',
    run: () => {
      ctx.clear();
    },
  };
}
