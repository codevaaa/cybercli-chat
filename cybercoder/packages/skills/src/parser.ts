import { parse as parseYaml } from 'yaml';
import { SkillFrontmatterSchema, type SkillFrontmatter } from './types.js';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Split a SKILL.md file into its YAML frontmatter and markdown body, then
 * validate the frontmatter against the schema. Throws a descriptive Error if
 * the file is malformed or fails validation.
 */
export function parseSkillSource(source: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = source.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error('SKILL.md must begin with a YAML frontmatter block delimited by "---" lines');
  }
  const [, yamlBlock, body] = match;
  let raw: unknown;
  try {
    raw = parseYaml(yamlBlock ?? '');
  } catch (err) {
    throw new Error(`SKILL.md frontmatter is not valid YAML: ${(err as Error).message}`);
  }
  const parsed = SkillFrontmatterSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`SKILL.md frontmatter failed validation:\n${issues}`);
  }
  return { frontmatter: parsed.data, body: (body ?? '').trim() };
}
