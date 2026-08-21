/**
 * AgentsMdParser — Reads AGENTS.md and SKILLS.md from a project root.
 *
 * AGENTS.md format:
 *   ## Project Context          → injected into every decomposer call
 *   ### <agentType>             → override per-agent model/instructions
 *   ## Custom Agents            → register new agent types
 *
 * Returns { projectContext, agentOverrides, customAgents }
 */
import fs   from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger.js'

export class AgentsMdParser {
  constructor(projectPath) {
    this.projectPath = projectPath
  }

  async parse() {
    const result = {
      projectContext: '',
      agentOverrides: {},
      customAgents:   {},
    }

    const agentsMdPath = path.join(this.projectPath, 'AGENTS.md')
    try {
      const content = await fs.readFile(agentsMdPath, 'utf8')
      this._parseAgentsMd(content, result)
      logger.info(`[AgentsMd] Parsed AGENTS.md: ${Object.keys(result.agentOverrides).length} overrides, ${Object.keys(result.customAgents).length} custom agents`)
    } catch {
      // AGENTS.md is optional
    }

    return result
  }

  _parseAgentsMd(content, result) {
    const lines   = content.split('\n')
    let section   = null   // 'context' | 'agent' | 'custom'
    let agentKey  = null
    let buffer    = []
    let inCustom  = false

    const flush = () => {
      if (!agentKey || !buffer.length) return
      const text = buffer.join('\n').trim()

      // Parse key: value pairs from the section
      const modelMatch = text.match(/^model:\s*(.+)$/m)
      const instrMatch = text.match(/instructions:\s*\|\n([\s\S]+?)(?=\n\S|\n*$)/m)

      const def = {}
      if (modelMatch)  def.model        = modelMatch[1].trim()
      if (instrMatch)  def.instructions = instrMatch[1].replace(/^  /gm, '').trim()

      if (inCustom) {
        result.customAgents[agentKey] = def
      } else {
        result.agentOverrides[agentKey] = def
      }
      buffer = []
      agentKey = null
    }

    for (const line of lines) {
      // Top-level h2 sections
      if (line.startsWith('## ')) {
        flush()
        const heading = line.slice(3).trim().toLowerCase()
        if (heading === 'project context') {
          section = 'context'
          inCustom = false
        } else if (heading === 'custom agents') {
          section = 'custom'
          inCustom = true
        } else if (heading === 'agent team overrides') {
          section = 'agents'
          inCustom = false
        } else {
          section = 'other'
        }
        continue
      }

      // h3 = individual agent definition
      if (line.startsWith('### ')) {
        flush()
        agentKey = line.slice(4).trim().toLowerCase().replace(/\s+/g, '-')
        buffer   = []
        continue
      }

      // Accumulate context or agent block
      if (section === 'context' && !agentKey) {
        if (!line.startsWith('>') && !line.startsWith('#')) {
          result.projectContext += line + '\n'
        }
        continue
      }

      if (agentKey) {
        buffer.push(line)
      }
    }
    flush()

    result.projectContext = result.projectContext.trim()
  }
}
