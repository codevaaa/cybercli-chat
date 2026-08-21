/**
 * Prompt Enhancer — rewrites vague IDE composer drafts into structured
 * coding instructions. Quotas are plan-gated (free/pro/max).
 */

/** Daily enhance limits by plan. -1 = unlimited. */
export const ENHANCE_DAILY_QUOTA = {
  free: 10,
  pro: 100,
  max: -1,
  enterprise: -1,
}

/** In-memory daily counters: `${userId}:${yyyy-mm-dd}` → count */
const enhanceUsage = new Map()

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function getEnhanceQuota(planName) {
  const key = String(planName || 'free').toLowerCase()
  return ENHANCE_DAILY_QUOTA[key] ?? ENHANCE_DAILY_QUOTA.free
}

/**
 * Check (and optionally consume) one enhance for the user.
 * @returns {{ allowed: boolean, used: number, limit: number, remaining: number }}
 */
export function checkEnhanceQuota(userId, planName, { consume = false } = {}) {
  const limit = getEnhanceQuota(planName)
  const key = `${userId || 'anon'}:${utcDayKey()}`
  const used = enhanceUsage.get(key) || 0

  if (limit === -1) {
    if (consume) enhanceUsage.set(key, used + 1)
    const next = consume ? used + 1 : used
    return { allowed: true, used: next, limit: -1, remaining: -1 }
  }

  if (used >= limit) {
    return { allowed: false, used, limit, remaining: 0 }
  }

  if (consume) {
    enhanceUsage.set(key, used + 1)
    return { allowed: true, used: used + 1, limit, remaining: Math.max(0, limit - used - 1) }
  }

  return { allowed: true, used, limit, remaining: Math.max(0, limit - used) }
}

/** Test helper — clear in-memory counters. */
export function _resetEnhanceQuotaForTests() {
  enhanceUsage.clear()
}

export const ENHANCE_SYSTEM_PROMPT = `You are Codevaa's Prompt Master Engineer — the strongest prompt rewriter for an agentic IDE (Chat / Agent / Plan / Debug / Multitask).

Mission: turn a vague or underspecified draft into an execution-ready instruction that a coding agent can follow without guessing.

Rules:
1. Output ONLY the enhanced prompt text — no preamble, no "Here's the improved prompt:", no markdown fences wrapping the whole answer.
2. Preserve the user's language intent. If they wrote Hindi or Hinglish, keep the enhanced prompt in that language (or bilingual). Otherwise use clear, precise English.
3. Always structure with short labeled sections when useful:
   - Goal (one sentence)
   - Context (stack, open files, relevant paths from digest only)
   - Constraints (minimal diff, no drive-by refactors, match project style)
   - Steps / approach (ordered, mode-aware)
   - Acceptance criteria (testable)
4. Mode shaping:
   - ask: read-only investigation questions; forbid edits/terminal
   - agent: full edit + terminal loop; prefer concrete file targets
   - plan: exploration then a numbered plan; defer irreversible edits until approved
   - debug: reproduce → hypothesize → instrument/patch → verify
   - multitask: split into parallel workstreams with clear ownership boundaries
5. Use the project digest if provided — reference real stacks, folders, and open files. Do NOT invent files, APIs, or libraries not in the digest.
6. Do not execute tools, write production code, or claim you edited files. You only rewrite the prompt.
7. Never invent secrets, credentials, API keys, tokens, or private URLs.
8. Prefer actionable specificity over length. Typical output: 120–350 words unless the draft is already detailed.
9. If the draft is empty or nonsense, produce a short clarifying Goal that asks the user for the missing target.
10. When the user mentions tests, CI, or terminal, include exact verification commands as acceptance criteria (generic if digest lacks scripts).`

/**
 * Build messages for the enhance completion call.
 */
export function buildEnhanceMessages({ rawPrompt, projectDigest, mode, locale }) {
  const parts = [
    `Mode: ${mode || 'agent'}`,
    locale ? `Locale preference: ${locale}` : null,
    projectDigest ? `Project digest:\n${String(projectDigest).slice(0, 6000)}` : 'Project digest: (none provided)',
    '',
    'Draft prompt to enhance:',
    String(rawPrompt || '').slice(0, 8000),
  ].filter((p) => p != null)

  return [
    { role: 'system', content: ENHANCE_SYSTEM_PROMPT, _skip_inject: true },
    { role: 'user', content: parts.join('\n') },
  ]
}

/**
 * Lightweight summary of what changed (for UI tooltips).
 */
export function summarizeEnhanceChanges(raw, enhanced) {
  const rawLen = (raw || '').trim().length
  const enhLen = (enhanced || '').trim().length
  if (!rawLen) return 'Generated structured prompt'
  if (enhLen > rawLen * 1.4) return 'Expanded with goals, constraints, and acceptance criteria'
  if (enhLen < rawLen * 0.7) return 'Tightened wording and structure'
  return 'Clarified structure and intent'
}
