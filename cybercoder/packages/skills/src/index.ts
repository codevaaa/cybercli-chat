/**
 * @cybermind/skills — skill loader, registry, sandbox executor, sub-agent runner.
 *
 * A "skill" is a markdown file with YAML frontmatter that becomes the system
 * prompt of an isolated sub-agent. Sub-agents run their own agent loop with a
 * restricted toolset and return their final assistant text as a summary to the
 * caller (which is typically the main agent loop via the spawn_subagent tool).
 */
export * from './types.js';
export * from './parser.js';
export * from './loader.js';
export * from './registry.js';
export * from './runner.js';
export * from './spawn-tool.js';
export const SKILLS_PACKAGE = '@cybermind/skills';
