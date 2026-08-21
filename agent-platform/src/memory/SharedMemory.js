/**
 * SharedMemory — Controlled shared state store for a session.
 *
 * All agents in a session share this store but with permission controls:
 * - Orchestrator can write anything
 * - Other agents can only write to their designated namespace
 * - All agents can read all entries (for cross-agent context)
 *
 * Inspired by Antigravity 2.0's "shared memory layer" — the key design
 * that prevents agents from duplicating work or contradicting each other.
 *
 * Persists to disk at ~/.codeva/sessions/<sessionId>/memory.json
 */
import fs from 'fs/promises'
import path from 'path'
import { EventEmitter } from 'eventemitter3'
import { SESSIONS_DIR, MEMORY_MAX_ENTRIES, MEMORY_MAX_CHARS } from '../config.js'
import { logger } from '../utils/logger.js'

export class SharedMemory extends EventEmitter {
  constructor(sessionId) {
    super()
    this.sessionId  = sessionId
    this.store      = new Map()   // key → { value, agentType, timestamp, key }
    this.locks      = new Map()   // key → agentType (write lock)
    this.sessionDir = path.join(SESSIONS_DIR, sessionId)
    this.memFile    = path.join(this.sessionDir, 'memory.json')
    this._initialized = false
  }

  async init() {
    if (this._initialized) return
    try {
      await fs.mkdir(this.sessionDir, { recursive: true })
      // Load existing memory from disk (for resumed sessions)
      const raw = await fs.readFile(this.memFile, 'utf8').catch(() => null)
      if (raw) {
        const entries = JSON.parse(raw)
        for (const entry of entries) {
          this.store.set(entry.key, entry)
        }
        logger.info(`[Memory:${this.sessionId}] Loaded ${this.store.size} entries from disk`)
      }
    } catch (err) {
      logger.warn(`[Memory:${this.sessionId}] Init warning: ${err.message}`)
    }
    this._initialized = true
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async set(key, value, agentType = 'orchestrator') {
    await this.init()

    // Permission check
    const lock = this.locks.get(key)
    if (lock && lock !== agentType && agentType !== 'orchestrator') {
      throw new Error(`Memory key "${key}" is locked by ${lock}. ${agentType} cannot write.`)
    }

    const entry = {
      key,
      value:     typeof value === 'string' ? value.slice(0, 50000) : value,
      agentType,
      timestamp: new Date().toISOString(),
      writes:    (this.store.get(key)?.writes || 0) + 1,
    }

    this.store.set(key, entry)
    this.emit('memory:set', entry)

    // Prune if over limit
    if (this.store.size > MEMORY_MAX_ENTRIES) {
      this._prune()
    }

    // Async persist (don't await — fire and forget)
    this._persist().catch(err => logger.warn(`[Memory] Persist failed: ${err.message}`))

    return entry
  }

  async lock(key, agentType) {
    this.locks.set(key, agentType)
  }

  async unlock(key) {
    this.locks.delete(key)
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  get(key) {
    return this.store.get(key)?.value ?? null
  }

  getEntry(key) {
    return this.store.get(key) || null
  }

  getAll() {
    return [...this.store.values()]
  }

  /**
   * Get memory entries relevant to a specific agent type.
   * Returns entries written by this agent type + entries tagged for 'all'.
   */
  getForAgent(agentType) {
    return [...this.store.values()].filter(e =>
      e.agentType === agentType ||
      e.agentType === 'orchestrator' ||
      e.agentType === 'all'
    )
  }

  /**
   * Get a flat context string suitable for injecting into an LLM prompt.
   */
  getContextString(maxChars = 4000) {
    const entries = [...this.store.values()]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    
    let context = ''
    for (const e of entries) {
      const line = `[${e.key}]: ${String(e.value).slice(0, 500)}\n`
      if (context.length + line.length > maxChars) break
      context += line
    }
    return context
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────

  snapshot() {
    return {
      sessionId: this.sessionId,
      size:      this.store.size,
      entries:   [...this.store.values()].map(e => ({
        key:       e.key,
        agentType: e.agentType,
        timestamp: e.timestamp,
        preview:   String(e.value).slice(0, 100),
      })),
    }
  }

  clear() {
    this.store.clear()
    this.locks.clear()
    this.emit('memory:cleared')
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  async _persist() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true })
      const entries = [...this.store.values()]
      await fs.writeFile(this.memFile, JSON.stringify(entries, null, 2), 'utf8')
    } catch (err) {
      logger.warn(`[Memory:${this.sessionId}] Persist error: ${err.message}`)
    }
  }

  _prune() {
    // Remove oldest entries until under limit
    const sorted = [...this.store.entries()]
      .sort((a, b) => new Date(a[1].timestamp) - new Date(b[1].timestamp))

    const toRemove = sorted.slice(0, this.store.size - MEMORY_MAX_ENTRIES + 10)
    for (const [key] of toRemove) {
      // Don't prune orchestrator-critical entries
      const entry = this.store.get(key)
      if (entry?.key === 'goal' || entry?.key === 'plan_summary') continue
      this.store.delete(key)
    }
  }
}
