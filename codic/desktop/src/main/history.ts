import type { CodicLocalStore, LocalTask, LocalThread } from './local-store.js'

export interface ThreadSummary {
  id: string
  title: string
  updatedAt: string
  lastTaskId: string | null
  lastTaskState: LocalTask['state'] | null
}

export interface ThreadMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ThreadHistory {
  thread: LocalThread
  messages: ThreadMessage[]
  lastTaskId: string | null
  truncated: boolean
}

export function listThreadSummaries(store: CodicLocalStore, projectId: string, limit = 100): ThreadSummary[] {
  return store.listThreads(projectId).slice(0, limit).map((thread) => {
    const latest = store.listTasks(thread.id)[0] ?? null
    return {
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt,
      lastTaskId: latest?.id ?? null,
      lastTaskState: latest?.state ?? null,
    }
  })
}

export function loadThreadHistory(store: CodicLocalStore, projectId: string, threadId: string): ThreadHistory {
  const thread = store.listThreads(projectId).find((item) => item.id === threadId)
  if (!thread) throw new Error('This task does not belong to the selected project.')

  const tasks = store.listTasks(thread.id).reverse()
  const messages: ThreadMessage[] = []
  for (const task of tasks) {
    messages.push({ id: `${task.id}:user`, role: 'user', content: task.prompt })
    let assistant = ''
    for (const storedEvent of store.listTaskEvents(task.id)) {
      const payload = asRecord(storedEvent.payload)
      if (payload.type !== 'agent_event') continue
      const event = asRecord(payload.event)
      if (event.type === 'text' && typeof event.text === 'string') assistant += event.text
    }
    if (assistant) messages.push({ id: `${task.id}:assistant`, role: 'assistant', content: assistant })
  }

  const lastTask = tasks.at(-1) ?? null
  return boundHistory(thread, messages, lastTask?.id ?? null)
}

function boundHistory(thread: LocalThread, messages: ThreadMessage[], lastTaskId: string | null): ThreadHistory {
  const maxMessages = 200
  const maxCharacters = 180_000
  let selected = messages.slice(-maxMessages)
  let totalCharacters = selected.reduce((total, message) => total + message.content.length, 0)
  let truncated = selected.length !== messages.length
  while (selected.length > 2 && totalCharacters > maxCharacters) {
    totalCharacters -= selected[0].content.length
    selected = selected.slice(1)
    truncated = true
  }
  if (selected.length && totalCharacters > maxCharacters) {
    const last = selected[selected.length - 1]
    const content = last.content.slice(-(maxCharacters - 1))
    selected[selected.length - 1] = { ...last, content: `…${content}` }
    truncated = true
  }
  return {
    thread,
    messages: selected,
    lastTaskId,
    truncated,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
