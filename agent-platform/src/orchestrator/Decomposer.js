/**
 * Decomposer — Uses the LLM to break a high-level goal into a TaskGraph.
 *
 * Flow:
 *   1. Send goal + project context to Chanakya (Orchestrator model)
 *   2. Receive JSON task plan with dependencies, agent types, priorities
 *   3. Validate with Zod
 *   4. Return TaskGraph instance
 *
 * This is the most important step — bad decomposition = bad results.
 * We use structured output (JSON mode) + retries to guarantee valid plans.
 */
import { z } from 'zod'
import { TaskGraph } from './TaskGraph.js'
import { callLLM } from '../llm/client.js'
import { MODELS } from '../config.js'
import { logger } from '../utils/logger.js'
import { v4 as uuid } from 'uuid'

// ── Schema for LLM-generated task plan ───────────────────────────────────
const TaskPlanSchema = z.object({
  plan_summary: z.string(),
  estimated_duration: z.string(),
  tasks: z.array(z.object({
    id:           z.string(),
    title:        z.string(),
    description:  z.string(),
    agent_type:   z.enum(['coder','tester','debugger','devops','researcher','writer','reviewer','security','orchestrator']),
    model:        z.string().optional(),
    tools:        z.array(z.string()).default([]),
    dependencies: z.array(z.string()).default([]),
    priority:     z.number().min(1).max(10).default(5),
    max_retries:  z.number().default(2),
    metadata:     z.record(z.any()).optional(),
  })).min(1),
})

const DECOMPOSE_SYSTEM = `You are Chanakya, the Master Strategist and Planner for the CodeVaa Agent Platform.

Your job: Given a goal and project context, produce a detailed, optimized task plan that can be executed by specialized AI agents in parallel.

RULES:
1. Break the goal into the MINIMUM number of discrete tasks needed — no redundancy.
2. Each task must be assigned to exactly ONE agent type: coder, tester, debugger, devops, researcher, writer, reviewer, or security.
3. Set dependencies carefully — only add a dependency if a task genuinely cannot start without another's output.
4. Maximize PARALLELISM — tasks without dependencies should run simultaneously.
5. Set priority 1-10 (10 = most critical, blocking tasks get higher priority).
6. Be specific in descriptions — the agent executing this task will have ONLY this description + its skills.
7. Tools array: include only needed tools from [file_read, file_write, terminal_exec, web_search, browser, code_exec, mcp].

AGENT TYPES & SPECIALIZATIONS:
- coder      → writes implementation code, all languages
- tester     → writes and runs unit/integration tests
- debugger   → analyzes failures, fixes bugs, root cause analysis
- devops     → Docker, CI/CD, cloud deploy, infrastructure
- researcher → web research, documentation lookup, API analysis
- writer     → README, docs, comments, technical writing
- reviewer   → code review, security audit, best practices
- security   → penetration testing, vulnerability analysis

OUTPUT FORMAT — return ONLY valid JSON matching this exact schema:
{
  "plan_summary": "Brief description of the overall plan",
  "estimated_duration": "e.g. '5-10 minutes with 4 parallel agents'",
  "tasks": [
    {
      "id": "t1",
      "title": "Short task name",
      "description": "Full detailed description of what this agent must do",
      "agent_type": "coder",
      "tools": ["file_read", "file_write"],
      "dependencies": [],
      "priority": 8,
      "max_retries": 2
    }
  ]
}`

export class Decomposer {
  constructor({ sessionId, projectContext = '', skills = [] }) {
    this.sessionId      = sessionId
    this.projectContext = projectContext
    this.skills         = skills
  }

  async decompose(goal, options = {}) {
    logger.info(`[Decomposer] Decomposing goal: "${goal.slice(0, 80)}..."`)

    const skillsContext = this.skills.length > 0
      ? `\n\nAVAILABLE SKILLS:\n${this.skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}`
      : ''

    const projectCtx = this.projectContext
      ? `\n\nPROJECT CONTEXT:\n${this.projectContext}`
      : ''

    const userPrompt = `GOAL: ${goal}${projectCtx}${skillsContext}

Please produce an optimal task plan to accomplish this goal.`

    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      attempts++
      try {
        const raw = await callLLM({
          model:       options.model || MODELS.orchestrator,
          messages:    [
            { role: 'system', content: DECOMPOSE_SYSTEM },
            { role: 'user',   content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens:  4096,
          json_mode:   true,
        })

        // Extract JSON from response (handle markdown code blocks)
        const jsonStr = extractJSON(raw)
        const parsed  = JSON.parse(jsonStr)
        const plan    = TaskPlanSchema.parse(parsed)

        logger.success(`[Decomposer] Plan generated: ${plan.tasks.length} tasks, ${plan.estimated_duration}`)

        return this._buildGraph(plan, goal)

      } catch (err) {
        logger.warn(`[Decomposer] Attempt ${attempts} failed: ${err.message}`)
        if (attempts >= maxAttempts) {
          logger.warn(`[Decomposer] Falling back to single-task plan`)
          return this._fallbackGraph(goal)
        }
        await sleep(1000 * attempts)
      }
    }
  }

  _buildGraph(plan, goal) {
    const graph = new TaskGraph(this.sessionId)
    graph.goal  = goal
    graph.planSummary = plan.plan_summary
    graph.estimatedDuration = plan.estimated_duration

    for (const t of plan.tasks) {
      graph.addTask({
        id:          t.id,
        title:       t.title,
        description: t.description,
        agentType:   t.agent_type,
        model:       t.model || null,
        tools:       t.tools || [],
        dependencies: t.dependencies || [],
        priority:    t.priority || 5,
        maxRetries:  t.max_retries || 2,
        metadata:    t.metadata || {},
      })
    }

    return graph
  }

  _fallbackGraph(goal) {
    const graph = new TaskGraph(this.sessionId)
    graph.goal  = goal
    graph.planSummary = `Single-agent fallback for: ${goal}`
    graph.addTask({
      id:          uuid(),
      title:       'Execute Goal',
      description: goal,
      agentType:   'coder',
      tools:       ['file_read', 'file_write', 'terminal_exec'],
      dependencies: [],
      priority:    10,
      maxRetries:  3,
    })
    return graph
  }
}

function extractJSON(text) {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  // Find first { ... } block
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)
  return text.trim()
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
