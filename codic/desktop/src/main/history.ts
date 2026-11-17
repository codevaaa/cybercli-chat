import type { CodicLocalStore, LocalTask, LocalThread } from './local-store.js'

export interface ThreadSummary {
  id: string
  title: string
  updatedAt: string
  lastTaskId: string | null
  lastTaskState: LocalTask['state'] | null
  pinned: boolean
  archived: boolean
  parentThreadId: string | null
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
  lastTaskState: LocalTask['state'] | null
  truncated: boolean
}

export function listThreadSummaries(store: CodicLocalStore, projectId: string, limit = 100, includeArchived = false): ThreadSummary[] {
  return store.listThreads(projectId, includeArchived).slice(0, limit).map((thread) => {
    const latest = store.listTasks(thread.id)[0] ?? null
    return {
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt,
      lastTaskId: latest?.id ?? null,
      lastTaskState: latest?.state ?? null,
      pinned: thread.pinned,
      archived: thread.archived,
      parentThreadId: thread.parentThreadId,
    }
  })
}

export function loadThreadHistory(store: CodicLocalStore, projectId: string, threadId: string): ThreadHistory {
  const thread = store.getThread(projectId, threadId)
  if (!thread) throw new Error('This task does not belong to the selected project.')

  const ancestry = [thread]
  let parentId = thread.parentThreadId
  const seen = new Set([thread.id])
  while (parentId && ancestry.length < 8 && !seen.has(parentId)) {
    const parent = store.getThread(projectId, parentId)
    if (!parent) break
    ancestry.unshift(parent)
    seen.add(parent.id)
    parentId = parent.parentThreadId
  }

  const messages: ThreadMessage[] = []
  let lastTaskId: string | null = null
  let lastTaskState: LocalTask['state'] | null = null
  for (const ancestor of ancestry) {
    const tasks = store.listTasks(ancestor.id).reverse()
    if (ancestor.id === thread.id) {
      const latestTask = tasks.at(-1) ?? null
      lastTaskId = latestTask?.id ?? null
      lastTaskState = latestTask?.state ?? null
    }
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
  }

  return boundHistory(thread, messages, lastTaskId, lastTaskState)
}

function boundHistory(thread: LocalThread, messages: ThreadMessage[], lastTaskId: string | null, lastTaskState: LocalTask['state'] | null): ThreadHistory {
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
    lastTaskState,
    truncated,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
