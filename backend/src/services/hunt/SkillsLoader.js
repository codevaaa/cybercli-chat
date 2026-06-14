/**
 * SkillsLoader — loads hunter-engine/skills/ markdown files into LLM context.
 *
 * The skills folder contains 10 knowledge bases covering 21 vuln classes,
 * methodology, report writing, web3 auditing, credential attacks, etc.
 * These get injected into AI prompts so every agent has expert-level knowledge.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HUNTER_ROOT = path.resolve(__dirname, '../../../../hunter-engine')
const SKILLS_DIR  = path.join(HUNTER_ROOT, 'skills')
const RULES_DIR   = path.join(HUNTER_ROOT, 'rules')

// Which skills to load for each phase
const PHASE_SKILLS = {
  recon:    ['web2-recon'],
  analyze:  ['bb-methodology'],
  scan:     ['web2-vuln-classes', 'security-arsenal'],
  validate: ['triage-validation'],
  chain:    ['bug-bounty'],
  report:   ['report-writing'],
  web3:     ['web3-audit', 'meme-coin-audit'],
  cred:     ['credential-attack'],
}

// Cache loaded skills in memory
const _cache = new Map()

async function readSkillFile(skillDir, maxBytes = 8000) {
  const cacheKey = skillDir
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)

  try {
    const skillPath = path.join(SKILLS_DIR, skillDir, 'SKILL.md')
    const content = await fs.readFile(skillPath, 'utf-8')
    // Strip YAML frontmatter
    const body = content.replace(/^---[\s\S]+?---\n/, '').trim()
    // Truncate to keep context manageable
    const truncated = body.length > maxBytes
      ? body.slice(0, maxBytes) + '\n\n[... truncated for context window ...]'
      : body
    _cache.set(cacheKey, truncated)
    return truncated
  } catch {
    return ''
  }
}

async function readRulesFile() {
  if (_cache.has('rules')) return _cache.get('rules')
  try {
    const content = await fs.readFile(path.join(RULES_DIR, 'hunting.md'), 'utf-8')
    const truncated = content.slice(0, 3000)
    _cache.set('rules', truncated)
    return truncated
  } catch {
    return ''
  }
}

/**
 * Get skill context for a specific hunt phase.
 * Returns a string to inject into the LLM system prompt.
 */
export async function getSkillContext(phase, extraSkills = []) {
  const skillNames = [...(PHASE_SKILLS[phase] || []), ...extraSkills]
  if (skillNames.length === 0) return ''

  const parts = []

  // Always include hunting rules
  if (['scan', 'validate', 'chain'].includes(phase)) {
    const rules = await readRulesFile()
    if (rules) parts.push(`## HUNTING RULES\n${rules}`)
  }

  for (const skillName of skillNames) {
    const content = await readSkillFile(skillName, 6000)
    if (content) {
      parts.push(`## SKILL: ${skillName.toUpperCase()}\n${content}`)
    }
  }

  return parts.join('\n\n---\n\n')
}

/**
 * Build an enhanced system prompt with skill context injected.
 * Used by HuntOrchestrator to supercharge each AI agent.
 */
export async function buildEnhancedPrompt(basePrompt, phase) {
  const skillContext = await getSkillContext(phase)
  if (!skillContext) return basePrompt
  return `${basePrompt}\n\n${skillContext}`
}

/**
 * Get the web3 audit skill for smart contract hunting.
 */
export async function getWeb3SkillContext() {
  const [web3, meme] = await Promise.all([
    readSkillFile('web3-audit', 10000),
    readSkillFile('meme-coin-audit', 4000),
  ])
  return [web3, meme].filter(Boolean).join('\n\n---\n\n')
}

/**
 * List all available skills.
 */
export async function listSkills() {
  try {
    const dirs = await fs.readdir(SKILLS_DIR)
    return dirs.filter(d => !d.startsWith('.'))
  } catch {
    return []
  }
}
