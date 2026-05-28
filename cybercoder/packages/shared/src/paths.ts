import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * All CyberMind state lives under a single root, configurable via env.
 * Default: ~/.cybermind/
 */
export function getHomeDir(): string {
  return process.env.CYBERMIND_HOME
    ? resolve(process.env.CYBERMIND_HOME)
    : join(homedir(), '.cybermind');
}

export function getSettingsPath(): string {
  return join(getHomeDir(), 'settings.json');
}

export function getTrustPath(): string {
  return join(getHomeDir(), 'trust.json');
}

export function getSkillsDir(): string {
  return join(getHomeDir(), 'skills');
}

export function getLogsDir(): string {
  return join(getHomeDir(), 'logs');
}

export function getDataDir(): string {
  return getHomeDir();
}

export function getSessionsDir(): string {
  return join(getHomeDir(), 'sessions');
}

export function getCheckpointsDir(): string {
  return join(getHomeDir(), 'checkpoints');
}

export function getSecretsPath(): string {
  return join(getHomeDir(), 'secrets.enc');
}

export function getMemoryGraphPath(): string {
  return join(getHomeDir(), 'memory.db');
}

/**
 * Per-project state goes under <cwd>/.cybermind/.
 */
export function getProjectDir(cwd: string = process.cwd()): string {
  return join(cwd, '.cybermind');
}

export function getProjectSettingsPath(cwd: string = process.cwd()): string {
  return join(getProjectDir(cwd), 'settings.json');
}

export function getProjectSkillsDir(cwd: string = process.cwd()): string {
  return join(getProjectDir(cwd), 'skills');
}

export function getProjectWorkflowsDir(cwd: string = process.cwd()): string {
  return join(getProjectDir(cwd), 'workflows');
}
