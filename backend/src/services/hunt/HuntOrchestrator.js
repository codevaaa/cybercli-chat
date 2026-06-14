/**
 * HuntOrchestrator — the brain of the Codeva Bug Bounty Engine.
 *
 * Replaces brain.py from the claude-bug-bounty repo entirely.
 * Uses our own llmGateway instead of Claude/Ollama/Groq direct.
 *
 * Flow:
 *   1. RECON     → shell tools (subfinder, httpx, nuclei)
 *   2. ANALYZE   → llmGateway (Ravan) → decide attack surface + priorities
 *   3. SCAN      → shell tools (dalfox, sqlmap, ffuf, nuclei CVEs)
 *   4. VALIDATE  → llmGateway (Kali)  → 7-Question Gate per finding
 *   5. CHAIN     → llmGateway (Ravan) → exploit chain builder
 *   6. REPORT    → llmGateway (Ravan) → H1-ready report markdown
 */

import { promises as fs } from 'fs'
import path from 'path'
import llmGateway from '../llm/gateway.js'
import {
  getSessionDirs,
  runReconEngine,
  runVulnScanner,
  collectFindings,
} from './ToolRunner.js'
import { CloudExecutor, detectExecutionMode } from './CloudExecutor.js'
import { AgentSwarm } from './AgentSwarm.js'
import { buildEnhancedPrompt } from './SkillsLoader.js'
import CybersecurityMCP from './CybersecurityMCP.js'

// ── Agent system prompts (derived from hunter-engine/agents/*.md) ────────────

const RECON_ANALYST_PROMPT = `You are an elite bug bounty reconnaissance analyst.
Given recon data (subdomains, live hosts, tech stack, URLs, nuclei findings),
you analyze the attack surface and produce a PRIORITIZED hunt plan.

Rules:
- Only reference hostnames/endpoints that actually appear in the data
- Rank by impact: what gives highest bounty for least effort
- Identify the specific vuln class most likely present based on tech stack
- Flag chain opportunities (A→B→C)
- Output must be actionable: exact endpoints, exact techniques

Output format:
## ATTACK SURFACE SCORE: [1-10]
## TOP 3 HUNT TARGETS (ordered by priority):
1. [hostname/endpoint] — [vuln class] — [why]
2. ...
## RECOMMENDED VULN CLASSES (ordered):
1. [class] — [specific reason from data]
## RED FLAGS:
- [pattern that signals bigger bug nearby]
## KILL LIST (skip these):
- [endpoint/host + reason]`

const KALIKAL_7Q_GATE_PROMPT = `You are Kali_Kal, an elite security triage specialist.
Your job: run the 7-Question Gate on findings. Kill weak ones fast. Approve real bugs.

THE 7 QUESTIONS (first NO = KILL):
Q1: Can attacker exploit this RIGHT NOW with a real HTTP request? (no theoretical bugs)
Q2: Is impact type accepted by bug bounty programs? (not info-disclosure-only)
Q3: Asset confirmed in scope and owned by target org?
Q4: Works without privileged access attacker can't get? (no "admin can do X")
Q5: Not already documented/known behavior?
Q6: Impact provable beyond "technically possible"? (must have real data, not just 200 OK)
Q7: Not on never-submit list? (no missing headers, no CORS wildcard alone, etc.)

NEVER-SUBMIT (instant KILL): missing CSP/HSTS, missing SPF/DKIM, GraphQL introspection alone,
version disclosure without CVE exploit, clickjacking without PoC, SSRF DNS-only,
open redirect alone, self-XSS, CORS wildcard without credentialed exfil proof.

Output:
VERDICT: [SUBMIT | CHAIN | DROP]
Q1-Q7: [YES/NO — reason]
REASON: [one sentence]
ACTION: [what to do next]
IF CHAIN: [what other bug to combine with]`

const CHAIN_BUILDER_PROMPT = `You are Ravan, an elite exploit chain architect.
Given multiple confirmed findings, build A→B→C exploit chains.

Known chains that pay most:
- Open redirect + OAuth redirect_uri → auth code theft → ATO (Critical)
- CORS wildcard + credentialed request → session token theft (High)
- SSRF + cloud metadata → IAM credentials → RCE (Critical)
- IDOR (read) + IDOR (write) → full account takeover (Critical)
- XSS + missing HttpOnly → session steal → ATO (High)
- GraphQL introspection + missing field auth → mass PII exfil (High)

For each chain found:
1. CHAIN NAME: [A→B chain name]
2. STEPS: [exact step-by-step]
3. COMBINED SEVERITY: [Critical/High/Medium]
4. POC SKETCH: [rough HTTP requests]
5. CONFIRMATION: [test that proves chain works]
6. PAYOUT: [estimated HackerOne bounty $]`

const REPORT_WRITER_PROMPT = `You are Ravan, writing a professional bug bounty report.
This report will be submitted to HackerOne/Bugcrowd. It must be perfect.

Rules:
- NEVER use: "could potentially", "may allow", "might be possible"
- ALWAYS prove: show actual data in response, not just "200 OK"
- Impact first: sentence 1 = what attacker gets, not what the bug is
- Short: under 600 words. Triagers skim.
- Human tone: write to a person, not a system
- Title formula: [Bug Class] in [Exact Endpoint] allows [attacker] to [impact]

Format (HackerOne):
## Summary
[Impact-first paragraph. No "could potentially".]

## Vulnerability Details
**Type:** [Bug Class]
**CVSS 3.1:** [score (vector)]
**Endpoint:** [Method] [URL]

## Steps to Reproduce
1. [Exact step with HTTP request]
2. ...

## Impact
[Concrete business impact. Real users affected. Data type.]

## Remediation
[1-2 sentences, specific fix.]`

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export class HuntOrchestrator {
  constructor(sessionId, target, userId, plan, emit) {
    this.sessionId = sessionId
    this.target    = target
    this.userId    = userId
    this.plan      = plan
    this.emit      = emit   // (type, data) → SSE writer
    this.dirs      = null
  }

  log(phase, message) {
    console.log(`[Hunt/${this.sessionId}] [${phase}] ${message}`)
    this.emit('progress', { phase, message, ts: new Date().toISOString() })
  }

  async llm(prompt, model = 'codeva-ravan-v1', systemOverride = null, phase = null) {
    // Enhance system prompt with skill context for the phase
    let system = systemOverride
    if (phase && systemOverride) {
      system = await buildEnhancedPrompt(systemOverride, phase)
    }

    const messages = system
      ? [{ role: 'system', content: system }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }]

    let result = ''
    const stream = llmGateway.complete({
      messages,
      model,
      temperature: 0.2,
      plan: this.plan,
      isKaliKal: model.includes('kali'),
    })

    for await (const chunk of await stream) {
      if (chunk.type === 'token') result += chunk.content
      if (chunk.type === 'error') throw new Error(chunk.content)
    }
    return result.trim()
  }

  // ── Phase 1: Recon ──────────────────────────────────────────────────────────
  async runRecon() {
    this.log('RECON', `Starting reconnaissance on ${this.target}`)
    this.dirs = await getSessionDirs(this.sessionId)

    const reconResult = await runReconEngine(
      this.target,
      this.dirs,
      (line) => this.log('RECON', line)
    )

    if (!reconResult) {
      this.log('RECON', 'Shell tools not available — using AI-only recon mode')
      return { fallback: true }
    }

    // Read recon summary files
    const reconData = await this.readReconData()
    this.log('RECON', `Found: ${reconData.subdomains} subdomains, ${reconData.live_hosts} live hosts, ${reconData.urls} URLs`)

    return reconData
  }

  async readReconData() {
    const base = path.join(this.dirs.recon, this.target)
    const readSafe = async (f) => {
      try { return await fs.readFile(path.join(base, f), 'utf-8') }
      catch { return '' }
    }
    const countLines = (content) => content.split('\n').filter(Boolean).length

    const [subs, live, urls, nuclei, httpx] = await Promise.all([
      readSafe('subdomains/all.txt'),
      readSafe('live/urls.txt'),
      readSafe('urls/all.txt'),
      readSafe('live/nuclei_takeovers.txt'),
      readSafe('live/httpx_full.txt'),
    ])

    return {
      subdomains:  countLines(subs),
      live_hosts:  countLines(live),
      urls:        countLines(urls),
      live_sample: httpx.split('\n').slice(0, 30).join('\n'),
      nuclei_hits: nuclei.split('\n').filter(Boolean),
      subs_sample: subs.split('\n').slice(0, 20).join('\n'),
      urls_sample: urls.split('\n').slice(0, 50).join('\n'),
    }
  }

  // ── Phase 2: AI Analysis (replaces brain.analyze_recon) ────────────────────
  async analyzeRecon(reconData) {
    this.log('ANALYZE', 'AI analyzing attack surface...')

    // Get MITRE ATT&CK aligned context for recon phase
    const tacticCtx = await CybersecurityMCP.getTacticContext('analyze')

    const prompt = `Analyze this recon data for ${this.target} and produce a prioritized hunt plan.

## Stats
- Subdomains found: ${reconData.subdomains}
- Live hosts: ${reconData.live_hosts}
- Total URLs: ${reconData.urls}
- Nuclei findings: ${reconData.nuclei_count || 0}
- XSS parameters: ${reconData.xss_params || 0}
- SQLi parameters: ${reconData.sqli_params || 0}
- API endpoints: ${reconData.api_endpoints || 0}

## Live Hosts Sample (tech detection)
${reconData.live_sample || '(none)'}

## Nuclei Findings
${reconData.nuclei_sample?.join('\n') || '(none)'}

## Secrets Found
${reconData.secrets?.join('\n') || '(none)'}

Produce a prioritized attack plan based ONLY on data above.`

    const system = tacticCtx
      ? `${RECON_ANALYST_PROMPT}\n\n## MITRE ATT&CK CONTEXT\n${tacticCtx.slice(0, 3000)}`
      : RECON_ANALYST_PROMPT

    const analysis = await this.llm(prompt, 'codeva-ravan-v1', system)
    this.log('ANALYZE', 'Attack surface analyzed')
    return analysis
  }

  // ── Phase 3: Vuln Scan ──────────────────────────────────────────────────────
  async runScan() {
    this.log('SCAN', `Starting vulnerability scan on ${this.target}`)

    const scanResult = await runVulnScanner(
      this.target,
      this.dirs,
      (line) => this.log('SCAN', line)
    )

    if (!scanResult) {
      this.log('SCAN', 'Shell scanners not available')
      return []
    }

    const findings = await collectFindings(this.dirs.findings)
    this.log('SCAN', `Collected ${findings.length} raw findings`)
    return findings
  }

  // ── Phase 4: Validate Each Finding (7-Question Gate) ───────────────────────
  async validateFindings(rawFindings) {
    this.log('VALIDATE', `Running 7-Question Gate on ${rawFindings.length} findings...`)
    const validated = []

    // Load triage skill from CybersecurityMCP
    const triageCtx = await CybersecurityMCP.getTacticContext('validate')
    const gateSystem = triageCtx
      ? `${KALIKAL_7Q_GATE_PROMPT}\n\n## TRIAGE CONTEXT\n${triageCtx.slice(0, 2000)}`
      : KALIKAL_7Q_GATE_PROMPT

    for (const finding of rawFindings) {
      this.log('VALIDATE', `Checking: [${finding.category}] ${(finding.evidence || '').slice(0, 80)}`)

      // Get technique-specific skill context
      const techCtx = await CybersecurityMCP.getSkill(finding.category, 1500)

      const prompt = `[${finding.category.toUpperCase()}] ${finding.evidence}
Tool: ${finding.tool || 'unknown'}
Target: ${this.target}
${techCtx ? `\nTechnique context:\n${techCtx.slice(0, 800)}` : ''}

Run the 7-Question Gate on this finding.`

      const result = await this.llm(prompt, 'codeva-kali-v1', gateSystem)

      const verdictMatch = result.match(/VERDICT:\s*(SUBMIT|CHAIN|DROP)/i)
      const verdict = verdictMatch?.[1]?.toUpperCase() || 'DROP'

      validated.push({ ...finding, verdict, gate_result: result })
      this.log('VALIDATE', `→ ${verdict}: ${finding.category}`)
    }

    const submittable = validated.filter(f => f.verdict === 'SUBMIT' || f.verdict === 'CHAIN')
    this.log('VALIDATE', `Validated: ${submittable.length} SUBMIT/CHAIN, ${validated.length - submittable.length} DROPPED`)
    return validated
  }

  // ── Phase 5: Build Exploit Chains ──────────────────────────────────────────
  async buildChains(validatedFindings) {
    const good = validatedFindings.filter(f => f.verdict === 'SUBMIT' || f.verdict === 'CHAIN')
    if (good.length < 2) return null

    this.log('CHAIN', `Building exploit chains from ${good.length} findings...`)

    const prompt = `I have these confirmed findings on ${this.target}:

${good.map((f, i) => `${i + 1}. [${f.category.toUpperCase()}] ${f.evidence}`).join('\n')}

Build A→B→C exploit chains. Only use findings listed above.`

    const chains = await this.llm(prompt, 'codeva-ravan-v1', CHAIN_BUILDER_PROMPT)
    this.log('CHAIN', 'Exploit chains built')
    return chains
  }

  // ── Phase 6: Write Report ───────────────────────────────────────────────────
  async writeReport(validatedFindings, chains, reconAnalysis) {
    const submittable = validatedFindings.filter(f => f.verdict === 'SUBMIT')
    if (submittable.length === 0) {
      this.log('REPORT', 'No submittable findings — no reports generated')
      return []
    }

    this.log('REPORT', `Writing ${Math.min(submittable.length, 3)} bug reports...`)

    const top3 = submittable.slice(0, 3)
    const reports = []

    for (const finding of top3) {
      const prompt = `Write a professional HackerOne bug bounty report for this finding on ${this.target}.

Finding:
Category: ${finding.category}
Evidence: ${finding.evidence}
Validation: ${finding.gate_result?.slice(0, 500) || '(passed 7-Question Gate)'}

${chains ? `Exploit Chains Available:\n${chains.slice(0, 800)}` : ''}

Write the full report. No theoretical language. Prove impact.`

      const content = await this.llm(prompt, 'codeva-ravan-v1', REPORT_WRITER_PROMPT)

      // Extract title and severity
      const titleMatch = content.match(/\*\*Title:\*\*\s*(.+)/i) || content.match(/^##[^#].+/m)
      const title = titleMatch?.[1]?.trim() || `${finding.category} vulnerability on ${this.target}`

      reports.push({
        platform: 'hackerone',
        title,
        severity: finding.severity || 'medium',
        content,
      })

      this.log('REPORT', `Written: ${title.slice(0, 80)}`)
    }

    return reports
  }

  // ── AUTOPILOT: Full pipeline ────────────────────────────────────────────────
  async runAutopilot() {
    const startedAt = Date.now()
    const execMode = await detectExecutionMode()
    this.emit('mode', { mode: execMode })
    this.log('INIT', `Execution mode: ${execMode.toUpperCase()} — ${
      execMode === 'cloud'   ? 'All tools run in secure cloud sandbox (works on any OS)' :
      execMode === 'local'   ? 'Using locally installed security tools' :
                               'AI-only mode (no shell tools detected)'
    }`)

    let cloudExec = null

    try {
      // ── Cloud mode: create sandbox first ──
      if (execMode === 'cloud') {
        cloudExec = new CloudExecutor(this.sessionId, (line) => this.log('CLOUD', line))
        await cloudExec.createSandbox()
      }

      // Phase 1: Recon
      this.emit('phase', { phase: 'recon', status: 'started' })
      let reconData

      if (execMode === 'cloud' && cloudExec) {
        reconData = await cloudExec.runRecon(this.target)
      } else if (execMode === 'local') {
        reconData = await this.runRecon()
      } else {
        // AI-only fallback
        this.log('RECON', 'No tools available — using AI-based passive recon...')
        reconData = await this.aiPassiveRecon()
      }

      this.emit('phase', { phase: 'recon', status: 'done', data: {
        subdomains: reconData.subdomains || 0,
        live_hosts: reconData.live_hosts || 0,
        urls: reconData.urls || 0,
      }})

      // Phase 2: Analyze
      this.emit('phase', { phase: 'analyze', status: 'started' })
      const analysis = await this.analyzeRecon(reconData)
      this.emit('phase', { phase: 'analyze', status: 'done', data: { analysis } })

      // Phase 3: Scan — use AgentSwarm in cloud mode for parallel execution
      this.emit('phase', { phase: 'scan', status: 'started' })
      let rawFindings = []

      if (execMode === 'cloud' && cloudExec) {
        // Parallel 5-agent swarm — each agent runs specialized attack
        this.log('SWARM', 'Launching 5-agent parallel swarm...')
        const swarm = new AgentSwarm(
          this.target,
          cloudExec.sandbox,
          this.plan,
          (line) => this.log('AGENT', line),
          (finding) => {
            this.emit('finding', { finding })
            this.log('FINDING', `[${finding.severity?.toUpperCase()}] [${finding.category}] ${finding.evidence?.slice(0, 80)}`)
          }
        )
        rawFindings = await swarm.runParallel()
      } else if (execMode === 'local') {
        rawFindings = await this.runScan()
      } else {
        rawFindings = await this.generateCandidatesFromRecon(reconData, analysis)
      }

      this.emit('phase', { phase: 'scan', status: 'done', data: { count: rawFindings.length } })

      // Phase 4: Validate
      this.emit('phase', { phase: 'validate', status: 'started' })
      const validated = rawFindings.length > 0
        ? await this.validateFindings(rawFindings.slice(0, 25))
        : []
      this.emit('phase', { phase: 'validate', status: 'done', data: {
        total: validated.length,
        submit: validated.filter(f => f.verdict === 'SUBMIT').length,
        chain:  validated.filter(f => f.verdict === 'CHAIN').length,
        drop:   validated.filter(f => f.verdict === 'DROP').length,
      }})

      // Phase 5: Chains
      this.emit('phase', { phase: 'chain', status: 'started' })
      const chains = await this.buildChains(validated)
      this.emit('phase', { phase: 'chain', status: 'done', data: { found: !!chains } })

      // Phase 6: Report
      this.emit('phase', { phase: 'report', status: 'started' })
      const reports = await this.writeReport(validated, chains, analysis)
      this.emit('phase', { phase: 'report', status: 'done', data: { count: reports.length } })

      const durationMs = Date.now() - startedAt

      return {
        success: true,
        target: this.target,
        exec_mode: execMode,
        recon: reconData,
        analysis,
        raw_findings: rawFindings,
        validated_findings: validated,
        chains,
        reports,
        duration_ms: durationMs,
        summary: {
          subdomains:     reconData.subdomains || 0,
          live_hosts:     reconData.live_hosts || 0,
          urls:           reconData.urls || 0,
          raw_findings:   rawFindings.length,
          validated:      validated.filter(f => f.verdict !== 'DROP').length,
          reports:        reports.length,
          duration_mins:  Math.round(durationMs / 60000),
          exec_mode:      execMode,
        }
      }
    } catch (err) {
      this.log('ERROR', err.message)
      return { success: false, error: err.message }
    } finally {
      // Always cleanup sandbox
      if (cloudExec) {
        await cloudExec.destroy().catch(() => {})
      }
    }
  }

  // AI-only passive recon (no tools) — uses OSINT queries via llmGateway
  async aiPassiveRecon() {
    this.log('RECON', `AI passive recon on ${this.target}...`)
    const prompt = `Perform passive OSINT reconnaissance on target: ${this.target}

Using only publicly available information, provide:
1. Likely subdomains based on common patterns and company name
2. Probable technology stack (infer from domain/company type)
3. Likely attack surface areas
4. Common vulnerability patterns for this type of target
5. Estimated risk areas

Be specific to this target. Do not invent confirmed data.
Format as structured list.`

    const result = await this.llm(prompt, 'codeva-ravan-v1')
    return {
      subdomains: 0, live_hosts: 0, urls: 0,
      httpx_sample: [], subs_sample: [],
      ai_recon: result,
      fallback: true,
    }
  }

  // Fallback: when no shell tools available, AI hypothesizes from recon
  async generateCandidatesFromRecon(reconData, analysis) {
    this.log('SCAN', 'Generating AI-based test candidates (no shell tools)...')

    const prompt = `Based on this recon data for ${this.target}, generate a list of SPECIFIC vulnerability candidates to test.

Recon analysis:
${analysis?.slice(0, 1500) || '(no analysis)'}

Live hosts sample:
${reconData.live_sample?.slice(0, 1000) || '(none)'}

Generate 5-10 specific, testable findings in this format:
[CATEGORY] [ENDPOINT] — [evidence/reason to test]

Only generate findings based on actual data above. No invented endpoints.`

    const result = await this.llm(prompt, 'codeva-kali-v1')

    return result.split('\n')
      .filter(l => l.match(/^\[(XSS|SQLI|SSRF|IDOR|AUTH|CORS|RCE|LFI)\]/i))
      .map(line => {
        const match = line.match(/^\[([^\]]+)\]\s*([^\s—]+)/)
        return {
          category: (match?.[1] || 'unknown').toLowerCase(),
          evidence:  line,
          tool: 'ai-analysis',
        }
      })
      .slice(0, 10)
  }
}
