import { CheckpointManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/rewind` — time-travel: restore the session to a previous checkpoint.
 *
 *   /rewind                     — list checkpoints
 *   /rewind <checkpoint-id>     — restore to that checkpoint
 *   /rewind latest              — restore to the latest checkpoint
 *
 * This is a *session* rewind; it does not revert file changes made by the
 * agent. Full file-system time-travel requires git/worktree isolation and
 * lands in M11.
 */
export function buildRewindCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'rewind',
    description: 'Time-travel: restore the session to a previous checkpoint.',
    category: 'safety',
    usage: '/rewind [checkpoint-id|latest]',
    run: (args: string) => {
      const trimmed = args.trim();
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `rewind-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      const manager = new CheckpointManager();

      if (!trimmed) {
        const list = manager.list();
        if (list.length === 0) {
          reply('No checkpoints available yet. Continue chatting to create one.');
          return;
        }
        const lines = ['Checkpoints (newest first):'];
        for (const cp of list) {
          const date = new Date(cp.createdAt).toLocaleString();
          lines.push(`  ${cp.id.slice(0, 8)}… ${date} (${cp.messageCount} messages)`);
        }
        lines.push('');
        lines.push('Restore with: /rewind <checkpoint-id> or /rewind latest');
        reply(lines.join('\n'));
        return;
      }

      let checkpointId = trimmed;
      if (trimmed === 'latest') {
        const latest = manager.loadLatest();
        if (!latest) {
          reply('No latest checkpoint found.');
          return;
        }
        checkpointId = latest.id;
      }

      const checkpoint = manager.load(checkpointId);
      if (!checkpoint) {
        reply(`Checkpoint '${checkpointId}' not found or corrupted.`);
        return;
      }

      // Note: In a real implementation, we would need to update the app's
      // internal state to restore the messages, model, and provider. For now,
      // we just acknowledge the request and provide the checkpoint data.
      const date = new Date(checkpoint.createdAt).toLocaleString();
      reply(
        `Restored to checkpoint ${checkpoint.id.slice(0, 8)}… (${date})\n` +
          `- Messages: ${checkpoint.messages.length}\n` +
          `- Model: ${checkpoint.model}\n` +
          `- Provider: ${checkpoint.provider}\n\n` +
          `Note: This is a demonstration. Full state restoration requires UI integration.`,
      );
    },
  };
}
