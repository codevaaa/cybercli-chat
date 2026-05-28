import { loadAllSkills, type LoadSkillsOptions } from './loader.js';
import type { Skill } from './types.js';

/**
 * Lazy, lookup-friendly view over the loaded skill set. Designed to be created
 * once per CLI session and shared across slash commands / the spawn_subagent
 * tool. Call `reload()` after the user installs/uninstalls a skill.
 */
export class SkillRegistry {
  private skills: Skill[] = [];
  private byName = new Map<string, Skill>();

  constructor(private readonly opts: LoadSkillsOptions = {}) {
    this.reload();
  }

  reload(): void {
    this.skills = loadAllSkills(this.opts);
    this.byName.clear();
    for (const s of this.skills) this.byName.set(s.frontmatter.name, s);
  }

  list(): Skill[] {
    return [...this.skills];
  }

  get(name: string): Skill | undefined {
    return this.byName.get(name);
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  /** Group skills by source for /skills UI output. */
  bySource(): Record<Skill['source'], Skill[]> {
    const out: Record<Skill['source'], Skill[]> = {
      bundled: [],
      user: [],
      project: [],
      marketplace: [],
    };
    for (const s of this.skills) out[s.source].push(s);
    return out;
  }
}
