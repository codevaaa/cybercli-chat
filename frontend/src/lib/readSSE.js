/** Read JSON SSE events, retaining split UTF-8 characters and releasing the body. */
export async function* readSSE(body, signal) {
  if (!body) throw new Error('Server returned an empty stream')
  const reader = body.getReader()
  const cancel = () => { reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', cancel, { once: true })
  const decoder = new TextDecoder()
  let pending = ''
  let data = []
  const event = () => {
    const value = data.join('\n'); data = []
    if (value === '[DONE]') return { done: true }
    if (!value) return null
    try { return { value: JSON.parse(value) } } catch { return null }
  }
  try {
    while (true) {
      signal?.throwIfAborted()
      const { value, done } = await reader.read()
      signal?.throwIfAborted()
      pending += done ? decoder.decode() + '\n\n' : decoder.decode(value, { stream: true })
      const lines = pending.split('\n')
      pending = lines.pop() || ''
      for (let line of lines) {
        if (line.endsWith('\r')) line = line.slice(0, -1)
        if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        else if (line === '') {
          const parsed = event()
          if (parsed?.done) return
          if (parsed) yield parsed.value
        }
      }
      if (done) return
    }
  } finally {
    signal?.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
