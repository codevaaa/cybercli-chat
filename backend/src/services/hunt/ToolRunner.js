import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

/**
 * ToolRunner — executes shell tools from the hunter-engine toolkit.
 * Streams output back via callbacks so it can be SSE'd to the frontend.
 */

// Path to hunter-engine tools directory
const HUNTER_ROOT = path.join(process.cwd(), '..', 'hunter-engine')
const TOOLS_DIR = path.join(HUNTER_ROOT, 'tools')

// Base data directories (created per-session under /tmp/codeva-hunts/)
export async function getSessionDirs(sessionId) {
  const base = path.join(os.tmpdir(), 'codeva-hunts', sessionId)
  const dirs = {
    base,
    recon:    path.join(base, 'recon'),
    findings: path.join(base, 'findings'),
    reports:  path.join(base, 'reports'),
  }
  for (const dir of Object.values(dirs)) {
    await fs.mkdir(dir, { recursive: true })
  }
  return dirs
}

/**
 * Run a shell command with live output streaming.
 * onOutput(line) is called for each line of stdout/stderr.
 * Returns { success, code, output }
 */
export function runTool({ command, args = [], cwd, env = {}, onOutput, timeout = 300_000 }) {
  return new Promise((resolve) => {
    const fullEnv = {
      ...process.env,
      PATH: `/usr/local/bin:/usr/bin:/bin:${os.homedir()}/go/bin:${process.env.PATH}`,
      ...env,
    }

    const proc = spawn(command, args, {
      cwd: cwd || TOOLS_DIR,
      env: fullEnv,
      shell: true,
    })

    let output = ''
    const lines = (data) => {
      const text = data.toString()
      output += text
      text.split('\n').filter(Boolean).forEach(line => {
        onOutput?.(line.trim())
      })
    }

    proc.stdout.on('data', lines)
    proc.stderr.on('data', lines)

    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      onOutput?.(`[TIMEOUT] Command exceeded ${timeout / 1000}s limit`)
      resolve({ success: false, code: -1, output })
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ success: code === 0, code, output })
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      onOutput?.(`[ERROR] ${err.message}`)
      resolve({ success: false, code: -1, output })
    })
  })
}

/**
 * Run the recon_engine.sh script for a target.
 */
export async function runReconEngine(target, dirs, onOutput) {
  const script = path.join(TOOLS_DIR, 'recon_engine.sh')

  // Check if script exists
  try { await fs.access(script) }
  catch { onOutput?.('[WARN] recon_engine.sh not found, using fallback recon'); return null }

  return runTool({
    command: 'bash',
    args: [script, target],
    cwd: dirs.base,
    env: {
      RECON_DIR: dirs.recon,
      TARGET: target,
    },
    onOutput,
    timeout: 600_000, // 10 min for recon
  })
}

/**
 * Run the vuln_scanner.sh script on recon results.
 */
export async function runVulnScanner(target, dirs, onOutput) {
  const script = path.join(TOOLS_DIR, 'vuln_scanner.sh')
  const reconDir = path.join(dirs.recon, target)

  try { await fs.access(script) }
  catch { onOutput?.('[WARN] vuln_scanner.sh not found'); return null }

  return runTool({
    command: 'bash',
    args: [script, reconDir],
    cwd: dirs.base,
    env: {
      FINDINGS_DIR: dirs.findings,
    },
    onOutput,
    timeout: 900_000, // 15 min for scanning
  })
}

/**
 * Check which security tools are installed on this machine.
 */
export async function checkTools() {
  const tools = ['subfinder', 'httpx', 'nuclei', 'ffuf', 'dalfox', 'sqlmap', 'nmap', 'gau', 'katana']
  const results = {}

  for (const tool of tools) {
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn('which', [tool], { shell: true })
        proc.on('close', (code) => code === 0 ? resolve() : reject())
        proc.on('error', reject)
      })
      results[tool] = true
    } catch {
      results[tool] = false
    }
  }

  return results
}

/**
 * Read findings from the findings directory after vuln scan.
 */
export async function collectFindings(findingsDir) {
  const categories = ['xss', 'sqli', 'ssrf', 'idor', 'auth_bypass', 'cors', 'cves', 'rce', 'lfi', 'ssti']
  const findings = []

  for (const cat of categories) {
    const catDir = path.join(findingsDir, cat)
    try {
      await fs.access(catDir)
      const files = await fs.readdir(catDir)
      for (const file of files) {
        if (!file.endsWith('.txt')) continue
        const content = await fs.readFile(path.join(catDir, file), 'utf-8')
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'))
        for (const line of lines) {
          findings.push({ category: cat, evidence: line.trim(), tool: file.replace('.txt', '') })
        }
      }
    } catch {
      // category dir doesn't exist, skip
    }
  }

  return findings
}
