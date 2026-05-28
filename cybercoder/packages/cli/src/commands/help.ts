import type { CommandContext, SlashCommandHandler } from './index.js';

const CATEGORY_ORDER: Array<SlashCommandHandler['category']> = [
  'session',
  'agent',
  'skills',
  'auth',
  'config',
  'safety',
  'collab',
  'cyber',
  'utility',
];

const CATEGORY_LABEL: Record<SlashCommandHandler['category'], string> = {
  session: 'Session',
  agent: 'Agent',
  skills: 'Skills',
  auth: 'Auth',
  config: 'Config',
  safety: 'Safety',
  collab: 'Collaboration',
  cyber: 'Cyber',
  utility: 'Utility',
};

export function buildHelpCommand(
  ctx: CommandContext,
  getAll: () => SlashCommandHandler[],
): SlashCommandHandler {
  return {
    name: 'help',
    description: 'Show all available slash commands grouped by category.',
    category: 'session',
    aliases: ['?'],
    usage: '/help [command]',
    run: (args: string) => {
      const filter = args.trim();
      const all = getAll().filter((c) => !c.hidden);

      if (filter) {
        const match = all.find((c) => c.name === filter || c.aliases?.includes(filter));
        if (!match) {
          ctx.appendMessage({
            id: `help-${Date.now()}`,
            role: 'system',
            content: `No command named /${filter}. Type /help with no arguments to list all.`,
            createdAt: Date.now(),
          });
          return;
        }
        ctx.appendMessage({
          id: `help-${Date.now()}`,
          role: 'system',
          content: formatOne(match),
          createdAt: Date.now(),
        });
        return;
      }

      const grouped: Record<string, SlashCommandHandler[]> = {};
      for (const c of all) (grouped[c.category] ??= []).push(c);

      const lines: string[] = [];
      lines.push('CyberMind slash commands:');
      for (const cat of CATEGORY_ORDER) {
        const cmds = grouped[cat];
        if (!cmds?.length) continue;
        lines.push('');
        lines.push(`  ${CATEGORY_LABEL[cat]}`);
        for (const c of cmds.sort((a, b) => a.name.localeCompare(b.name))) {
          const aliasNote = c.aliases?.length ? ` (aliases: ${c.aliases.map((a) => `/${a}`).join(', ')})` : '';
          lines.push(`    /${c.name.padEnd(16)} ${c.description}${aliasNote}`);
        }
      }
      lines.push('');
      lines.push('  Type /help <name> for usage of a specific command.');

      ctx.appendMessage({
        id: `help-${Date.now()}`,
        role: 'system',
        content: lines.join('\n'),
        createdAt: Date.now(),
      });
    },
  };
}

function formatOne(c: SlashCommandHandler): string {
  const lines: string[] = [];
  lines.push(`/${c.name} — ${c.description}`);
  if (c.aliases?.length) lines.push(`  aliases: ${c.aliases.map((a) => `/${a}`).join(', ')}`);
  if (c.usage) lines.push(`  usage:   ${c.usage}`);
  lines.push(`  category: ${c.category}`);
  return lines.join('\n');
}
