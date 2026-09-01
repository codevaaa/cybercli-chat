/**
 * Agency Agents — Persona registry API
 * ----------------------------------------------------------------------------
 * Read-only endpoints that expose the curated persona registry to the chat UI,
 * CLI, and Chrome extension. No database writes; the registry is in-memory and
 * frozen (see services/agents/registry.js).
 *
 * Security posture:
 * - All endpoints are read-only (GET) and safe for anonymous access.
 * - `agentId` params are strictly validated against AGENT_ID_RE before use, so
 *   nothing user-controlled is used to build queries or file paths.
 * - A dedicated rate limiter caps abuse without affecting the global limiter.
 * - Responses are cache-friendly (static registry) via Cache-Control.
 */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { optionalAuth } from '../middleware/auth.js'
import {
  AGENT_ID_RE,
  DIVISIONS,
  PERSONA_COUNT,
  getPersonaById,
  listPersonas,
  toPublicPersona,
} from '../services/agents/registry.js'

const router = Router()

// Dedicated, generous read limiter — the registry is static and cheap, but we
// still cap runaway clients. Keyed per-IP by express-rate-limit defaults.
const agentsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // 300 reads / 5 min / IP — plenty for a picker, hostile scrapers get 429
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests to the agents registry' },
})

router.use(agentsLimiter)

// Registry is static; let clients and CDNs cache list/get responses briefly.
function setCacheHeaders(res) {
  res.setHeader('Cache-Control', 'public, max-age=300') // 5 min
}

/**
 * GET /api/v1/agents
 * List all personas (public-safe view, no system prompt).
 * Optional query: ?division=engineering  ?includePrompt=1 (auth-gated)
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const rawDivision = typeof req.query.division === 'string' ? req.query.division : undefined
    // Validate division against the known allowlist; ignore anything else.
    const division = rawDivision && DIVISIONS[rawDivision] ? rawDivision : undefined

    // Only authenticated callers may pull full prompts in bulk (avoids trivial
    // scraping of the whole prompt library by anonymous clients).
    const wantPrompt = req.query.includePrompt === '1' || req.query.includePrompt === 'true'
    const includePrompt = wantPrompt && Boolean(req.user)

    const personas = listPersonas({ division, includePrompt })
    // Prompt-included responses vary by auth, so they must not land in a shared
    // cache. Only the anonymous, prompt-free listing is publicly cacheable.
    if (includePrompt) {
      res.setHeader('Cache-Control', 'private, max-age=60')
      res.setHeader('Vary', 'Authorization')
    } else {
      setCacheHeaders(res)
    }
    res.json({
      count: personas.length,
      total: PERSONA_COUNT,
      divisions: DIVISIONS,
      personas,
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to list agents' })
  }
})

/**
 * GET /api/v1/agents/divisions
 * The division allowlist for building the picker UI grouping.
 */
router.get('/divisions', (_req, res) => {
  setCacheHeaders(res)
  res.json({ divisions: DIVISIONS })
})

/**
 * GET /api/v1/agents/:id
 * Fetch a single persona. Includes the trusted system prompt so clients can
 * preview it; the prompt itself is server-authored and safe to expose.
 */
router.get('/:id', (req, res) => {
  const id = req.params.id
  if (typeof id !== 'string' || !AGENT_ID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid agent id' })
  }

  const persona = getPersonaById(id)
  if (!persona) {
    return res.status(404).json({ error: 'Agent not found' })
  }

  setCacheHeaders(res)
  res.json({ persona: toPublicPersona(persona, { includePrompt: true }) })
})

export default router
