/**
 * SkillsLoader — Antigravity-level Skills System for CodeVaa
 *
 * Skills are modular, on-demand capability extensions for agents.
 * Unlike system prompts (always loaded), skills load ONLY when relevant.
 *
 * SKILL FORMAT (Antigravity-compatible):
 * ────────────────────────────────────
 * my-skill/
 * ├── SKILL.md           # Definition file (YAML frontmatter + Markdown body)
 * ├── scripts/           # [Optional] Python, Bash, Node scripts the agent can execute
 * │   ├── run.py
 * │   └── validate.sh
 * ├── references/        # [Optional] Documentation, templates, API specs
 * │   └── api-docs.md
 * ├── examples/          # [Optional] Input/output examples for few-shot learning
 * │   ├── input.json
 * │   └── output.py
 * └── assets/            # [Optional] Static assets
 *
 * SKILL.md FORMAT:
 * ────────────────
 * ---
 * name: my-skill-name
 * description: Use this skill when the user asks to [trigger description]
 * agents: [coder, reviewer]       # Which agent types get this skill (optional, default: all)
 * tags: [typescript, react]       # Searchable tags
 * version: 1.0.0                  # Skill version
 * author: Chandan Pandey          # Skill author
 * ---
 * # Skill Title
 *
 * ## Goal
 * [What this skill achieves]
 *
 * ## Instructions
 * [Step-by-step logic for the agent]
 *
 * ## Constraints
 * [What the agent must NOT do]
 *
 * ## Examples
 * [Few-shot examples if needed]
 *
 * PROGRESSIVE DISCLOSURE:
 * ───────────────────────
 * Only the metadata (name, description) is indexed at session start.
 * The full body + scripts + references load ONLY when the agent's task
 * semantically matches the skill's description. This keeps context lean.
 *
 * SKILL SCOPES:
 * - Global:  ~/.codeva/skills/          (available across all projects)
 * - Project: <project>/.codeva/skills/  (project-specific)
 * - Project: <project>/.agents/skills/  (Antigravity-compatible path)
 * - Single:  <project>/SKILLS.md        (inline skills in one file)
 */
import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'
import { SKILLS_DIR, BUNDLED_SKILLS_DIR } from '../config.js'
import { logger } from '../utils/logger.js'

// ═══════════════════════════════════════════════════════════════════════════
// FRONTMATTER PARSER
// ═══════════════════════════════════════════════════════════════════════════

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/m)
  if (!match) return { meta: {}, body: content.trim() }

  const meta = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    // Parse arrays: [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value.slice(1, -1).split(',').map(v => v.trim()).filter(Boolean)
    } else {
      meta[key] = value
    }
  }
  return { meta, body: match[2].trim() }
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILL CLASS
// ═══════════════════════════════════════════════════════════════════════════

class Skill {
  constructor({ id, name, description, body, agents, tags, version, author, source, dirPath, filePath, scripts, references, examples }) {
    this.id          = id
    this.name        = name
    this.description = description
    this.body        = body           // Full markdown instructions (loaded on demand)
    this.agents      = agents || ['all']
    this.tags        = tags   || []
    this.version     = version || '1.0.0'
    this.author      = author || ''
    this.source      = source        // 'global' | 'project' | 'SKILLS.md'
    this.dirPath     = dirPath       // Directory containing the skill
    this.filePath    = filePath      // Path to SKILL.md
    this.scripts     = scripts || [] // Available script file paths
    this.references  = references || [] // Available reference file paths
    this.examples    = examples || []   // Available example file paths
    this._loaded     = !!body        // Whether full body is loaded
  }

  /** Metadata-only representation (for indexing/progressive disclosure) */
  toIndex() {
    return {
      id:          this.id,
      name:        this.name,
      description: this.description,
      agents:      this.agents,
      tags:        this.tags,
      version:     this.version,
      author:      this.author,
      source:      this.source,
      hasScripts:  this.scripts.length > 0,
      hasRefs:     this.references.length > 0,
      hasExamples: this.examples.length > 0,
    }
  }

  /** Full representation (when skill is activated for an agent) */
  toFull() {
    return {
      ...this.toIndex(),
      body:       this.body,
      scripts:    this.scripts,
      references: this.references,
      examples:   this.examples,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SKILLS LOADER
// ═══════════════════════════════════════════════════════════════════════════

export class SkillsLoader {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath
    this._index      = null   // Skill[] — metadata only (progressive disclosure)
    this._cache      = new Map() // id → fully-loaded Skill
  }

  /**
   * Load all skill METADATA (not full bodies) from all scopes.
   * This is fast — just reads frontmatter, not full content.
   */
  async loadIndex() {
    if (this._index) return this._index

    const skills = []

    // 0. Bundled skills shipped with the platform
    await this._scanDirectory(BUNDLED_SKILLS_DIR, 'bundled', skills)

    // 1. Global skills: ~/.codeva/skills/
    await this._scanDirectory(SKILLS_DIR, 'global', skills)

    // 2. Project skills: <project>/.codeva/skills/
    await this._scanDirectory(path.join(this.projectPath, '.codeva', 'skills'), 'project', skills)

    // 3. Antigravity-compatible: <project>/.agents/skills/
    await this._scanDirectory(path.join(this.projectPath, '.agents', 'skills'), 'project', skills)

    // 4. SKILLS.md at project root (inline skills)
    await this._parseSkillsMd(path.join(this.projectPath, 'SKILLS.md'), skills)

    this._index = skills
    logger.info(`[SkillsLoader] Indexed ${skills.length} skills (progressive disclosure: metadata only)`)
    return skills
  }

  /**
   * Load ALL skills fully (for backward compat with simple workflows).
   */
  async loadAll() {
    const index = await this.loadIndex()
    const full = []
    for (const skill of index) {
      if (!skill._loaded) {
        await this._loadFullBody(skill)
      }
      full.push(skill)
    }
    return full
  }

  /**
   * Load skills relevant to a specific agent type.
   * Returns full skill bodies for matching skills.
   */
  async loadForAgent(agentType) {
    const index = await this.loadIndex()
    const relevant = index.filter(s =>
      s.agents.includes('all') || s.agents.includes(agentType)
    )
    // Load full bodies for relevant skills
    for (const skill of relevant) {
      if (!skill._loaded) {
        await this._loadFullBody(skill)
      }
    }
    return relevant
  }

  /**
   * Semantic match: find skills whose description matches a task description.
   * Uses simple keyword matching (LLM handles true semantic matching).
   */
  async matchForTask(taskDescription) {
    const index = await this.loadIndex()
    const desc  = taskDescription.toLowerCase()
    const matches = []

    for (const skill of index) {
      const skillText = `${skill.name} ${skill.description} ${skill.tags.join(' ')}`.toLowerCase()
      // Simple relevance scoring
      const words = desc.split(/\s+/)
      let score   = 0
      for (const word of words) {
        if (word.length < 3) continue
        if (skillText.includes(word)) score++
      }
      if (score >= 2) {
        if (!skill._loaded) await this._loadFullBody(skill)
        matches.push({ skill, score })
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.skill)
  }

  /**
   * Get a specific skill by ID, fully loaded.
   */
  async getSkill(id) {
    const index = await this.loadIndex()
    const skill = index.find(s => s.id === id)
    if (!skill) return null
    if (!skill._loaded) await this._loadFullBody(skill)
    return skill
  }

  /**
   * List all skills (metadata only — for UI display).
   */
  async listSkills() {
    const index = await this.loadIndex()
    return index.map(s => s.toIndex())
  }

  /**
   * Install a new skill from content string.
   */
  async installSkill(name, content, scope = 'project') {
    const dir = scope === 'global'
      ? SKILLS_DIR
      : path.join(this.projectPath, '.codeva', 'skills')

    const skillDir = path.join(dir, slugify(name))
    await fs.mkdir(skillDir, { recursive: true })
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content, 'utf8')

    // Invalidate cache
    this._index = null
    this._cache.clear()

    logger.success(`[SkillsLoader] Installed skill: ${name} (${scope}) → ${skillDir}`)
    return skillDir
  }

  /**
   * Install a skill from a directory (copy entire skill package).
   */
  async installSkillDir(srcDir, scope = 'project') {
    const skillMd = path.join(srcDir, 'SKILL.md')
    const raw     = await fs.readFile(skillMd, 'utf8')
    const { meta } = parseFrontmatter(raw)
    const name    = meta.name || path.basename(srcDir)

    const destDir = scope === 'global'
      ? path.join(SKILLS_DIR, slugify(name))
      : path.join(this.projectPath, '.codeva', 'skills', slugify(name))

    // Copy entire directory
    await copyDir(srcDir, destDir)

    this._index = null
    this._cache.clear()
    logger.success(`[SkillsLoader] Installed skill package: ${name} → ${destDir}`)
    return destDir
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  async _scanDirectory(dir, source, skills) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Directory-based skill (Antigravity format): dir/SKILL.md
          const skillMdPath = path.join(dir, entry.name, 'SKILL.md')
          try {
            await fs.access(skillMdPath)
            const skill = await this._parseSkillDir(path.join(dir, entry.name), source)
            if (skill) skills.push(skill)
          } catch {
            // No SKILL.md in this dir — skip
          }
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'SKILL.md') {
          // Single-file skill (simple format): dir/my-skill.md
          const skill = await this._parseSingleFileSkill(path.join(dir, entry.name), source)
          if (skill) skills.push(skill)
        }
      }
    } catch {
      // Directory doesn't exist — fine
    }
  }

  async _parseSkillDir(dirPath, source) {
    try {
      const skillMdPath = path.join(dirPath, 'SKILL.md')
      const raw = await fs.readFile(skillMdPath, 'utf8')
      const { meta, body } = parseFrontmatter(raw)

      const name = meta.name || path.basename(dirPath)
      const id   = slugify(name)

      // Discover scripts, references, examples (file list only — not contents)
      const scripts    = await listFiles(path.join(dirPath, 'scripts'))
      const references = await listFiles(path.join(dirPath, 'references'))
      const examples   = await listFiles(path.join(dirPath, 'examples'))

      const skill = new Skill({
        id,
        name,
        description: meta.description || body.split('\n')[0] || '',
        body,    // Load body immediately for dir-based skills (they're specific enough)
        agents:  meta.agents || ['all'],
        tags:    meta.tags   || [],
        version: meta.version || '1.0.0',
        author:  meta.author || '',
        source,
        dirPath,
        filePath: skillMdPath,
        scripts,
        references,
        examples,
      })
      skill._loaded = true

      return skill
    } catch (err) {
      logger.warn(`[SkillsLoader] Failed to parse skill dir ${dirPath}: ${err.message}`)
      return null
    }
  }

  async _parseSingleFileSkill(filePath, source) {
    try {
      const raw = await fs.readFile(filePath, 'utf8')
      const { meta, body } = parseFrontmatter(raw)
      const name = meta.name || path.basename(filePath, '.md')

      return new Skill({
        id:          slugify(name),
        name,
        description: meta.description || body.split('\n')[0] || '',
        body:        null, // Lazy load (progressive disclosure)
        agents:      meta.agents || ['all'],
        tags:        meta.tags   || [],
        version:     meta.version || '1.0.0',
        author:      meta.author || '',
        source,
        dirPath:     null,
        filePath,
        scripts:     [],
        references:  [],
        examples:    [],
      })
    } catch (err) {
      logger.warn(`[SkillsLoader] Failed to parse ${filePath}: ${err.message}`)
      return null
    }
  }

  async _parseSkillsMd(filePath, skills) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      // Split by ## headings — each is a separate inline skill
      const sections = content.split(/^## /m).filter(Boolean)
      for (const section of sections) {
        const lines = section.split('\n')
        const name  = lines[0].trim()
        const body  = lines.slice(1).join('\n').trim()
        if (!name || !body) continue

        skills.push(new Skill({
          id:          slugify(name),
          name,
          description: body.split('\n')[0] || '',
          body:        null, // Lazy load
          agents:      ['all'],
          tags:        [],
          version:     '1.0.0',
          author:      '',
          source:      'SKILLS.md',
          dirPath:     null,
          filePath,
          scripts:     [],
          references:  [],
          examples:    [],
        }))
      }
    } catch {
      // SKILLS.md doesn't exist — fine
    }
  }

  async _loadFullBody(skill) {
    if (skill._loaded) return
    try {
      if (skill.filePath) {
        const raw = await fs.readFile(skill.filePath, 'utf8')
        if (skill.source === 'SKILLS.md') {
          // For inline SKILLS.md, body is already the section content
          const content = raw
          const sections = content.split(/^## /m).filter(Boolean)
          for (const section of sections) {
            const lines = section.split('\n')
            if (slugify(lines[0].trim()) === skill.id) {
              skill.body = lines.slice(1).join('\n').trim()
              break
            }
          }
        } else {
          const { body } = parseFrontmatter(raw)
          skill.body = body
        }
      }
      skill._loaded = true
    } catch (err) {
      logger.warn(`[SkillsLoader] Failed to load body for skill ${skill.id}: ${err.message}`)
      skill.body = skill.description
      skill._loaded = true
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function listFiles(dir) {
  try {
    const entries = await fs.readdir(dir)
    return entries.map(f => path.join(dir, f))
  } catch {
    return []
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath  = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}
