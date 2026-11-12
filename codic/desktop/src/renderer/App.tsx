import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CodicLimits, CodicRuntimeEvent, ModelOption, ThreadSummary, WorkspaceInfo } from '../shared/contracts'
import DiffReviewPanel from './DiffReviewPanel'
import TerminalPanel from './TerminalPanel'

type View = 'assistant' | 'review' | 'terminal' | 'activity'
type Message = { id: string; role: 'user' | 'assistant'; content: string; runId?: string }
type Activity = { id: string; title: string; detail: string; status: 'done' | 'running' | 'waiting' | 'error' }
type ApprovalRequest = Extract<CodicRuntimeEvent, { type: 'approval_required' }> & { taskId: string }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'codic-auth',
        storage: {
          getItem: (key) => window.codic.auth.getItem(key),
          setItem: (key, value) => window.codic.auth.setItem(key, value),
          removeItem: (key) => window.codic.auth.removeItem(key),
        },
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null

const starterPrompts = [
  { label: 'Understand this project', prompt: 'Give me a concise overview of this project and how to run it.' },
  { label: 'Find a bug', prompt: 'Look for a likely bug in this project and explain the evidence before changing anything.' },
  { label: 'Plan a feature', prompt: 'Help me plan a useful next feature for this project. Start with a short plan.' },
]

const Logo = ({ small = false }: { small?: boolean }) => (
  <span className={`brand-mark${small ? ' brand-mark-small' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 32 32" role="presentation">
      <path d="M23.3 8.5a10.4 10.4 0 1 0 1.5 13.2" />
      <path d="m18.2 19.8 9.2-9.2 3.1 3.1-9.2 9.2-4.4 1.3z" />
      <path d="m25.7 12.3 3.1 3.1" />
    </svg>
  </span>
)

const Icon = ({ name, size = 17 }: { name: string; size?: number }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, React.ReactNode> = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.4" /><path d="m16 16 4.2 4.2" /></>,
    folder: <><path d="M3.5 7.5h6l2 2h9v9.1a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9z" /><path d="M3.5 7.5V5.9A1.9 1.9 0 0 1 5.4 4h4.1l2 2h7.1" /></>,
    history: <><path d="M3.2 12a8.8 8.8 0 1 0 2.5-6.2L3.2 8" /><path d="M3.2 4.7V8h3.4M12 7v5l3.4 2" /></>,
    branch: <><circle cx="7" cy="6" r="2" /><circle cx="17" cy="18" r="2" /><circle cx="17" cy="6" r="2" /><path d="M7 8v8a2 2 0 0 0 2 2h6M17 8v4a2 2 0 0 1-2 2h-2" /></>,
    terminal: <><path d="m5 7 5 5-5 5M12.5 17H19" /></>,
    activity: <><path d="M3 12h4l3-7 4 14 3-7h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1 1.9-1.8 3.1-2.2-.5a7.6 7.6 0 0 1-1.7 1l-.8 2.2h-3.6l-.8-2.2a7.6 7.6 0 0 1-1.7-1l-2.2.5-1.8-3.1 1.1-1.9a7.1 7.1 0 0 1 0-2l-1.1-1.9 1.8-3.1 2.2.5a7.6 7.6 0 0 1 1.7-1l.8-2.2h3.6l.8 2.2a7.6 7.6 0 0 1 1.7 1l2.2-.5 1.8 3.1-1.1 1.9a7.1 7.1 0 0 1 0 2Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon: <><path d="M20.2 15.2A8.4 8.4 0 0 1 8.8 3.8 8.6 8.6 0 1 0 20.2 15.2Z" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chevron: <><path d="m8 10 4 4 4-4" /></>,
    arrow: <><path d="M5 12h13m-5-5 5 5-5 5" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    paperclip: <><path d="m8 12.5 6.9-6.9a3 3 0 0 1 4.2 4.2l-8.7 8.7a5 5 0 0 1-7.1-7.1l8.5-8.5" /></>,
    send: <><path d="m4 4 16 8-16 8 3-8zM7 12h13" /></>,
    stop: <><rect x="6" y="6" width="12" height="12" rx="2" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6m-6 4h6" /></>,
    spark: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 11.9-3" /></>,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    warning: <><path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2z" /><path d="M12 9v4m0 3h.01" /></>,
  }
  return <svg {...common} aria-hidden="true">{paths[name] || paths.spark}</svg>
}

const timeLabel = () => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const [projects, setProjects] = useState<WorkspaceInfo[]>([])
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [view, setView] = useState<View>('assistant')
  const [composer, setComposer] = useState('')
  const [models, setModels] = useState<ModelOption[]>([{ id: 'auto', name: 'Codeva Auto' }])
  const [limits, setLimits] = useState<CodicLimits | null>(null)
  const [modelId, setModelId] = useState('auto')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [lastTaskId, setLastTaskId] = useState<string | null>(null)
  const [checkpointRevision, setCheckpointRevision] = useState(0)
  const [approval, setApproval] = useState<ApprovalRequest | null>(null)
  const [error, setError] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [accountPlan, setAccountPlan] = useState('Free')
  const [showAuth, setShowAuth] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [authMode, setAuthMode] = useState<'sign-in' | 'create-account' | 'reset'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID())
  const registeredDeviceRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeTaskIdRef = useRef<string | null>(null)

  activeTaskIdRef.current = activeTaskId

  const authClient = supabase
  const hasSession = Boolean(userEmail)
  const currentModel = useMemo(() => models.find((model) => model.id === modelId)?.name || 'Codeva Auto', [models, modelId])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (theme === 'system') delete document.documentElement.dataset.theme
  }, [theme])

  useEffect(() => {
    void window.codic.app.getVersion().then(setAppVersion).catch(() => undefined)
    const storedTheme = window.localStorage.getItem('codic-theme')
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') setTheme(storedTheme)
    const onEvent = window.codic.runtime.onEvent((event) => handleAgentEvent(event))
    const onAuthCallback = window.codic.auth.onCallback((url) => { void finishOAuth(url) })
    if (authClient) {
      void authClient.auth.getSession().then(({ data }) => {
        if (data.session) void acceptSession(data.session)
      })
      const { data } = authClient.auth.onAuthStateChange((_event, session) => {
        if (session) void acceptSession(session)
        else setUserEmail('')
      })
      return () => {
        onEvent()
        onAuthCallback()
        data.subscription.unsubscribe()
      }
    }
    return () => {
      onEvent()
      onAuthCallback()
    }
  }, [authClient])

  useEffect(() => {
    let active = true
    const restoreLastWorkspace = async () => {
      try {
        const savedProjects = await window.codic.workspace.listProjects()
        if (!active) return
        setProjects(savedProjects)
        const lastProject = savedProjects[0]
        if (!lastProject) return
        const selected = await window.codic.workspace.selectSaved(lastProject.path)
        if (!active) return
        setWorkspace(selected)
        const savedThreads = await window.codic.history.listThreads(selected.path)
        if (!active) return
        setThreads(savedThreads)
        if (!savedThreads[0]) {
          setConversationId(crypto.randomUUID())
          return
        }
        const restored = await window.codic.history.loadThread(selected.path, savedThreads[0].id)
        if (!active) return
        setConversationId(restored.thread.id)
        setMessages(restored.messages.map((message) => ({ ...message })))
        setLastTaskId(restored.lastTaskId)
        setHistoryNotice(restored.truncated ? 'Showing the newest part of this task. Earlier messages were left out to keep the model context within its limit.' : '')
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not restore your last project.')
      }
    }
    void restoreLastWorkspace()
    return () => { active = false }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, activities])

  useEffect(() => {
    if (!hasSession) return
    void window.codic.api.getModels().then((catalog) => {
      if (Array.isArray(catalog.models) && catalog.models.length) {
        const safeModels = catalog.models.filter((model) => model && typeof model.id === 'string' && typeof model.name === 'string')
        setModels(safeModels)
        setModelId((current) => safeModels.some((model) => model.id === current && !model.locked) ? current : safeModels.find((model) => !model.locked)?.id || 'auto')
      }
      if (catalog.plan) setAccountPlan(catalog.plan)
      setLimits(catalog.limits ?? null)
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Could not load your Codeva models.')
    })
  }, [hasSession])

  const acceptSession = async (session: Session) => {
    const identity = session.user.email || 'Codeva account'
    setUserEmail(identity)
    try {
      const result = await window.codic.api.syncAccount()
      if (result.banned) {
        await authClient?.auth.signOut()
        setUserEmail('')
        registeredDeviceRef.current = false
        setError('This account cannot access Codeva right now.')
        return
      }
      if (result.plan) setAccountPlan(result.plan)
      if (!registeredDeviceRef.current) {
        await window.codic.api.registerDevice()
        registeredDeviceRef.current = true
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not connect your Codeva account.')
    }
  }

  const finishOAuth = async (url: string) => {
    if (!authClient) {
      setError('Add the Supabase public URL and anonymous key to the Codic environment before signing in.')
      return
    }
    try {
      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')
      if (!code) throw new Error(parsed.searchParams.get('error_description') || 'Google sign-in did not return an authorization code.')
      const { data, error: exchangeError } = await authClient.auth.exchangeCodeForSession(code)
      if (exchangeError) throw exchangeError
      if (data.session) await acceptSession(data.session)
      setShowAuth(false)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete Google sign-in.')
      setShowAuth(true)
    }
  }

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!authClient) {
      setError('Supabase sign-in is not configured for this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    setAuthBusy(true)
    setError('')
    try {
      if (authMode === 'reset') {
        const { error: resetError } = await authClient.auth.resetPasswordForEmail(email, { redirectTo: 'https://cybermindcli.info/auth/reset-password' })
        if (resetError) throw resetError
        setError('Password reset link sent. Check your email.')
      } else if (authMode === 'create-account') {
        const { data, error: signupError } = await authClient.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: 'https://cybermindcli.info/auth/verify-email?source=codic' },
        })
        if (signupError) throw signupError
        if (data.session) await acceptSession(data.session)
        else setError('Check your email to verify your account, then sign in here.')
      } else {
        const { data, error: loginError } = await authClient.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        if (data.session) await acceptSession(data.session)
        setShowAuth(false)
      }
      setPassword('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in could not be completed.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!authClient) {
      setError('Supabase sign-in is not configured for this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }
    setAuthBusy(true)
    setError('')
    try {
      const { data, error: oauthError } = await authClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'codic://auth/callback', skipBrowserRedirect: true },
      })
      if (oauthError) throw oauthError
      if (data.url) await window.codic.auth.openOAuth(data.url)
      else throw new Error('Google sign-in did not return a secure browser link.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start Google sign-in.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleSignOut = async () => {
    let revokeError = ''
    try {
      if (registeredDeviceRef.current) await window.codic.api.revokeDevice()
    } catch (caught) {
      revokeError = caught instanceof Error ? caught.message : 'The device could not be revoked on the server.'
    }
    await authClient?.auth.signOut()
    registeredDeviceRef.current = false
    setUserEmail('')
    setMessages([])
    setActivities([])
    setError(revokeError)
    setShowSettings(false)
  }

  const activateProject = async (selected: WorkspaceInfo) => {
    if (activeTaskIdRef.current) window.codic.runtime.cancelTask(activeTaskIdRef.current)
    activeTaskIdRef.current = null
    setActiveTaskId(null)
    setActiveRunId(null)
    setIsStreaming(false)
    setApproval(null)
    setWorkspace(selected)
    setConversationId(crypto.randomUUID())
    setLastTaskId(null)
    setMessages([])
    setActivities([])
    setHistoryNotice('')
    setError('')
    const [savedProjects, savedThreads] = await Promise.all([
      window.codic.workspace.listProjects(),
      window.codic.history.listThreads(selected.path),
    ])
    setProjects(savedProjects)
    setThreads(savedThreads)
  }

  const openWorkspace = async () => {
    try {
      const selected = await window.codic.workspace.choose()
      if (selected) await activateProject(selected)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open that project folder.')
    }
  }

  const openSavedProject = async (projectPath: string) => {
    try {
      const selected = await window.codic.workspace.selectSaved(projectPath)
      await activateProject(selected)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open that saved project.')
    }
  }

  const openThread = async (threadId: string) => {
    if (!workspace || isStreaming) return
    try {
      const restored = await window.codic.history.loadThread(workspace.path, threadId)
      setConversationId(restored.thread.id)
      setMessages(restored.messages.map((message) => ({ ...message })))
      setLastTaskId(restored.lastTaskId)
      setActivities([])
      setHistoryNotice(restored.truncated ? 'Showing the newest part of this task. Earlier messages were left out to keep the model context within its limit.' : '')
      setError('')
      setView('assistant')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this task history.')
    }
  }

  const handleAgentEvent = useCallback((event: CodicRuntimeEvent) => {
    if (event.type === 'run_started') {
      setActiveRunId(event.runId)
      return
    }
    if (event.type === 'agent_event') {
      const coreEvent = event.event
      if (coreEvent.type === 'text') {
        setMessages((current) => {
          const assistantIndex = current.findIndex((message) => message.role === 'assistant' && message.runId === event.runId)
          if (assistantIndex < 0) return [...current, { id: crypto.randomUUID(), role: 'assistant', content: coreEvent.text, runId: event.runId }]
          return current.map((message, index) => index === assistantIndex ? { ...message, content: message.content + coreEvent.text } : message)
        })
      } else if (coreEvent.type === 'tool_call') {
        setActivities((current) => [...current, {
          id: coreEvent.id,
          title: coreEvent.name,
          detail: coreEvent.name === 'run_command' ? 'Waiting for your approval.' : 'Running inside the selected project.',
          status: coreEvent.name === 'run_command' ? 'waiting' : 'running',
        }])
        setView('activity')
      } else if (coreEvent.type === 'tool_result') {
        setActivities((current) => current.map((activity) => activity.id === coreEvent.id
          ? { ...activity, detail: coreEvent.output.slice(0, 800), status: coreEvent.ok ? 'done' : 'error' }
          : activity))
      } else if (coreEvent.type === 'iteration') {
        setActivities((current) => [...current, {
          id: `iteration-${event.runId}-${coreEvent.index}`,
          title: `Agent step ${coreEvent.index + 1}`,
          detail: `Step ${coreEvent.index + 1} of ${coreEvent.max}`,
          status: 'running',
        }])
      } else if (coreEvent.type === 'context') {
        setActivities((current) => [...current, { id: crypto.randomUUID(), title: 'Context organized', detail: coreEvent.note, status: 'done' }])
      } else if (coreEvent.type === 'usage') {
        setActivities((current) => [...current, {
          id: `usage-${event.runId}`,
          title: 'Model usage',
          detail: `${coreEvent.inputTokens.toLocaleString()} input · ${coreEvent.outputTokens.toLocaleString()} output tokens${coreEvent.estimated ? ' · approximate' : ''}`,
          status: 'done',
        }])
      }
      return
    }
    if (event.type === 'approval_required') {
      const taskId = activeTaskIdRef.current || ''
      if (taskId) setApproval({ ...event, taskId })
      setActivities((current) => current.map((activity) => activity.title === event.toolName && activity.status === 'waiting'
        ? { ...activity, detail: event.summary, status: 'waiting' }
        : activity))
      setView('activity')
      return
    }
    if (event.type === 'tool_blocked') {
      setActivities((current) => [...current, { id: crypto.randomUUID(), title: `${event.toolName} blocked`, detail: event.reason, status: 'error' }])
      return
    }
    if (event.type === 'checkpoint_created') {
      setCheckpointRevision((current) => current + 1)
      setActivities((current) => [...current, {
        id: `checkpoint-${event.runId}-${event.checkpoint.seq}`,
        title: 'Restore point saved',
        detail: `${event.checkpoint.label} · ${event.checkpoint.files.join(', ')}`,
        status: 'done',
      }])
      return
    }
    if (event.type === 'run_finished') {
      if (activeTaskIdRef.current) setLastTaskId(activeTaskIdRef.current)
      if (workspaceRef.current) void window.codic.history.listThreads(workspaceRef.current.path).then(setThreads).catch(() => undefined)
      setCheckpointRevision((current) => current + 1)
      setIsStreaming(false)
      setActiveRunId(null)
      setActiveTaskId(null)
      activeTaskIdRef.current = null
      setApproval(null)
      if (event.error && event.reason === 'error') setError(event.error)
      setActivities((current) => current.map((activity) => activity.status === 'running'
        ? { ...activity, status: event.reason === 'error' ? 'error' : 'done', ...(event.error ? { detail: event.error } : event.reason === 'cancelled' ? { detail: 'Stopped by you.' } : {}) }
        : activity))
    }
  }, [])

  const sendPrompt = async (value = composer) => {
    const prompt = value.trim()
    if (!prompt || isStreaming) return
    if (!hasSession) {
      setShowAuth(true)
      setError('Sign in to your Codeva account before sending a model request.')
      return
    }
    if (!workspace) {
      setError('Open a project first so Codic has a workspace for this task.')
      return
    }
    setError('')
    const nextMessages = [...messages, { id: crypto.randomUUID(), role: 'user' as const, content: prompt }]
    setMessages(nextMessages)
    setComposer('')
    setActivities((current) => [...current, { id: crypto.randomUUID(), title: 'Thinking', detail: `Started at ${timeLabel()}`, status: 'running' }])
    setIsStreaming(true)
    setView('assistant')
    try {
      const result = await window.codic.runtime.startTask({
        workspacePath: workspace.path,
        prompt,
        model: modelId,
        conversationId,
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      })
      setActiveTaskId(result.taskId)
      activeTaskIdRef.current = result.taskId
      setLastTaskId(result.taskId)
      setThreads(await window.codic.history.listThreads(workspace.path))
    } catch (caught) {
      setIsStreaming(false)
      setError(caught instanceof Error ? caught.message : 'The task could not be started.')
      setActivities((current) => current.map((activity) => activity.status === 'running' ? { ...activity, status: 'error' } : activity))
    }
  }

  const decideApproval = async (decision: 'allow' | 'deny') => {
    if (!approval) return
    try {
      const resolved = await window.codic.runtime.resolveApproval({
        taskId: approval.taskId,
        approvalId: approval.approvalId,
        decision,
      })
      if (!resolved) setError('This approval request has already expired.')
      setActivities((current) => current.map((activity) => activity.status === 'waiting' && activity.title === approval.toolName
        ? { ...activity, status: decision === 'allow' && resolved ? 'running' : 'error', detail: decision === 'allow' && resolved ? 'Approved. Running in the selected project.' : 'You denied this action.' }
        : activity))
      setApproval(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resolve this approval.')
    }
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendPrompt()
    }
  }

  const stopRun = async () => {
    if (!activeTaskId) return
    setLastTaskId(activeTaskId)
    window.codic.runtime.cancelTask(activeTaskId)
    setIsStreaming(false)
    setActiveRunId(null)
    setActiveTaskId(null)
    activeTaskIdRef.current = null
    setApproval(null)
    setActivities((current) => current.map((activity) => activity.status === 'running' ? { ...activity, status: 'done', detail: 'Stopped by you.' } : activity))
  }

  const changeTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
    window.localStorage.setItem('codic-theme', next)
  }

  const openAuth = (mode: typeof authMode = 'sign-in') => {
    setAuthMode(mode)
    setShowAuth(true)
    setError('')
  }

  const openSettings = () => {
    if (!hasSession) openAuth()
    else setShowSettings(true)
  }

  const setPreferredTheme = (next: 'system' | 'light' | 'dark') => {
    setTheme(next)
    window.localStorage.setItem('codic-theme', next)
  }

  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="titlebar-brand" aria-label="Codic">
          <Logo small />
          <span>Codic</span>
          <span className="titlebar-version">{appVersion}</span>
        </div>
        <div className="titlebar-drag">{workspace?.name || 'Your local coding workspace'}</div>
        <div className="titlebar-actions">
          <button className="icon-button titlebar-action" onClick={changeTheme} title={`Theme: ${theme}`} aria-label={`Theme: ${theme}`}><Icon name={theme === 'light' ? 'sun' : 'moon'} size={16} /></button>
          <button className="icon-button titlebar-action" onClick={openSettings} title="Account settings" aria-label="Account settings"><Icon name="settings" size={16} /></button>
          <span className="window-divider" />
          <button className="window-control" onClick={() => window.codic.window.minimize()} aria-label="Minimize window">—</button>
          <button className="window-control" onClick={() => window.codic.window.toggleMaximize()} aria-label="Toggle window size">□</button>
          <button className="window-control window-close" onClick={() => window.codic.window.close()} aria-label="Close window"><Icon name="close" size={15} /></button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-workspace">
            <button className="workspace-switcher" onClick={openWorkspace}>
              <span className="workspace-avatar"><Logo small /></span>
              <span className="workspace-switcher-copy"><strong>{workspace?.name || 'Open a project'}</strong><small>{workspace ? 'Local workspace' : 'Choose a folder to begin'}</small></span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
          <div className="sidebar-actions">
            <button className="side-action" onClick={() => { setConversationId(crypto.randomUUID()); setLastTaskId(null); setMessages([]); setActivities([]); setHistoryNotice(''); setError(''); setView('assistant') }} disabled={!workspace || isStreaming}><Icon name="plus" /><span>New task</span><kbd>Ctrl&nbsp;N</kbd></button>
            <button className="side-action" disabled title="Task search is not available in this preview"><Icon name="search" /><span>Search · preview</span></button>
            <button className="side-action" onClick={() => setView('activity')}><Icon name="history" /><span>Task history</span></button>
          </div>
          <div className="sidebar-section-label"><span>PROJECT</span><button className="icon-button compact" onClick={openWorkspace} aria-label="Open project"><Icon name="plus" size={15} /></button></div>
          {workspace ? (
            <div className="project-list">
              {projects.map((project) => <button key={project.path} className={`project-row${workspace.path === project.path ? ' active' : ''}`} onClick={() => void openSavedProject(project.path)} disabled={isStreaming} title={project.path}><Icon name="folder" size={16} /><span>{project.name}</span>{workspace.path === project.path && <span className="project-dot" />}</button>)}
            </div>
          ) : (
            <button className="project-empty" onClick={openWorkspace}><Icon name="folder" size={16} /><span>Open a local folder</span></button>
          )}
          <div className="sidebar-section-label thread-label"><span>RECENT TASKS</span><button className="icon-button compact" onClick={() => setView('activity')} aria-label="View task history"><Icon name="history" size={15} /></button></div>
          {threads.length ? threads.slice(0, 40).map((thread) => <button key={thread.id} className={`thread-row${conversationId === thread.id ? ' selected' : ''}`} onClick={() => void openThread(thread.id)} disabled={isStreaming} title={`${thread.title} · ${thread.lastTaskState || 'No run yet'}`}><span className="thread-indicator" /><span>{thread.title}</span></button>) : <div className="empty-thread-note">Your tasks will appear here.</div>}
          <div className="sidebar-spacer" />
          <div className="sidebar-footer">
            <div className={`connection-line${hasSession ? ' connected' : ''}`}><span className="connection-dot" /><span>{hasSession ? 'Codeva connected' : 'Local workspace ready'}</span></div>
            <button className="account-card" onClick={() => hasSession ? setShowSettings(true) : openAuth()}>
              <span className="account-avatar">{hasSession ? userEmail.slice(0, 1).toUpperCase() : <Icon name="lock" size={15} />}</span>
              <span className="account-copy"><strong>{hasSession ? userEmail : 'Connect Codeva account'}</strong><small>{hasSession ? `${accountPlan} plan · Manage account` : 'Sign in for model access'}</small></span>
              <Icon name="chevron" size={15} />
            </button>
          </div>
        </aside>

        <main className="main-content">
          <div className="main-toolbar">
            <div className="breadcrumbs"><span className="breadcrumb-muted">{workspace ? workspace.name : 'Codic'}</span><span className="breadcrumb-separator">/</span><strong>{view === 'assistant' ? 'Assistant' : view === 'review' ? 'Review' : view === 'terminal' ? 'Terminal' : 'Activity'}</strong></div>
            <div className="toolbar-right">
              <button className="toolbar-chip" onClick={() => setIsRightPanelOpen((open) => !open)}><Icon name="branch" size={15} /><span>Workspace</span><Icon name="chevron" size={14} /></button>
              <button className="icon-button toolbar-icon" onClick={openWorkspace} title="Open folder" aria-label="Open folder"><Icon name="folder" size={16} /></button>
            </div>
          </div>

          {error && <div className="notice-bar" role="alert"><Icon name="warning" size={16} /><span>{error}</span><button className="icon-button compact" onClick={() => setError('')} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}
          {historyNotice && <div className="notice-bar notice-info" role="status"><Icon name="history" size={16} /><span>{historyNotice}</span><button className="icon-button compact" onClick={() => setHistoryNotice('')} aria-label="Dismiss task history notice"><Icon name="close" size={15} /></button></div>}

          {!workspace ? (
            <section className="welcome-screen">
              <div className="welcome-orbit orbit-one" /><div className="welcome-orbit orbit-two" />
              <div className="welcome-content">
                <div className="welcome-icon"><Logo /></div>
                <p className="eyebrow"><span className="eyebrow-line" />YOUR LOCAL CODING WORKBENCH</p>
                <h1>Start with a project.<br /><span>Build from there.</span></h1>
                <p className="welcome-copy">Open a codebase and work with your Codeva models in a focused, reviewable workspace.</p>
                <div className="welcome-actions">
                  <button className="primary-button" onClick={openWorkspace}><Icon name="folder" size={17} />Open a folder<Icon name="arrow" size={16} /></button>
                  <button className="secondary-button" onClick={() => openAuth()}><Icon name="lock" size={15} />Connect your account</button>
                </div>
                <div className="welcome-footnote"><Icon name="checkCircle" size={15} /><span>Your project files stay on this device.</span></div>
              </div>
              <div className="welcome-status-card"><span className="status-mini-dot" /><span>LOCAL WORKSPACE</span><strong>Ready when you are</strong><small>Choose any folder to get started</small></div>
            </section>
          ) : (
            <div className={`workspace-content${isRightPanelOpen ? '' : ' panel-collapsed'}`}>
              <section className="conversation-column">
                {approval && <section className="approval-card" aria-labelledby="approval-title">
                  <div className="approval-card-heading"><span className="approval-icon"><Icon name="lock" size={16} /></span><div><p className="eyebrow">ACTION NEEDS YOUR APPROVAL</p><h2 id="approval-title">{approval.toolName}</h2></div></div>
                  <p className="approval-summary">{approval.summary}</p>
                  {typeof approval.input.command === 'string' && <pre className="approval-command"><code>{approval.input.command}</code></pre>}
                  {approval.unsandboxed && <p className="approval-warning"><Icon name="warning" size={14} />This command runs on your computer with access outside Codic’s file tools.</p>}
                  <div className="approval-actions"><button className="secondary-button" onClick={() => void decideApproval('deny')}>Deny</button><button className="primary-button" onClick={() => void decideApproval('allow')}>Allow once<Icon name="arrow" size={15} /></button></div>
                </section>}
                {messages.length === 0 ? (
                  <div className="project-welcome">
                    <div className="project-welcome-icon"><Logo /></div>
                    <p className="eyebrow">PROJECT WORKSPACE</p>
                    <h1>What are we working on?</h1>
                    <p>Ask a question, outline a change, or start with one of these.</p>
                    <div className="prompt-suggestions">
                      {starterPrompts.map((item) => <button key={item.label} onClick={() => void sendPrompt(item.prompt)}><span>{item.label}</span><Icon name="arrow" size={15} /></button>)}
                    </div>
                  </div>
                ) : (
                  <div className="message-list">
                    {messages.map((message) => (
                      <article key={message.id} className={`message message-${message.role}`}>
                        <div className="message-avatar">{message.role === 'assistant' ? <Logo small /> : userEmail.slice(0, 1).toUpperCase() || 'Y'}</div>
                        <div className="message-body">
                          <div className="message-meta"><strong>{message.role === 'assistant' ? 'Codic' : 'You'}</strong>{message.role === 'assistant' && <span className="model-tag">{currentModel}</span>}</div>
                          <p>{message.content || (isStreaming ? 'Thinking through the next step…' : '')}</p>
                        </div>
                      </article>
                    ))}
                    {isStreaming && <div className="streaming-indicator"><span /><span /><span />Codic is working</div>}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                <div className="composer-wrap">
                  <div className="composer">
                    <textarea ref={composerRef} value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Ask Codic to explain, plan, or change something…" rows={2} aria-label="Message Codic" />
                    <div className="composer-controls">
                      <div className="composer-left">
                        <button className="composer-tool" onClick={openWorkspace} title="Open another folder"><Icon name="paperclip" size={16} /><span>Add context</span></button>
                        <label className="model-select-wrap"><span className="model-status-dot" /><select value={modelId} onChange={(event) => setModelId(event.target.value)} aria-label="Select model" disabled={!hasSession}>{models.map((model) => <option key={model.id} value={model.id} disabled={model.locked === true}>{model.name}{model.locked ? ' · Plan locked' : ''}</option>)}</select><Icon name="chevron" size={13} /></label>
                      </div>
                      <div className="composer-right"><span className="composer-hint">Enter to send · Shift + Enter for a new line</span>{isStreaming ? <button className="send-button stop-button" onClick={() => void stopRun()} aria-label="Stop task"><Icon name="stop" size={17} /></button> : <button className="send-button" onClick={() => void sendPrompt()} disabled={!composer.trim()} aria-label="Send message"><Icon name="send" size={16} /></button>}</div>
                    </div>
                  </div>
                  <p className="privacy-caption"><Icon name="lock" size={12} />Only the context needed for your request is sent to Codeva.</p>
                </div>
              </section>

              {isRightPanelOpen && <aside className="detail-panel">
                <div className="detail-panel-heading"><div><span className="eyebrow">PROJECT</span><h2>{workspace.name}</h2></div><button className="icon-button compact panel-hide" onClick={() => setIsRightPanelOpen(false)} aria-label="Hide project panel"><Icon name="close" size={15} /></button></div>
                <div className="panel-tabs" role="tablist" aria-label="Project views">
                  {(['review', 'terminal', 'activity'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)} role="tab" aria-selected={view === item}>{item === 'review' ? 'Review' : item === 'terminal' ? 'Terminal' : 'Activity'}{item === 'activity' && activities.length > 0 && <span className="tab-count">{activities.length}</span>}</button>)}
                </div>
                <div className="panel-content">
                  {view === 'review' && <DiffReviewPanel workspace={workspace} taskId={lastTaskId} taskRunning={isStreaming} refreshToken={checkpointRevision} />}
                  <div className="panel-section" hidden={view !== 'terminal'}><TerminalPanel workspace={workspace} /></div>
                  {view === 'activity' && <div className="activity-list">{activities.length ? activities.map((activity) => <div key={activity.id} className={`activity-item activity-${activity.status}`}><span className="activity-icon">{activity.status === 'done' ? <Icon name="check" size={14} /> : activity.status === 'error' ? <Icon name="warning" size={14} /> : activity.status === 'waiting' ? <Icon name="lock" size={14} /> : <span className="activity-spinner" />}</span><div><strong>{activity.title}</strong><p>{activity.detail}</p></div></div>) : <div className="panel-empty"><div className="panel-empty-icon"><Icon name="activity" size={19} /></div><strong>No task activity yet</strong><p>Start a task to see progress and reviewable actions.</p></div>}</div>}
                </div>
                <div className="panel-bottom"><div className="panel-bottom-row"><span className="panel-bottom-label">WORKSPACE</span><span className="panel-bottom-value"><span className="tiny-dot" />Local</span></div><div className="panel-bottom-row"><span className="panel-bottom-label">ACCOUNT</span><span className="panel-bottom-value">{hasSession ? accountPlan : 'Not connected'}</span></div>{limits && <><div className="panel-bottom-row"><span className="panel-bottom-label">REQUESTS / HOUR</span><span className="panel-bottom-value">{limits.requestsPerHour.toLocaleString()}</span></div><div className="panel-bottom-row"><span className="panel-bottom-label">MONTHLY TOKENS</span><span className="panel-bottom-value">{limits.monthlyTokens.remaining === null ? 'Unlimited' : `${Math.max(0, limits.monthlyTokens.remaining).toLocaleString()} left`}</span></div></>}</div>
              </aside>}
            </div>
          )}
        </main>
      </div>

      {showAuth && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAuth(false) }}>
        <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button className="icon-button auth-close" onClick={() => setShowAuth(false)} aria-label="Close sign-in dialog"><Icon name="close" /></button>
          <div className="auth-brand"><Logo /></div>
          <p className="eyebrow">YOUR CODEVA ACCOUNT</p>
          <h2 id="auth-title">{authMode === 'create-account' ? 'Create your account' : authMode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2>
          <p className="auth-intro">{authMode === 'reset' ? 'We’ll send a password reset link to your email.' : 'Sign in to connect Codic to your models and account.'}</p>
          {authMode !== 'reset' && <button className="google-button" onClick={() => void handleGoogleSignIn()} disabled={authBusy}><GoogleMark />Continue with Google</button>}
          {authMode !== 'reset' && <div className="form-divider"><span />or continue with email<span /></div>}
          <form onSubmit={handleAuth}>
            <label className="field-label" htmlFor="account-email">Email</label>
            <input id="account-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            {authMode !== 'reset' && <><label className="field-label" htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete={authMode === 'create-account' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></>}
            <button className="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'create-account' ? 'Create account' : authMode === 'reset' ? 'Send reset link' : 'Sign in'}<Icon name="arrow" size={15} /></button>
          </form>
          <div className="auth-links">
            {authMode === 'sign-in' ? <><button onClick={() => setAuthMode('reset')}>Forgot password?</button><span>New to Codeva? <button onClick={() => setAuthMode('create-account')}>Create an account</button></span></> : <button onClick={() => setAuthMode('sign-in')}>Back to sign in</button>}
          </div>
          {!hasSupabaseConfig && <div className="auth-config-warning"><Icon name="warning" size={15} /><span>This build needs the public Supabase URL and anonymous key configured before sign-in can work.</span></div>}
          <p className="auth-privacy"><Icon name="lock" size={12} />Your account session is stored using this device’s secure storage.</p>
        </section>
      </div>}
      {showSettings && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false) }}>
        <section className="auth-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <button className="icon-button auth-close" onClick={() => setShowSettings(false)} aria-label="Close account settings"><Icon name="close" /></button>
          <div className="auth-brand"><Logo /></div>
          <p className="eyebrow">CODEVA ACCOUNT</p>
          <h2 id="settings-title">Account settings</h2>
          <p className="auth-intro">Signed in as <strong>{userEmail}</strong></p>
          <div className="settings-list">
            <div className="settings-row"><span>Plan</span><strong>{accountPlan}</strong></div>
            {limits && <>
              <div className="settings-row"><span>Requests per hour</span><strong>{limits.requestsPerHour.toLocaleString()}</strong></div>
              <div className="settings-row"><span>Monthly tokens used</span><strong>{limits.monthlyTokens.limit === null ? `${limits.monthlyTokens.used.toLocaleString()} · no fixed limit` : `${limits.monthlyTokens.used.toLocaleString()} / ${limits.monthlyTokens.limit.toLocaleString()}`}</strong></div>
              {limits.monthlyTokens.resetsAt && <div className="settings-row"><span>Quota resets</span><strong>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(limits.monthlyTokens.resetsAt))}</strong></div>}
            </>}
            <label className="settings-row settings-theme"><span>Appearance</span><select value={theme} onChange={(event) => setPreferredTheme(event.target.value as 'system' | 'light' | 'dark')}><option value="system">System setting</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
          </div>
          <button className="secondary-button settings-signout" onClick={() => void handleSignOut()}>Sign out of this device</button>
          <p className="auth-privacy"><Icon name="lock" size={12} />Your session is held in this device’s secure storage.</p>
        </section>
      </div>}
    </div>
  )
}

const GoogleMark = () => <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.55 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.63 5.92c4.45-4.11 7.13-10.17 7.13-17.57Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.86 23.86 0 0 0 0 24c0 3.87.93 7.54 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.63-5.92C30.15 37.65 27.3 38.5 24 38.5c-6.26 0-11.57-4.05-13.47-9.72l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
