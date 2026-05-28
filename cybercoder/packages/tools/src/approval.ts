import { createLogger, getTrustPath } from '@cybermind/shared';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const log = createLogger('tools:approval');

export type ApprovalMode = 'always-ask' | 'session-bypass' | 'persistent-bypass';

export type ApprovalDecision = 'allow' | 'deny' | 'allow-session' | 'allow-persistent';

export interface ApprovalPrompt {
  toolName: string;
  input: Record<string, unknown>;
  /** Short description shown to the user; e.g. "Run command: rm -rf …". */
  summary: string;
  /** True when the tool can mutate user state (write, delete, exec). */
  destructive: boolean;
}

export interface ApprovalUI {
  /**
   * Ask the user for a decision. Implementations may render an Ink dialog
   * (interactive) or auto-deny (CI). Must return the chosen decision.
   */
  ask(prompt: ApprovalPrompt): Promise<ApprovalDecision>;
}

interface TrustStore {
  /** Tool names trusted persistently across sessions. */
  tools: string[];
}

function loadTrustStore(): TrustStore {
  const path = getTrustPath();
  if (!existsSync(path)) return { tools: [] };
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TrustStore>;
    return { tools: Array.isArray(parsed.tools) ? parsed.tools : [] };
  } catch (err) {
    log.warn('failed to load trust store', String(err));
    return { tools: [] };
  }
}

function saveTrustStore(store: TrustStore): void {
  const path = getTrustPath();
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * ApprovalGate decides whether a tool call may proceed. It consults the
 * persistent trust store first, then a session allowlist, then the UI.
 *
 * Behaviour matches the user's requirement: "ek baar bypass approval de de
 * to dobara na puche" — once a tool is allow-persistent'd, no future prompt.
 */
export class ApprovalGate {
  private readonly persistent: Set<string>;
  private readonly sessionAllow = new Set<string>();
  private mode: ApprovalMode = 'always-ask';

  constructor(private readonly ui: ApprovalUI) {
    this.persistent = new Set(loadTrustStore().tools);
  }

  setMode(mode: ApprovalMode): void {
    this.mode = mode;
  }

  /** True if the tool is already trusted (either persistently or for the session). */
  isTrusted(toolName: string): boolean {
    return this.persistent.has(toolName) || this.sessionAllow.has(toolName);
  }

  /** Trust a tool persistently — written to ~/.cybermind/trust.json. */
  trustPersistent(toolName: string): void {
    this.persistent.add(toolName);
    saveTrustStore({ tools: [...this.persistent] });
    log.info('tool persistently trusted', { toolName });
  }

  /** Revoke persistent trust. */
  revoke(toolName: string): void {
    this.persistent.delete(toolName);
    this.sessionAllow.delete(toolName);
    saveTrustStore({ tools: [...this.persistent] });
  }

  listTrusted(): { persistent: string[]; session: string[] } {
    return { persistent: [...this.persistent], session: [...this.sessionAllow] };
  }

  /**
   * Main entry point used by the agent loop. Returns true when the tool call
   * may proceed; false when the user denied.
   */
  async request(prompt: ApprovalPrompt): Promise<boolean> {
    // Persistent-bypass mode: allow everything once user accepted blanket trust.
    if (this.mode === 'persistent-bypass') return true;

    if (this.isTrusted(prompt.toolName)) return true;

    // Session-bypass mode: read-only tools auto-allow; destructive tools still ask.
    if (this.mode === 'session-bypass' && !prompt.destructive) return true;

    const decision = await this.ui.ask(prompt);
    switch (decision) {
      case 'allow':
        return true;
      case 'allow-session':
        this.sessionAllow.add(prompt.toolName);
        return true;
      case 'allow-persistent':
        this.trustPersistent(prompt.toolName);
        return true;
      case 'deny':
      default:
        return false;
    }
  }
}

/**
 * Headless approval UI used by `--print` mode and CI: auto-allows non-destructive
 * tools and denies destructive ones. Real interactive UI is wired in the CLI.
 */
export class HeadlessApprovalUI implements ApprovalUI {
  async ask(prompt: ApprovalPrompt): Promise<ApprovalDecision> {
    return prompt.destructive ? 'deny' : 'allow';
  }
}
