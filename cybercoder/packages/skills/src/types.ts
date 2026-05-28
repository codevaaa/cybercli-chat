import { z } from 'zod';

/**
 * YAML frontmatter schema for a SKILL.md file. Mirrors the marketplace
 * publishing schema documented in backend-prompt.md §7.3.
 */
export const SkillIOSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  description: z.string().optional(),
});
export type SkillIO = z.infer<typeof SkillIOSchema>;

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/, 'name must be kebab-case'),
  description: z.string().min(1),
  version: z.string().default('0.1.0'),
  inputs: z.array(SkillIOSchema).default([]),
  outputs: z.array(SkillIOSchema).default([]),
  /** Capabilities the skill needs to run. */
  requires: z
    .object({
      tools: z.array(z.string()).default([]),
      /** Reserved for M13 — MCP servers the skill expects. */
      mcp: z.array(z.string()).default([]),
    })
    .default({ tools: [], mcp: [] }),
  /** Free-form trigger phrases shown in /help and used by skill discovery. */
  triggers: z.array(z.string()).default([]),
  license: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  /** Used by the marketplace to flag curated/official skills. */
  official: z.boolean().default(false),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export interface Skill {
  /** Globally unique id: `${source}/${owner}/${repo}/${name}` for marketplace, or `bundled/${name}` for bundled. */
  id: string;
  /** Where this skill came from. */
  source: 'bundled' | 'user' | 'project' | 'marketplace';
  /** Absolute path to the SKILL.md file. */
  path: string;
  frontmatter: SkillFrontmatter;
  /** The markdown body — becomes the system prompt prefix for the sub-agent. */
  body: string;
}
