import type { CommandContext, SlashCommandHandler } from './index.js';

const ALLOWED = new Set([
  'cyan',
  'magenta',
  'green',
  'yellow',
  'blue',
  'red',
  'white',
  'gray',
]);

/**
 * `/color <name>` — pick a chalk-compatible accent color for the prompt bar
 * and welcome card. Cosmetic only; resets to cyan on next launch unless a
 * /profile (M10) is saved.
 */
export function buildColorCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'color',
    description: 'Pick an accent color for this session (cyan, magenta, green, yellow, blue, red, white, gray).',
    category: 'config',
    usage: '/color <name>',
    run: (args: string) => {
      const name = args.trim().toLowerCase();
      const reply = (content: string) =>
        ctx.appendMessage({ id: `color-${Date.now()}`, role: 'system', content, createdAt: Date.now() });
      if (!name) {
        reply(`Pick one: ${[...ALLOWED].join(', ')}. Example: /color magenta`);
        return;
      }
      if (!ALLOWED.has(name)) {
        reply(`Unknown color '${name}'. Pick one of: ${[...ALLOWED].join(', ')}.`);
        return;
      }
      if (!ctx.setPromptColor) {
        reply('Color switching is not available in this context.');
        return;
      }
      ctx.setPromptColor(name);
      reply(`Accent color set to ${name}.`);
    },
  };
}
