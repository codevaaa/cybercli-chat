import {
  createLogger,
  getProjectSkillsDir,
  getSkillsDir,
} from '@cybermind/shared';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSkillSource } from './parser.js';
import type { Skill } from './types.js';

const log = createLogger('skills:loader');

/**
 * Resolve the absolute path to `skills-bundled/` shipped inside this package's
 * monorepo. The directory layout differs between dev (loader source lives at
 * `packages/skills/src/loader.ts`) and the bundled CLI (lives at
 * `packages/cli/dist/index.js`), so we walk up from the current file until we
 * find a `skills-bundled/` directory. Falls back to a sensible default that
 * `scanDir` will harmlessly skip if it doesn't exist.
 */
function getBundledDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  // Walk up at most 6 levels — this covers both `packages/skills/src/` (3 up)
  // and `packages/cli/dist/` (2 up) plus any future bundler relocations.
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, 'skills-bundled');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  // Default: monorepo root layout. scanDir() guards on existsSync.
  return resolve(here, '..', '..', '..', 'skills-bundled');
}

/**
 * Discover every SKILL.md under `root`. We treat each immediate subdirectory
 * as a skill folder (the conventional layout).
 */
function scanDir(root: string, source: Skill['source']): Skill[] {
  if (!existsSync(root)) return [];
  const out: Skill[] = [];
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch (err) {
    log.warn('failed to read skills dir', { root, err: String(err) });
    return [];
  }
  for (const name of entries) {
    const folder = join(root, name);
    let stat;
    try {
      stat = statSync(folder);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    const skillFile = join(folder, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    try {
      const raw = readFileSync(skillFile, 'utf8');
      const { frontmatter, body } = parseSkillSource(raw);
      const id = `${source}/${frontmatter.name}`;
      out.push({ id, source, path: skillFile, frontmatter, body });
    } catch (err) {
      log.warn('skipping malformed skill', { skillFile, err: String(err) });
    }
  }
  return out;
}

export interface LoadSkillsOptions {
  cwd?: string;
  /** Override the bundled directory (useful for tests). */
  bundledDir?: string;
  /** Skip a particular source. */
  skip?: Array<Skill['source']>;
}

/**
 * Load every skill from the three standard locations, in precedence order
 * (project > user > bundled). The first occurrence of a given `frontmatter.name`
 * wins so users can shadow bundled skills with project-local overrides.
 */
export function loadAllSkills(opts: LoadSkillsOptions = {}): Skill[] {
  const cwd = opts.cwd ?? process.cwd();
  const skip = new Set(opts.skip ?? []);
  const sources: Array<{ source: Skill['source']; dir: string }> = [];
  if (!skip.has('project')) sources.push({ source: 'project', dir: getProjectSkillsDir(cwd) });
  if (!skip.has('user')) sources.push({ source: 'user', dir: getSkillsDir() });
  if (!skip.has('bundled')) sources.push({ source: 'bundled', dir: opts.bundledDir ?? getBundledDir() });

  const seen = new Set<string>();
  const out: Skill[] = [];
  for (const { source, dir } of sources) {
    for (const skill of scanDir(dir, source)) {
      if (seen.has(skill.frontmatter.name)) continue;
      seen.add(skill.frontmatter.name);
      out.push(skill);
    }
  }
  return out;
}
