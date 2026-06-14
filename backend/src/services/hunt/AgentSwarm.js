/**
 * AgentSwarm — Parallel multi-agent bug bounty engine
 *
 * Runs 5 specialized agents simultaneously on a cloud sandbox:
 *   Agent 1 (Scout)     → Subdomain enum + live host discovery
 *   Agent 2 (Crawler)   → JS analysis + endpoint discovery  
 *   Agent 3 (Scanner)   → CVE + nuclei + misconfig detection
 *   Agent 4 (Fuzzer)    → XSS + SQLi + SSRF + parameter testing
 *   Agent 5 (Exploiter) → Verify + PoC generation + impact proof
 *
 * Each agent runs in the SAME E2B sandbox but executes independently.
 * Results are fed back to the AI Orchestrator for chain analysis.
 */

import llmGateway from '../llm/gateway.js'

// ── Agent System Prompts ──────────────────────────────────────────────────────

const SCOUT_SYSTEM = `You are Scout, an elite reconnaissance agent.
Your job: maximize attack surface discovery for a target domain.
You output ONLY bash commands to run. One command at a time.
After seeing command output, you decide the next command.
Stop when you have complete subdomain + live host + tech stack data.
Output format: just the bash command, nothing else.
Available tools: subfinder, httpx, dnsx, katana, gau, waybackurls, anew, nmap`

const CRAWLER_SYSTEM = `You are Crawler, a JavaScript and endpoint analysis agent.
Your job: extract hidden endpoints, API routes, and secrets from JS files and crawl the target.
You output ONLY bash commands. One at a time.
Available tools: katana, linkfinder, secretfinder, jsluice, gau, hakrawler, kiterunner (kr)
Focus: JS bundles → hardcoded keys, hidden APIs, auth tokens, internal endpoints`

const SCANNER_SYSTEM = `You are Scanner, a CVE and misconfiguration detection agent.
Your job: find known vulnerabilities and dangerous misconfigurations.
You output ONLY bash commands. One at a time.
Available tools: nuclei, nmap, curl, whatweb
Focus: nuclei CVE templates (critical/high), exposed .env files, .git repos, admin panels,
default credentials, exposed GraphQL, Spring actuators, CORS misconfigs, JWT weaknesses`

const FUZZER_SYSTEM = `You are Fuzzer, a vulnerability discovery agent.
Your job: actively test for XSS, SQLi, SSRF, IDOR, LFI, open redirects.
You output ONLY bash commands. One at a time.
Available tools: dalfox, sqlmap, ffuf, arjun, gf, qsreplace, curl, interactsh-client
Focus: parameterized URLs → fuzz for all vuln classes
Real exploits only — confirm with actual response evidence, not just tool output`

const EXPLOITER_SYSTEM = `You are Exploiter, an exploit verification and PoC generation agent.
Your job: take a candidate vulnerability and PROVE it's real with concrete evidence.
You output ONLY bash commands to verify impact. One at a time.
Rules:
- Show actual data from the target (session token, PII, server response with evidence)
- Generate the exact HTTP request that proves exploitation
- Calculate CVSS score
- Draft the HackerOne report title
Stop when you have: CONFIRMED (with evidence) or REJECTED (with reason)`

// ── Tool command templates ────────────────────────────────────────────────────

const TOOL_COMMANDS = {
  // Phase 1 — Scout
  subdomainEnum: (target) => `subfinder -d ${target} -silent 2>/dev/null | anew /hunt/subs.txt && echo "SUBS:$(wc -l < /hunt/subs.txt)"`,
  liveHosts:     () => `cat /hunt/subs.txt | httpx -silent -status-code -title -tech-detect -o /hunt/httpx.txt 2>/dev/null && cat /hunt/httpx.txt | awk '{print $1}' > /hunt/live.txt && echo "LIVE:$(wc -l < /hunt/live.txt)"`,
  portScan:      (target) => `naabu -host ${target} -top-ports 1000 -silent 2>/dev/null | head -20`,
  
  // Phase 2 — Crawler  
  crawlUrls:     () => `cat /hunt/live.txt | katana -silent -d 3 -jc -kf all 2>/dev/null | head -500 | anew /hunt/urls.txt && echo "URLS:$(wc -l < /hunt/urls.txt)"`,
  jsFiles:       () => `cat /hunt/urls.txt | grep -i "\.js$" | sort -u | head -30 > /hunt/js.txt && echo "JS:$(wc -l < /hunt/js.txt)"`,
  apiEndpoints:  () => `cat /hunt/urls.txt | grep -E "/api/|/v[0-9]+/|/graphql|/rest/" | sort -u > /hunt/api.txt && echo "API:$(wc -l < /hunt/api.txt)"`,
  
  // Phase 3 — Scanner
  nucleiCritical: () => `nuclei -l /hunt/live.txt -severity critical,high -silent -o /hunt/nuclei.txt 2>/dev/null && cat /hunt/nuclei.txt`,
  envCheck:      (target) => `for path in /.env /.env.local /.env.production /.git/config /config.json /api/config; do code=$(curl -sk -o /dev/null -w "%{http_code}" "https://${target}$path"); [ "$code" = "200" ] && echo "[EXPOSED] https://${target}$path (HTTP $code)"; done`,
  graphqlCheck:  (target) => `curl -sk "https://${target}/graphql" -d '{"query":"{__schema{types{name}}}"}' -H 'Content-Type: application/json' | python3 -c "import json,sys; d=json.load(sys.stdin); [print('[GQL-INTROSPECTION] '+t['name']) for t in d.get('data',{}).get('__schema',{}).get('types',[])]" 2>/dev/null || true`,
  
  // Phase 4 — Fuzzer
  xssScan:       () => `cat /hunt/urls.txt | gf xss | head -20 | dalfox pipe --silence --no-color 2>/dev/null`,
  ssrfParams:    () => `cat /hunt/urls.txt | gf ssrf | head -20 | qsreplace "http://$(interactsh-client -silent -v 2>/dev/null | head -1 | awk '{print $1}')" | xargs -I{} curl -sk "{}" -o /dev/null -w "%{url_effective}\\n" 2>/dev/null | head -10`,
  sqlScan:       () => `cat /hunt/urls.txt | gf sqli | head -5 | while read url; do sqlmap -u "$url" --batch --level=1 --risk=1 --silent 2>/dev/null | grep -i "parameter\\|injectable" | head -3; done`,
  paramDiscover: (target) => `arjun -u "https://${target}" --rate-limit 5 -q 2>/dev/null | grep "Found\\|Parameter" | head -10`,
  
  // Phase 5 — Exploiter  
  verifyXss:     (url, payload) => `curl -sk "${url}" --data-urlencode "${payload}" | grep -i "${payload.split('=')[1]}" | head -3`,
  verifySsrf:    (url) => `curl -sk "${url}" -H "X-Forwarded-For: 169.254.169.254" | grep -i "ami-id\\|instance-id\\|iam\\|credentials" | head -5`,
  extractCookies: (url) => `curl -sk -I "${url}" | grep -i "set-cookie" | head -3`,
}

// ── Agent class ───────────────────────────────────────────────────────────────

class Agent {
  constructor(name, systemPrompt, sandbox, onLog, planTier) {
    this.name       = name
    this.system     = systemPrompt
    this.sandbox    = sandbox
    this.onLog      = onLog
    this.plan       = planTier
    this.history    = []
    this.findings   = []
    this.maxRounds  = 12
  }

  log(msg) { this.onLog(`[${this.name}] ${msg}`) }

  async think(context) {
    const messages = [
      { role: 'system', content: this.system },
      ...this.history,
      { role: 'user', content: context },
    ]

    let response = ''
    const stream = llmGateway.complete({
      messages,
      model: 'codeva-kali-v1',
      temperature: 0.1,
      plan: this.plan,
      isKaliKal: true,
    })

    for await (const chunk of await stream) {
      if (chunk.type === 'token') response += chunk.content
    }

    return response.trim()
  }

  async runCommand(cmd) {
    if (!this.sandbox) return { stdout: '(no sandbox)', stderr: '' }
    
    try {
      let stdout = '', stderr = ''
      const result = await this.sandbox.commands.run(cmd, {
        timeout: 120_000,
        onStdout: (out) => { stdout += out.line + '\n'; this.log(out.line) },
        onStderr: (err) => { if (!err.line.includes('Warn') && !err.line.includes('Deprecat')) stderr += err.line + '\n' },
      })
      return { stdout: stdout.slice(0, 3000), stderr: stderr.slice(0, 500), code: result.exitCode }
    } catch (err) {
      return { stdout: '', stderr: err.message, code: -1 }
    }
  }

  // ReAct loop: Reason → Act → Observe → Repeat
  async run(initialContext, maxRounds = this.maxRounds) {
    this.log(`Starting... Context: ${initialContext.slice(0, 100)}`)
    
    let context = `Target context: ${initialContext}\n\nStart your reconnaissance. Output only the bash command to run first.`

    for (let round = 0; round < maxRounds; round++) {
      // Think — AI decides next action
      const decision = await this.think(context)
      
      // Parse decision
      const cmdMatch = decision.match(/```(?:bash|sh)?\s*([\s\S]+?)```/) ||
                       decision.match(/^([^#\n].+)$/m)
      
      if (!cmdMatch || decision.toLowerCase().includes('done') || decision.toLowerCase().includes('complete')) {
        this.log(`Agent complete after ${round + 1} rounds`)
        break
      }

      const cmd = (cmdMatch[1] || cmdMatch[0]).trim()
      if (!cmd || cmd.length < 3) break

      this.log(`Round ${round + 1}: $ ${cmd.slice(0, 80)}`)
      
      // Act — run the command in sandbox
      const result = await this.runCommand(cmd)
      const output = (result.stdout + result.stderr).slice(0, 2000)

      // Extract findings from output
      this.extractFindings(output, cmd)

      // Build next context
      this.history.push(
        { role: 'assistant', content: decision },
        { role: 'user', content: `Command output:\n\`\`\`\n${output}\n\`\`\`\n\nWhat's the next command? If you found something important, note it. Output the next bash command or say DONE.` }
      )

      context = `Previous output analyzed. Continue.`
    }

    return this.findings
  }

  extractFindings(output, cmd) {
    const lines = output.split('\n').filter(Boolean)
    
    for (const line of lines) {
      // XSS findings
      if (line.includes('[VULN]') || line.includes('XSS') || line.includes('dalfox')) {
        if (line.includes('http')) this.findings.push({ category: 'xss', evidence: line, agent: this.name, severity: 'high' })
      }
      // SQLi
      if (line.toLowerCase().includes('injectable') || line.toLowerCase().includes('sqlmap found')) {
        this.findings.push({ category: 'sqli', evidence: line, agent: this.name, severity: 'high' })
      }
      // Exposed files
      if (line.includes('[EXPOSED]')) {
        this.findings.push({ category: 'exposure', evidence: line, agent: this.name, severity: 'medium' })
      }
      // GraphQL introspection
      if (line.includes('[GQL-INTROSPECTION]')) {
        this.findings.push({ category: 'graphql', evidence: line, agent: this.name, severity: 'low' })
      }
      // Nuclei findings (always high/critical)
      if (line.includes('[critical]') || line.includes('[high]')) {
        this.findings.push({ category: 'cves', evidence: line, agent: this.name, severity: line.includes('[critical]') ? 'critical' : 'high' })
      }
      // SSRF callbacks
      if (line.includes('169.254') || line.includes('instance-id') || line.includes('iam/security')) {
        this.findings.push({ category: 'ssrf', evidence: line, agent: this.name, severity: 'critical' })
      }
    }
  }
}

// ── AgentSwarm ────────────────────────────────────────────────────────────────

export class AgentSwarm {
  constructor(target, sandbox, plan, onLog, onFinding) {
    this.target    = target
    this.sandbox   = sandbox
    this.plan      = plan
    this.onLog     = onLog
    this.onFinding = onFinding
    this.allFindings = []
  }

  log(msg) { this.onLog(`[SWARM] ${msg}`) }

  // Setup hunt directory in sandbox
  async initHunt() {
    if (!this.sandbox) return
    await this.sandbox.commands.run(
      `mkdir -p /hunt && echo "${this.target}" > /hunt/target.txt && echo "HUNT_INIT:OK"`,
      { timeout: 10_000 }
    )
  }

  // Run all 5 agents in parallel
  async runParallel() {
    this.log(`Launching 5-agent parallel swarm on ${this.target}`)
    await this.initHunt()

    const context = `Target: ${this.target}\nHunt directory: /hunt/\nWordlists at: /opt/wordlists/`

    // Agent 1 & 2 run first (recon + crawl needed for scan+fuzz)
    this.log('Phase 1: Scout + Crawler (parallel recon)')
    const [scoutFindings, crawlerFindings] = await Promise.all([
      new Agent('Scout',   SCOUT_SYSTEM,   this.sandbox, this.onLog, this.plan).run(`${context}\nRun full subdomain enum and live host discovery for ${this.target}`, 8),
      new Agent('Crawler', CRAWLER_SYSTEM, this.sandbox, this.onLog, this.plan).run(`${context}\nFirst check if /hunt/urls.txt exists, if not wait 30s then crawl ${this.target}`, 6),
    ])

    this.collectFindings([...scoutFindings, ...crawlerFindings])
    this.log(`Phase 1 done. Found ${this.allFindings.length} initial signals.`)

    // Agent 3, 4, 5 run in parallel using recon data
    this.log('Phase 2: Scanner + Fuzzer + Exploiter (parallel attack)')
    const [scanFindings, fuzzFindings] = await Promise.all([
      new Agent('Scanner', SCANNER_SYSTEM, this.sandbox, this.onLog, this.plan).run(`${context}\nScan ${this.target} for CVEs, misconfigs, exposed files`, 8),
      new Agent('Fuzzer',  FUZZER_SYSTEM,  this.sandbox, this.onLog, this.plan).run(`${context}\nFuzz ${this.target} for XSS, SQLi, SSRF, IDOR`, 8),
    ])

    this.collectFindings([...scanFindings, ...fuzzFindings])
    this.log(`Phase 2 done. Total signals: ${this.allFindings.length}`)

    // Exploiter verifies best findings
    if (this.allFindings.length > 0) {
      const topFindings = this.allFindings
        .sort((a, b) => {
          const sev = { critical: 4, high: 3, medium: 2, low: 1 }
          return (sev[b.severity] || 0) - (sev[a.severity] || 0)
        })
        .slice(0, 5)

      this.log(`Phase 3: Exploiter verifying top ${topFindings.length} findings...`)
      const exploitCtx = `${context}\nFindings to verify:\n${topFindings.map((f, i) => `${i+1}. [${f.category}] ${f.evidence}`).join('\n')}\n\nVerify each one with actual HTTP requests. Confirm REAL impact.`
      const exploitFindings = await new Agent('Exploiter', EXPLOITER_SYSTEM, this.sandbox, this.onLog, this.plan).run(exploitCtx, 10)
      this.collectFindings(exploitFindings)
    }

    this.log(`Swarm complete. Total findings: ${this.allFindings.length}`)
    return this.allFindings
  }

  collectFindings(findings) {
    for (const f of findings) {
      if (f && f.evidence && f.evidence.length > 10) {
        this.allFindings.push(f)
        this.onFinding?.(f)
      }
    }
  }
}
