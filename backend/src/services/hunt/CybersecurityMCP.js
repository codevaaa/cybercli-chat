/**
 * CybersecurityMCP — integrates Anthropic-Cybersecurity-Skills as an MCP-style
 * knowledge provider for the Codeva Hunter Engine.
 *
 * Source: https://github.com/codevaaa/Anthropic-Cybersecurity-Skills
 * 754 structured cybersecurity skills mapped to:
 *   - MITRE ATT&CK
 *   - NIST CSF 2.0
 *   - MITRE ATLAS
 *   - D3FEND
 *   - NIST AI RMF
 * 26 security domains, works with any AI agent harness.
 *
 * Usage in HuntOrchestrator:
 *   const skill = await CybersecurityMCP.getSkill('sql-injection')
 *   const attackPath = await CybersecurityMCP.getAttackPath('web-app')
 */

import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Path to cloned Anthropic-Cybersecurity-Skills repo
// Can be overridden via env var
const SKILLS_REPO = process.env.CYBERSEC_SKILLS_PATH ||
  path.resolve(__dirname, '../../../../hunter-engine/skills')

// In-memory cache
const _cache = new Map()

// ── 26 Security Domains → hunter-engine/skills mapping ─────────────────────
const DOMAIN_MAP = {
  'web-application':    'web2-vuln-classes',
  'reconnaissance':     'web2-recon',
  'bug-bounty':         'bug-bounty',
  'methodology':        'bb-methodology',
  'report-writing':     'report-writing',
  'triage-validation':  'triage-validation',
  'web3':               'web3-audit',
  'token-security':     'meme-coin-audit',
  'credential-attack':  'credential-attack',
  'security-arsenal':   'security-arsenal',
}

// ── Skill categories (MITRE ATT&CK aligned) ─────────────────────────────────
const SKILL_CATEGORIES = {
  // Initial Access
  'phishing':           'credential-attack',
  'supply-chain':       'web2-vuln-classes',
  'exploit-public':     'web2-vuln-classes',

  // Discovery
  'network-scan':       'web2-recon',
  'subdomain-enum':     'web2-recon',
  'service-discovery':  'web2-recon',

  // Credential Access
  'sql-injection':      'web2-vuln-classes',
  'credential-dump':    'security-arsenal',
  'brute-force':        'credential-attack',
  'password-spray':     'credential-attack',
  'jwt-attack':         'web2-vuln-classes',

  // Collection
  'ssrf':               'web2-vuln-classes',
  'idor':               'web2-vuln-classes',
  'cors':               'web2-vuln-classes',
  'xxe':                'web2-vuln-classes',

  // Execution
  'xss':                'web2-vuln-classes',
  'rce':                'web2-vuln-classes',
  'ssti':               'web2-vuln-classes',
  'code-injection':     'web2-vuln-classes',

  // Persistence
  'oauth-abuse':        'web2-vuln-classes',
  'session-hijack':     'web2-vuln-classes',

  // Impact
  'smart-contract':     'web3-audit',
  'flash-loan':         'web3-audit',
  'reentrancy':         'web3-audit',
  'token-rug':          'meme-coin-audit',
}

export class CybersecurityMCP {

  /**
   * Get skill context for a specific attack technique.
   * Maps technique names to our local skill files.
   */
  static async getSkill(technique, maxBytes = 6000) {
    const cacheKey = `skill:${technique}`
    if (_cache.has(cacheKey)) return _cache.get(cacheKey)

    const skillDir = SKILL_CATEGORIES[technique.toLowerCase()] ||
                     DOMAIN_MAP[technique.toLowerCase()]

    if (!skillDir) return null

    try {
      const skillPath = path.join(SKILLS_REPO, skillDir, 'SKILL.md')
      const content = await fs.readFile(skillPath, 'utf-8')
      // Strip YAML frontmatter
      const body = content.replace(/^---[\s\S]+?---\n/, '').trim()
      const result = body.length > maxBytes
        ? body.slice(0, maxBytes) + '\n\n[truncated]'
        : body
      _cache.set(cacheKey, result)
      return result
    } catch {
      return null
    }
  }

  /**
   * Get a full attack path for a given target type.
   * Returns multi-phase context: recon → hunt → exploit → report
   */
  static async getAttackPath(targetType = 'web-app') {
    const phases = {
      'web-app': ['web2-recon', 'web2-vuln-classes', 'triage-validation', 'report-writing'],
      'api':     ['web2-recon', 'web2-vuln-classes', 'security-arsenal', 'report-writing'],
      'web3':    ['web3-audit', 'meme-coin-audit', 'report-writing'],
      'full':    ['web2-recon', 'bb-methodology', 'web2-vuln-classes', 'security-arsenal', 'triage-validation', 'report-writing'],
    }

    const skillDirs = phases[targetType] || phases['full']
    const parts = []

    for (const dir of skillDirs) {
      try {
        const skillPath = path.join(SKILLS_REPO, dir, 'SKILL.md')
        const content = await fs.readFile(skillPath, 'utf-8')
        const body = content.replace(/^---[\s\S]+?---\n/, '').trim()
        parts.push(`## ${dir.toUpperCase()}\n${body.slice(0, 3000)}`)
      } catch {}
    }

    return parts.join('\n\n---\n\n')
  }

  /**
   * Get MITRE ATT&CK tactic context for current hunt phase.
   */
  static async getTacticContext(phase) {
    const tacticMap = {
      recon:    'web2-recon',
      analyze:  'bb-methodology',
      scan:     'web2-vuln-classes',
      validate: 'triage-validation',
      chain:    'bug-bounty',
      report:   'report-writing',
    }

    return CybersecurityMCP.getSkill(tacticMap[phase] || 'bug-bounty', 5000)
  }

  /**
   * Search skills by keyword across all domains.
   */
  static async searchSkills(keyword) {
    const results = []
    const kw = keyword.toLowerCase()

    for (const [technique, dir] of Object.entries(SKILL_CATEGORIES)) {
      if (technique.includes(kw) || dir.includes(kw)) {
        const content = await CybersecurityMCP.getSkill(technique, 1000)
        if (content) results.push({ technique, domain: dir, preview: content.slice(0, 200) })
      }
    }

    return results
  }

  /**
   * List all available skills.
   */
  static async listAll() {
    return Object.keys(SKILL_CATEGORIES).map(k => ({
      technique: k,
      domain: SKILL_CATEGORIES[k],
    }))
  }
}

// ── MCP-compatible tool definitions ─────────────────────────────────────────
// These follow the MCP tool schema so this can be exposed as an MCP server

export const MCP_TOOLS = [
  {
    name: 'get_cybersecurity_skill',
    description: 'Get detailed knowledge for a specific cybersecurity technique or attack class',
    inputSchema: {
      type: 'object',
      properties: {
        technique: {
          type: 'string',
          description: 'Attack technique (e.g. sql-injection, ssrf, xss, idor, jwt-attack, smart-contract)',
          enum: Object.keys(SKILL_CATEGORIES),
        }
      },
      required: ['technique'],
    },
    handler: async ({ technique }) => CybersecurityMCP.getSkill(technique),
  },
  {
    name: 'get_attack_path',
    description: 'Get a full multi-phase attack methodology for a target type',
    inputSchema: {
      type: 'object',
      properties: {
        target_type: {
          type: 'string',
          enum: ['web-app', 'api', 'web3', 'full'],
          description: 'Type of target being assessed',
        }
      },
      required: ['target_type'],
    },
    handler: async ({ target_type }) => CybersecurityMCP.getAttackPath(target_type),
  },
  {
    name: 'get_hunt_phase_context',
    description: 'Get MITRE ATT&CK aligned context for current hunt phase',
    inputSchema: {
      type: 'object',
      properties: {
        phase: {
          type: 'string',
          enum: ['recon', 'analyze', 'scan', 'validate', 'chain', 'report'],
        }
      },
      required: ['phase'],
    },
    handler: async ({ phase }) => CybersecurityMCP.getTacticContext(phase),
  },
  {
    name: 'search_skills',
    description: 'Search cybersecurity skills by keyword',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' }
      },
      required: ['keyword'],
    },
    handler: async ({ keyword }) => CybersecurityMCP.searchSkills(keyword),
  },
]

export default CybersecurityMCP
