import { activeLines, assertNoSecrets, fault } from './domain.js'

export function previewTestInput(value = {}) {
  // Reject target/host/url/IP configuration before a tool can open a socket.
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'path') || value.path !== undefined && value.path !== '/' && value.path !== '/rows') throw fault('Security tests accept only this dossier preview and its fixed relative routes', 400)
  return { path: value.path || '/' }
}
export function cryptoCheck(files) {
  const failures = []
  for (const file of files) {
    try { assertNoSecrets(file.content) } catch { failures.push({ file: file.path, reason: 'Secret in generated or committed source' }) }
    if (/\b(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/i.test(file.content)) failures.push({ file: file.path, reason: 'Plaintext password in source' })
  }
  return { exit_code: failures.length ? 1 : 0, tests: ['no_plaintext_password', 'no_committed_secret'], failures, output: failures.length ? 'Crypto policy failed; secret values redacted' : 'Versioned password/session policy; no plaintext password or committed secret in scanned files' }
}
export function performanceBudget(d) {
  const specs = activeLines(d).filter(l => /\b(?:within|under|budget|at most|<=|less than)\s*(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?)\b/i.test(l.final_text) && /list|rows|endpoint|response/i.test(l.final_text))
  if (!specs.length) return null
  const budgets = specs.map(l => {
    const match = l.final_text.match(/\b(?:within|under|budget|at most|<=|less than)\s*(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?)\b/i)
    return { id: l.id, ms: Number(match[1]) * (/^(?:s|second)/i.test(match[2]) ? 1000 : 1) }
  })
  return { ms: Math.min(...budgets.map(b => b.ms)), spec_line_ids: budgets.map(b => b.id) }
}
