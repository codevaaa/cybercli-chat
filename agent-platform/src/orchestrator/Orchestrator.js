/**
 * Orchestrator — The Central Command Engine
 *
 * This is what Google Antigravity 2.0 calls the "orchestrator layer":
 * - Owns the TaskGraph
 * - Schedules ready tasks into the AgentPool
 * - Manages shared state
 * - Streams live progress to WebSocket clients
 * - Handles retries and failure cascades
 * - Synthesizes final output from all agent results
 *
 * One Orchestrator per session. Can run multiple sessions simultaneously.
 */
import { EventEmitter } from 'eventemitter3'
import PQueue from 'p-queue'
import { v4 as uuid } from 'uuid'
import { Decomposer }         from './Decomposer.js'
import { TaskGraph, TASK_STATUS } from './TaskGraph.js'
import { AgentWorker }        from '../agents/AgentWorker.js'
import { SharedMemory }       from '../memory/SharedMemory.js'
import { SkillsLoader }       from '../skills/SkillsLoader.js'
import { AgentsMdParser }     from '../agents/AgentsMdParser.js'
import { agentRegistry }      from '../agents/AgentRegistry.js'
import { callLLM }            from '../llm/client.js'
import { logger }             from '../utils/logger.js'
import {
  MAX_PARALLEL_AGENTS,
  ORCHESTRATOR_TIMEOUT_MS,
  MODELS,
} from '../config.js'

export const SESSION_STATUS = {
  IDLE:        'idle',
  PLANNING:    'planning',
  RUNNING:     'running',
  SYNTHESIZING:'synthesizing',
  COMPLETED:   'completed',
  FAILED:      'failed',
  CANCELLED:   'cancelled',
}

export class Orchestrator extends EventEmitter {
  constructor({ sessionId, projectPath, projectContext, maxParallel } = {}) {
    super()
    this.sessionId      = sessionId || uuid()
    this.projectPath    = projectPath || process.cwd()
    this.projectContext = projectContext || ''
    this.maxParallel    = maxParallel || MAX_PARALLEL_AGENTS

    this.status         = SESSION_STATUS.IDLE
    this.graph          = null
    this.memory         = new SharedMemory(this.sessionId)
    this.skills         = []
    this.activeAgents   = new Map()    // agentId → AgentWorker
    this.goal           = null
    this.result         = null
    this.startedAt      = null
    this.completedAt    = null

    // Concurrency-limited queue for agent execution
    this.queue = new PQueue({ concurrency: this.maxParallel })
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Main entry: given a goal string, plan and execute autonomously.
   * Returns final synthesized result.
   */
  async run(goal, options = {}) {
    if (this.status !== SESSION_STATUS.IDLE) {
      throw new Error(`Session ${this.sessionId} is already ${this.status}`)
    }

    this.goal       = goal
    this.startedAt  = new Date()

    try {
      // 1. Load skills
      await this._loadSkills()

      // 2. Decompose goal into task graph
      this._setStatus(SESSION_STATUS.PLANNING)
      this._emit('orchestrator:planning', { goal, sessionId: this.sessionId })

      const decomposer = new Decomposer({
        sessionId:      this.sessionId,
        projectContext: this.projectContext,
        skills:         this.skills,
      })

      this.graph = await decomposer.decompose(goal, options)
      this._emit('orchestrator:graph_ready', this.graph.snapshot())

      logger.info(`[Orchestrator ${this.sessionId}] Graph: ${this.graph.tasks.size} tasks`)

      // Store plan summary in memory
      await this.memory.set('plan_summary', this.graph.planSummary, 'orchestrator')
      await this.memory.set('goal', goal, 'orchestrator')

      // 3. Execute task graph
      this._setStatus(SESSION_STATUS.RUNNING)
      await this._executeGraph()

      // 4. Synthesize final answer
      this._setStatus(SESSION_STATUS.SYNTHESIZING)
      this.result = await this._synthesize()

      this._setStatus(SESSION_STATUS.COMPLETED)
      this.completedAt = new Date()

      const durationMs = this.completedAt - this.startedAt
      this._emit('orchestrator:completed', {
        sessionId:  this.sessionId,
        result:     this.result,
        stats:      this.graph.getStats(),
        durationMs,
      })

      return {
        success:    true,
        result:     this.result,
        stats:      this.graph.getStats(),
        durationMs,
        sessionId:  this.sessionId,
      }

    } catch (err) {
      this._setStatus(SESSION_STATUS.FAILED)
      this.completedAt = new Date()
      logger.error(`[Orchestrator ${this.sessionId}] Fatal: ${err.message}`)
      this._emit('orchestrator:failed', { sessionId: this.sessionId, error: err.message })
      throw err
    }
  }

  cancel() {
    this._setStatus(SESSION_STATUS.CANCELLED)
    this.queue.clear()
    for (const agent of this.activeAgents.values()) {
      agent.cancel()
    }
    this._emit('orchestrator:cancelled', { sessionId: this.sessionId })
  }

  getSnapshot() {
    return {
      sessionId:   this.sessionId,
      status:      this.status,
      goal:        this.goal,
      graph:       this.graph?.snapshot() || null,
      result:      this.result,
      startedAt:   this.startedAt,
      completedAt: this.completedAt,
      activeAgents: this.activeAgents.size,
    }
  }

  // ── Graph Execution ───────────────────────────────────────────────────────

  async _executeGraph() {
    const timeout = setTimeout(() => {
      logger.error(`[Orchestrator] Timeout after ${ORCHESTRATOR_TIMEOUT_MS}ms`)
      this.cancel()
    }, ORCHESTRATOR_TIMEOUT_MS)

    try {
      while (!this.graph.isComplete()) {
        if (this.status === SESSION_STATUS.CANCELLED) break

        // Get tasks ready to run (dependencies satisfied)
        const ready = this.graph.getReadyTasks()

        if (ready.length === 0) {
          // All pending tasks are waiting on dependencies or running
          await sleep(200)
          continue
        }

        // Dispatch ready tasks to the concurrency queue
        for (const task of ready) {
          if (this.status === SESSION_STATUS.CANCELLED) break
          this.graph.markRunning(task.id, null)

          this.queue.add(async () => {
            await this._executeTask(task)
          })
        }

        // Small yield to let queue process
        await sleep(100)
      }

      // Wait for all queued tasks to finish
      await this.queue.onIdle()

    } finally {
      clearTimeout(timeout)
    }

    const stats = this.graph.getStats()
    logger.info(`[Orchestrator] Graph complete — ${stats.completed} done, ${stats.failed} failed`)
  }

  async _executeTask(task) {
    const agentId = uuid()
    const inputs  = this.graph.resolveInputs(task)

    this.graph.markRunning(task.id, agentId)
    this._emit('task:started', { task: task.toJSON(), agentId })

    const agent = new AgentWorker({
      agentId,
      sessionId:   this.sessionId,
      task,
      inputs,
      memory:      this.memory,
      skills:      this.skills,
      projectPath: this.projectPath,
      onToken:     (token) => this._emit('agent:token', { agentId, taskId: task.id, token }),
      onInfo:      (info)  => this._emit('agent:info',  { agentId, taskId: task.id, info }),
      onToolUse:   (tool)  => this._emit('agent:tool',  { agentId, taskId: task.id, tool }),
    })

    this.activeAgents.set(agentId, agent)

    try {
      const output = await agent.execute()
      this.graph.markCompleted(task.id, output)
      await this.memory.set(`task_output_${task.id}`, output, task.agentType)
      this._emit('task:completed', { task: task.toJSON(), agentId, output })
      logger.success(`[${task.agentType.toUpperCase()}] "${task.title}" — done`)
    } catch (err) {
      this.graph.markFailed(task.id, err)
      this._emit('task:failed', { task: task.toJSON(), agentId, error: err.message })
      logger.error(`[${task.agentType.toUpperCase()}] "${task.title}" — failed: ${err.message}`)
    } finally {
      this.activeAgents.delete(agentId)
    }
  }

  // ── Synthesis ─────────────────────────────────────────────────────────────

  async _synthesize() {
    const completedTasks = [...this.graph.tasks.values()]
      .filter(t => t.status === TASK_STATUS.COMPLETED)

    if (completedTasks.length === 0) {
      return 'No tasks completed successfully.'
    }

    if (completedTasks.length === 1) {
      return completedTasks[0].output
    }

    this._emit('orchestrator:synthesizing', { count: completedTasks.length })

    const outputs = completedTasks.map(t =>
      `### ${t.title} (${t.agentType})\n${t.output}`
    ).join('\n\n---\n\n')

    const synthesisPrompt = `You are the CodeVaa Synthesis Engine. Multiple specialized agents have completed their tasks for this goal:

GOAL: ${this.goal}

AGENT OUTPUTS:
${outputs}

Your task: Synthesize all outputs into a single, cohesive, comprehensive response. 
- Merge overlapping information
- Resolve contradictions with the best information
- Structure clearly with headers
- Include any code, files, or artifacts mentioned
- Do NOT mention the individual agents — write as one unified response
- Be complete and actionable`

    try {
      const synthesis = await callLLM({
        model:      MODELS.orchestrator,
        messages:   [
          { role: 'system', content: 'You are the CodeVaa Synthesis Engine. Produce unified, comprehensive responses.' },
          { role: 'user',   content: synthesisPrompt },
        ],
        temperature: 0.3,
        max_tokens:  8192,
      })
      return synthesis
    } catch (err) {
      logger.warn(`[Orchestrator] Synthesis failed, returning best single output: ${err.message}`)
      const best = completedTasks.sort((a, b) => (b.output?.length || 0) - (a.output?.length || 0))[0]
      return best.output
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async _loadSkills() {
    try {
      // 1. Parse AGENTS.md for project context + agent overrides
      const parser  = new AgentsMdParser(this.projectPath)
      const agentsCfg = await parser.parse()

      // Merge project context from AGENTS.md
      if (agentsCfg.projectContext && !this.projectContext) {
        this.projectContext = agentsCfg.projectContext
      }

      // Register custom agents and apply overrides
      if (Object.keys(agentsCfg.customAgents).length > 0) {
        agentRegistry.loadFromConfig(agentsCfg.customAgents)
        logger.info(`[Orchestrator] Registered ${Object.keys(agentsCfg.customAgents).length} custom agents from AGENTS.md`)
      }
      if (Object.keys(agentsCfg.agentOverrides).length > 0) {
        agentRegistry.loadFromConfig(agentsCfg.agentOverrides)
      }

      // 2. Load skills from SKILLS.md + .codeva/skills/
      const loader = new SkillsLoader(this.projectPath)
      this.skills  = await loader.loadAll()
      logger.info(`[Orchestrator] Loaded ${this.skills.length} skills`)
    } catch (err) {
      logger.warn(`[Orchestrator] Skills/AGENTS.md load failed: ${err.message}`)
      this.skills = []
    }
  }

  _setStatus(status) {
    this.status = status
    this._emit('orchestrator:status', { sessionId: this.sessionId, status })
  }

  _emit(event, data) {
    this.emit(event, data)
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
