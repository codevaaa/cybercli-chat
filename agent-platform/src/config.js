/**
 * CodeVaa Agent Platform — Central Configuration
 * All tunable constants live here. Override via env vars or .codeva/config.yaml
 */
import path from 'path'
import os from 'os'

export const PLATFORM_VERSION = '1.0.0'
export const PLATFORM_NAME    = 'CodeVaa'

// ── Directories ────────────────────────────────────────────────────────────
export const HOME_DIR           = os.homedir()
export const CODEVA_HOME        = path.join(HOME_DIR, '.codeva')
export const SKILLS_DIR         = path.join(CODEVA_HOME, 'skills')
export const AGENTS_DIR         = path.join(CODEVA_HOME, 'agents')
export const LOGS_DIR           = path.join(CODEVA_HOME, 'logs')
export const SESSIONS_DIR       = path.join(CODEVA_HOME, 'sessions')
export const MEMORY_DIR         = path.join(CODEVA_HOME, 'memory')

// Bundled skills shipped with the platform
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const BUNDLED_SKILLS_DIR = path.resolve(__dirname, '..', 'skills-bundled')

// ── Agent Platform Server ──────────────────────────────────────────────────
export const PLATFORM_PORT      = parseInt(process.env.PORT || process.env.CODEVA_PLATFORM_PORT || '4000', 10)
export const PLATFORM_HOST      = process.env.CODEVA_PLATFORM_HOST || '0.0.0.0'

// ── Backend API ───────────────────────────────────────────────────────────
export const BACKEND_URL        = process.env.CODEVA_BACKEND_URL || 'http://localhost:3000'
export const BACKEND_API_BASE   = `${BACKEND_URL}/api/v1`

// ── Orchestrator ──────────────────────────────────────────────────────────
export const MAX_PARALLEL_AGENTS      = parseInt(process.env.CODEVA_MAX_PARALLEL || '8', 10)
export const AGENT_TIMEOUT_MS         = parseInt(process.env.CODEVA_AGENT_TIMEOUT || '120000', 10)
export const ORCHESTRATOR_TIMEOUT_MS  = parseInt(process.env.CODEVA_ORCH_TIMEOUT || '600000', 10)
export const MAX_RETRIES              = 3
export const RETRY_DELAY_MS           = 2000

// ── Memory ────────────────────────────────────────────────────────────────
export const MEMORY_MAX_CHARS         = 100_000   // per session
export const MEMORY_MAX_ENTRIES       = 500
export const SHARED_STATE_LOCK_TTL_MS = 5_000

// ── Models ────────────────────────────────────────────────────────────────
// Defaults — can be overridden per-agent or per-project in AGENTS.md
export const MODELS = {
  orchestrator:  'codeva/chanakya',      // Master Strategist — best for planning
  coder:         'codeva/ravan',         // God-Tier coder
  researcher:    'codeva/sahadeva',      // Data & research
  tester:        'codeva/arjun',         // Fast, precise
  debugger:      'codeva/madhav',        // Deep reasoning
  devops:        'codeva/bheem',         // Heavy execution
  reviewer:      'codeva/yudhishthir',   // Rules & alignment
  writer:        'codeva/nakul',         // UI/UX & docs
  security:      'codeva/shiv',          // Cybersecurity
  council:       'codeva/panchayat',     // Multi-model consensus
  default:       'auto',
}

// ── Codeva Agent Personas ─────────────────────────────────────────────────
export const AGENT_PERSONAS = {
  ravan:      { name: 'Ravan',      emoji: '👑', specialty: 'God-Tier Brute Force Coder',        color: '#FF4444' },
  abhimanyu:  { name: 'Abhimanyu',  emoji: '⚡', specialty: 'All-Rounder Prodigy',               color: '#FFB300' },
  madhav:     { name: 'Madhav',     emoji: '🧠', specialty: 'Supreme Intelligence & Reasoning',  color: '#9C27B0' },
  yudhishthir:{ name: 'Yudhishthir',emoji: '⚖️', specialty: 'Rules, Alignment & Review',        color: '#2196F3' },
  bheem:      { name: 'Bheem',      emoji: '💪', specialty: 'Bulk Heavy Execution',              color: '#4CAF50' },
  arjun:      { name: 'Arjun',      emoji: '🏹', specialty: 'Swift Precision Executor',          color: '#00BCD4' },
  nakul:      { name: 'Nakul',      emoji: '🎨', specialty: 'UI/UX & Frontend Master',           color: '#E91E63' },
  sahadeva:   { name: 'Sahadeva',   emoji: '🔍', specialty: 'Data, Logs & Research',             color: '#FF9800' },
  chanakya:   { name: 'Chanakya',   emoji: '🗺️', specialty: 'Master Strategist & Planner',      color: '#795548' },
  shiv:       { name: 'Shiv',       emoji: '💀', specialty: 'Cybersecurity Destroyer',           color: '#F44336' },
  panchayat:  { name: 'Panchayat',  emoji: '🌐', specialty: 'Multi-Model Council',               color: '#607D8B' },
}

// ── Tool Permissions ──────────────────────────────────────────────────────
export const DEFAULT_TOOL_PERMISSIONS = {
  orchestrator: ['all'],
  coder:        ['file_read', 'file_write', 'terminal_exec', 'web_search'],
  researcher:   ['web_search', 'file_read', 'browser'],
  tester:       ['file_read', 'file_write', 'terminal_exec'],
  debugger:     ['file_read', 'terminal_exec', 'web_search'],
  devops:       ['file_read', 'file_write', 'terminal_exec', 'web_search'],
  reviewer:     ['file_read'],
  writer:       ['file_read', 'file_write'],
  security:     ['file_read', 'web_search', 'terminal_exec'],
}
