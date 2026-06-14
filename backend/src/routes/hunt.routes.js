import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import HuntSession from '../models/HuntSession.js'
import { HuntOrchestrator } from '../services/hunt/HuntOrchestrator.js'
import { checkTools } from '../services/hunt/ToolRunner.js'
import { Web3Hunter } from '../services/hunt/Web3Hunter.js'
import { listSkills, getSkillContext } from '../services/hunt/SkillsLoader.js'
import { detectExecutionMode } from '../services/hunt/CloudExecutor.js'

const router = Router()

// ── Auth + Plan Guard ─────────────────────────────────────────────────────────
// ALL hunt routes require:
// 1. Valid JWT auth
// 2. MAX plan (not pro, not free)
// 3. x-desktop-client header (desktop app only)

function huntGuard(req, res, next) {
  // MAX plan only
  if (req.user?.plan !== 'max' && req.user?.plan !== 'enterprise') {
    return res.status(403).json({
      error: 'Bug Bounty Engine requires MAX plan',
      required_plan: 'max',
      current_plan: req.user?.plan || 'free',
      upgrade_url: '/upgrade',
    })
  }
  // Desktop only (optional header check — can relax this if needed)
  // if (!req.headers['x-desktop-client']) {
  //   return res.status(403).json({ error: 'Available on Desktop app only' })
  // }
  next()
}

// ── POST /api/v1/hunt/autopilot — Start a full autonomous hunt ───────────────
router.post('/autopilot', requireAuth, huntGuard, async (req, res) => {
  const { target } = req.body

  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'target domain is required' })
  }

  // Sanitize target (must be a valid domain or IP)
  const cleanTarget = target.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  if (!cleanTarget.match(/^[a-z0-9\-\.]+$/)) {
    return res.status(400).json({ error: 'Invalid target format. Use a domain like example.com' })
  }

  // Create session record
  const session = new HuntSession({
    user_id: req.user.id,
    target:  cleanTarget,
    status:  'queued',
    mode:    'autopilot',
  })
  await session.save()

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Hunt-Session-ID', session._id.toString())

  const emit = (type, data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
    }
  }

  emit('session', { sessionId: session._id.toString(), target: cleanTarget, status: 'started' })

  // Update session status
  session.status = 'recon'
  await session.save()

  // Run the full autopilot pipeline
  try {
    const orchestrator = new HuntOrchestrator(
      session._id.toString(),
      cleanTarget,
      req.user.id,
      req.user.plan,
      emit
    )

    const result = await orchestrator.runAutopilot()

    // Save results to session
    if (result.success) {
      session.status         = 'done'
      session.recon          = {
        subdomains_count:     result.recon?.subdomains || 0,
        live_hosts_count:     result.recon?.live_hosts || 0,
        urls_count:           result.recon?.urls || 0,
        attack_surface_summary: result.analysis?.slice(0, 2000),
      }
      session.raw_findings      = result.raw_findings?.slice(0, 100) || []
      session.validated_findings = result.validated_findings?.map(f => ({
        category:    f.category,
        endpoint:    f.evidence?.split(' ')[0],
        evidence:    f.evidence,
        severity:    f.severity || 'medium',
        verdict:     f.verdict,
        gate_result: f.gate_result?.slice(0, 1000),
      })) || []
      session.reports = result.reports?.map(r => ({
        platform: r.platform || 'hackerone',
        title:    r.title,
        severity: r.severity,
        content:  r.content,
      })) || []
      session.finished_at = new Date()
      session.duration_ms = result.duration_ms
    } else {
      session.status = 'failed'
      session.error  = result.error
    }
    await session.save()

    emit('complete', {
      sessionId: session._id.toString(),
      success:   result.success,
      summary:   result.summary || {},
      reports:   result.reports?.length || 0,
      error:     result.error,
    })

  } catch (err) {
    console.error('[Hunt] Autopilot error:', err)
    session.status = 'failed'
    session.error  = err.message
    await session.save()
    emit('error', { message: err.message })
  }

  res.write('data: [DONE]\n\n')
  res.end()
})

// ── GET /api/v1/hunt/sessions — List user's hunt sessions ─────────────────────
router.get('/sessions', requireAuth, huntGuard, async (req, res) => {
  try {
    const sessions = await HuntSession.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('target status mode recon.subdomains_count recon.live_hosts_count validated_findings reports started_at finished_at duration_ms createdAt')
      .lean()

    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/hunt/sessions/:id — Get a specific session ───────────────────
router.get('/sessions/:id', requireAuth, huntGuard, async (req, res) => {
  try {
    const session = await HuntSession.findOne({
      _id:     req.params.id,
      user_id: req.user.id,
    }).lean()

    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/hunt/sessions/:id/reports — Download reports ─────────────────
router.get('/sessions/:id/reports', requireAuth, huntGuard, async (req, res) => {
  try {
    const session = await HuntSession.findOne({
      _id:     req.params.id,
      user_id: req.user.id,
    }).select('target reports').lean()

    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json({ target: session.target, reports: session.reports || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/hunt/tools — Check installed tools ────────────────────────────
router.get('/tools', requireAuth, huntGuard, async (req, res) => {
  try {
    const tools = await checkTools()
    const installed = Object.entries(tools).filter(([, v]) => v).map(([k]) => k)
    const missing   = Object.entries(tools).filter(([, v]) => !v).map(([k]) => k)

    res.json({
      installed,
      missing,
      ready: missing.length === 0,
      message: missing.length > 0
        ? `Missing tools: ${missing.join(', ')}. Install with: bash hunter-engine/install_tools.sh`
        : 'All tools installed',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/v1/hunt/sessions/:id — Delete a session ───────────────────────
router.delete('/sessions/:id', requireAuth, huntGuard, async (req, res) => {
  try {
    await HuntSession.deleteOne({ _id: req.params.id, user_id: req.user.id })
    res.json({ deleted: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/hunt/status — Execution mode + system info ────────────────────
router.get('/status', requireAuth, huntGuard, async (req, res) => {
  try {
    const [mode, tools, skills] = await Promise.all([
      detectExecutionMode(),
      checkTools(),
      listSkills(),
    ])

    const installed = Object.entries(tools).filter(([, v]) => v).map(([k]) => k)
    const missing   = Object.entries(tools).filter(([, v]) => !v).map(([k]) => k)

    res.json({
      exec_mode:    mode,
      e2b_template: !!process.env.E2B_SANDBOX_TEMPLATE_ID,
      tools:        { installed, missing, total: installed.length },
      skills:       skills,
      cloud_ready:  mode === 'cloud',
      description:  mode === 'cloud'
        ? '☁ Cloud mode — all 250+ tools run in secure Linux sandbox on any OS'
        : mode === 'local'
        ? '💻 Local mode — using installed tools on this machine'
        : '🤖 AI-only mode — no shell tools, AI analysis only',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/v1/hunt/web3 — Smart contract audit ─────────────────────────────
router.post('/web3', requireAuth, huntGuard, async (req, res) => {
  const { target, contract_address, contract_source, audit_type = 'full' } = req.body

  if (!target && !contract_address) {
    return res.status(400).json({ error: 'target (protocol name) or contract_address required' })
  }

  // Create session
  const session = new HuntSession({
    user_id: req.user.id,
    target:  contract_address || target,
    status:  'recon',
    mode:    'web3',
  })
  await session.save()

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const emit = (type, data) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
  }

  emit('session', { sessionId: session._id.toString(), target: contract_address || target })

  try {
    const hunter = new Web3Hunter(
      contract_address || target,
      null,  // no sandbox for web3 (uses external APIs)
      req.user.plan,
      (msg) => emit('progress', { message: msg })
    )

    let result
    if (audit_type === 'token') {
      emit('phase', { phase: 'scan', status: 'started' })
      result = await hunter.scanToken(contract_address)
      emit('phase', { phase: 'scan', status: 'done' })
    } else {
      emit('phase', { phase: 'recon', status: 'started' })
      result = await hunter.audit(contract_source, contract_address)
      emit('phase', { phase: 'recon', status: 'done' })
    }

    // Save to session
    session.status = 'done'
    session.raw_findings = result.findings?.slice(0, 50) || []
    session.reports = result.reports || []
    session.finished_at = new Date()
    await session.save()

    emit('complete', {
      sessionId: session._id.toString(),
      success: true,
      findings: result.findings?.length || 0,
      reports: result.reports?.length || 0,
    })
  } catch (err) {
    session.status = 'failed'
    session.error = err.message
    await session.save()
    emit('error', { message: err.message })
  }

  res.write('data: [DONE]\n\n')
  res.end()
})

// ── GET /api/v1/hunt/skills — List available knowledge bases ──────────────────
router.get('/skills', requireAuth, huntGuard, async (req, res) => {
  try {
    const skills = await listSkills()
    const { phase } = req.query
    if (phase) {
      const context = await getSkillContext(phase)
      return res.json({ phase, skills, context_length: context.length })
    }
    res.json({ skills, total: skills.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/v1/hunt/stats — User's hunt statistics ───────────────────────────
router.get('/stats', requireAuth, huntGuard, async (req, res) => {
  try {
    const sessions = await HuntSession.find({ user_id: req.user.id }).lean()

    const stats = {
      total_hunts:       sessions.length,
      completed:         sessions.filter(s => s.status === 'done').length,
      total_findings:    sessions.reduce((n, s) => n + (s.raw_findings?.length || 0), 0),
      total_reports:     sessions.reduce((n, s) => n + (s.reports?.length || 0), 0),
      total_subdomains:  sessions.reduce((n, s) => n + (s.recon?.subdomains_count || 0), 0),
      targets_hunted:    [...new Set(sessions.map(s => s.target))].length,
      avg_duration_mins: sessions.filter(s => s.duration_ms).length > 0
        ? Math.round(sessions.filter(s => s.duration_ms)
            .reduce((n, s) => n + s.duration_ms, 0) / sessions.filter(s => s.duration_ms).length / 60000)
        : 0,
      recent_targets:    sessions.slice(0, 5).map(s => ({ target: s.target, status: s.status, date: s.createdAt })),
    }

    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
