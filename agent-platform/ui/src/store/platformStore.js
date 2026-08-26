/**
 * Zustand store — central state for the Agent Manager UI.
 * Handles WebSocket connection and all real-time event updates.
 */
import { create } from 'zustand'
import toast from 'react-hot-toast'

const IS_PROD = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
const PLATFORM_HOST = IS_PROD ? 'cybercli-api.onrender.com' : 'localhost:4000'
const PLATFORM_WS  = `${IS_PROD ? 'wss' : 'ws'}://${PLATFORM_HOST}/ws`
const PLATFORM_API = `${IS_PROD ? 'https' : 'http'}://${PLATFORM_HOST}/api`

const AGENT_PERSONAS = {
  orchestrator: { emoji: '🗺️', name: 'Chanakya',      color: '#795548' },
  coder:        { emoji: '👑', name: 'Ravan',          color: '#FF4444' },
  tester:       { emoji: '🏹', name: 'Arjun',          color: '#00BCD4' },
  debugger:     { emoji: '🧠', name: 'Madhav',         color: '#9C27B0' },
  devops:       { emoji: '💪', name: 'Bheem',          color: '#4CAF50' },
  researcher:   { emoji: '🔍', name: 'Sahadeva',       color: '#FF9800' },
  writer:       { emoji: '🎨', name: 'Nakul',          color: '#E91E63' },
  reviewer:     { emoji: '⚖️', name: 'Yudhishthir',   color: '#2196F3' },
  security:     { emoji: '💀', name: 'Shiv',           color: '#F44336' },
  panchayat:    { emoji: '🌐', name: 'Panchayat',      color: '#607D8B' },
}

export const usePlatformStore = create((set, get) => ({
  // ── Connection ────────────────────────────────────────────────────────────
  ws:           null,
  connected:    false,
  platformOnline: false,

  // ── Sessions ──────────────────────────────────────────────────────────────
  sessions:     {},         // sessionId → snapshot
  activeSession: null,

  // ── Current session live data ─────────────────────────────────────────────
  tasks:        {},         // taskId → task object
  agentLogs:    {},         // taskId → [{ type, content, timestamp }]
  agentTokens:  {},         // taskId → accumulated string
  planSummary:  null,
  estimatedDuration: null,
  result:       null,
  sessionStatus: 'idle',    // idle | planning | running | synthesizing | completed | failed

  // ── Skills & Agents ───────────────────────────────────────────────────────
  skills:       [],
  agents:       [],

  // ── Persona helper ────────────────────────────────────────────────────────
  getPersona: (type) => AGENT_PERSONAS[type] || { emoji: '🤖', name: type, color: '#6B7280' },

  // ── WebSocket Connection ──────────────────────────────────────────────────
  connect: () => {
    const existing = get().ws
    if (existing?.readyState === 1) return

    try {
      const ws = new WebSocket(PLATFORM_WS)

      ws.onopen = () => {
        set({ connected: true, platformOnline: true })
        toast.success('Connected to CodeVaa Platform', { id: 'ws-connect' })
      }

      ws.onclose = () => {
        set({ connected: false, ws: null })
        // Auto-reconnect after 5s
        setTimeout(() => {
          if (get().ws === null) get().connect()
        }, 5000)
      }

      ws.onerror = () => {
        set({ connected: false, platformOnline: false })
      }

      ws.onmessage = (e) => {
        let msg
        try { msg = JSON.parse(e.data) } catch { return }
        get()._handleMessage(msg)
      }

      set({ ws })
    } catch (err) {
      // WebSocket not available — fallback to HTTP-only mode
      set({ connected: false, platformOnline: false })
      console.warn('[Platform] WebSocket connection failed:', err.message)
    }
  },

  disconnect: () => {
    get().ws?.close()
    set({ ws: null, connected: false })
  },

  // ── Run a goal ────────────────────────────────────────────────────────────
  runGoal: (goal, options = {}) => {
    const { ws, activeSession } = get()
    if (!ws || ws.readyState !== 1) {
      toast.error('Not connected to platform')
      return null
    }

    const sessionId = crypto.randomUUID()

    // Reset state for new session
    set({
      activeSession: sessionId,
      tasks:         {},
      agentLogs:     {},
      agentTokens:   {},
      planSummary:   null,
      result:        null,
      sessionStatus: 'planning',
    })

    ws.send(JSON.stringify({
      type:        'run',
      sessionId,
      goal,
      projectPath: options.projectPath,
      maxParallel: options.maxParallel || 4,
    }))

    return sessionId
  },

  cancelSession: (sessionId) => {
    const { ws } = get()
    if (!ws) return
    ws.send(JSON.stringify({ type: 'cancel', sessionId: sessionId || get().activeSession }))
  },

  // ── Message Handler ───────────────────────────────────────────────────────
  _handleMessage: (msg) => {
    const { agentLogs, agentTokens, tasks } = get()

    const addLog = (taskId, entry) => {
      set(s => ({
        agentLogs: {
          ...s.agentLogs,
          [taskId]: [...(s.agentLogs[taskId] || []), { ...entry, timestamp: Date.now() }],
        }
      }))
    }

    switch (msg.type) {
      case 'orchestrator:planning':
        set({ sessionStatus: 'planning', planSummary: null })
        break

      case 'orchestrator:graph_ready': {
        const taskList = msg.tasks || msg.graph?.tasks || []
        const newTasks = {}
        for (const t of taskList) newTasks[t.id] = t
        set({
          tasks:             newTasks,
          planSummary:       msg.graph?.planSummary || msg.planSummary,
          estimatedDuration: msg.graph?.estimatedDuration,
          sessionStatus:     'running',
        })
        break
      }

      case 'task:started': {
        const t = msg.task
        if (!t) break
        set(s => ({ tasks: { ...s.tasks, [t.id]: { ...s.tasks[t.id], ...t, status: 'running' } } }))
        addLog(t.id, { type: 'info', content: `Started: ${t.title}` })
        break
      }

      case 'agent:token': {
        const { taskId, token } = msg
        set(s => ({
          agentTokens: {
            ...s.agentTokens,
            [taskId]: (s.agentTokens[taskId] || '') + token,
          }
        }))
        break
      }

      case 'agent:info':
        if (msg.taskId && msg.info) {
          addLog(msg.taskId, { type: 'info', content: msg.info })
        }
        break

      case 'agent:tool':
        if (msg.taskId && msg.tool) {
          addLog(msg.taskId, { type: 'tool', content: `🔧 ${msg.tool.tool}`, args: msg.tool.args })
        }
        break

      case 'task:completed': {
        const t = msg.task
        if (!t) break
        set(s => ({
          tasks: { ...s.tasks, [t.id]: { ...s.tasks[t.id], ...t, status: 'completed' } }
        }))
        addLog(t.id, { type: 'success', content: `✅ Completed` })
        break
      }

      case 'task:failed': {
        const t = msg.task
        if (!t) break
        set(s => ({
          tasks: { ...s.tasks, [t.id]: { ...s.tasks[t.id], ...t, status: 'failed' } }
        }))
        addLog(t.id, { type: 'error', content: `❌ Failed: ${msg.error}` })
        toast.error(`Task failed: ${t.title}`)
        break
      }

      case 'orchestrator:synthesizing':
        set({ sessionStatus: 'synthesizing' })
        break

      case 'orchestrator:completed':
        set({ sessionStatus: 'completed', result: msg.result })
        toast.success('All tasks complete!', { duration: 5000 })
        break

      case 'orchestrator:failed':
      case 'orchestrator:error':
        set({ sessionStatus: 'failed' })
        toast.error(`Session failed: ${msg.error}`, { duration: 8000 })
        break

      case 'orchestrator:cancelled':
        set({ sessionStatus: 'idle' })
        break
    }
  },

  // ── API Calls ─────────────────────────────────────────────────────────────
  fetchSkills: async () => {
    try {
      const res = await fetch(`${PLATFORM_API}/skills`)
      const data = await res.json()
      set({ skills: data.skills || [] })
    } catch { /* platform may not be running */ }
  },

  fetchAgents: async () => {
    try {
      const res = await fetch(`${PLATFORM_API}/agents`)
      const data = await res.json()
      set({ agents: data.agents || [] })
    } catch { /* platform may not be running */ }
  },

  checkPlatformHealth: async () => {
    try {
      const healthUrl = IS_PROD ? `https://${PLATFORM_HOST}/health` : `http://${PLATFORM_HOST}/health`
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
      set({ platformOnline: res.ok })
      return res.ok
    } catch {
      set({ platformOnline: false })
      return false
    }
  },
}))
