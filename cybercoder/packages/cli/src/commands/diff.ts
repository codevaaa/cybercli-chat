import { CheckpointManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/diff` — compare two checkpoints or show changes since a checkpoint.
 *
 *   /diff                       — show diff between latest and previous
 *   /diff <id>                  — compare <id> with latest
 *   /diff <id1> <id2>           — compare <id1> with <id2>
 *
 * Output is a readable summary of added/removed/modified messages.
 */
export function buildDiffCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'diff',
    description: 'Compare two checkpoints or show changes since a checkpoint.',
    category: 'safety',
    usage: '/diff [<id1> [<id2>]]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `diff-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      const manager = new CheckpointManager();

      if (parts.length === 0) {
        // Show diff between latest and previous
        const list = manager.list();
        if (list.length < 2) {
          reply('Need at least two checkpoints to diff.');
          return;
        }
        const latest = manager.load(list[0]?.id ?? '');
        const previous = manager.load(list[1]?.id ?? '');
        if (!latest || !previous || !list[0]?.id || !list[1]?.id) {
          reply('Could not load checkpoints for diff.');
          return;
        }
        const diff = diffCheckpoints(previous, latest);
        reply(formatDiff(list[1].id, list[0].id, diff));
        return;
      }

      if (parts.length === 1) {
        // Compare <id> with latest
        const id1 = parts[0];
        if (!id1) {
          reply('Invalid checkpoint ID.');
          return;
        }
        const latest = manager.loadLatest();
        const cp1 = manager.load(id1);
        if (!latest || !cp1) {
          reply('Could not load checkpoints for diff.');
          return;
        }
        const diff = diffCheckpoints(cp1, latest);
        reply(formatDiff(id1, latest.id, diff));
        return;
      }

      if (parts.length === 2) {
        // Compare id1 with id2
        const [id1, id2] = parts;
        if (!id1 || !id2) {
          reply('Both checkpoint IDs must be provided.');
          return;
        }
        const cp1 = manager.load(id1);
        const cp2 = manager.load(id2);
        if (!cp1 || !cp2) {
          reply('Could not load checkpoints for diff.');
          return;
        }
        const diff = diffCheckpoints(cp1, cp2);
        reply(formatDiff(id1, id2, diff));
        return;
      }

      reply('Usage: /diff [<id1> [<id2>]]');
    },
  };
}

function diffCheckpoints(from: any, to: any): {
  added: any[];
  removed: any[];
  modified: any[];
} {
  const fromMap = new Map(from.messages.map((m: any) => [m.id, m]));
  const toMap = new Map(to.messages.map((m: any) => [m.id, m]));

  const added: any[] = [];
  const removed: any[] = [];
  const modified: any[] = [];

  for (const [id, msg] of toMap) {
    if (!fromMap.has(id)) {
      added.push(msg);
    } else {
      const fromMsg = fromMap.get(id) as any;
      const toMsg = msg as any;
      if (fromMsg && fromMsg.content !== toMsg.content) {
        modified.push({ id, from: fromMsg, to: toMsg });
      }
    }
  }

  for (const [id, msg] of fromMap) {
    if (!toMap.has(id)) {
      removed.push(msg);
    }
  }

  return { added, removed, modified };
}

function formatDiff(id1: string, id2: string, diff: ReturnType<typeof diffCheckpoints>): string {
  const lines = [
    `Diff: ${id1.slice(0, 8)}… → ${id2.slice(0, 8)}…`,
    '',
  ];

  if (diff.added.length > 0) {
    lines.push(`+ Added (${diff.added.length}):`);
    for (const msg of diff.added.slice(0, 5)) {
      const preview = msg.content.slice(0, 60).replace(/\n/g, ' ');
      lines.push(`  ${msg.role}: ${preview}${msg.content.length > 60 ? '…' : ''}`);
    }
    if (diff.added.length > 5) {
      lines.push(`  ... and ${diff.added.length - 5} more`);
    }
    lines.push('');
  }

  if (diff.removed.length > 0) {
    lines.push(`- Removed (${diff.removed.length}):`);
    for (const msg of diff.removed.slice(0, 5)) {
      const preview = msg.content.slice(0, 60).replace(/\n/g, ' ');
      lines.push(`  ${msg.role}: ${preview}${msg.content.length > 60 ? '…' : ''}`);
    }
    if (diff.removed.length > 5) {
      lines.push(`  ... and ${diff.removed.length - 5} more`);
    }
    lines.push('');
  }

  if (diff.modified.length > 0) {
    lines.push(`~ Modified (${diff.modified.length}):`);
    for (const { from: fromMsg, to: toMsg } of diff.modified.slice(0, 5)) {
      const fromPreview = fromMsg.content.slice(0, 30).replace(/\n/g, ' ');
      const toPreview = toMsg.content.slice(0, 30).replace(/\n/g, ' ');
      lines.push(`  ${fromMsg.role}: "${fromPreview}…" → "${toPreview}…"`);
    }
    if (diff.modified.length > 5) {
      lines.push(`  ... and ${diff.modified.length - 5} more`);
    }
    lines.push('');
  }

  if (diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0) {
    lines.push('No changes.');
  }

  return lines.join('\n');
}
