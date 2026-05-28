import { ApprovalGate, HeadlessApprovalUI } from '@cybermind/tools';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/trust` — manage persistent tool trust at ~/.cybermind/trust.json.
 *
 *   /trust              — list trusted tools
 *   /trust add <tool>   — trust a tool persistently
 *   /trust remove <tool>— revoke persistent trust
 *
 * The ApprovalGate consulted by the agent loop reads this same file on
 * every chat invocation, so changes take effect on the next tool call.
 */
export function buildTrustCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'trust',
    description: 'Persistently allow a tool without prompting (read/write ~/.cybermind/trust.json).',
    category: 'safety',
    usage: '/trust [add|remove] <tool>',
    run: (args: string) => {
      const [sub, tool] = args.split(/\s+/).filter(Boolean);
      // A transient gate is fine — its constructor reads from disk and its
      // mutators write back, so it is effectively a file-backed view.
      const gate = new ApprovalGate(new HeadlessApprovalUI());
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `trust-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (!sub || sub === 'list') {
        const { persistent } = gate.listTrusted();
        if (persistent.length === 0) {
          reply('No tools persistently trusted. Use /trust add <tool> to add one.');
        } else {
          reply(`Persistently trusted tools:\n  ${persistent.join('\n  ')}`);
        }
        return;
      }
      if (!tool) {
        reply(`/trust ${sub} requires a tool name. Try: /trust add edit`);
        return;
      }
      if (sub === 'add') {
        gate.trustPersistent(tool);
        reply(`Trusted '${tool}' persistently. Future calls will skip the approval prompt.`);
      } else if (sub === 'remove' || sub === 'revoke') {
        gate.revoke(tool);
        reply(`Revoked trust for '${tool}'. Next call will prompt again.`);
      } else {
        reply(`Unknown subcommand '${sub}'. Try /trust, /trust add <tool>, or /trust remove <tool>.`);
      }
    },
  };
}
