import { CollaborationManager, WebMirrorManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/collab` — manage collaborative sessions with multiple agents.
 *
 *   /collab create <name>              — create a new collaboration session
 *   /collab list                       — list all collaboration sessions
 *   /collab join <session-id>          — join an existing session
 *   /collab mirror <session-id>        — start web UI mirror for session
 *   /collab status <session-id>        — show session status and participants
 *   /collab leave <session-id>         — leave a collaboration session
 *   /collab close <session-id>         — close a collaboration session
 */
export function buildCollabCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'collab',
    description: 'Manage collaborative sessions with multiple agents.',
    category: 'collab',
    usage: '/collab <create|list|join|mirror|status|leave|close> [args...]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `collab-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /collab <create|list|join|mirror|status|leave|close> [args...]');
        return;
      }

      const command = parts[0];
      const collabManager = new CollaborationManager();
      const mirrorManager = new WebMirrorManager();

      switch (command) {
        case 'create':
          if (parts.length < 2) {
            reply('Usage: /collab create <session-name>');
            return;
          }
          const name = parts.slice(1).join(' ');
          const session = collabManager.createSession(name, 'current-agent');
          reply(`Created collaboration session:\n  ID: ${session.id}\n  Name: ${name}\n  Participants: 1\n\nUse "/collab mirror ${session.id}" to start web UI mirror.`);
          break;

        case 'list':
          const sessions = collabManager.listSessions();
          if (sessions.length === 0) {
            reply('No collaboration sessions found.');
            return;
          }
          const lines = ['Collaboration sessions:'];
          for (const s of sessions) {
            const status = s.status === 'active' ? '🟢' : s.status === 'paused' ? '⏸️' : '⏹️';
            lines.push(`${status} ${s.name} (${s.id.slice(0, 8)}…)`);
            lines.push(`   Participants: ${s.participants.length}`);
            lines.push(`   Created: ${new Date(s.createdAt).toLocaleString()}`);
            lines.push('');
          }
          reply(lines.join('\n'));
          break;

        case 'join':
          if (parts.length < 2) {
            reply('Usage: /collab join <session-id>');
            return;
          }
          const sessionId = parts[1];
          if (!sessionId) {
            reply('Session ID is required.');
            return;
          }
          const joinSuccess = collabManager.addParticipant(sessionId, 'current-agent');
          if (joinSuccess) {
            const updatedSession = collabManager.getSession(sessionId);
            if (updatedSession) {
              reply(`Joined collaboration session "${updatedSession.name}".\nParticipants: ${updatedSession.participants.length}`);
            } else {
              reply(`Joined session but failed to retrieve details.`);
            }
          } else {
            reply(`Failed to join session "${sessionId}". Does it exist or are you already a participant?`);
          }
          break;

        case 'mirror':
          if (parts.length < 2) {
            reply('Usage: /collab mirror <session-id>');
            return;
          }
          const mirrorSessionId = parts[1];
          if (!mirrorSessionId) {
            reply('Session ID is required.');
            return;
          }
          const targetSession = collabManager.getSession(mirrorSessionId);
          if (!targetSession) {
            reply(`Session "${mirrorSessionId}" not found.`);
            return;
          }
          
          const existingMirror = mirrorManager.getMirrorBySession(mirrorSessionId);
          if (existingMirror) {
            const url = mirrorManager.getMirrorUrl(existingMirror.id);
            if (url) {
              reply(`Web mirror already running for this session.\nURL: ${url}`);
            } else {
              reply(`Web mirror already running but URL unavailable.`);
            }
            return;
          }

          const mirror = mirrorManager.createMirror(mirrorSessionId, targetSession.name);
          const url = mirrorManager.getMirrorUrl(mirror.id);
          if (url) {
            reply(`Started web UI mirror for session "${targetSession.name}".\nURL: ${url}\nMirror ID: ${mirror.id}\n\nShare this URL with other participants to enable live collaboration.`);
          } else {
            reply(`Started web UI mirror but URL unavailable.`);
          }
          break;

        case 'status':
          if (parts.length < 2) {
            reply('Usage: /collab status <session-id>');
            return;
          }
          const statusSessionId = parts[1];
          if (!statusSessionId) {
            reply('Session ID is required.');
            return;
          }
          const statusSession = collabManager.getSession(statusSessionId);
          if (!statusSession) {
            reply(`Session "${statusSessionId}" not found.`);
            return;
          }

          const sessionMirror = mirrorManager.getMirrorBySession(statusSessionId);
          const statusLines = [
            `Session: ${statusSession.name} (${statusSession.id})`,
            `Status: ${statusSession.status}`,
            `Created: ${new Date(statusSession.createdAt).toLocaleString()}`,
            `Participants: ${statusSession.participants.length}`,
            `Worktrees: ${Object.keys(statusSession.worktrees).length}`,
            `Web Mirror: ${sessionMirror ? `Running on port ${sessionMirror.port}` : 'Not started'}`,
            '',
            'Participants:',
            ...statusSession.participants.map(p => `  - ${p}`),
            '',
            'Worktrees:',
            ...Object.entries(statusSession.worktrees).map(([agent, path]) => `  - ${agent}: ${path}`),
            '',
            'Shared Context:',
            ...Object.entries(statusSession.sharedContext).map(([key, value]) => `  - ${key}: ${JSON.stringify(value)}`),
          ];
          reply(statusLines.join('\n'));
          break;

        case 'leave':
          if (parts.length < 2) {
            reply('Usage: /collab leave <session-id>');
            return;
          }
          const leaveSessionId = parts[1];
          if (!leaveSessionId) {
            reply('Session ID is required.');
            return;
          }
          // Note: This is a simplified implementation
          reply(`Left collaboration session "${leaveSessionId}".\nNote: Full participant removal would require tracking current agent ID.`);
          break;

        case 'close':
          if (parts.length < 2) {
            reply('Usage: /collab close <session-id>');
            return;
          }
          const closeSessionId = parts[1];
          if (!closeSessionId) {
            reply('Session ID is required.');
            return;
          }
          const closeSuccess = collabManager.deleteSession(closeSessionId);
          if (closeSuccess) {
            // Also close the mirror if it exists
            const closeMirror = mirrorManager.getMirrorBySession(closeSessionId);
            if (closeMirror) {
              mirrorManager.stopMirror(closeMirror.id);
            }
            reply(`Closed collaboration session "${closeSessionId}" and stopped any associated mirrors.`);
          } else {
            reply(`Failed to close session "${closeSessionId}". Does it exist?`);
          }
          break;

        default:
          reply(`Unknown command "${command}". Use: create, list, join, mirror, status, leave, close`);
          break;
      }
    },
  };
}

/**
 * `/worktree` — manage git worktrees for parallel agent work.
 *
 *   /worktree create <session-id> [branch]  — create a worktree for current agent
 *   /worktree list <session-id>             — list worktrees in session
 *   /worktree sync <session-id>             — sync changes back to main branch
 */
export function buildWorktreeCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'worktree',
    description: 'Manage git worktrees for parallel agent work.',
    category: 'collab',
    usage: '/worktree <create|list|sync> <session-id> [branch]',
    run: (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `worktree-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length < 2) {
        reply('Usage: /worktree <create|list|sync> <session-id> [branch]');
        return;
      }

      const command = parts[0];
      const sessionId = parts[1];
      if (!sessionId) {
        reply('Session ID is required.');
        return;
      }
      const collabManager = new CollaborationManager();

      switch (command) {
        case 'create':
          const branch = parts[2] || 'main';
          const worktreePath = collabManager.createWorktree(sessionId, 'current-agent', branch);
          if (worktreePath) {
            reply(`Created worktree for session "${sessionId}":\n  Path: ${worktreePath}\n  Branch: ${branch}\n\nNote: Actual git worktree creation would run \`git worktree add ${worktreePath} ${branch}\``);
          } else {
            reply(`Failed to create worktree. Does session "${sessionId}" exist?`);
          }
          break;

        case 'list':
          const session = collabManager.getSession(sessionId);
          if (!session) {
            reply(`Session "${sessionId}" not found.`);
            return;
          }
          if (Object.keys(session.worktrees).length === 0) {
            reply(`No worktrees found for session "${sessionId}".`);
            return;
          }
          const worktreeLines = [`Worktrees for session "${sessionId}":`];
          for (const [agentId, path] of Object.entries(session.worktrees)) {
            worktreeLines.push(`  ${agentId}: ${path}`);
          }
          reply(worktreeLines.join('\n'));
          break;

        case 'sync':
          reply(`Sync feature not yet implemented. Would run \`git push\` from worktree and \`git pull\` in main branch for session "${sessionId}".`);
          break;

        default:
          reply(`Unknown command "${command}". Use: create, list, sync`);
          break;
      }
    },
  };
}
