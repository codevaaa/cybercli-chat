import { SecretsVault } from '@cybermind/tools';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/secret` — manage the encrypted secrets vault at ~/.cybermind/secrets.enc.
 *
 *   /secret list
 *   /secret set NAME=value           (value may contain spaces)
 *   /secret get NAME                 (prints to chat once — handle with care)
 *   /secret remove NAME
 *
 * Secrets are AES-256-GCM encrypted on disk; they are auto-injected into
 * tool environments (run_command) but are NEVER sent to the LLM.
 */
export function buildSecretCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'secret',
    description: 'Manage the encrypted secrets vault (~/.cybermind/secrets.enc).',
    category: 'safety',
    usage: '/secret list | /secret set NAME=value | /secret get NAME | /secret remove NAME',
    run: (args: string) => {
      const trimmed = args.trim();
      const vault = new SecretsVault();
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `secret-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (!trimmed || trimmed === 'list') {
        const names = vault.list();
        if (names.length === 0) {
          reply('Vault is empty. Use /secret set NAME=value to add one.');
        } else {
          reply(`Stored secrets (names only):\n  ${names.join('\n  ')}`);
        }
        return;
      }

      const spaceIdx = trimmed.indexOf(' ');
      const sub = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
      const rest = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

      if (sub === 'set') {
        const eq = rest.indexOf('=');
        if (eq === -1) {
          reply('Usage: /secret set NAME=value');
          return;
        }
        const name = rest.slice(0, eq).trim();
        const value = rest.slice(eq + 1);
        if (!name) {
          reply('Secret name must be non-empty.');
          return;
        }
        vault.set(name, value);
        reply(`Stored secret '${name}'.`);
        return;
      }
      if (sub === 'get') {
        const value = vault.get(rest);
        if (value === undefined) reply(`No secret named '${rest}'.`);
        else reply(`${rest}=${value}`);
        return;
      }
      if (sub === 'remove' || sub === 'delete' || sub === 'rm') {
        const ok = vault.remove(rest);
        reply(ok ? `Removed secret '${rest}'.` : `No secret named '${rest}'.`);
        return;
      }
      reply(`Unknown subcommand '${sub}'. Try /secret list, /secret set NAME=value, /secret get NAME, /secret remove NAME.`);
    },
  };
}
