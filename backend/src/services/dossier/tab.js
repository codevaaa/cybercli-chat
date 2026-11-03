import { performance } from 'node:perf_hooks'
import { assertNoSecrets, fault } from './domain.js'

export async function localTab(body, { fetcher = fetch, origin = process.env.DOSSIER_TAB_MODEL_URL || 'http://127.0.0.1:11434/api/generate', budget = 100 } = {}) {
  const suffix = body?.suffix ?? ''
  if (typeof body?.prefix !== 'string' || body.prefix.length > 8000 || typeof suffix !== 'string' || suffix.length > 2000) throw fault('Bounded prefix and suffix are required', 400)
  assertNoSecrets(body.prefix + suffix)
  let url
  try { url = new URL(origin) } catch { throw fault('Local tab URL configuration is invalid', 503) }
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/api/generate' || url.search || url.hash) throw fault('Tab model must be the configured loopback /api/generate host', 503)
  const start = performance.now(), controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), budget)
  try {
    const response = await fetcher(url.href, { method: 'POST', signal: controller.signal, redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'qwen2.5-coder:0.5b', prompt: body.prefix, suffix, stream: false, options: { num_predict: 32, temperature: 0 } }) })
    if (!response.ok) throw fault('Local tab model unavailable', 503)
    let data
    if (response.body) {
      const pieces = []; let size = 0
      for await (const piece of response.body) { size += piece.length; if (size > 8192) throw fault('Local tab response exceeds limits', 503); pieces.push(Buffer.from(piece)) }
      data = JSON.parse(Buffer.concat(pieces).toString('utf8'))
    } else data = await response.json()
    const elapsed = performance.now() - start
    if (elapsed >= budget) return { completion: '', timed_out: true, budget_ms: budget }
    if (typeof data.response !== 'string') throw fault('Local tab response is malformed', 503)
    const completion = data.response.slice(0, 512)
    assertNoSecrets(completion)
    return { completion, host: url.origin, model: 'qwen2.5-coder:0.5b', budget_ms: budget, elapsed_ms: elapsed }
  } catch (error) {
    if (controller.signal.aborted) return { completion: '', timed_out: true, budget_ms: budget }
    throw error.status ? error : fault('Local tab model unavailable', 503)
  } finally { clearTimeout(timer); controller.abort() }
}
