/**
 * AgentWorker — The individual agent that executes a single task.
 *
 * Each worker is an autonomous ReAct loop (Reason → Act → Observe):
 *   1. Receives task description + injected inputs from dependencies
 *   2. Loads its persona system prompt + relevant skills
 *   3. Enters a tool-calling loop:
 *      - LLM reasons about what to do next
 *      - Calls tools (file_read, terminal_exec, web_search, etc.)
 *      - Observes results
 *      - Repeats until task is complete
 *   4. Returns final output string
 *
 * Workers are stateless — one worker per task execution.
 * All shared state goes through SharedMemory.
 */
import { agentRegistry }  from './AgentRegistry.js'
import { ToolExecutor }   from '../tools/ToolExecutor.js'
import { callLLMStream, callLLM } from '../llm/client.js'
import { AGENT_TIMEOUT_MS, MAX_RETRIES } from '../config.js'
import { logger } from '../utils/logger.js'

const MAX_TOOL_ROUNDS = 20    // safety limit on ReAct iterations
const TOOL_TIMEOUT_MS = 30000

export class AgentWorker {
  constructor({ agentId, sessionId, task, inputs, memory, skills, projectPath, onToken, onInfo, onToolUse }) {
    this.agentId     = agentId
    this.sessionId   = sessionId
    this.task        = task
    this.inputs      = inputs      || {}
    this.memory      = memory
    this.skills      = skills      || []
    this.projectPath = projectPath || process.cwd()
    this.onToken     = onToken     || (() => {})
    this.onInfo      = onInfo      || (() => {})
    this.onToolUse   = onToolUse   || (() => {})

    this.cancelled   = false
    this.definition  = agentRegistry.get(task.agentType)
    this.toolExecutor= new ToolExecutor({
      agentId:     this.agentId,
      agentType:   this.task.agentType,
      projectPath: this.projectPath,
      memory:      this.memory,
      permissions: this.definition.tools,
    })
  }

  cancel() {
    this.cancelled = true
  }

  async execute() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Agent timeout after ${AGENT_TIMEOUT_MS}ms`)), AGENT_TIMEOUT_MS)
    )
    return Promise.race([this._executeLoop(), timeout])
  }

  async _executeLoop() {
    const { persona } = this.definition
    this.onInfo(`${persona.emoji} ${persona.name} starting: "${this.task.title}"`)

    // Build full system prompt with skills injected
    const systemPrompt = agentRegistry.getSystemPrompt(this.task.agentType, this.skills)

    // Build initial user message
    const taskMessage = this._buildTaskMessage()

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: taskMessage },
    ]

    // Get available tools for this agent type
    const tools = this.toolExecutor.getToolDefinitions()

    let rounds = 0
    let finalOutput = null

    while (rounds < MAX_TOOL_ROUNDS && !this.cancelled) {
      rounds++

      // Call LLM (non-streaming for tool-calling rounds, streaming for final answer)
      const isFinalRound = rounds === MAX_TOOL_ROUNDS
      let response

      if (isFinalRound) {
        // Force a final answer without tools
        messages.push({
          role: 'user',
          content: 'You have reached the maximum number of tool rounds. Provide your final complete answer now based on everything you have done so far.'
        })
        response = await callLLM({
          model:       this.task.model || this.definition.model,
          messages,
          temperature: 0.3,
          max_tokens:  8192,
          tools:       [],
        })
        finalOutput = response
        break
      }

      response = await callLLM({
        model:       this.task.model || this.definition.model,
        messages,
        temperature: 0.3,
        max_tokens:  8192,
        tools,
        tool_choice: 'auto',
      })

      // Emit tokens for streaming UI
      if (response.content) {
        for (const char of response.content) {
          this.onToken(char)
        }
      }

      // Check if LLM wants to call tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Add assistant message with tool calls
        messages.push({
          role:       'assistant',
          content:    response.content || null,
          tool_calls: response.tool_calls,
        })

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          if (this.cancelled) break

          const toolName = toolCall.function.name
          let toolArgs
          try {
            toolArgs = JSON.parse(toolCall.function.arguments)
          } catch {
            toolArgs = {}
          }

          this.onToolUse({ tool: toolName, args: toolArgs })
          this.onInfo(`🔧 Using tool: ${toolName}`)

          let toolResult
          try {
            toolResult = await Promise.race([
              this.toolExecutor.execute(toolName, toolArgs),
              new Promise((_, r) => setTimeout(() => r(new Error('Tool timeout')), TOOL_TIMEOUT_MS))
            ])
          } catch (err) {
            toolResult = { error: err.message }
          }

          const resultText = typeof toolResult === 'string'
            ? toolResult
            : JSON.stringify(toolResult, null, 2)

          messages.push({
            role:         'tool',
            tool_call_id: toolCall.id,
            content:      resultText.slice(0, 20000), // truncate huge results
          })
        }

      } else {
        // No tool calls — LLM is done
        finalOutput = response.content || ''
        break
      }
    }

    if (!finalOutput && messages.length > 0) {
      const last = messages.slice().reverse().find(m => m.role === 'assistant' && m.content)
      finalOutput = last?.content || 'Task completed.'
    }

    this.onInfo(`✅ ${persona.name} finished: "${this.task.title}"`)
    return finalOutput
  }

  _buildTaskMessage() {
    const { task, inputs } = this

    let msg = `## Task: ${task.title}\n\n${task.description}`

    // Inject outputs from dependency tasks
    const depOutputs = Object.entries(inputs).filter(([k]) => !k.startsWith('_dep_'))
    if (depOutputs.length > 0) {
      msg += `\n\n## Context from Previous Agents\n`
      for (const [agentType, output] of depOutputs) {
        if (typeof output === 'string' && output.trim()) {
          msg += `\n### From ${agentType} agent:\n${output}\n`
        }
      }
    }

    // Inject relevant memory entries
    const memoryCtx = this.memory.getForAgent(this.task.agentType)
    if (memoryCtx.length > 0) {
      msg += `\n\n## Relevant Memory\n`
      for (const entry of memoryCtx.slice(-5)) {
        msg += `- ${entry.key}: ${String(entry.value).slice(0, 500)}\n`
      }
    }

    msg += `\n\n## Instructions\nComplete this task fully and thoroughly. Use your tools as needed. When done, provide your complete output.`

    return msg
  }
}
