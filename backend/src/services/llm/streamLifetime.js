// One response owns its keepalive timer and provider cancellation.
export function streamLifetime(res, intervalMs = 5000) {
  const abort = new AbortController()
  let firstToken = false
  const timer = setInterval(() => {
    if (!firstToken && !res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify({ type: 'heartbeat', elapsed: Date.now() })}\n\n`)
  }, intervalMs)
  const close = () => { clearInterval(timer); abort.abort() }
  res.once('close', close)
  return {
    signal: abort.signal,
    token() { firstToken = true },
    dispose() { close(); res.removeListener('close', close) },
  }
}
