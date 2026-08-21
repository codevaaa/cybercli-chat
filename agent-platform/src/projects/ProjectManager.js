/**
 * ProjectManager — Antigravity-style multi-project management.
 *
 * Each project is a registered directory the user works in.
 * Projects have:
 *   - path (absolute directory path)
 *   - name (display name, inferred from directory name)
 *   - conversations (list of conversation IDs linked to this project)
 *   - AGENTS.md context (parsed and cached)
 *   - SKILLS.md context
 *   - Skills loaded from .codeva/skills/ or .agents/skills/
 *   - Last accessed timestamp
 *
 * The Orchestrator uses the active project to:
 *   1. Set the working directory for all agent tools
 *   2. Load project-specific AGENTS.md overrides
 *   3. Load project-specific skills
 *   4. Inject project context into the Decomposer
 *
 * Storage: ~/.codeva/projects.json (global registry of known projects)
 *
 * Inspired by Antigravity's project switching (sidebar dropdown with
 * search, "New Project", "Quick Start", "No Project" options).
 */
import fs from 'fs/promises'
import path from 'path'
import { EventEmitter } from 'eventemitter3'
import { v4 as uuid } from 'uuid'
import { CODEVA_HOME } from '../config.js'
import { AgentsMdParser } from '../agents/AgentsMdParser.js'
import { SkillsLoader } from '../skills/SkillsLoader.js'
import { logger } from '../utils/logger.js'

const PROJECTS_FILE = path.join(CODEVA_HOME, 'projects.json')

export class ProjectManager extends EventEmitter {
  constructor() {
    super()
    this._projects = []        // Array of Project objects
    this._active   = null      // Currently active project ID
    this._loaded   = false
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  async init() {
    if (this._loaded) return
    try {
      const raw = await fs.readFile(PROJECTS_FILE, 'utf8')
      this._projects = JSON.parse(raw)
      logger.info(`[ProjectManager] Loaded ${this._projects.length} projects`)
    } catch {
      this._projects = []
    }
    this._loaded = true
  }

  async save() {
    await fs.mkdir(CODEVA_HOME, { recursive: true })
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(this._projects, null, 2), 'utf8')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a new project by path.
   * Detects name from directory, scans for AGENTS.md, and indexes skills.
   */
  async addProject(projectPath, options = {}) {
    await this.init()

    const absPath = path.resolve(projectPath)

    // Check if already registered
    const existing = this._projects.find(p => p.path === absPath)
    if (existing) {
      logger.info(`[ProjectManager] Project already registered: ${existing.name}`)
      return existing
    }

    // Verify directory exists
    try {
      const stat = await fs.stat(absPath)
      if (!stat.isDirectory()) throw new Error('Not a directory')
    } catch {
      throw new Error(`Invalid project path: ${absPath}`)
    }

    // Detect project metadata
    const name       = options.name || path.basename(absPath)
    const detectedStack = await this._detectStack(absPath)

    const project = {
      id:             uuid(),
      name,
      path:           absPath,
      stack:          detectedStack,
      conversations:  [],
      createdAt:      new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      settings:       {},  // Per-project overrides (model, autonomy, etc.)
    }

    this._projects.push(project)
    await this.save()

    this.emit('project:added', project)
    logger.success(`[ProjectManager] Added project: ${name} (${absPath})`)

    return project
  }

  /**
   * Remove a project from registry (does NOT delete the directory).
   */
  async removeProject(projectId) {
    await this.init()
    const idx = this._projects.findIndex(p => p.id === projectId)
    if (idx === -1) throw new Error(`Project ${projectId} not found`)

    const removed = this._projects.splice(idx, 1)[0]
    if (this._active === projectId) this._active = null
    await this.save()

    this.emit('project:removed', removed)
    return removed
  }

  /**
   * Set the active project (switches working directory context for all agents).
   */
  async setActive(projectId) {
    await this.init()

    if (!projectId) {
      this._active = null
      this.emit('project:changed', null)
      return null
    }

    const project = this._projects.find(p => p.id === projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)

    project.lastAccessedAt = new Date().toISOString()
    this._active = projectId
    await this.save()

    this.emit('project:changed', project)
    logger.info(`[ProjectManager] Active project: ${project.name}`)

    return project
  }

  /**
   * Set active by path (convenience for CLI).
   */
  async setActiveByPath(projectPath) {
    await this.init()
    const absPath = path.resolve(projectPath)
    let project = this._projects.find(p => p.path === absPath)
    if (!project) {
      project = await this.addProject(absPath)
    }
    return this.setActive(project.id)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async listProjects() {
    await this.init()
    return this._projects.sort((a, b) =>
      new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt)
    )
  }

  async getActive() {
    await this.init()
    if (!this._active) return null
    return this._projects.find(p => p.id === this._active) || null
  }

  async getProject(projectId) {
    await this.init()
    return this._projects.find(p => p.id === projectId) || null
  }

  async getProjectByName(name) {
    await this.init()
    return this._projects.find(p => p.name.toLowerCase() === name.toLowerCase()) || null
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT CONTEXT (for Orchestrator)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Load full project context: AGENTS.md parsed + skills indexed.
   * Used by the Orchestrator before starting a session.
   */
  async loadProjectContext(projectId) {
    const project = await this.getProject(projectId)
    if (!project) return { projectPath: process.cwd(), context: '', agents: {}, skills: [] }

    const projectPath = project.path

    // Parse AGENTS.md
    let agentsConfig = { projectContext: '', agentOverrides: {}, customAgents: {} }
    try {
      const parser = new AgentsMdParser(projectPath)
      agentsConfig = await parser.parse()
    } catch (err) {
      logger.warn(`[ProjectManager] AGENTS.md parse failed for ${project.name}: ${err.message}`)
    }

    // Load skills
    let skills = []
    try {
      const loader = new SkillsLoader(projectPath)
      skills = await loader.loadIndex()
    } catch (err) {
      logger.warn(`[ProjectManager] Skills load failed for ${project.name}: ${err.message}`)
    }

    return {
      projectPath,
      projectName:    project.name,
      stack:          project.stack,
      context:        agentsConfig.projectContext,
      agentOverrides: agentsConfig.agentOverrides,
      customAgents:   agentsConfig.customAgents,
      skills,
      settings:       project.settings,
    }
  }

  /**
   * Load context for the currently active project.
   */
  async loadActiveContext() {
    const active = await this.getActive()
    if (!active) return { projectPath: process.cwd(), context: '', agents: {}, skills: [] }
    return this.loadProjectContext(active.id)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Link a conversation to a project.
   */
  async addConversation(projectId, conversationId) {
    await this.init()
    const project = this._projects.find(p => p.id === projectId)
    if (!project) return
    if (!project.conversations.includes(conversationId)) {
      project.conversations.push(conversationId)
      await this.save()
    }
  }

  /**
   * Get all conversations for a project (returns IDs).
   */
  async getConversations(projectId) {
    await this.init()
    const project = this._projects.find(p => p.id === projectId)
    return project?.conversations || []
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update project-level settings (model override, autonomy, etc.)
   */
  async updateSettings(projectId, settings) {
    await this.init()
    const project = this._projects.find(p => p.id === projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)
    project.settings = { ...project.settings, ...settings }
    await this.save()
    this.emit('project:settings_changed', project)
    return project
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Detect the project's tech stack from its files.
   */
  async _detectStack(projectPath) {
    const stack = { language: null, framework: null, runtime: null, packageManager: null }

    const checks = [
      { file: 'package.json',      language: 'javascript', runtime: 'node' },
      { file: 'tsconfig.json',     language: 'typescript', runtime: 'node' },
      { file: 'requirements.txt',  language: 'python',     runtime: 'python' },
      { file: 'pyproject.toml',    language: 'python',     runtime: 'python' },
      { file: 'Cargo.toml',        language: 'rust',       runtime: 'rust' },
      { file: 'go.mod',            language: 'go',         runtime: 'go' },
      { file: 'build.gradle',      language: 'java',       runtime: 'jvm' },
      { file: 'pom.xml',           language: 'java',       runtime: 'jvm' },
      { file: 'Gemfile',           language: 'ruby',       runtime: 'ruby' },
      { file: 'composer.json',     language: 'php',        runtime: 'php' },
    ]

    for (const { file, language, runtime } of checks) {
      try {
        await fs.access(path.join(projectPath, file))
        stack.language = language
        stack.runtime  = runtime
        break
      } catch { /* try next */ }
    }

    // Detect framework from package.json
    if (stack.runtime === 'node') {
      try {
        const pkg = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf8'))
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (allDeps.react)     stack.framework = 'react'
        else if (allDeps.vue)  stack.framework = 'vue'
        else if (allDeps.next) stack.framework = 'next'
        else if (allDeps.express) stack.framework = 'express'
        else if (allDeps.fastify) stack.framework = 'fastify'
        else if (allDeps.nuxt) stack.framework = 'nuxt'
        else if (allDeps.svelte) stack.framework = 'svelte'

        // Package manager
        const pmChecks = [
          { file: 'pnpm-lock.yaml', pm: 'pnpm' },
          { file: 'yarn.lock', pm: 'yarn' },
          { file: 'bun.lockb', pm: 'bun' },
        ]
        stack.packageManager = 'npm'
        for (const { file: f, pm } of pmChecks) {
          try { await fs.access(path.join(projectPath, f)); stack.packageManager = pm; break }
          catch { /* next */ }
        }
      } catch { /* no package.json readable */ }
    }

    return stack
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON + REST ROUTES
// ═══════════════════════════════════════════════════════════════════════════

export const projectManager = new ProjectManager()
