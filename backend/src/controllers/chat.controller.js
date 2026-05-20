export const createThread = (req, res) => {
  res.json({ id: 'thread_' + Date.now(), title: 'New Chat', created_at: new Date().toISOString() })
}

export const listThreads = (req, res) => {
  res.json({ threads: [] })
}

export const getThread = (req, res) => {
  res.json({ id: req.params.id, title: 'Demo Thread', messages: [] })
}

export const updateThread = (req, res) => {
  res.json({ id: req.params.id, ...req.body })
}

export const deleteThread = (req, res) => {
  res.json({ deleted: req.params.id })
}

export const forkThread = (req, res) => {
  res.json({ original_id: req.params.id, forked_id: 'thread_fork_' + Date.now() })
}

export const sendMessage = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write('data: {"type":"start"}\n\n')
  res.write('data: {"type":"done"}\n\n')
  res.end()
}

export const getMessages = (req, res) => {
  res.json({ messages: [] })
}
