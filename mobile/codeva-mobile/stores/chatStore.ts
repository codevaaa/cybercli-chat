import { create } from 'zustand'
import { saveThreads, saveActiveThread } from '@/services/storage/chatStorage'

export interface Attachment {
  type: 'image' | 'file'
  uri: string
  name?: string
  mimeType?: string
  base64?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  model?: string
  attachments?: Attachment[]
  council?: { model: string; response: string }[]
  // Follow-up suggestions from backend
  followups?: string[]
  // Routing info
  tier?: 'fast' | 'balanced' | 'reasoning'
  // Branch support — if this message has alternate versions
  branches?: Message[]
  activeBranch?: number // index into branches array (0 = original)
}

export interface Thread {
  id: string
  title: string
  messages: Message[]
  model: string
  createdAt: number
  updatedAt: number
}

interface ChatState {
  threads: Thread[]
  activeThreadId: string | null
  streaming: boolean
  streamingText: string
  hydrated: boolean

  hydrate: (threads: Thread[], activeId: string | null) => void
  setThreads: (threads: Thread[]) => void
  addThread: (thread: Thread) => void
  setActiveThread: (id: string | null) => void
  addMessage: (threadId: string, message: Message) => void
  updateMessage: (threadId: string, messageId: string, content: string) => void
  deleteMessage: (threadId: string, messageId: string) => void
  setStreaming: (streaming: boolean) => void
  setStreamingText: (text: string) => void
  appendStreamingText: (chunk: string) => void
  deleteThread: (id: string) => void
  renameThread: (id: string, title: string) => void
  clearAll: () => void
  getActiveThread: () => Thread | undefined
  branchMessage: (threadId: string, messageId: string, newContent: string, model?: string) => void
  setFollowups: (threadId: string, messageId: string, followups: string[]) => void
}

function persist(get: () => ChatState) {
  const s = get()
  void saveThreads(s.threads)
  void saveActiveThread(s.activeThreadId)
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  streaming: false,
  streamingText: '',
  hydrated: false,

  hydrate: (threads, activeId) => set({ threads, activeThreadId: activeId, hydrated: true }),
  setThreads: (threads) => { set({ threads }); persist(get) },

  addThread: (thread) => { set((s) => ({ threads: [thread, ...s.threads], activeThreadId: thread.id })); persist(get) },
  setActiveThread: (id) => { set({ activeThreadId: id }); persist(get) },

  addMessage: (threadId, message) => {
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, messages: [...t.messages, message], updatedAt: Date.now() } : t
      ),
    }))
    persist(get)
  },

  updateMessage: (threadId, messageId, content) => {
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, messages: t.messages.map((m) => (m.id === messageId ? { ...m, content } : m)) }
          : t
      ),
    }))
    persist(get)
  },

  deleteMessage: (threadId, messageId) => {
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.filter((m) => m.id !== messageId) } : t
      ),
    }))
    persist(get)
  },

  setStreaming: (streaming) => set({ streaming }),
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),

  deleteThread: (id) => {
    set((s) => ({
      threads: s.threads.filter((t) => t.id !== id),
      activeThreadId: s.activeThreadId === id ? null : s.activeThreadId,
    }))
    persist(get)
  },

  renameThread: (id, title) => {
    set((s) => ({ threads: s.threads.map((t) => (t.id === id ? { ...t, title } : t)) }))
    persist(get)
  },

  clearAll: () => { set({ threads: [], activeThreadId: null }); persist(get) },

  getActiveThread: () => {
    const { threads, activeThreadId } = get()
    return threads.find((t) => t.id === activeThreadId)
  },

  branchMessage: (threadId, messageId, newContent, model) => {
    set((s) => ({
      threads: s.threads.map((t) => {
        if (t.id !== threadId) return t
        return {
          ...t,
          messages: t.messages.map((m) => {
            if (m.id !== messageId) return m
            const branches = m.branches || [{ ...m }] // first branch is the original
            branches.push({ ...m, id: `${m.id}-b${branches.length}`, content: newContent, model, timestamp: Date.now() })
            return { ...m, branches, activeBranch: branches.length - 1 }
          }),
        }
      }),
    }))
    persist(get)
  },

  setFollowups: (threadId, messageId, followups) => {
    set((s) => ({
      threads: s.threads.map((t) => {
        if (t.id !== threadId) return t
        return {
          ...t,
          messages: t.messages.map((m) => m.id === messageId ? { ...m, followups } : m),
        }
      }),
    }))
    persist(get)
  },
}))
