import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { KeyboardEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CodicLimits, CodicRuntimeEvent, CodicUpdateCheck, ModelOption, ScheduledTask, ThreadSummary, WorkspaceInfo } from '../shared/contracts'
import DiffReviewPanel from './DiffReviewPanel'
import TerminalPanel from './TerminalPanel'
import ModelPicker from './ModelPicker'
import ProjectPicker from './ProjectPicker'
import { getInitialAppZoom, placeComposerPopover } from './appPreferences'
import { getWorkspaceRestoreIntent } from './workspaceRestore'

type View = 'assistant' | 'review' | 'terminal' | 'activity'
type SettingsSection = 'general' | 'profile' | 'appearance' | 'models' | 'permissions' | 'shortcuts' | 'updates' | 'troubleshooting' | 'about'
type Message = { id: string; role: 'user' | 'assistant'; content: string; runId?: string }
type Activity = { id: string; title: string; detail: string; status: 'done' | 'running' | 'waiting' | 'error' }
type ApprovalRequest = Extract<CodicRuntimeEvent, { type: 'approval_required' }> & { taskId: string }
type NavigationEntry = { threadId: string | null; conversationId: string; view: View; temporary?: boolean; messages?: Message[] }
type ShortcutActions = {
  navigateBack: () => Promise<void>
  navigateForward: () => Promise<void>
  navigateView: (view: View) => void
  openWorkspace: () => Promise<void>
  openTaskSearch: () => void
  startNewTask: (temporary?: boolean) => void
}
type ProfileStats = Awaited<ReturnType<typeof window.codic.history.getProfileStats>>
type MenuName = 'File' | 'Edit' | 'View' | 'Help'

function navigateMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(event.key)) return
  const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  if (!options.length) return
  event.preventDefault()
  const current = options.indexOf(document.activeElement as HTMLButtonElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
  options[next]?.focus()
}

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

const settingsSections: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'profile', label: 'Profile and account', icon: 'user' },
  { id: 'appearance', label: 'Appearance', icon: 'sun' },
  { id: 'models', label: 'Models', icon: 'spark' },
  { id: 'permissions', label: 'Permissions', icon: 'lock' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard' },
  { id: 'updates', label: 'Updates', icon: 'refresh' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: 'warning' },
  { id: 'about', label: 'About Codic', icon: 'activity' },
]

const Logo = ({ small = false }: { small?: boolean }) => (
  <span className={`brand-mark${small ? ' brand-mark-small' : ''}`} aria-hidden="true">
    <span className="brand-mark-ring" />
    <span className="brand-mark-core" />
    <span className="brand-mark-spark" />
  </span>
)

const WindowSizeGlyph = ({ maximized }: { maximized: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {maximized
      ? <><path d="M4 1.5h6.5V8" /><path d="M8 4H1.5v6.5H8z" /></>
      : <rect x="1.5" y="1.5" width="9" height="9" rx=".5" />}
  </svg>
)

const Icon = ({ name, size = 17 }: { name: string; size?: number }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, React.ReactNode> = {
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <><path d="M5 12h14" /></>,
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
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    keyboard: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h.01M11 9h.01M15 9h.01M7 12h.01M11 12h.01M15 12h.01M8 16h8" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    back: <><path d="m14.5 5-7 7 7 7" /><path d="M8 12h11" /></>,
    forward: <><path d="m9.5 5 7 7-7 7" /><path d="M16 12H5" /></>,
    panel: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9 4.5v15" /></>,
    pin: <><path d="m15 4 5 5-3 1-3 4-1 1-3-3 1-1 4-3zM12 12l-7 7" /></>,
    archive: <><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" /></>,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    play: <><path d="m8 5 12 7-12 7z" /></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></>,
    window: <><rect x="3" y="4" width="18" height="15" rx="2" /><path d="M3 8h18m-14 3v5m4-5v5" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></>,
  }
  return <svg {...common} aria-hidden="true">{paths[name] || paths.spark}</svg>
}

const timeLabel = () => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())
const localDateTimeInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
const defaultScheduleDateTime = () => localDateTimeInput(new Date(Date.now() + 60 * 60_000))

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const [projects, setProjects] = useState<WorkspaceInfo[]>([])
  const [projectThreads, setProjectThreads] = useState<Record<string, ThreadSummary[]>>({})
  const [expandedProjectPaths, setExpandedProjectPaths] = useState<Record<string, boolean>>({})
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [showAllRecentTasks, setShowAllRecentTasks] = useState(false)
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [archivedThreads, setArchivedThreads] = useState<ThreadSummary[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [showScheduledTasks, setShowScheduledTasks] = useState(true)
  const [scheduleThreadId, setScheduleThreadId] = useState<string | null>(null)
  const [scheduleTitle, setScheduleTitle] = useState('')
  const [schedulePrompt, setSchedulePrompt] = useState('')
  const [scheduleDateTime, setScheduleDateTime] = useState(defaultScheduleDateTime)
  const [scheduleRecurrence, setScheduleRecurrence] = useState<'once' | 'daily' | 'weekly'>('once')
  const [scheduleBusy, setScheduleBusy] = useState(false)
  const [showArchivedThreads, setShowArchivedThreads] = useState(false)
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
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const approval = approvals[0] ?? null
  const [error, setError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [historyNotice, setHistoryNotice] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [accountPlan, setAccountPlan] = useState('Free')
  const [localPreviewAvailable, setLocalPreviewAvailable] = useState(false)
  const [isLocalPreview, setIsLocalPreview] = useState(false)
  // Never show project data while the encrypted Codeva session is being read.
  const [showAuth, setShowAuth] = useState(true)
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig)
  const [isFirstRun, setIsFirstRun] = useState(() => window.localStorage.getItem('codic-first-run-complete') !== '1')
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('general')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [railMoreOpen, setRailMoreOpen] = useState(false)
  const [threadActionMenuId, setThreadActionMenuId] = useState<string | null>(null)
  const [threadMenuAnchor, setThreadMenuAnchor] = useState<{ left: number; top: number } | null>(null)
  const [threadMenuSection, setThreadMenuSection] = useState<'main' | 'copy' | 'open-in' | 'share' | 'fork'>('main')
  const [renameThreadId, setRenameThreadId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [activeAppMenu, setActiveAppMenu] = useState<MenuName | null>(null)
  const [appMenuPosition, setAppMenuPosition] = useState<{ name: MenuName; top: number; left: number } | null>(null)
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  const [isNavigationHidden, setIsNavigationHidden] = useState(() => window.localStorage.getItem('codic-navigation-hidden') === '1')
  const [isPinnedSummaryVisible, setIsPinnedSummaryVisible] = useState(false)
  const [browserSubmenuOpen, setBrowserSubmenuOpen] = useState(false)
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false)
  const [taskManagerData, setTaskManagerData] = useState<Awaited<ReturnType<typeof window.codic.app.getTaskManagerData>> | null>(null)
  const [performanceTraceRunning, setPerformanceTraceRunning] = useState(false)
  const [updateNoticeDismissed, setUpdateNoticeDismissed] = useState(false)
  const [sidebarSearchOpen, setSidebarSearchOpen] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [updateCheck, setUpdateCheck] = useState<CodicUpdateCheck | null>(null)
  const [updateCheckBusy, setUpdateCheckBusy] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [isWindowMaximized, setIsWindowMaximized] = useState(false)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium')
  const [approvalPolicy, setApprovalPolicy] = useState<'ask' | 'safe-reads' | 'full-access'>('ask')
  const [appZoom, setAppZoom] = useState(() => getInitialAppZoom(window.localStorage.getItem('codic-zoom')))
  const [approvalMenuOpen, setApprovalMenuOpen] = useState(false)
  const [approvalMenuPosition, setApprovalMenuPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const [effortMenuOpen, setEffortMenuOpen] = useState(false)
  const [effortMenuPosition, setEffortMenuPosition] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
  const [appVersion, setAppVersion] = useState('0.1.7')
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID())
  const [navigationRevision, setNavigationRevision] = useState(0)
  const registeredDeviceRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeTaskIdRef = useRef<string | null>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const railMoreRef = useRef<HTMLDivElement>(null)
  const appMenuRef = useRef<HTMLDivElement>(null)
  const threadActionMenuRef = useRef<HTMLDivElement>(null)
  const sidebarSearchRef = useRef<HTMLInputElement>(null)
  const approvalMenuRef = useRef<HTMLDivElement>(null)
  const approvalTriggerRef = useRef<HTMLButtonElement>(null)
  const effortMenuRef = useRef<HTMLDivElement>(null)
  const effortTriggerRef = useRef<HTMLButtonElement>(null)
  const shortcutActionsRef = useRef<ShortcutActions>({
    navigateBack: async () => undefined,
    navigateForward: async () => undefined,
    navigateView: () => undefined,
    openWorkspace: async () => undefined,
    openTaskSearch: () => undefined,
    startNewTask: () => undefined,
  })
  const navigationHistoryRef = useRef<NavigationEntry[]>([{ threadId: null, conversationId, view: 'assistant' }])
  const navigationIndexRef = useRef(0)
  const activeRunIsTemporaryRef = useRef(false)
  const lastPanelViewRef = useRef<View>('review')

  activeTaskIdRef.current = activeTaskId

  useEffect(() => {
    let active = true
    void window.codic.app.getVersion().then((version) => { if (active) setAppVersion(version) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    void window.codic.window.getState().then((state) => { if (active) setIsWindowMaximized(state.maximized) }).catch(() => undefined)
    const unsubscribe = window.codic.window.onStateChange((state) => setIsWindowMaximized(state.maximized))
    return () => { active = false; unsubscribe() }
  }, [])

  useEffect(() => {
    let active = true
    void window.codic.app.getUpdateState().then((state) => { if (active) setUpdateCheck(state) }).catch(() => undefined)
    const unsubscribe = window.codic.app.onUpdateState((state) => {
      setUpdateCheck(state)
      setUpdateCheckBusy(state.phase === 'checking' || state.phase === 'downloading')
      if (state.phase === 'available' || state.phase === 'downloaded') setUpdateNoticeDismissed(false)
      if (state.phase === 'error') setHistoryNotice(state.message)
    })
    return () => { active = false; unsubscribe() }
  }, [])

  useEffect(() => {
    let active = true
    void window.codic.auth.getLocalPreviewStatus().then((status) => {
      if (!active) return
      setLocalPreviewAvailable(status.available)
      setIsLocalPreview(status.enabled)
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const authClient = supabase
  const hasSession = Boolean(userEmail)
  const canUseWorkspace = hasSession || isLocalPreview
  const visibleThreads = useMemo(() => threads.filter((thread) => thread.title.toLowerCase().includes(sidebarSearch.trim().toLowerCase())), [threads, sidebarSearch])
  const visibleArchivedThreads = useMemo(() => archivedThreads.filter((thread) => thread.title.toLowerCase().includes(sidebarSearch.trim().toLowerCase())), [archivedThreads, sidebarSearch])
  const visibleProjectGroups = useMemo(() => projects.map((project) => ({
    project,
    threads: (projectThreads[project.path] || (workspace?.path === project.path ? threads : []))
      .filter((thread) => thread.title.toLowerCase().includes(sidebarSearch.trim().toLowerCase()))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  })).filter(({ project, threads: projectTasks }) => !sidebarSearch.trim() || project.name.toLowerCase().includes(sidebarSearch.trim().toLowerCase()) || projectTasks.length > 0), [projects, projectThreads, workspace?.path, threads, sidebarSearch])
  const recentProjectTasks = useMemo(() => visibleProjectGroups.flatMap(({ project, threads: projectTasks }) => projectTasks.map((thread) => ({ project, thread })))
    .sort((a, b) => b.thread.updatedAt.localeCompare(a.thread.updatedAt)), [visibleProjectGroups])
  const currentModel = useMemo(() => models.find((model) => model.id === modelId)?.name || 'Codeva Auto', [models, modelId])
  const currentThreadSummary = useMemo(() => [...threads, ...archivedThreads].find((thread) => thread.id === conversationId) || null, [threads, archivedThreads, conversationId])
  const canNavigateBack = navigationIndexRef.current > 0
  const canNavigateForward = navigationIndexRef.current < navigationHistoryRef.current.length - 1

  const markFirstRunComplete = () => {
    window.localStorage.setItem('codic-first-run-complete', '1')
    setIsFirstRun(false)
    setShowAuth(false)
  }

  const pushNavigation = (entry: NavigationEntry) => {
    const next = [...navigationHistoryRef.current.slice(0, navigationIndexRef.current + 1), entry].slice(-60)
    navigationHistoryRef.current = next
    navigationIndexRef.current = next.length - 1
    setNavigationRevision((revision) => revision + 1)
  }

  const resetNavigation = (entry: NavigationEntry) => {
    navigationHistoryRef.current = [entry]
    navigationIndexRef.current = 0
    setNavigationRevision((revision) => revision + 1)
  }

  const startNewTask = (temporary = false) => {
    if (isStreaming) return
    const nextId = crypto.randomUUID()
    setConversationId(nextId)
    setIsTemporaryChat(temporary)
    activeRunIsTemporaryRef.current = temporary
    setLastTaskId(null)
    setMessages([])
    setActivities([])
    setHistoryNotice('')
    setError('')
    setThreadActionMenuId(null)
    setView('assistant')
    pushNavigation({ threadId: null, conversationId: nextId, view: 'assistant', temporary })
  }

  const navigateView = (nextView: View) => {
    if (nextView !== view) pushNavigation({ threadId: isTemporaryChat ? null : conversationId, conversationId, view: nextView, temporary: isTemporaryChat, ...(isTemporaryChat ? { messages } : {}) })
    setView(nextView)
  }

  const refreshThreadLists = async (workspacePath = workspaceRef.current?.path) => {
    if (!workspacePath) return
    const [active, archived] = await Promise.all([
      window.codic.history.listThreads(workspacePath),
      window.codic.history.listArchivedThreads(workspacePath),
    ])
    setThreads(active)
    setArchivedThreads(archived)
    setProjectThreads((current) => ({ ...current, [workspacePath]: active }))
  }

  useEffect(() => {
    let current = true
    if (!projects.length) {
      setProjectThreads({})
      return () => { current = false }
    }
    void Promise.all(projects.map(async (project) => {
      try { return [project.path, await window.codic.history.listThreads(project.path)] as const }
      catch { return [project.path, []] as const }
    })).then((entries) => {
      if (current) setProjectThreads(Object.fromEntries(entries))
    })
    return () => { current = false }
  }, [projects])

  const refreshScheduledTasks = async (workspacePath = workspaceRef.current?.path) => {
    if (!workspacePath) return
    try { setScheduledTasks(await window.codic.schedules.list(workspacePath)) }
    catch { setScheduledTasks([]) }
  }

  const beginScheduleThread = async (thread: ThreadSummary) => {
    if (!workspace) return
    try {
      const history = await window.codic.history.loadThread(workspace.path, thread.id)
      const latestPrompt = [...history.messages].reverse().find((message) => message.role === 'user')?.content || ''
      setScheduleThreadId(thread.id)
      setScheduleTitle(thread.title.slice(0, 160))
      setSchedulePrompt(latestPrompt)
      setScheduleDateTime(defaultScheduleDateTime())
      setScheduleRecurrence('once')
      setThreadActionMenuId(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this task to schedule it.')
    }
  }

  const saveScheduledTask = async () => {
    if (!workspace || !scheduleTitle.trim() || !schedulePrompt.trim()) return
    const scheduledDate = new Date(scheduleDateTime)
    if (!Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() + 60_000) {
      setError('Choose a run time at least one minute in the future.')
      return
    }
    setScheduleBusy(true)
    try {
      await window.codic.schedules.create({
        workspacePath: workspace.path,
        sourceThreadId: scheduleThreadId,
        title: scheduleTitle.trim(),
        prompt: schedulePrompt.trim(),
        model: modelId,
        reasoningEffort,
        recurrence: scheduleRecurrence,
        nextRunAt: scheduledDate.toISOString(),
      })
      await refreshScheduledTasks(workspace.path)
      setScheduleThreadId(null)
      setHistoryNotice('Scheduled task saved. Codic must be open at the run time.')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this scheduled task.')
    } finally {
      setScheduleBusy(false)
    }
  }

  const setScheduleEnabled = async (task: ScheduledTask, enabled: boolean) => {
    if (!workspace) return
    try {
      await window.codic.schedules.setEnabled({ workspacePath: workspace.path, scheduleId: task.id, enabled })
      await refreshScheduledTasks(workspace.path)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update this schedule.') }
  }

  const removeScheduledTask = async (task: ScheduledTask) => {
    if (!workspace) return
    try {
      await window.codic.schedules.delete({ workspacePath: workspace.path, scheduleId: task.id })
      await refreshScheduledTasks(workspace.path)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete this schedule.') }
  }

  const loadProfileStats = async () => {
    try {
      setProfileStats(await window.codic.history.getProfileStats())
    } catch {
      setProfileStats(null)
    }
  }

  const beginRenameThread = (thread: ThreadSummary) => {
    setThreadActionMenuId(null)
    setRenameThreadId(thread.id)
    setRenameDraft(thread.title)
  }

  const saveThreadRename = async () => {
    if (!workspace || !renameThreadId) return
    try {
      await window.codic.history.renameThread({ workspacePath: workspace.path, threadId: renameThreadId, title: renameDraft })
      await refreshThreadLists(workspace.path)
      setRenameThreadId(null)
      setHistoryNotice('Task name updated.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not rename this task.')
    }
  }

  const toggleThreadPin = async (thread: ThreadSummary) => {
    if (!workspace) return
    try {
      await window.codic.history.setThreadPinned({ workspacePath: workspace.path, threadId: thread.id, pinned: !thread.pinned })
      await refreshThreadLists(workspace.path)
      setThreadActionMenuId(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the pinned task.')
    }
  }

  const forkThread = async (thread: ThreadSummary, mode: 'fork' | 'side-chat', inNewWindow = false) => {
    if (!workspace) return
    try {
      const forked = await window.codic.history.forkThread({ workspacePath: workspace.path, threadId: thread.id, mode })
      await refreshThreadLists(workspace.path)
      setThreadActionMenuId(null)
      if (inNewWindow) await window.codic.window.openThread(workspace.path, forked.id)
      else await openThread(forked.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create a task branch.')
    }
  }

  const archiveThread = async (thread: ThreadSummary, archived: boolean) => {
    if (!workspace) return
    try {
      await window.codic.history.setThreadArchived({ workspacePath: workspace.path, threadId: thread.id, archived })
      await refreshThreadLists(workspace.path)
      setThreadActionMenuId(null)
      if (archived && conversationId === thread.id) startNewTask()
      setHistoryNotice(archived ? 'Task archived. You can restore it from Archived tasks.' : 'Task restored to recent tasks.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this task.')
    }
  }

  const copyThreadContent = async (thread: ThreadSummary, kind: 'prompt' | 'transcript') => {
    if (!workspace) return
    try {
      const history = await window.codic.history.loadThread(workspace.path, thread.id)
      const text = kind === 'prompt'
        ? [...history.messages].reverse().find((message) => message.role === 'user')?.content || ''
        : [`# ${history.thread.title}`, '', ...history.messages.flatMap((message) => [`${message.role === 'user' ? 'You' : 'Codic'}:`, message.content, ''])].join('\n')
      await window.codic.history.copyText(text)
      setThreadActionMenuId(null)
      setHistoryNotice(kind === 'prompt' ? 'Latest prompt copied to the clipboard.' : 'Task transcript copied to the clipboard.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not copy this task.')
    }
  }

  const exportThread = async (thread: ThreadSummary) => {
    if (!workspace) return
    try {
      const savedPath = await window.codic.history.exportMarkdown({ workspacePath: workspace.path, threadId: thread.id })
      setThreadActionMenuId(null)
      if (savedPath) setHistoryNotice(`Transcript exported to ${savedPath}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not export this task.')
    }
  }

  const openThreadInNewWindow = async (thread: ThreadSummary) => {
    if (!workspace) return
    try {
      await window.codic.window.openThread(workspace.path, thread.id)
      setThreadActionMenuId(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open a new task window.')
    }
  }

  const openThreadInView = async (thread: ThreadSummary, nextView: View) => {
    setThreadActionMenuId(null)
    if (thread.id !== conversationId) await openThread(thread.id)
    navigateView(nextView)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    if (theme === 'system') delete document.documentElement.dataset.theme
  }, [theme])

  useEffect(() => {
    void window.codic.app.getVersion().then(setAppVersion).catch(() => undefined)
    const storedTheme = window.localStorage.getItem('codic-theme')
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') setTheme(storedTheme)
    const storedEffort = window.localStorage.getItem('codic-reasoning-effort')
    if (storedEffort === 'low' || storedEffort === 'medium' || storedEffort === 'high') setReasoningEffort(storedEffort)
    const storedApproval = window.localStorage.getItem('codic-approval-policy')
    if (storedApproval === 'ask' || storedApproval === 'safe-reads' || storedApproval === 'full-access') setApprovalPolicy(storedApproval)
    const onEvent = window.codic.runtime.onEvent((event, taskId) => handleAgentEvent(event, taskId))
    const onAuthCallback = window.codic.auth.onCallback((url) => { void finishOAuth(url) })
    const onSignedOut = window.codic.auth.onSignedOut(() => {
      setUserEmail('')
      setIsLocalPreview(false)
      setWorkspace(null)
      setProjects([])
      setProjectThreads({})
      setThreads([])
      setArchivedThreads([])
      setScheduledTasks([])
      setMessages([])
      setActivities([])
    })
    if (authClient) {
      let disposed = false
      void authClient.auth.getSession().then(({ data }) => {
        if (data.session) void acceptSession(data.session)
      }).catch(() => undefined).finally(() => { if (!disposed) setAuthReady(true) })
      const { data } = authClient.auth.onAuthStateChange((_event, session) => {
        if (session) void acceptSession(session)
        else {
          setUserEmail('')
        }
      })
      return () => {
        disposed = true
        onEvent()
        onAuthCallback()
        onSignedOut()
        data.subscription.unsubscribe()
      }
    }
    return () => {
      onEvent()
      onAuthCallback()
      onSignedOut()
    }
  }, [authClient])

  useEffect(() => {
    if (!authReady) return
    setShowAuth(!canUseWorkspace)
  }, [authReady, canUseWorkspace])

  useEffect(() => {
    window.codic.window.setZoomFactor(appZoom)
    window.localStorage.setItem('codic-zoom', String(appZoom))
  }, [appZoom])

  useLayoutEffect(() => {
    if (!approvalMenuOpen || !approvalTriggerRef.current) return
    setApprovalMenuPosition(placeComposerPopover(approvalTriggerRef.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, 360, 220))
  }, [approvalMenuOpen])

  useLayoutEffect(() => {
    if (!effortMenuOpen || !effortTriggerRef.current) return
    const rect = effortTriggerRef.current.getBoundingClientRect()
    const width = Math.min(250, window.innerWidth - 24)
    const position = placeComposerPopover({ ...rect, left: rect.right - width }, { width: window.innerWidth, height: window.innerHeight }, width, 200)
    setEffortMenuPosition(position)
  }, [effortMenuOpen])

  useEffect(() => {
    if (!approvalMenuOpen && !effortMenuOpen) return
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node
      if (approvalMenuOpen && !approvalMenuRef.current?.contains(target) && !approvalTriggerRef.current?.contains(target)) setApprovalMenuOpen(false)
      if (effortMenuOpen && !effortMenuRef.current?.contains(target) && !effortTriggerRef.current?.contains(target)) setEffortMenuOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (approvalMenuOpen) { setApprovalMenuOpen(false); approvalTriggerRef.current?.focus() }
      if (effortMenuOpen) { setEffortMenuOpen(false); effortTriggerRef.current?.focus() }
    }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', escape)
    const reposition = () => {
      if (approvalMenuOpen && approvalTriggerRef.current) {
        const rect = approvalTriggerRef.current.getBoundingClientRect()
        setApprovalMenuPosition(placeComposerPopover(rect, { width: window.innerWidth, height: window.innerHeight }, 360, 220))
      }
      if (effortMenuOpen && effortTriggerRef.current) {
        const rect = effortTriggerRef.current.getBoundingClientRect()
        const width = Math.min(250, window.innerWidth - 24)
        setEffortMenuPosition(placeComposerPopover({ ...rect, left: rect.right - width }, { width: window.innerWidth, height: window.innerHeight }, width, 200))
      }
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', escape)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [approvalMenuOpen, effortMenuOpen])

  useEffect(() => {
    if (approvalMenuOpen && approvalMenuPosition) approvalMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    if (effortMenuOpen && effortMenuPosition) effortMenuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
  }, [approvalMenuOpen, approvalMenuPosition, effortMenuOpen, effortMenuPosition])

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const isCommand = event.ctrlKey || event.metaKey
      if (event.key === 'F11') {
        event.preventDefault()
        window.codic.window.toggleFullScreen()
        return
      }
      if (!isCommand) return
      if (event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        if (!isStreaming) shortcutActionsRef.current.startNewTask(true)
        return
      }
      if (event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        setIsSidebarHidden((hidden) => !hidden)
        return
      }
      if (event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        toggleNavigationPanel()
        return
      }
      if (event.altKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        switchChatAndTabs()
        return
      }
      if (event.altKey && (event.key === '[' || event.code === 'BracketLeft')) {
        event.preventDefault()
        cycleSidebarView(-1)
        return
      }
      if (event.altKey && (event.key === ']' || event.code === 'BracketRight')) {
        event.preventDefault()
        cycleSidebarView(1)
        return
      }
      if (event.shiftKey && (event.key === '[' || event.code === 'BracketLeft')) {
        event.preventDefault()
        cyclePanelTab(-1)
        return
      }
      if (event.shiftKey && (event.key === ']' || event.code === 'BracketRight')) {
        event.preventDefault()
        cyclePanelTab(1)
        return
      }
      if (event.shiftKey && event.key === '=') {
        event.preventDefault()
        setAppZoom((current) => Math.min(1.5, Math.round((current + 0.1) * 10) / 10))
        return
      }
      if (event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setIsRightPanelOpen((open) => !open)
        return
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        shortcutActionsRef.current.openTaskSearch()
        return
      }
      if (event.key === '`' || event.code === 'Backquote') {
        event.preventDefault()
        setIsRightPanelOpen(true)
        shortcutActionsRef.current.navigateView('terminal')
        return
      }
      if (event.key === '[') {
        event.preventDefault()
        void shortcutActionsRef.current.navigateBack()
        return
      }
      if (event.key === ']') {
        event.preventDefault()
        void shortcutActionsRef.current.navigateForward()
        return
      }
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault()
        void shortcutActionsRef.current.openWorkspace()
        return
      }
      if (event.key.toLowerCase() === 'w') {
        event.preventDefault()
        window.codic.window.close()
        return
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault()
        void window.codic.app.quit()
        return
      }
      if (event.key === '/' || event.key === '?') {
        event.preventDefault()
        setSettingsSection('shortcuts')
        setShowSettings(true)
        return
      }
      if (event.altKey && event.key.toLowerCase() === 'r' && currentThreadSummary) {
        event.preventDefault()
        beginRenameThread(currentThreadSummary)
      } else if (event.altKey && event.key.toLowerCase() === 'p' && currentThreadSummary) {
        event.preventDefault()
        void toggleThreadPin(currentThreadSummary)
      } else if (event.altKey && event.key.toLowerCase() === 's' && currentThreadSummary) {
        event.preventDefault()
        void forkThread(currentThreadSummary, 'side-chat')
      } else if (event.shiftKey && event.key.toLowerCase() === 'a' && currentThreadSummary) {
        event.preventDefault()
        void archiveThread(currentThreadSummary, !currentThreadSummary.archived)
      } else if (event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setIsSidebarHidden((hidden) => !hidden)
      } else if (event.key === ',') {
        event.preventDefault()
        setSettingsSection('general')
        setShowSettings(true)
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        if (isStreaming) return
        shortcutActionsRef.current.startNewTask()
      } else if (event.key === '+' || event.key === '=' || event.key === 'Add') {
        event.preventDefault()
        setAppZoom((current) => Math.min(1.5, Math.round((current + 0.1) * 10) / 10))
      } else if (event.key === '-') {
        event.preventDefault()
        setAppZoom((current) => Math.max(0.75, Math.round((current - 0.1) * 10) / 10))
      } else if (event.key === '0') {
        event.preventDefault()
        setAppZoom(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isStreaming, currentThreadSummary, view, isTemporaryChat, messages])

  useEffect(() => {
    if (!profileMenuOpen) return
    const dismiss = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setProfileMenuOpen(false) }
    document.addEventListener('mousedown', dismiss)
    window.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', dismiss); window.removeEventListener('keydown', escape) }
  }, [profileMenuOpen])

  useEffect(() => {
    if (!railMoreOpen) return
    const dismiss = (event: MouseEvent) => {
      if (!railMoreRef.current?.contains(event.target as Node)) setRailMoreOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setRailMoreOpen(false) }
    document.addEventListener('mousedown', dismiss)
    window.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', dismiss); window.removeEventListener('keydown', escape) }
  }, [railMoreOpen])

  useEffect(() => {
    if (!workspace) {
      setScheduledTasks([])
      return
    }
    const refresh = () => {
      void Promise.all([
        window.codic.history.listThreads(workspace.path),
        window.codic.history.listArchivedThreads(workspace.path),
        window.codic.schedules.list(workspace.path),
      ]).then(([active, archived, schedules]) => {
        setThreads(active)
        setArchivedThreads(archived)
        setScheduledTasks(schedules)
      }).catch(() => undefined)
    }
    const interval = window.setInterval(refresh, 15_000)
    return () => window.clearInterval(interval)
  }, [workspace?.path])

  useEffect(() => {
    if (!activeAppMenu) return
    const dismiss = (event: MouseEvent) => {
      if (!appMenuRef.current?.contains(event.target as Node)) setActiveAppMenu(null)
    }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setActiveAppMenu(null) }
    const resize = () => setActiveAppMenu(null)
    document.addEventListener('mousedown', dismiss)
    window.addEventListener('keydown', escape)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('mousedown', dismiss); window.removeEventListener('keydown', escape); window.removeEventListener('resize', resize) }
  }, [activeAppMenu])

  useEffect(() => {
    if (!threadActionMenuId) return
    const dismiss = (event: MouseEvent) => {
      if (!threadActionMenuRef.current?.contains(event.target as Node)) setThreadActionMenuId(null)
    }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setThreadActionMenuId(null) }
    const resize = () => setThreadActionMenuId(null)
    document.addEventListener('mousedown', dismiss)
    window.addEventListener('keydown', escape)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('mousedown', dismiss); window.removeEventListener('keydown', escape); window.removeEventListener('resize', resize) }
  }, [threadActionMenuId])

  useLayoutEffect(() => {
    if (!threadActionMenuId || !threadMenuAnchor || !threadActionMenuRef.current) return
    const menu = threadActionMenuRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(threadMenuAnchor.left, window.innerWidth - menu.width - 8))
    const top = Math.max(8, Math.min(threadMenuAnchor.top, window.innerHeight - menu.height - 8))
    if (left !== threadMenuAnchor.left || top !== threadMenuAnchor.top) setThreadMenuAnchor({ left, top })
  }, [threadActionMenuId, threadMenuSection, threadMenuAnchor])

  useEffect(() => {
    if (!showSettings && !showAuth && !renameThreadId && !scheduleThreadId) return
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setShowSettings(false)
      if (!canUseWorkspace) setShowAuth(true)
      else setShowAuth(false)
      setRenameThreadId(null)
      setScheduleThreadId(null)
      setThreadActionMenuId(null)
      setActiveAppMenu(null)
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [showSettings, showAuth, renameThreadId, scheduleThreadId, canUseWorkspace])

  useEffect(() => {
    let active = true
    const restoreLastWorkspace = async () => {
      if (!authReady || !canUseWorkspace) return
      try {
        const savedProjects = await window.codic.workspace.listProjects()
        if (!active) return
        setProjects(savedProjects)
        const intent = getWorkspaceRestoreIntent(window.location.search)
        if (intent.kind === 'blank') {
          setWorkspace(null)
          setThreads([])
          setArchivedThreads([])
          setScheduledTasks([])
          setMessages([])
          const nextId = crypto.randomUUID()
          setConversationId(nextId)
          resetNavigation({ threadId: null, conversationId: nextId, view: 'assistant' })
          return
        }
        const requestedProjectPath = intent.projectPath
        const lastProject = requestedProjectPath
          ? savedProjects.find((project) => project.path === requestedProjectPath)
          : savedProjects[0]
        if (requestedProjectPath && !lastProject) {
          setError('This window requested a project that is no longer in your Codic project list. Open the folder again to add it.')
          return
        }
        if (!lastProject) return
        const selected = await window.codic.workspace.selectSaved(lastProject.path)
        if (!active) return
        setWorkspace(selected)
        const [savedThreads, savedArchived] = await Promise.all([
          window.codic.history.listThreads(selected.path),
          window.codic.history.listArchivedThreads(selected.path),
        ])
        const savedSchedules = await window.codic.schedules.list(selected.path)
        if (!active) return
        setThreads(savedThreads)
        setArchivedThreads(savedArchived)
        setScheduledTasks(savedSchedules)
        if (intent.kind === 'new-project') {
          const nextId = crypto.randomUUID()
          setConversationId(nextId)
          resetNavigation({ threadId: null, conversationId: nextId, view: 'assistant' })
          return
        }
        const initialThread = (intent.threadId && [...savedThreads, ...savedArchived].find((thread) => thread.id === intent.threadId)) || savedThreads[0]
        if (!initialThread) {
          const nextId = crypto.randomUUID()
          setConversationId(nextId)
          resetNavigation({ threadId: null, conversationId: nextId, view: 'assistant' })
          return
        }
        const restored = await window.codic.history.loadThread(selected.path, initialThread.id)
        if (!active) return
        setConversationId(restored.thread.id)
        setMessages(restored.messages.map((message) => ({ ...message })))
        setLastTaskId(restored.lastTaskId)
        resetNavigation({ threadId: restored.thread.id, conversationId: restored.thread.id, view: 'assistant' })
        setHistoryNotice(restored.truncated ? 'Showing the newest part of this task. Earlier messages were left out to keep the model context within its limit.' : '')
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not restore your last project.')
      }
    }
    void restoreLastWorkspace()
    return () => { active = false }
  }, [authReady, canUseWorkspace])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, activities])

  useEffect(() => {
    if (!hasSession) return
    void window.codic.api.getModels().then((catalog) => {
      if (Array.isArray(catalog.models) && catalog.models.length) {
        const safeModels = catalog.models.filter((model) => model && typeof model.id === 'string' && typeof model.name === 'string')
        setModels(safeModels)
        setModelId((current) => {
          const saved = window.localStorage.getItem('codic-model') || current
          const next = safeModels.some((model) => model.id === saved && !model.locked) ? saved : safeModels.find((model) => !model.locked)?.id || 'auto'
          window.localStorage.setItem('codic-model', next)
          return next
        })
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
    markFirstRunComplete()
    try {
      const result = await window.codic.api.syncAccount()
      if (result.banned) {
        await authClient?.auth.signOut()
        setUserEmail('')
        setShowAuth(true)
        registeredDeviceRef.current = false
        setError('This account cannot access Codeva right now.')
        return false
      }
      if (result.plan) setAccountPlan(result.plan)
      if (!registeredDeviceRef.current) {
        await window.codic.api.registerDevice()
        registeredDeviceRef.current = true
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not connect your Codeva account.')
    }
    return true
  }

  const finishOAuth = async (url: string) => {
    if (!authClient) {
      setError('Add the Supabase public URL and anonymous key to the Codic environment before signing in.')
      return
    }
    try {
      const parsed = new URL(url)
      const ticket = parsed.searchParams.get('ticket')
      if (!ticket) throw new Error(parsed.searchParams.get('error_description') || 'Codeva sign-in did not return a secure handoff ticket.')
      const handoff = await window.codic.auth.redeemHandoff(ticket)
      const { data, error: sessionError } = await authClient.auth.setSession(handoff)
      if (sessionError) throw sessionError
      if (!data.session) throw new Error('Codeva did not return a signed-in session. Try again.')
      const accepted = await acceptSession(data.session)
      if (!accepted) return
      setShowAuth(false)
      setAuthNotice('')
      setError('')
    } catch (caught) {
      setAuthNotice('')
      setError(caught instanceof Error ? caught.message : 'Could not complete Codeva sign-in.')
      setShowAuth(true)
    }
  }

  const handleCodevaSignIn = async () => {
    if (!authClient) {
      setError('This Codic build is missing its Supabase public configuration. Please install an official Codeva build.')
      return
    }
    setAuthBusy(true)
    setError('')
    setAuthNotice('')
    try {
      await window.codic.auth.beginCodevaSignIn()
      setAuthNotice('Codeva opened in your browser. Sign in there; Codic will reopen when the secure handoff is ready.')
    } catch (caught) {
      setAuthNotice('')
      setError(caught instanceof Error ? caught.message : 'Could not open Codeva sign-in.')
    } finally {
      setAuthBusy(false)
    }
  }

  const continueLocally = async () => {
    setAuthBusy(true)
    setError('')
    try {
      await window.codic.auth.continueLocally()
      setIsLocalPreview(true)
      setShowAuth(false)
      setHistoryNotice('Local preview is active. Projects and local tools are available; sign in to Codeva to send AI model requests.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start the local preview.')
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
    setIsLocalPreview(false)
    setWorkspace(null)
    setProjects([])
    setProjectThreads({})
    setThreads([])
    setArchivedThreads([])
    setScheduledTasks([])
    setMessages([])
    setActivities([])
    setShowAuth(true)
    setError(revokeError)
    setShowSettings(false)
  }

  const activateProject = async (selected: WorkspaceInfo) => {
    if (activeTaskIdRef.current) window.codic.runtime.cancelTask(activeTaskIdRef.current)
    activeTaskIdRef.current = null
    setActiveTaskId(null)
    setActiveRunId(null)
    setIsStreaming(false)
    setApprovals([])
    setWorkspace(selected)
    setIsTemporaryChat(false)
    const nextId = crypto.randomUUID()
    setConversationId(nextId)
    setLastTaskId(null)
    setMessages([])
    setActivities([])
    setHistoryNotice('')
    setError('')
    const [savedProjects, savedThreads, savedArchived, savedSchedules] = await Promise.all([
      window.codic.workspace.listProjects(),
      window.codic.history.listThreads(selected.path),
      window.codic.history.listArchivedThreads(selected.path),
      window.codic.schedules.list(selected.path),
    ])
    setProjects(savedProjects)
    setThreads(savedThreads)
    setArchivedThreads(savedArchived)
    setScheduledTasks(savedSchedules)
    resetNavigation({ threadId: null, conversationId: nextId, view: 'assistant' })
  }

  const openWorkspace = async () => {
    try {
      const selected = await window.codic.workspace.choose()
      if (selected) await activateProject(selected)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open that project folder.')
    }
  }

  const createProject = async () => {
    try {
      const selected = await window.codic.workspace.chooseNewProject()
      if (selected) await activateProject(selected)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create or open that project folder.')
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

  const openThreadForProject = async (project: WorkspaceInfo, thread: ThreadSummary) => {
    if (isStreaming) return
    try {
      const selected = workspace?.path === project.path ? workspace : await window.codic.workspace.selectSaved(project.path)
      const [savedProjects, active, archived, schedules, restored] = await Promise.all([
        window.codic.workspace.listProjects(),
        window.codic.history.listThreads(selected.path),
        window.codic.history.listArchivedThreads(selected.path),
        window.codic.schedules.list(selected.path),
        window.codic.history.loadThread(selected.path, thread.id),
      ])
      setWorkspace(selected)
      setProjects(savedProjects)
      setThreads(active)
      setProjectThreads((current) => ({ ...current, [selected.path]: active }))
      setArchivedThreads(archived)
      setScheduledTasks(schedules)
      setConversationId(restored.thread.id)
      setIsTemporaryChat(false)
      setMessages(restored.messages.map((message) => ({ ...message })))
      setLastTaskId(restored.lastTaskId)
      setActivities([])
      setHistoryNotice(restored.truncated ? 'Showing the newest part of this task. Earlier messages were left out to keep the model context within its limit.' : '')
      setError('')
      setThreadActionMenuId(null)
      setView('assistant')
      pushNavigation({ threadId: restored.thread.id, conversationId: restored.thread.id, view: 'assistant' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open this project task.')
    }
  }

  const openThread = async (threadId: string) => {
    if (!workspace || isStreaming) return
    try {
      const restored = await window.codic.history.loadThread(workspace.path, threadId)
      setConversationId(restored.thread.id)
      setIsTemporaryChat(false)
      setMessages(restored.messages.map((message) => ({ ...message })))
      setLastTaskId(restored.lastTaskId)
      setActivities([])
      setHistoryNotice(restored.truncated ? 'Showing the newest part of this task. Earlier messages were left out to keep the model context within its limit.' : '')
      setError('')
      setThreadActionMenuId(null)
      setView('assistant')
      pushNavigation({ threadId: restored.thread.id, conversationId: restored.thread.id, view: 'assistant' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this task history.')
    }
  }

  const applyNavigationEntry = async (entry: NavigationEntry) => {
    if (entry.threadId && workspace) {
      const restored = await window.codic.history.loadThread(workspace.path, entry.threadId)
      setConversationId(restored.thread.id)
      setMessages(restored.messages.map((message) => ({ ...message })))
      setLastTaskId(restored.lastTaskId)
      setHistoryNotice(restored.truncated ? 'Showing the newest part of this task. Earlier messages were left out to keep the model context within its limit.' : '')
      setIsTemporaryChat(false)
    } else if (entry.temporary) {
      setConversationId(entry.conversationId)
      setMessages(entry.messages || [])
      setLastTaskId(null)
      setHistoryNotice('This temporary chat is not saved to task history.')
      setIsTemporaryChat(true)
    } else {
      setConversationId(entry.conversationId)
      setMessages([])
      setLastTaskId(null)
      setHistoryNotice('')
      setIsTemporaryChat(false)
    }
    setActivities([])
    setView(entry.view)
  }

  const navigateBack = async () => {
    if (!canNavigateBack || isStreaming) return
    const nextIndex = navigationIndexRef.current - 1
    navigationIndexRef.current = nextIndex
    setNavigationRevision((revision) => revision + 1)
    await applyNavigationEntry(navigationHistoryRef.current[nextIndex])
  }

  const navigateForward = async () => {
    if (!canNavigateForward || isStreaming) return
    const nextIndex = navigationIndexRef.current + 1
    navigationIndexRef.current = nextIndex
    setNavigationRevision((revision) => revision + 1)
    await applyNavigationEntry(navigationHistoryRef.current[nextIndex])
  }

  const handleAgentEvent = useCallback((event: CodicRuntimeEvent, taskId: string) => {
    if (event.type === 'run_started') {
      setActiveRunId(event.runId)
      activeTaskIdRef.current = taskId
      setActiveTaskId(taskId)
      setIsStreaming(true)
      return
    }
    if (event.type === 'subagent_progress') {
      const skillLabel = event.skill === 'code-review' ? 'Code review' : event.skill === 'research' ? 'Research' : 'Planning'
      const detail = event.status === 'running'
        ? 'Reading the selected project in parallel.'
        : event.status === 'error'
          ? event.error || 'The specialist could not finish.'
          : (event.summary || 'Analysis complete.').slice(0, 1_200)
      setActivities((current) => {
        const existing = current.some((activity) => activity.id === event.agentId)
        const next: Activity = {
          id: event.agentId,
          title: `${event.label} · ${skillLabel}`,
          detail,
          status: event.status === 'running' ? 'running' : event.status,
        }
        return existing
          ? current.map((activity) => activity.id === event.agentId ? next : activity)
          : [...current, next]
      })
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
      } else if (coreEvent.type === 'subagent_progress') {
        const status = coreEvent.status === 'completed' ? 'done' : coreEvent.status === 'failed' ? 'error' : 'running'
        setActivities((current) => {
          const next: Activity = {
            id: coreEvent.agentId,
            title: `Helper agent · ${coreEvent.skill}`,
            detail: coreEvent.message || `Agent ${coreEvent.status}.`,
            status,
          }
          return current.some((activity) => activity.id === coreEvent.agentId)
            ? current.map((activity) => activity.id === coreEvent.agentId ? next : activity)
            : [...current, next]
        })
        setView('activity')
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
      if (taskId) setApprovals((current) => current.some((item) => item.approvalId === event.approvalId) ? current : [...current, { ...event, taskId }])
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
      if (activeTaskIdRef.current === taskId) setLastTaskId(taskId)
      if (!activeRunIsTemporaryRef.current && workspaceRef.current) void window.codic.history.listThreads(workspaceRef.current.path).then(setThreads).catch(() => undefined)
      activeRunIsTemporaryRef.current = false
      setCheckpointRevision((current) => current + 1)
      setIsStreaming(false)
      setActiveRunId(null)
      setActiveTaskId(null)
      activeTaskIdRef.current = null
      setApprovals([])
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
      if (!isLocalPreview) setShowAuth(true)
      setError(isLocalPreview
        ? 'Local preview can open projects and test local tools. Sign in to Codeva to send AI model requests.'
        : 'Sign in to your Codeva account before sending a model request.')
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
    activeRunIsTemporaryRef.current = isTemporaryChat
    setView('assistant')
    try {
      const result = await window.codic.runtime.startTask({
        workspacePath: workspace.path,
        prompt,
        model: modelId,
        reasoningEffort,
        approvalPolicy,
        temporary: isTemporaryChat,
        conversationId,
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
      })
      setActiveTaskId(result.taskId)
      activeTaskIdRef.current = result.taskId
      setLastTaskId(result.taskId)
      if (!isTemporaryChat) setThreads(await window.codic.history.listThreads(workspace.path))
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
      setApprovals((current) => current.filter((item) => item.approvalId !== approval.approvalId))
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
    setApprovals([])
    setActivities((current) => current.map((activity) => activity.status === 'running' ? { ...activity, status: 'done', detail: 'Stopped by you.' } : activity))
  }

  const changeTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
    window.localStorage.setItem('codic-theme', next)
  }

  const openAuth = () => {
    setShowAuth(true)
    setError('')
  }

  const openTaskSearch = () => {
    setIsSidebarHidden(false)
    setSidebarSearchOpen(true)
    window.setTimeout(() => sidebarSearchRef.current?.focus(), 0)
  }

  const checkForUpdates = async () => {
    setUpdateCheckBusy(true)
    try {
      const result = await window.codic.app.checkForUpdates()
      setUpdateCheck(result)
      setHistoryNotice(result.message)
      return result
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not check for updates.'
      setHistoryNotice(message)
      return null
    } finally {
      setUpdateCheckBusy(false)
    }
  }

  const downloadCodicUpdate = async () => {
    setUpdateCheckBusy(true)
    try { await window.codic.app.downloadUpdate() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not download the Codic update.') }
    finally { setUpdateCheckBusy(false) }
  }

  const installCodicUpdate = async () => {
    try { await window.codic.app.installUpdate() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not install the Codic update.') }
  }

  const openTaskManager = async () => {
    try {
      setTaskManagerData(await window.codic.app.getTaskManagerData())
      setIsTaskManagerOpen(true)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not read Codic process information.') }
  }

  const togglePerformanceTrace = async () => {
    try {
      if (performanceTraceRunning) {
        const savedPath = await window.codic.app.stopPerformanceTrace()
        if (savedPath) {
          setPerformanceTraceRunning(false)
          setHistoryNotice(`Performance trace saved to ${savedPath}`)
        }
      } else {
        await window.codic.app.startPerformanceTrace()
        setPerformanceTraceRunning(true)
        setHistoryNotice('Performance trace is recording locally. Stop it to choose a save location.')
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not manage the performance trace.') }
  }

  const openCodicBrowser = async (url?: string) => {
    setActiveAppMenu(null)
    setBrowserSubmenuOpen(false)
    try { await window.codic.window.openBrowser(url) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not open the Codic browser.') }
  }

  const toggleApplicationMenu = (name: MenuName, trigger: HTMLButtonElement) => {
    setBrowserSubmenuOpen(false)
    if (activeAppMenu === name) {
      setActiveAppMenu(null)
      return
    }
    if (window.innerWidth <= 640) {
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(name === 'View' ? 360 : 286, window.innerWidth - 16)
      const desiredLeft = rect.left + width > window.innerWidth - 8 ? rect.right - width : rect.left
      const left = Math.max(8, Math.min(desiredLeft, window.innerWidth - width - 8))
      const maxHeight = Math.min(620, window.innerHeight - 52)
      const top = Math.max(8, Math.min(rect.bottom + 2, window.innerHeight - maxHeight - 8))
      setAppMenuPosition({ name, top, left })
    } else {
      setAppMenuPosition(null)
    }
    setActiveAppMenu(name)
  }

  const cycleSidebarView = (direction: -1 | 1) => {
    const entries: View[] = ['assistant', 'activity', 'review', 'terminal']
    const index = entries.indexOf(view)
    const next = entries[(index + direction + entries.length) % entries.length]
    setIsRightPanelOpen(next !== 'assistant')
    navigateView(next)
  }

  const cyclePanelTab = (direction: -1 | 1) => {
    const entries: View[] = ['review', 'terminal', 'activity']
    const index = entries.indexOf(view)
    const next = entries[(Math.max(index, -1) + direction + entries.length) % entries.length]
    lastPanelViewRef.current = next
    setIsRightPanelOpen(true)
    navigateView(next)
  }

  const switchChatAndTabs = () => {
    if (view === 'assistant') {
      setIsRightPanelOpen(true)
      navigateView(lastPanelViewRef.current)
    } else {
      lastPanelViewRef.current = view
      setIsRightPanelOpen(true)
      navigateView('assistant')
    }
  }

  const toggleNavigationPanel = () => setIsNavigationHidden((hidden) => {
    window.localStorage.setItem('codic-navigation-hidden', hidden ? '0' : '1')
    return !hidden
  })

  const checkGatewayConnection = async () => {
    if (!hasSession) {
      setHistoryNotice('Sign in to Codeva to check access to your model gateway.')
      return
    }
    try {
      const catalog = await window.codic.api.getModels()
      setHistoryNotice(catalog.models.length ? `Codeva is reachable. ${catalog.models.length} model${catalog.models.length === 1 ? '' : 's'} available for this account.` : 'Codeva responded, but no models are currently available for this account.')
    } catch (caught) {
      setHistoryNotice(caught instanceof Error ? caught.message : 'Could not reach the Codeva model gateway.')
    }
  }

  const openWebsite = async (page: '/help' | '/status' | '/contact' | '/downloads/codic') => {
    try {
      await window.codic.app.openWebsite(page)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open the Codeva website.')
    }
  }

  const openSettings = (section: SettingsSection = 'general') => {
    setProfileMenuOpen(false)
    setSettingsSection(section)
    setShowSettings(true)
    if (section === 'profile') void loadProfileStats()
  }

  const setPreferredTheme = (next: 'system' | 'light' | 'dark') => {
    setTheme(next)
    window.localStorage.setItem('codic-theme', next)
  }

  const setPreferredEffort = (next: 'low' | 'medium' | 'high') => {
    setReasoningEffort(next)
    window.localStorage.setItem('codic-reasoning-effort', next)
  }

  const setPreferredModel = (next: string) => {
    setModelId(next)
    window.localStorage.setItem('codic-model', next)
  }

  const setPreferredApprovalPolicy = (next: 'ask' | 'safe-reads' | 'full-access') => {
    setApprovalPolicy(next)
    window.localStorage.setItem('codic-approval-policy', next)
  }

  const openThreadMenuAt = (threadId: string, left: number, top: number) => {
    setThreadMenuSection('main')
    setThreadMenuAnchor({ left, top })
    setThreadActionMenuId(threadId)
  }

  const renderThreadActionMenu = (thread: ThreadSummary, archived = false) => (
    <div ref={threadActionMenuRef} className="task-context-menu" style={threadMenuAnchor ? { left: threadMenuAnchor.left, top: threadMenuAnchor.top } : undefined} role="menu" aria-label={`Actions for ${thread.title}`}>
        {threadMenuSection === 'main' ? <>
          <button role="menuitem" onClick={() => beginRenameThread(thread)}><Icon name="file" size={15} />Rename<kbd>Ctrl+Alt+R</kbd></button>
          <button role="menuitem" onClick={() => void toggleThreadPin(thread)}><Icon name="pin" size={15} />{thread.pinned ? 'Unpin' : 'Pin'}<kbd>Ctrl+Alt+P</kbd></button>
          <button role="menuitem" onClick={() => void forkThread(thread, 'side-chat')}><Icon name="plus" size={15} />New side chat<kbd>Ctrl+Alt+S</kbd></button>
          <button role="menuitem" onClick={() => setThreadMenuSection('fork')}><Icon name="branch" size={15} />Fork<Icon name="chevron" size={14} /></button>
          <button role="menuitem" onClick={() => void beginScheduleThread(thread)}><Icon name="calendar" size={15} />Add scheduled task…</button>
          <button role="menuitem" onClick={() => setThreadMenuSection('share')}><Icon name="share" size={15} />Share<Icon name="chevron" size={14} /></button>
          <button role="menuitem" onClick={() => setThreadMenuSection('copy')}><Icon name="copy" size={15} />Copy<Icon name="chevron" size={14} /></button>
          <div className="task-menu-divider" />
          <button role="menuitem" onClick={() => void openThreadInNewWindow(thread)}><Icon name="window" size={15} />Open in new window</button>
          <button role="menuitem" onClick={() => setThreadMenuSection('open-in')}><Icon name="arrow" size={15} />Open in<Icon name="chevron" size={14} /></button>
          <div className="task-menu-divider" />
          <button role="menuitem" onClick={() => void archiveThread(thread, !archived)}><Icon name="archive" size={15} />{archived ? 'Restore from archive' : 'Archive'}</button>
        </> : <>
          <button className="task-menu-back" role="menuitem" onClick={() => setThreadMenuSection('main')}><Icon name="back" size={15} />Back to task actions</button>
          <div className="task-menu-divider" />
          {threadMenuSection === 'copy' && <>
            <button role="menuitem" onClick={() => void copyThreadContent(thread, 'prompt')}><Icon name="copy" size={15} />Copy latest prompt</button>
            <button role="menuitem" onClick={() => void copyThreadContent(thread, 'transcript')}><Icon name="file" size={15} />Copy transcript</button>
          </>}
          {threadMenuSection === 'fork' && <>
            <button role="menuitem" onClick={() => void forkThread(thread, 'fork')}><Icon name="branch" size={15} />New task from this context</button>
            <button role="menuitem" onClick={() => void forkThread(thread, 'fork', true)}><Icon name="window" size={15} />Fork into a new window</button>
          </>}
          {threadMenuSection === 'share' && <>
            <p className="task-menu-note">Export a local Markdown transcript. Public share links are not available yet.</p>
            <button role="menuitem" onClick={() => void exportThread(thread)}><Icon name="share" size={15} />Export Markdown…</button>
            <button role="menuitem" onClick={() => void copyThreadContent(thread, 'transcript')}><Icon name="copy" size={15} />Copy shareable transcript</button>
          </>}
          {threadMenuSection === 'open-in' && <>
            <button role="menuitem" onClick={() => void openThreadInView(thread, 'assistant')}>Assistant</button>
            <button role="menuitem" onClick={() => void openThreadInView(thread, 'review')}>Review</button>
            <button role="menuitem" onClick={() => void openThreadInView(thread, 'terminal')}>Terminal</button>
            <button role="menuitem" onClick={() => void openThreadInView(thread, 'activity')}>Activity</button>
          </>}
        </>}
    </div>
  )

  const handleThreadContextMenu = (event: React.MouseEvent, threadId: string) => {
    if ((event.target as HTMLElement).closest('.task-context-menu')) return
    event.preventDefault()
    openThreadMenuAt(threadId, event.clientX || 12, event.clientY || 12)
  }

  const renderThreadRow = (thread: ThreadSummary, archived = false) => (
    <div key={thread.id} className="thread-list-item" onContextMenu={(event) => handleThreadContextMenu(event, thread.id)}>
      <button className={`thread-row${conversationId === thread.id ? ' selected' : ''}${archived ? ' thread-row-archived' : ''}`} onClick={() => void openThread(thread.id)} disabled={isStreaming} title={`${thread.title} · ${thread.lastTaskState || 'No run yet'}`}>
        <span className="thread-indicator" />
        <span>{thread.title}</span>
        {thread.pinned && <Icon name="pin" size={12} />}
      </button>
      <button className="thread-row-menu-button" onClick={(event) => {
        if (threadActionMenuId === thread.id) setThreadActionMenuId(null)
        else {
          const rect = event.currentTarget.getBoundingClientRect()
          openThreadMenuAt(thread.id, rect.right - 278, rect.bottom + 4)
        }
      }} disabled={isStreaming} aria-label={`More actions for ${thread.title}`} aria-haspopup="menu" aria-expanded={threadActionMenuId === thread.id}>
        <Icon name="more" size={16} />
      </button>
      {threadActionMenuId === thread.id && renderThreadActionMenu(thread, archived)}
    </div>
  )

  const renderRecentTaskRow = (project: WorkspaceInfo, thread: ThreadSummary) => (
    <div className="thread-list-item recent-task-item" key={`${project.path}:${thread.id}`} onContextMenu={(event) => handleThreadContextMenu(event, thread.id)}>
      <button className={`recent-task-row${conversationId === thread.id ? ' selected' : ''}`} onClick={() => void openThreadForProject(project, thread)} disabled={isStreaming} title={`${project.name} · ${thread.title}`}>{thread.title}</button>
      <button className="thread-row-menu-button" onClick={(event) => {
        if (threadActionMenuId === thread.id) setThreadActionMenuId(null)
        else {
          const rect = event.currentTarget.getBoundingClientRect()
          openThreadMenuAt(thread.id, rect.right - 278, rect.bottom + 4)
        }
      }} disabled={isStreaming} aria-label={`More actions for ${thread.title}`} aria-haspopup="menu" aria-expanded={threadActionMenuId === thread.id}><Icon name="more" size={16} /></button>
      {threadActionMenuId === thread.id && renderThreadActionMenu(thread)}
    </div>
  )

  shortcutActionsRef.current = { navigateBack, navigateForward, navigateView, openWorkspace, openTaskSearch, startNewTask }

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
          <button className="icon-button titlebar-action" onClick={() => openSettings('general')} title="Settings" aria-label="Settings"><Icon name="settings" size={16} /></button>
          <span className="window-divider" />
          <button className="window-control" onClick={() => window.codic.window.minimize()} aria-label="Minimize window">—</button>
          <button className="window-control" onClick={() => window.codic.window.toggleMaximize()} aria-label={isWindowMaximized ? 'Restore window' : 'Maximize window'} title={isWindowMaximized ? 'Restore' : 'Maximize'}><WindowSizeGlyph maximized={isWindowMaximized} /></button>
          <button className="window-control window-close" onClick={() => window.codic.window.close()} aria-label="Close window"><Icon name="close" size={15} /></button>
        </div>
      </header>

      <div className="menu-bar" data-navigation-revision={navigationRevision}>
        <div className="menu-bar-navigation">
          <button className="menu-nav-button" onClick={() => void navigateBack()} disabled={!canNavigateBack || isStreaming} title="Back" aria-label="Back"><Icon name="back" size={17} /></button>
          <button className="menu-nav-button" onClick={() => void navigateForward()} disabled={!canNavigateForward || isStreaming} title="Forward" aria-label="Forward"><Icon name="forward" size={17} /></button>
          <button className="menu-nav-button" onClick={() => setIsSidebarHidden((hidden) => !hidden)} aria-label={isSidebarHidden ? 'Show sidebar' : 'Hide sidebar'} aria-pressed={isSidebarHidden}><Icon name="panel" size={17} /></button>
        </div>
        <nav className="app-menu-list" ref={appMenuRef} aria-label="Application menu">
          {(['File', 'Edit', 'View', 'Help'] as MenuName[]).map((name) => <div key={name} className="app-menu-anchor">
            <button className={`app-menu-trigger${activeAppMenu === name ? ' active' : ''}`} onClick={(event) => toggleApplicationMenu(name, event.currentTarget)} aria-haspopup="menu" aria-expanded={activeAppMenu === name}>{name}</button>
            {activeAppMenu === name && <div className={`app-menu-panel menu-${name.toLowerCase()}`} style={appMenuPosition?.name === name ? { position: 'fixed', top: appMenuPosition.top, left: appMenuPosition.left, right: 'auto' } : undefined} role="menu" aria-label={`${name} menu`}>
              {name === 'File' && <>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.openBlank() }}><Icon name="window" size={15} />New window</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); startNewTask() }} disabled={isStreaming}><Icon name="plus" size={15} />New chat<kbd>Ctrl+N</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); startNewTask(true) }} disabled={isStreaming}><Icon name="lock" size={15} />New temporary chat<kbd>Ctrl+Shift+N</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void createProject() }}><Icon name="folder" size={15} />New project…</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void openWorkspace() }}><Icon name="folder" size={15} />Open folder…<kbd>Ctrl+O</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); window.codic.window.close() }}><Icon name="close" size={15} />Close window<kbd>Ctrl+W</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); if (hasSession) void handleSignOut(); else openAuth() }}><Icon name={hasSession ? 'close' : 'lock'} size={15} />{hasSession ? 'Log out' : 'Sign in to Codeva'}</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.app.quit() }}><Icon name="close" size={15} />Quit Codic<kbd>Ctrl+Q</kbd></button>
              </>}
              {name === 'Edit' && <>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('undo') }}><Icon name="back" size={15} />Undo<kbd>Ctrl+Z</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('redo') }}><Icon name="forward" size={15} />Redo<kbd>Ctrl+Y</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('cut') }}><Icon name="copy" size={15} />Cut<kbd>Ctrl+X</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('copy') }}><Icon name="copy" size={15} />Copy<kbd>Ctrl+C</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('paste') }}><Icon name="copy" size={15} />Paste<kbd>Ctrl+V</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('delete') }}><Icon name="trash" size={15} />Delete</button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void window.codic.window.editAction('select-all') }}><Icon name="copy" size={15} />Select all<kbd>Ctrl+A</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openSettings('general') }}><Icon name="settings" size={15} />Settings…<kbd>Ctrl+,</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); if (currentThreadSummary) void copyThreadContent(currentThreadSummary, 'prompt') }} disabled={!currentThreadSummary}><Icon name="copy" size={15} />Copy latest prompt</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); if (currentThreadSummary) void copyThreadContent(currentThreadSummary, 'transcript') }} disabled={!currentThreadSummary}><Icon name="file" size={15} />Copy transcript</button>
              </>}
              {name === 'View' && <>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); setIsSidebarHidden((hidden) => !hidden) }}><Icon name="panel" size={15} />{isSidebarHidden ? 'Show sidebar' : 'Hide sidebar'}<kbd>Ctrl+Shift+S</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); setIsRightPanelOpen((open) => !open) }}><Icon name="panel" size={15} />Toggle bottom panel<kbd>Ctrl+J</kbd></button>
                <button role="menuitemcheckbox" aria-checked={isPinnedSummaryVisible} onClick={() => { setActiveAppMenu(null); setIsPinnedSummaryVisible((visible) => !visible) }}><Icon name="pin" size={15} />Toggle pinned summary</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); setIsRightPanelOpen(true); navigateView('terminal') }}><Icon name="terminal" size={15} />Open terminal<kbd>Ctrl+`</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); toggleNavigationPanel() }}>{isNavigationHidden ? 'Show navigation panel' : 'Toggle navigation panel'}<kbd>Ctrl+Shift+E</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); switchChatAndTabs() }}>Switch between chat and tabs<kbd>Alt+Ctrl+B</kbd></button>
                <div className="task-menu-divider" />
                <div className="app-menu-submenu-anchor" onMouseEnter={() => setBrowserSubmenuOpen(true)} onMouseLeave={() => setBrowserSubmenuOpen(false)}>
                  <button role="menuitem" aria-haspopup="menu" aria-expanded={browserSubmenuOpen} onFocus={() => setBrowserSubmenuOpen(true)} onClick={() => setBrowserSubmenuOpen((open) => !open)}><Icon name="window" size={15} />Browser<Icon name="chevron" size={14} /></button>
                  {browserSubmenuOpen && <div className="app-menu-panel app-menu-submenu" role="menu" aria-label="Browser menu">
                    <button role="menuitem" onClick={() => void openCodicBrowser()}><Icon name="window" size={15} />Open browser</button>
                    <button role="menuitem" onClick={() => void window.codic.window.browserAction('back')}><Icon name="back" size={15} />Back in browser</button>
                    <button role="menuitem" onClick={() => void window.codic.window.browserAction('forward')}><Icon name="forward" size={15} />Forward in browser</button>
                    <button role="menuitem" onClick={() => void window.codic.window.browserAction('reload')}><Icon name="refresh" size={15} />Reload page</button>
                    <button role="menuitem" onClick={() => void window.codic.window.browserAction('external')}><Icon name="arrow" size={15} />Open in default browser</button>
                    <div className="task-menu-divider" />
                    <button role="menuitem" onClick={() => void window.codic.window.browserAction('close')}><Icon name="close" size={15} />Close browser</button>
                  </div>}
                </div>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openTaskSearch() }}><Icon name="search" size={15} />Find<kbd>Ctrl+F</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void navigateBack() }} disabled={!canNavigateBack || isStreaming}><Icon name="back" size={15} />Back<kbd>Ctrl+[</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void navigateForward() }} disabled={!canNavigateForward || isStreaming}><Icon name="forward" size={15} />Forward<kbd>Ctrl+]</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); cycleSidebarView(-1) }}><Icon name="back" size={15} />Previous sidebar item<kbd>Alt+Ctrl+[</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); cycleSidebarView(1) }}><Icon name="forward" size={15} />Next sidebar item<kbd>Alt+Ctrl+]</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); cyclePanelTab(-1) }}><Icon name="back" size={15} />Previous tab<kbd>Ctrl+Shift+[</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); cyclePanelTab(1) }}><Icon name="forward" size={15} />Next tab<kbd>Ctrl+Shift+]</kbd></button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); setAppZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 10) / 10)) }}><Icon name="plus" size={15} />Zoom in<kbd>Ctrl+Shift+=</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); setAppZoom((value) => Math.max(0.75, Math.round((value - 0.1) * 10) / 10)) }}><Icon name="minus" size={15} />Zoom out<kbd>Ctrl+-</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); setAppZoom(1) }}>Actual size<kbd>Ctrl+0</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); window.codic.window.toggleFullScreen() }}>Toggle full screen<kbd>F11</kbd></button>
              </>}
              {name === 'Help' && <>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void openWebsite('/help') }}><Icon name="file" size={15} />Documentation</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openSettings('shortcuts') }}><Icon name="keyboard" size={15} />Keyboard shortcuts<kbd>Ctrl+/</kbd></button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openSettings('updates') }}><Icon name="spark" size={15} />What’s new</button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openSettings('troubleshooting') }}><Icon name="warning" size={15} />Troubleshooting</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void openWebsite('/status') }}><Icon name="activity" size={15} />System status</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void openWebsite('/contact') }}><Icon name="share" size={15} />Send feedback</button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void openTaskManager() }}><Icon name="activity" size={15} />Task manager</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); void togglePerformanceTrace() }}><Icon name="activity" size={15} />{performanceTraceRunning ? 'Stop performance trace…' : 'Start performance trace'}</button>
                <div className="task-menu-divider" />
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openSettings('updates'); void checkForUpdates() }}><Icon name="refresh" size={15} />Check for updates…</button>
                <button role="menuitem" onClick={() => { setActiveAppMenu(null); openSettings('about') }}><Icon name="activity" size={15} />About Codic</button>
              </>}
            </div>}
          </div>)}
        </nav>
      </div>

      {updateCheck?.available && !updateNoticeDismissed && <div className="update-announcement" role="status">
        <Icon name="refresh" size={16} />
        <span>{updateCheck.message}</span>
        {updateCheck.phase === 'downloading' && <span className="update-announcement-progress">{Math.round(updateCheck.percent || 0)}%</span>}
        {updateCheck.phase === 'downloaded' ? <button className="primary-button" onClick={() => void installCodicUpdate()}>Restart and install<Icon name="arrow" size={14} /></button> : <button className="quiet-button" onClick={() => openSettings('updates')}>Review update</button>}
        <button className="icon-button compact" onClick={() => setUpdateNoticeDismissed(true)} aria-label="Dismiss update notice"><Icon name="close" size={14} /></button>
      </div>}

      {isPinnedSummaryVisible && <aside className="pinned-summary-popover" role="dialog" aria-label="Pinned task summary">
        <div className="pinned-summary-heading"><div><span className="eyebrow">PINNED SUMMARY</span><strong>{currentThreadSummary?.title || workspace?.name || 'No active project'}</strong></div><button className="icon-button compact" onClick={() => setIsPinnedSummaryVisible(false)} aria-label="Close pinned summary"><Icon name="close" size={14} /></button></div>
        <dl><div><dt>Project</dt><dd>{workspace?.name || 'Choose a project'}</dd></div><div><dt>Task state</dt><dd>{isStreaming ? 'Running' : currentThreadSummary?.lastTaskState || (isTemporaryChat ? 'Temporary chat' : 'Ready')}</dd></div><div><dt>Account</dt><dd>{hasSession ? accountPlan : isLocalPreview ? 'Local preview' : 'Local mode'}</dd></div></dl>
        {currentThreadSummary && <button className="quiet-button" onClick={() => void toggleThreadPin(currentThreadSummary)}><Icon name="pin" size={14} />{currentThreadSummary.pinned ? 'Unpin this task' : 'Pin this task'}</button>}
      </aside>}

      <div className={`app-layout${isSidebarHidden ? ' sidebar-hidden' : ''}${isNavigationHidden ? ' navigation-hidden' : ''}`}>
        <nav className="nav-rail" aria-label="Main navigation">
          <button className="nav-rail-brand" onClick={() => { navigateView('assistant'); setIsRightPanelOpen(false) }} aria-label="Codic home" title="Codic"><Logo small /></button>
          <div className="nav-rail-primary">
            <button className={`nav-rail-item${view === 'assistant' ? ' active' : ''}`} onClick={() => { navigateView('assistant'); setIsRightPanelOpen(false) }} aria-label="Home" title="Home"><Icon name="home" size={20} /></button>
            <button className={`nav-rail-item${!isSidebarHidden ? ' active' : ''}`} onClick={() => setIsSidebarHidden((hidden) => !hidden)} aria-label="Projects and tasks" title="Projects and tasks" aria-pressed={!isSidebarHidden}><Icon name="folder" size={20} /></button>
            <button className={`nav-rail-item${view === 'activity' ? ' active' : ''}`} onClick={() => { setIsRightPanelOpen(true); navigateView('activity') }} aria-label="Task history" title="Task history"><Icon name="history" size={20} /></button>
            <button className={`nav-rail-item${view === 'review' ? ' active' : ''}`} onClick={() => { if (!workspace) { void openWorkspace(); return } setIsRightPanelOpen(true); navigateView('review') }} aria-label="Code review" title="Code review"><Icon name="branch" size={20} /></button>
            <button className={`nav-rail-item${view === 'terminal' ? ' active' : ''}`} onClick={() => { if (!workspace) { void openWorkspace(); return } setIsRightPanelOpen(true); navigateView('terminal') }} aria-label="Terminal" title="Terminal"><Icon name="terminal" size={20} /></button>
          </div>
          <div className="nav-rail-divider" />
          <div className="nav-rail-more-anchor" ref={railMoreRef}>
            <button className={`nav-rail-item${railMoreOpen ? ' active' : ''}`} onClick={() => setRailMoreOpen((open) => !open)} aria-label="More navigation" title="More" aria-haspopup="menu" aria-expanded={railMoreOpen}><Icon name="more" size={20} /></button>
            {railMoreOpen && <div className="nav-rail-popover" role="menu" aria-label="More navigation">
              <button role="menuitem" onClick={() => { setRailMoreOpen(false); void openWorkspace() }}><Icon name="folder" size={16} />Open project…</button>
              <button role="menuitem" onClick={() => { setRailMoreOpen(false); openTaskSearch() }}><Icon name="search" size={16} />Find task</button>
              <button role="menuitem" onClick={() => { setRailMoreOpen(false); openSettings('general') }}><Icon name="settings" size={16} />Settings</button>
            </div>}
          </div>
          <div className="nav-rail-spacer" />
          <div className="profile-menu-anchor nav-rail-profile" ref={profileMenuRef}>
            <button className="profile-trigger" onClick={() => setProfileMenuOpen((open) => !open)} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={profileMenuOpen} title={hasSession ? userEmail : 'Account'}>
              <span className="account-avatar">{hasSession ? userEmail.slice(0, 1).toUpperCase() : <Icon name="user" size={15} />}</span>
            </button>
            {profileMenuOpen && <div className="profile-menu nav-rail-profile-menu" role="menu" aria-label="Account menu">
              <div className="profile-menu-identity"><span className="account-avatar">{hasSession ? userEmail.slice(0, 1).toUpperCase() : <Icon name="user" size={15} />}</span><div><strong>{hasSession ? userEmail.split('@')[0] : 'Local profile'}</strong><small>{hasSession ? `${accountPlan} plan` : isLocalPreview ? 'Local preview · AI sign-in needed' : 'Not signed in'}</small></div></div>
              <button role="menuitem" onClick={() => openSettings('profile')}><Icon name="user" size={16} />Profile and account<Icon name="chevron" size={14} /></button>
              <button role="menuitem" onClick={() => openSettings('profile')}><Icon name="activity" size={16} />Usage and limits<Icon name="chevron" size={14} /></button>
              <button role="menuitem" onClick={() => openSettings('appearance')}><Icon name="sun" size={16} />Personalization<Icon name="chevron" size={14} /></button>
              <button role="menuitem" onClick={() => openSettings('general')}><Icon name="settings" size={16} />Settings<kbd>Ctrl+,</kbd></button>
              <div className="profile-menu-divider" />
              {hasSession ? <button className="profile-menu-danger" role="menuitem" onClick={() => { setProfileMenuOpen(false); void handleSignOut() }}><Icon name="close" size={16} />Sign out</button> : <button role="menuitem" onClick={() => { setProfileMenuOpen(false); openAuth() }}><Icon name="lock" size={16} />Connect Codeva account</button>}
            </div>}
          </div>
        </nav>
        {!isSidebarHidden && window.matchMedia('(max-width: 640px)').matches && <button className="sidebar-mobile-backdrop" onClick={() => setIsSidebarHidden(true)} aria-label="Close navigation sidebar" />}
        <aside className="sidebar">
          <div className="sidebar-workspace">
            <button className="workspace-switcher" onClick={openWorkspace}>
              <span className="workspace-avatar"><Logo small /></span>
              <span className="workspace-switcher-copy"><strong>{workspace?.name || 'Open a project'}</strong><small>{workspace ? (isLocalPreview && !hasSession ? 'Local preview workspace' : 'Local workspace') : 'Choose a folder to begin'}</small></span>
              <Icon name="chevron" size={16} />
            </button>
          </div>
          <div className="sidebar-actions">
            <button className="side-action" onClick={() => startNewTask()} disabled={!workspace || isStreaming}><Icon name="plus" /><span>New task</span><kbd>Ctrl&nbsp;N</kbd></button>
            <button className="side-action" onClick={openTaskSearch} aria-expanded={sidebarSearchOpen}><Icon name="search" /><span>Find task</span><kbd>Ctrl&nbsp;F</kbd></button>
            {sidebarSearchOpen && <div className="sidebar-search-box"><input ref={sidebarSearchRef} value={sidebarSearch} onChange={(event) => setSidebarSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setSidebarSearchOpen(false); setSidebarSearch('') } }} placeholder="Find by task name" aria-label="Find tasks by name" /><button className="icon-button compact" onClick={() => { setSidebarSearchOpen(false); setSidebarSearch('') }} aria-label="Clear task search"><Icon name="close" size={14} /></button></div>}
            <button className="side-action" onClick={() => navigateView('activity')}><Icon name="history" /><span>Task history</span></button>
          </div>
          <div className="sidebar-content-scroll">
          <div className="sidebar-section-label"><span>PROJECTS</span><button className="icon-button compact" onClick={() => void openWorkspace()} aria-label="Open project"><Icon name="plus" size={15} /></button></div>
          {visibleProjectGroups.length ? <div className="project-groups">
            {(showAllProjects ? visibleProjectGroups : visibleProjectGroups.slice(0, 8)).map(({ project, threads: projectTasks }) => {
              const expanded = expandedProjectPaths[project.path] ?? workspace?.path === project.path
              return <section className="project-group" key={project.path}>
                <div className={`project-group-heading${workspace?.path === project.path ? ' active' : ''}`}>
                  <button className="project-group-open" onClick={() => void openSavedProject(project.path)} disabled={isStreaming} title={project.path}><Icon name="folder" size={17} /><span>{project.name}</span></button>
                  <button className="project-group-toggle" onClick={() => setExpandedProjectPaths((current) => ({ ...current, [project.path]: !expanded }))} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${project.name} tasks`} aria-expanded={expanded}><Icon name="chevron" size={14} /></button>
                </div>
                {expanded && <div className="project-group-tasks">{projectTasks.slice(0, 4).map((thread) => <button className={`project-task-row${conversationId === thread.id ? ' selected' : ''}`} key={thread.id} onClick={() => void openThreadForProject(project, thread)} disabled={isStreaming} title={thread.title}>{thread.title}</button>)}{projectTasks.length > 4 && <button className="project-task-more" onClick={() => { setSidebarSearch(''); setShowAllRecentTasks(true) }}>Show all in recents</button>}</div>}
              </section>
            })}
            {visibleProjectGroups.length > 8 && <button className="sidebar-show-more" onClick={() => setShowAllProjects((show) => !show)}>{showAllProjects ? 'Show less' : 'Show more projects'}</button>}
          </div> : <button className="project-empty" onClick={() => void openWorkspace()}><Icon name="folder" size={16} /><span>{sidebarSearch.trim() ? 'No projects or tasks match your search.' : 'Open a local folder'}</span></button>}
          <div className="sidebar-section-label thread-label"><span>RECENTS</span><button className="icon-button compact" onClick={() => navigateView('activity')} aria-label="View task history"><Icon name="history" size={15} /></button></div>
          {recentProjectTasks.length ? (showAllRecentTasks ? recentProjectTasks.slice(0, 40) : recentProjectTasks.slice(0, 12)).map(({ project, thread }) => renderRecentTaskRow(project, thread)) : <div className="empty-thread-note">{sidebarSearch.trim() ? 'No task names match your search.' : 'Your tasks will appear here.'}</div>}
          {recentProjectTasks.length > 12 && <button className="sidebar-show-more" onClick={() => setShowAllRecentTasks((show) => !show)}>{showAllRecentTasks ? 'Show fewer recents' : 'Show more recents'}</button>}
          {archivedThreads.length > 0 && <>
            <button className="archived-toggle" onClick={() => setShowArchivedThreads((shown) => !shown)} aria-expanded={showArchivedThreads}><Icon name="archive" size={13} /><span>Archived tasks</span><span>{archivedThreads.length}</span></button>
            {showArchivedThreads && visibleArchivedThreads.slice(0, 20).map((thread) => renderThreadRow(thread, true))}
          </>}
          {workspace && <>
            <button className="archived-toggle scheduled-toggle" onClick={() => setShowScheduledTasks((shown) => !shown)} aria-expanded={showScheduledTasks}><Icon name="calendar" size={13} /><span>Scheduled tasks</span><span>{scheduledTasks.filter((task) => task.enabled).length}</span></button>
            {showScheduledTasks && scheduledTasks.slice(0, 20).map((task) => {
              const completed = task.recurrence === 'once' && Boolean(task.lastRunAt)
              return <div className={`scheduled-task-row${task.enabled ? '' : ' schedule-disabled'}`} key={task.id}>
              <div className="scheduled-task-copy"><strong title={task.title}>{task.title}</strong><small>{task.enabled ? `${task.recurrence === 'once' ? 'Once' : task.recurrence === 'daily' ? 'Daily' : 'Weekly'} · ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(task.nextRunAt))}` : completed && task.lastRunAt ? `Last run · ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(task.lastRunAt))}` : 'Paused'}</small></div>
              <button className="schedule-action" onClick={() => void setScheduleEnabled(task, !task.enabled)} disabled={completed} title={completed ? 'This one-time task has already run' : task.enabled ? 'Pause schedule' : 'Resume schedule'} aria-label={completed ? `${task.title} completed` : task.enabled ? `Pause ${task.title}` : `Resume ${task.title}`}><Icon name={task.enabled ? 'pause' : 'play'} size={13} /></button>
              <button className="schedule-action schedule-delete" onClick={() => void removeScheduledTask(task)} title="Delete schedule" aria-label={`Delete ${task.title}`}><Icon name="trash" size={13} /></button>
            </div>})}
          </>}
          </div>
        </aside>

        <main className="main-content">
          <div className="main-toolbar">
            <div className="breadcrumbs"><span className="breadcrumb-muted">{workspace ? workspace.name : 'Codic'}</span><span className="breadcrumb-separator">/</span><strong>{view === 'assistant' ? 'Assistant' : view === 'review' ? 'Review' : view === 'terminal' ? 'Terminal' : 'Activity'}</strong>{isTemporaryChat && <span className="temporary-chat-badge">Temporary · not saved</span>}</div>
            <div className="toolbar-right">
              <button className="toolbar-chip" onClick={() => setIsRightPanelOpen((open) => !open)}><Icon name="branch" size={15} /><span>Workspace</span><Icon name="chevron" size={14} /></button>
              <button className="icon-button toolbar-icon" onClick={openWorkspace} title="Open folder" aria-label="Open folder"><Icon name="folder" size={16} /></button>
            </div>
          </div>

          {error && <div className="notice-bar" role="alert"><Icon name="warning" size={16} /><span>{error}</span><button className="icon-button compact" onClick={() => setError('')} aria-label="Dismiss notification"><Icon name="close" size={15} /></button></div>}
          {historyNotice && <div className="notice-bar notice-info" role="status"><Icon name="history" size={16} /><span>{historyNotice}</span><button className="icon-button compact" onClick={() => setHistoryNotice('')} aria-label="Dismiss task history notice"><Icon name="close" size={15} /></button></div>}

          {!workspace ? (
            <section className="welcome-screen welcome-chat-empty">
              <div className="composer-wrap welcome-composer-wrap">
                <ProjectPicker className="composer-project-selector" projects={projects} onSelect={(project) => void openSavedProject(project.path)} onOpenFolder={() => void openWorkspace()} onNewProject={() => void createProject()} />
                <div className="composer">
                  <textarea ref={composerRef} value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (composer.trim()) void openWorkspace() } }} placeholder="Ask Codic to explain, plan, or build something…" rows={2} aria-label="Message Codic" />
                  <div className="composer-controls">
                    <div className="composer-left">
                      <button className="composer-tool composer-add-context" onClick={() => void openWorkspace()} title="Choose a project folder" aria-label="Choose a project folder"><Icon name="plus" size={19} /></button>
                      <div className="approval-picker-anchor">
                        <button ref={approvalTriggerRef} className={`approval-picker-trigger${approvalPolicy === 'safe-reads' ? ' approval-picker-safe' : approvalPolicy === 'full-access' ? ' approval-picker-full' : ''}`} onClick={() => { setEffortMenuOpen(false); setApprovalMenuPosition(null); setApprovalMenuOpen((open) => !open) }} aria-label="Action approval mode" aria-haspopup="menu" aria-expanded={approvalMenuOpen}><Icon name={approvalPolicy === 'ask' ? 'lock' : approvalPolicy === 'full-access' ? 'warning' : 'checkCircle'} size={14} /><span>{approvalPolicy === 'ask' ? 'Ask for approval' : approvalPolicy === 'safe-reads' ? 'Approve for me' : 'Full access'}</span><Icon name="chevron" size={13} /></button>
                        {approvalMenuOpen && approvalMenuPosition ? createPortal(<div ref={approvalMenuRef} className="approval-picker-popover" role="menu" tabIndex={-1} onKeyDown={navigateMenuFocus} aria-label="Action approval mode" style={approvalMenuPosition}>
                          <p className="approval-picker-heading">How should Codic actions be approved?</p>
                          <button role="menuitemradio" aria-checked={approvalPolicy === 'ask'} className={`approval-picker-option${approvalPolicy === 'ask' ? ' selected' : ''}`} onClick={() => { setPreferredApprovalPolicy('ask'); setApprovalMenuOpen(false) }}><span className="approval-option-icon"><Icon name="lock" size={17} /></span><span><strong>Ask for approval</strong><small>Ask before shell commands and file access outside this project.</small></span>{approvalPolicy === 'ask' && <Icon name="check" size={16} />}</button>
                          <button role="menuitemradio" aria-checked={approvalPolicy === 'safe-reads'} className={`approval-picker-option${approvalPolicy === 'safe-reads' ? ' selected' : ''}`} onClick={() => { setPreferredApprovalPolicy('safe-reads'); setApprovalMenuOpen(false) }}><span className="approval-option-icon"><Icon name="checkCircle" size={17} /></span><span><strong>Approve for me</strong><small>Allow exact read-only shell commands. Ask before other shell or out-of-project actions.</small></span>{approvalPolicy === 'safe-reads' && <Icon name="check" size={16} />}</button>
                          <button role="menuitemradio" aria-checked={approvalPolicy === 'full-access'} className={`approval-picker-option approval-picker-full-option${approvalPolicy === 'full-access' ? ' selected' : ''}`} onClick={() => { setPreferredApprovalPolicy('full-access'); setApprovalMenuOpen(false) }}><span className="approval-option-icon"><Icon name="warning" size={17} /></span><span><strong>Full access</strong><small>Run shell and network actions and access files anywhere on this computer without asking.</small></span>{approvalPolicy === 'full-access' && <Icon name="check" size={16} />}</button>
                        </div>, document.body) : null}
                      </div>
                    </div>
                    <div className="composer-right composer-right-controls">
                      <ModelPicker models={models} value={modelId} onChange={setPreferredModel} disabled={!hasSession} />
                      <div className="effort-picker-anchor">
                        <button ref={effortTriggerRef} className="effort-picker-trigger" onClick={() => { setApprovalMenuOpen(false); setEffortMenuPosition(null); setEffortMenuOpen((open) => !open) }} aria-label="Reasoning effort" aria-haspopup="menu" aria-expanded={effortMenuOpen}><span className={`effort-status effort-${reasoningEffort}`} /><span>{reasoningEffort[0]!.toUpperCase() + reasoningEffort.slice(1)} effort</span><Icon name="chevron" size={13} /></button>
                        {effortMenuOpen && effortMenuPosition ? createPortal(<div ref={effortMenuRef} className="effort-picker-popover" role="menu" tabIndex={-1} onKeyDown={navigateMenuFocus} aria-label="Reasoning effort" style={effortMenuPosition}>
                          <p className="effort-picker-heading">Reasoning effort</p>
                          {(['low', 'medium', 'high'] as const).map((effort) => <button key={effort} role="menuitemradio" aria-checked={reasoningEffort === effort} className={`effort-picker-option${reasoningEffort === effort ? ' selected' : ''}`} onClick={() => { setPreferredEffort(effort); setEffortMenuOpen(false) }}><span className={`effort-status effort-${effort}`} /><span><strong>{effort[0]!.toUpperCase() + effort.slice(1)}</strong><small>{effort === 'low' ? 'Focused budget for quick questions.' : effort === 'medium' ? 'Balanced for everyday coding work.' : 'Larger budget for complex tasks.'}</small></span>{reasoningEffort === effort && <Icon name="check" size={15} />}</button>)}
                        </div>, document.body) : null}
                      </div>
                      <button className="send-button" onClick={() => void openWorkspace()} disabled={!composer.trim()} aria-label="Choose a project to send this prompt"><Icon name="send" size={17} /></button>
                    </div>
                  </div>
                </div>
                <p className="privacy-caption"><Icon name="lock" size={12} />Your project files stay on this device. Choose a folder to begin.</p>
              </div>
            </section>
          ) : (
            <div className={`workspace-content${isRightPanelOpen ? '' : ' panel-collapsed'}`}>
              <section className={`conversation-column${messages.length === 0 ? ' conversation-column-empty' : ''}`}>
                {approval && <section className="approval-card" aria-labelledby="approval-title">
                  <div className="approval-card-heading"><span className="approval-icon"><Icon name="lock" size={16} /></span><div><p className="eyebrow">ACTION NEEDS YOUR APPROVAL{approvals.length > 1 ? ` · ${approvals.length} PENDING` : ''}</p><h2 id="approval-title">{approval.toolName}</h2></div></div>
                  <p className="approval-summary">{approval.summary}</p>
                  {typeof approval.input.command === 'string' && <pre className="approval-command"><code>{approval.input.command}</code></pre>}
                  {approval.unsandboxed && <p className="approval-warning"><Icon name="warning" size={14} />This action reaches outside the selected project or runs a host command. Review its path and command before allowing it.</p>}
                  <div className="approval-actions"><button className="secondary-button" onClick={() => void decideApproval('deny')}>Deny</button><button className="primary-button" onClick={() => void decideApproval('allow')}>Allow once<Icon name="arrow" size={15} /></button></div>
                </section>}
                {messages.length === 0 ? <div className="empty-conversation-space" aria-hidden="true" /> : (
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
                  <ProjectPicker className="composer-project-selector composer-project-selector-active" projects={projects} value={workspace.path} disabled={isStreaming} onSelect={(project) => void openSavedProject(project.path)} onOpenFolder={() => void openWorkspace()} onNewProject={() => void createProject()} />
                  <div className="composer">
                    <textarea ref={composerRef} value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Ask Codic to explain, plan, or change something…" rows={2} aria-label="Message Codic" />
                    <div className="composer-controls">
                      <div className="composer-left">
                        <button className="composer-tool" onClick={openWorkspace} title="Open another folder"><Icon name="paperclip" size={16} /><span>Add context</span></button>
                        <div className="approval-picker-anchor">
                          <button ref={approvalTriggerRef} className={`approval-picker-trigger${approvalPolicy === 'safe-reads' ? ' approval-picker-safe' : approvalPolicy === 'full-access' ? ' approval-picker-full' : ''}`} onClick={() => { setEffortMenuOpen(false); setApprovalMenuPosition(null); setApprovalMenuOpen((open) => !open) }} aria-label="Action approval mode" aria-haspopup="menu" aria-expanded={approvalMenuOpen}>
                            <Icon name={approvalPolicy === 'ask' ? 'lock' : approvalPolicy === 'full-access' ? 'warning' : 'checkCircle'} size={14} /><span>{approvalPolicy === 'ask' ? 'Ask for approval' : approvalPolicy === 'safe-reads' ? 'Approve for me' : 'Full access'}</span><Icon name="chevron" size={13} />
                          </button>
                          {approvalMenuOpen && approvalMenuPosition ? createPortal(<div ref={approvalMenuRef} className="approval-picker-popover" role="menu" tabIndex={-1} onKeyDown={navigateMenuFocus} aria-label="Action approval mode" style={approvalMenuPosition}>
                            <p className="approval-picker-heading">How should Codic actions be approved?</p>
                            <button role="menuitemradio" aria-checked={approvalPolicy === 'ask'} className={`approval-picker-option${approvalPolicy === 'ask' ? ' selected' : ''}`} onClick={() => { setPreferredApprovalPolicy('ask'); setApprovalMenuOpen(false) }}><span className="approval-option-icon"><Icon name="lock" size={17} /></span><span><strong>Ask for approval</strong><small>Ask before shell commands and file access outside this project.</small></span>{approvalPolicy === 'ask' && <Icon name="check" size={16} />}</button>
                            <button role="menuitemradio" aria-checked={approvalPolicy === 'safe-reads'} className={`approval-picker-option${approvalPolicy === 'safe-reads' ? ' selected' : ''}`} onClick={() => { setPreferredApprovalPolicy('safe-reads'); setApprovalMenuOpen(false) }}><span className="approval-option-icon"><Icon name="checkCircle" size={17} /></span><span><strong>Approve for me</strong><small>Allow exact read-only shell commands. Ask before other shell or out-of-project actions.</small></span>{approvalPolicy === 'safe-reads' && <Icon name="check" size={16} />}</button>
                            <button role="menuitemradio" aria-checked={approvalPolicy === 'full-access'} className={`approval-picker-option approval-picker-full-option${approvalPolicy === 'full-access' ? ' selected' : ''}`} onClick={() => { setPreferredApprovalPolicy('full-access'); setApprovalMenuOpen(false) }}><span className="approval-option-icon"><Icon name="warning" size={17} /></span><span><strong>Full access</strong><small>Run shell and network actions and access files anywhere on this computer without asking.</small></span>{approvalPolicy === 'full-access' && <Icon name="check" size={16} />}</button>
                          </div>, document.body) : null}
                        </div>
                      </div>
                      <div className="composer-right composer-right-controls">
                        <span className="composer-hint">Enter to send · Shift + Enter for a new line</span>
                        <ModelPicker models={models} value={modelId} onChange={setPreferredModel} disabled={!hasSession} />
                        <div className="effort-picker-anchor">
                          <button ref={effortTriggerRef} className="effort-picker-trigger" onClick={() => { setApprovalMenuOpen(false); setEffortMenuPosition(null); setEffortMenuOpen((open) => !open) }} aria-label="Reasoning effort" aria-haspopup="menu" aria-expanded={effortMenuOpen}><span className={`effort-status effort-${reasoningEffort}`} /><span>{reasoningEffort[0]!.toUpperCase() + reasoningEffort.slice(1)} effort</span><Icon name="chevron" size={13} /></button>
                        {effortMenuOpen && effortMenuPosition ? createPortal(<div ref={effortMenuRef} className="effort-picker-popover" role="menu" tabIndex={-1} onKeyDown={navigateMenuFocus} aria-label="Reasoning effort" style={effortMenuPosition}>
                            <p className="effort-picker-heading">Reasoning effort</p>
                            {(['low', 'medium', 'high'] as const).map((effort) => <button key={effort} role="menuitemradio" aria-checked={reasoningEffort === effort} className={`effort-picker-option${reasoningEffort === effort ? ' selected' : ''}`} onClick={() => { setPreferredEffort(effort); setEffortMenuOpen(false) }}><span className={`effort-status effort-${effort}`} /><span><strong>{effort[0]!.toUpperCase() + effort.slice(1)}</strong><small>{effort === 'low' ? 'Focused budget for quick questions.' : effort === 'medium' ? 'Balanced for everyday coding work.' : 'Larger budget for complex tasks.'}</small></span>{reasoningEffort === effort && <Icon name="check" size={15} />}</button>)}
                          </div>, document.body) : null}
                        </div>
                        {isStreaming ? <button className="send-button stop-button" onClick={() => void stopRun()} aria-label="Stop task"><Icon name="stop" size={17} /></button> : <button className="send-button" onClick={() => void sendPrompt()} disabled={!composer.trim()} aria-label="Send message"><Icon name="send" size={16} /></button>}
                      </div>
                    </div>
                  </div>
                  <p className="privacy-caption"><Icon name="lock" size={12} />{isTemporaryChat ? 'This temporary chat is not saved in local task history.' : 'Only the context needed for your request is sent to Codeva.'}</p>
                </div>
                {messages.length === 0 && <div className="empty-conversation-space" aria-hidden="true" />}
              </section>

              {isRightPanelOpen && <aside className="detail-panel">
                <div className="detail-panel-heading"><div><span className="eyebrow">PROJECT</span><h2>{workspace.name}</h2></div><button className="icon-button compact panel-hide" onClick={() => setIsRightPanelOpen(false)} aria-label="Hide project panel"><Icon name="close" size={15} /></button></div>
                <div className="panel-tabs" role="tablist" aria-label="Project views">
                  {(['review', 'terminal', 'activity'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => navigateView(item)} role="tab" aria-selected={view === item}>{item === 'review' ? 'Review' : item === 'terminal' ? 'Terminal' : 'Activity'}{item === 'activity' && activities.length > 0 && <span className="tab-count">{activities.length}</span>}</button>)}
                </div>
                <div className="panel-content">
                  {view === 'review' && <DiffReviewPanel workspace={workspace} taskId={lastTaskId} taskRunning={isStreaming} refreshToken={checkpointRevision} />}
                  <div className="panel-section" hidden={view !== 'terminal'}><TerminalPanel workspace={workspace} /></div>
                  {view === 'activity' && <div className="activity-list">{activities.length ? activities.map((activity) => <div key={activity.id} className={`activity-item activity-${activity.status}`}><span className="activity-icon">{activity.status === 'done' ? <Icon name="check" size={14} /> : activity.status === 'error' ? <Icon name="warning" size={14} /> : activity.status === 'waiting' ? <Icon name="lock" size={14} /> : <span className="activity-spinner" />}</span><div><strong>{activity.title}</strong><p>{activity.detail}</p></div></div>) : <div className="panel-empty"><div className="panel-empty-icon"><Icon name="activity" size={19} /></div><strong>No task activity yet</strong><p>Start a task to see progress and reviewable actions.</p></div>}</div>}
                </div>
                <div className="panel-bottom"><div className="panel-bottom-row"><span className="panel-bottom-label">WORKSPACE</span><span className="panel-bottom-value"><span className="tiny-dot" />Local</span></div><div className="panel-bottom-row"><span className="panel-bottom-label">ACCOUNT</span><span className="panel-bottom-value">{hasSession ? accountPlan : isLocalPreview ? 'Local preview' : 'Not connected'}</span></div>{limits && <><div className="panel-bottom-row"><span className="panel-bottom-label">REQUESTS / HOUR</span><span className="panel-bottom-value">{limits.requestsPerHour.toLocaleString()}</span></div><div className="panel-bottom-row"><span className="panel-bottom-label">MONTHLY TOKENS</span><span className="panel-bottom-value">{limits.monthlyTokens.remaining === null ? 'Unlimited' : `${Math.max(0, limits.monthlyTokens.remaining).toLocaleString()} left`}</span></div></>}</div>
              </aside>}
            </div>
          )}
        </main>
      </div>

      {isTaskManagerOpen && taskManagerData && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsTaskManagerOpen(false) }}>
        <section className="task-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="task-manager-title">
          <header className="settings-dialog-header"><div><p className="eyebrow">LOCAL DIAGNOSTICS</p><h2 id="task-manager-title">Task Manager</h2></div><button className="icon-button" onClick={() => setIsTaskManagerOpen(false)} aria-label="Close Task Manager"><Icon name="close" /></button></header>
          <p className="task-manager-intro">Live resource snapshot for Codic and its renderer processes. This information stays on this device.</p>
          <div className="task-manager-stats"><div><span>Processes</span><strong>{taskManagerData.processCount}</strong></div><div><span>Memory in use</span><strong>{taskManagerData.memoryMb.toFixed(1)} MB</strong></div><div><span>Version</span><strong>{taskManagerData.version}</strong></div><div><span>Platform</span><strong>{taskManagerData.platform}</strong></div></div>
          <div className="task-manager-table-wrap"><table className="task-manager-table"><thead><tr><th>Process</th><th>Type</th><th>CPU</th><th>Memory</th></tr></thead><tbody>{taskManagerData.processes.map((process) => <tr key={process.pid}><td>{process.name}</td><td>{process.type}</td><td>{process.cpuPercent.toFixed(1)}%</td><td>{process.memoryMb.toFixed(1)} MB</td></tr>)}</tbody></table></div>
          <footer className="task-manager-footer"><span>CPU values are measured since the previous snapshot.</span><button className="secondary-button" onClick={() => void openTaskManager()}><Icon name="refresh" size={14} />Refresh</button></footer>
        </section>
      </div>}

      {scheduleThreadId && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setScheduleThreadId(null) }}>
        <section className="schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-title">
          <p className="eyebrow">LOCAL AUTOMATION</p>
          <h2 id="schedule-title">Add scheduled task</h2>
          <p className="schedule-intro">Codic will open this task when it is due. The app must be running and the project folder available.</p>
          <label className="field-label" htmlFor="schedule-name">Task name</label>
          <input id="schedule-name" value={scheduleTitle} maxLength={160} autoFocus onChange={(event) => setScheduleTitle(event.target.value)} />
          <label className="field-label" htmlFor="schedule-prompt">Prompt</label>
          <textarea id="schedule-prompt" value={schedulePrompt} maxLength={20_000} rows={5} onChange={(event) => setSchedulePrompt(event.target.value)} />
          <div className="schedule-fields">
            <div><label className="field-label" htmlFor="schedule-when">First run</label><input id="schedule-when" type="datetime-local" min={localDateTimeInput(new Date(Date.now() + 60_000))} value={scheduleDateTime} onChange={(event) => setScheduleDateTime(event.target.value)} /></div>
            <div><label className="field-label" htmlFor="schedule-repeat">Repeat</label><select id="schedule-repeat" value={scheduleRecurrence} onChange={(event) => setScheduleRecurrence(event.target.value as 'once' | 'daily' | 'weekly')}><option value="once">Once</option><option value="daily">Every day</option><option value="weekly">Every week</option></select></div>
          </div>
          <div className="schedule-policy-note"><Icon name="lock" size={15} /><span>Shell commands, network access, and file changes still follow Codic’s approval settings. Scheduled runs use “Ask for approval.”</span></div>
          <div className="rename-dialog-actions"><button className="secondary-button" onClick={() => setScheduleThreadId(null)}>Cancel</button><button className="primary-button" onClick={() => void saveScheduledTask()} disabled={scheduleBusy || !scheduleTitle.trim() || !schedulePrompt.trim()}>{scheduleBusy ? 'Saving…' : 'Save schedule'}</button></div>
        </section>
      </div>}
      {renameThreadId && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameThreadId(null) }}>
        <section className="rename-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-title">
          <p className="eyebrow">TASK ORGANIZATION</p>
          <h2 id="rename-title">Rename task</h2>
          <label className="field-label" htmlFor="thread-rename">Task name</label>
          <input id="thread-rename" value={renameDraft} maxLength={160} autoFocus onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void saveThreadRename() }} />
          <div className="rename-dialog-actions"><button className="secondary-button" onClick={() => setRenameThreadId(null)}>Cancel</button><button className="primary-button" onClick={() => void saveThreadRename()} disabled={!renameDraft.trim()}>Save name</button></div>
        </section>
      </div>}
      {showAuth && <div className="modal-scrim auth-scrim-first-run">
        <section className="auth-modal auth-modal-first-run" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <div className="auth-window-drag" aria-hidden="true" />
          <div className="auth-window-controls" aria-label="Window controls">
            <button type="button" className="window-control" onClick={() => window.codic.window.minimize()} aria-label="Minimize window" title="Minimize"><Icon name="minus" size={14} /></button>
            <button type="button" className="window-control" onClick={() => window.codic.window.toggleMaximize()} aria-label={isWindowMaximized ? 'Restore window' : 'Maximize window'} title={isWindowMaximized ? 'Restore' : 'Maximize'}><WindowSizeGlyph maximized={isWindowMaximized} /></button>
            <button type="button" className="window-control window-close" onClick={() => window.codic.window.close()} aria-label="Close Codic" title="Close"><Icon name="close" size={15} /></button>
          </div>
          <aside className="first-run-intro">
            <div className="first-run-brand"><Logo /><span>Codic</span></div>
            <p className="eyebrow"><span className="eyebrow-line" />YOUR CODEVA CODING WORKSPACE</p>
            <h1>{isFirstRun ? <>Make a home<br />for your next idea.</> : <>Welcome back<br />to your workspace.</>}</h1>
            <p className="first-run-copy">Sign in to open your projects, continue tasks, and use the Codic agent tools on this device.</p>
            <div className="first-run-benefits"><div><Icon name="folder" size={16} /><span><strong>Your files stay local</strong><small>Only the context needed for a prompt goes to Codeva.</small></span></div><div><Icon name="lock" size={16} /><span><strong>You stay in control</strong><small>Review edits and approve commands as Codic works.</small></span></div></div>
            <div className="first-run-local-note"><span className="status-mini-dot" />{localPreviewAvailable ? 'Local preview opens project files for interface testing. AI requests still need a Codeva account.' : 'Sign in is required before Codic can access project files or run tools.'}</div>
          </aside>
          <div className="auth-form-panel auth-form-panel-first-run">
            <div className="auth-brand"><Logo /></div>
            <p className="eyebrow">YOUR CODEVA ACCOUNT</p>
            <h2 id="auth-title">Sign in to Codeva</h2>
            <p className="auth-intro">Continue on the Codeva website to sign in with Google or email, create an account, verify your email, or reset your password.</p>
            {error && <div className="auth-inline-message" role="alert"><Icon name="warning" size={15} /><span>{error}</span></div>}
            {authNotice && <div className="auth-inline-message auth-inline-message-info" role="status"><Icon name="checkCircle" size={15} /><span>{authNotice}</span></div>}
            <button className="primary-button auth-submit" onClick={() => void handleCodevaSignIn()} disabled={authBusy || !authClient}>{authBusy ? 'Opening Codeva…' : 'Continue to Codeva'}<Icon name="arrow" size={15} /></button>
            {localPreviewAvailable && <div className="local-preview-entry">
              <div className="local-preview-divider"><span>or</span></div>
              <button className="secondary-button local-preview-button" onClick={() => void continueLocally()} disabled={authBusy}>
                <Icon name="terminal" size={15} />Continue locally
              </button>
              <p>Private preview mode. Your project stays on this computer; model requests stay locked until you sign in.</p>
            </div>}
            {!hasSupabaseConfig && <div className="auth-config-warning"><Icon name="warning" size={15} /><span>This build needs the public Supabase URL and anonymous key configured before sign-in can work.</span></div>}
                <p className="auth-privacy"><Icon name={isLocalPreview ? 'terminal' : 'lock'} size={12} />{isLocalPreview ? 'Local preview is temporary and resets when Codic closes.' : 'Your account session is stored using this device’s secure storage.'}</p>
          </div>
        </section>
      </div>}
      {showSettings && <div className="modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false) }}>
        <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <header className="settings-dialog-header"><div className="settings-dialog-brand"><Logo small /><span>Codic settings</span></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><Icon name="close" /></button></header>
          <div className="settings-dialog-body">
            <nav className="settings-navigation" aria-label="Settings sections">
              <p className="settings-nav-label">PREFERENCES</p>
              {settingsSections.map((section) => <button key={section.id} className={settingsSection === section.id ? 'active' : ''} onClick={() => { setSettingsSection(section.id); if (section.id === 'profile') void loadProfileStats() }}><Icon name={section.icon} size={16} /><span>{section.label}</span></button>)}
            </nav>
            <div className="settings-content">
              <div className="settings-content-title"><p className="eyebrow">CODEVA WORKSPACE</p><h2 id="settings-title">{settingsSections.find((section) => section.id === settingsSection)?.label}</h2></div>
              {settingsSection === 'general' && <div className="settings-page">
                <div className="settings-card"><div><strong>Current project</strong><p>{workspace?.path || 'No project is open yet.'}</p></div><button className="secondary-button" onClick={openWorkspace}>Choose project</button></div>
                <div className="settings-card"><div><strong>Start new tasks with</strong><p>Use your selected project and local task history.</p></div><span className="settings-value">{workspace?.name || 'Choose a project'}</span></div>
                <div className="settings-card"><div><strong>Application text size</strong><p>Adjust the whole window. You can also use Ctrl +, Ctrl −, and Ctrl 0.</p></div><div className="zoom-control"><button className="secondary-button" onClick={() => setAppZoom((value) => Math.max(0.75, Math.round((value - 0.1) * 10) / 10))} aria-label="Decrease text size">−</button><span>{Math.round(appZoom * 100)}%</span><button className="secondary-button" onClick={() => setAppZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 10) / 10))} aria-label="Increase text size">+</button><button className="quiet-button" onClick={() => setAppZoom(1)}>Reset</button></div></div>
              </div>}
              {settingsSection === 'profile' && <div className="settings-page">
                <div className="settings-profile-card"><span className="settings-profile-avatar">{hasSession ? userEmail.slice(0, 1).toUpperCase() : <Icon name="user" size={24} />}</span><div><h3>{hasSession ? userEmail.split('@')[0] : 'Local profile'}</h3><p>{hasSession ? userEmail : isLocalPreview ? 'Local preview. Sign in for models, plans, and account usage.' : 'Sign in to connect models, plans, and account usage.'}</p></div><span className="settings-value">{hasSession ? accountPlan : isLocalPreview ? 'Preview' : 'Local only'}</span></div>
                <section className="profile-stat-card" aria-label="Local Codic activity">
                  <div className="profile-stat-heading"><div><strong>Your Codic activity</strong><p>Private task history stored on this device.</p></div><span>LOCAL</span></div>
                  <div className="profile-stat-grid">
                    <div><strong>{profileStats?.taskCount.toLocaleString() ?? '—'}</strong><span>Tasks</span></div>
                    <div><strong>{profileStats?.completedRuns.toLocaleString() ?? '—'}</strong><span>Completed runs</span></div>
                    <div><strong>{profileStats ? profileStats.totalTokens.toLocaleString() : '—'}</strong><span>{profileStats?.tokensEstimated ? 'Approx. tokens' : 'Tokens'}</span></div>
                    <div><strong>{profileStats && profileStats.longestTaskSeconds > 0 ? `${Math.floor(profileStats.longestTaskSeconds / 3600)}h ${Math.floor((profileStats.longestTaskSeconds % 3600) / 60)}m` : '—'}</strong><span>Longest run</span></div>
                  </div>
                  <div className="profile-activity-heading"><strong>Task activity</strong><span>Last 12 weeks</span></div>
                  <div className="profile-activity-grid" role="img" aria-label="Task activity over the last 12 weeks">
                    {(profileStats?.activity || []).map((day) => <span key={day.date} title={`${day.date}: ${day.count} ${day.count === 1 ? 'task' : 'tasks'}`} data-level={day.count === 0 ? 0 : day.count === 1 ? 1 : day.count <= 3 ? 2 : day.count <= 6 ? 3 : 4} />)}
                  </div>
                  {!profileStats && <p className="profile-stats-empty">Local activity could not be loaded.</p>}
                </section>
                {!hasSession && <div className="settings-card"><div><strong>Connect your Codeva account</strong><p>Sign in to use your plan, view usage, and access account models.</p></div><button className="primary-button" onClick={() => { setShowSettings(false); openAuth() }}>Sign in</button></div>}
                {hasSession && <><div className="settings-card"><div><strong>Plan</strong><p>Your active account access.</p></div><span className="settings-value">{accountPlan}</span></div>
                  {limits ? <><div className="settings-card"><div><strong>Requests per hour</strong><p>Current plan allowance.</p></div><span className="settings-value">{limits.requestsPerHour.toLocaleString()}</span></div><div className="settings-card"><div><strong>Monthly token usage</strong><p>{limits.monthlyTokens.resetsAt ? `Resets ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(limits.monthlyTokens.resetsAt))}` : 'Usage reported by Codeva.'}</p></div><span className="settings-value">{limits.monthlyTokens.limit === null ? `${limits.monthlyTokens.used.toLocaleString()} used` : `${limits.monthlyTokens.used.toLocaleString()} / ${limits.monthlyTokens.limit.toLocaleString()}`}</span></div></> : <div className="settings-card"><div><strong>Usage</strong><p>Sign in and refresh your account to load limits.</p></div></div>}
                  <button className="secondary-button settings-signout" onClick={() => void handleSignOut()}>Sign out of this device</button></>}
                <p className="auth-privacy"><Icon name="lock" size={12} />Your session is stored in this device’s secure storage.</p>
              </div>}
              {settingsSection === 'appearance' && <div className="settings-page">
                <div className="settings-card settings-card-stack"><div><strong>Color theme</strong><p>Follow your computer or choose an appearance for Codic.</p></div><div className="theme-choice-grid">{(['system', 'light', 'dark'] as const).map((choice) => <button key={choice} className={`theme-choice${theme === choice ? ' selected' : ''}`} onClick={() => setPreferredTheme(choice)}><span className={`theme-preview theme-preview-${choice}`}><span /><i /></span><strong>{choice === 'system' ? 'System' : choice === 'light' ? 'Light' : 'Dark'}</strong>{theme === choice && <Icon name="checkCircle" size={14} />}</button>)}</div></div>
                <div className="settings-card"><div><strong>Text size</strong><p>Scale the interface for your display.</p></div><div className="zoom-control"><button className="secondary-button" onClick={() => setAppZoom((value) => Math.max(0.75, Math.round((value - 0.1) * 10) / 10))} aria-label="Decrease text size">−</button><span>{Math.round(appZoom * 100)}%</span><button className="secondary-button" onClick={() => setAppZoom((value) => Math.min(1.5, Math.round((value + 0.1) * 10) / 10))} aria-label="Increase text size">+</button><button className="quiet-button" onClick={() => setAppZoom(1)}>Reset</button></div></div>
              </div>}
              {settingsSection === 'models' && <div className="settings-page">
                <div className="settings-card"><div><strong>Default model</strong><p>Choose a Codeva model for the next coding task.</p></div><ModelPicker className="settings-model-picker" label="Default model" models={models} value={modelId} onChange={setPreferredModel} disabled={!hasSession} /></div>
                {!hasSession && <p className="settings-inline-note">Connect your Codeva account to load available models.</p>}
                <div className="settings-card settings-card-stack"><div><strong>Reasoning effort</strong><p>Higher effort gives the model a larger response budget. It does not expose private chain-of-thought.</p></div><div className="effort-selector" role="group" aria-label="Reasoning effort">{(['low', 'medium', 'high'] as const).map((effort, index) => <button key={effort} className={reasoningEffort === effort ? 'active' : ''} onClick={() => setPreferredEffort(effort)}><span className="effort-bars" aria-hidden="true">{[1, 2, 3].map((bar) => <i key={bar} className={bar <= index + 1 ? 'lit' : ''} />)}</span><strong>{effort[0].toUpperCase() + effort.slice(1)}</strong></button>)}</div><div className={`reasoning-pulse reasoning-${reasoningEffort}`} aria-label={`${reasoningEffort} reasoning effort`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><p className="settings-inline-note">{reasoningEffort === 'low' ? 'A focused response budget for quick questions and small edits.' : reasoningEffort === 'medium' ? 'A balanced response budget for everyday coding tasks.' : 'A larger response budget for complex, multi-step work.'}</p></div>
              </div>}
              {settingsSection === 'permissions' && <div className="settings-page">
                <div className="settings-card settings-card-stack"><div><strong>Action approvals</strong><p>Choose how Codic handles shell commands, network actions, and file access outside the selected project.</p></div>
                  <div className="permission-options">
                    <button className={`permission-option${approvalPolicy === 'ask' ? ' selected' : ''}`} onClick={() => setPreferredApprovalPolicy('ask')}><span className="permission-option-icon"><Icon name="lock" size={18} /></span><span><strong>Ask for approval</strong><small>Ask before shell commands and file access outside the selected project.</small></span>{approvalPolicy === 'ask' && <Icon name="checkCircle" size={17} />}</button>
                    <button className={`permission-option${approvalPolicy === 'safe-reads' ? ' selected' : ''}`} onClick={() => setPreferredApprovalPolicy('safe-reads')}><span className="permission-option-icon"><Icon name="checkCircle" size={18} /></span><span><strong>Approve for me</strong><small>Allow exact read-only shell commands. Ask before other shell or out-of-project actions.</small></span>{approvalPolicy === 'safe-reads' && <Icon name="checkCircle" size={17} />}</button>
                    <button className={`permission-option${approvalPolicy === 'full-access' ? ' selected permission-option-full' : ''}`} onClick={() => setPreferredApprovalPolicy('full-access')}><span className="permission-option-icon"><Icon name="warning" size={18} /></span><span><strong>Full access</strong><small>Run shell and network actions and access files anywhere on this computer without asking.</small></span>{approvalPolicy === 'full-access' && <Icon name="checkCircle" size={17} />}</button>
                  </div>
                </div>
                <div className={`settings-security-note${approvalPolicy === 'full-access' ? ' settings-full-access-note' : ''}`}><Icon name={approvalPolicy === 'full-access' ? 'warning' : 'lock'} size={15} /><span>{approvalPolicy === 'full-access' ? 'Full access lets the agent process read and change files outside the project and run host shell commands, including commands that use the network. Select this only when you want that access for your coding tasks.' : 'Codic limits automatic file access to the selected project. Shell commands require approval unless they match the narrow read-only allowlist.'}</span></div>
              </div>}
              {settingsSection === 'shortcuts' && <div className="settings-page settings-shortcuts">
                {[['New window', 'File menu'], ['New chat', 'Ctrl+N'], ['New temporary chat', 'Ctrl+Shift+N'], ['Open folder', 'Ctrl+O'], ['Rename task', 'Ctrl+Alt+R'], ['Pin task', 'Ctrl+Alt+P'], ['New side chat', 'Ctrl+Alt+S'], ['Archive task', 'Ctrl+Shift+A'], ['Toggle sidebar', 'Ctrl+Shift+S · Ctrl+B'], ['Toggle bottom panel', 'Ctrl+J'], ['Toggle navigation panel', 'Ctrl+Shift+E'], ['Switch between chat and tabs', 'Alt+Ctrl+B'], ['Find tasks', 'Ctrl+F'], ['Open terminal', 'Ctrl+`'], ['Previous sidebar item', 'Alt+Ctrl+['], ['Next sidebar item', 'Alt+Ctrl+]'], ['Previous tab', 'Ctrl+Shift+['], ['Next tab', 'Ctrl+Shift+]'], ['Back', 'Ctrl+['], ['Forward', 'Ctrl+]'], ['Zoom in', 'Ctrl+Shift+='], ['Zoom out', 'Ctrl+−'], ['Reset zoom', 'Ctrl+0'], ['Open settings', 'Ctrl+,'], ['Keyboard shortcuts', 'Ctrl+/'], ['Toggle full screen', 'F11'], ['Send prompt', 'Enter'], ['New line in prompt', 'Shift+Enter'], ['Stop current task', 'Stop button']].map(([label, keys]) => <div className="settings-shortcut-row" key={label}><span>{label}</span><kbd>{keys}</kbd></div>)}
              </div>}
              {settingsSection === 'updates' && <div className="settings-page">
                <div className="settings-card"><div><strong>Codic preview</strong><p>Current installed version.</p></div><span className="settings-value">{appVersion}</span></div>
                <div className="settings-card settings-card-stack"><div><strong>Automatic updates</strong><p>Windows x64 builds check on launch and download updates in the background. Codic asks before restarting to install. Unsigned macOS and Linux preview builds use manual installers.</p></div><span className="settings-inline-note" role="status">{updateCheck?.message || 'Codic checks for a newer release when it starts.'}</span>{updateCheck?.phase === 'downloading' && <div className="update-download-progress"><progress max="100" value={updateCheck.percent || 0} aria-label="Codic update download progress" /><span>{Math.round(updateCheck?.percent || 0)}%</span></div>}<div className="settings-action-row"><button className="secondary-button" onClick={() => void checkForUpdates()} disabled={updateCheckBusy}>{updateCheckBusy ? updateCheck?.phase === 'downloading' ? 'Downloading…' : 'Checking…' : 'Check for updates'}</button>{updateCheck?.phase === 'downloaded' && <button className="primary-button" onClick={() => void installCodicUpdate()}>Restart and install<Icon name="arrow" size={14} /></button>}{updateCheck?.phase === 'unsupported' && <button className="primary-button" onClick={() => void openWebsite('/downloads/codic')}>Open downloads<Icon name="arrow" size={14} /></button>}</div></div>
                <div className="settings-card settings-card-stack"><div><strong>What’s new in this preview</strong><p>Searchable project switching, model and reasoning controls, explicit shell approvals, optional full computer access, local task history, diff review, terminal panels, and Windows update checks with retry and checksum verification.</p></div><span className="settings-value">Codic {appVersion}</span></div>
                <div className="settings-card"><div><strong>Manual installer downloads</strong><p>Get the latest Codic release for your operating system.</p></div><button className="secondary-button" onClick={() => void openWebsite('/downloads/codic')}>Open downloads</button></div>
              </div>}
              {settingsSection === 'troubleshooting' && <div className="settings-page">
                <div className="settings-card settings-card-stack"><div><strong>Account and model access</strong><p>Sign in to Codeva and check that your account has an available model. The desktop app sends prompts through the Codeva API.</p></div><div className="settings-action-row"><button className="secondary-button" onClick={() => void checkGatewayConnection()}>Check Codeva connection</button>{!hasSession && <button className="primary-button" onClick={() => openAuth()}>Sign in<Icon name="arrow" size={14} /></button>}</div></div>
                <div className="settings-card settings-card-stack"><div><strong>Local project and terminal</strong><p>{workspace ? `Current project: ${workspace.path}` : 'Choose a project folder before starting a coding task.'} Terminal commands run in the selected workspace and follow the approval setting.</p></div><button className="secondary-button" onClick={() => void openWorkspace()}>Choose project folder</button></div>
                <div className="settings-card"><div><strong>Service status and support</strong><p>Open the Codeva service status page or send the team a report.</p></div><div className="settings-action-row"><button className="secondary-button" onClick={() => void openWebsite('/status')}>System status</button><button className="secondary-button" onClick={() => void openWebsite('/contact')}>Send feedback</button></div></div>
                <div className="settings-card"><div><strong>App version</strong><p>Share this version when reporting an issue.</p></div><span className="settings-value">{appVersion}</span></div>
              </div>}
              {settingsSection === 'about' && <div className="settings-page">
                <div className="settings-about"><div className="settings-about-logo"><Logo /></div><h3>Codic</h3><p>Codeva’s local coding workspace.</p><span>Version {appVersion} · Preview</span></div>
                <div className="settings-card"><div><strong>Workspace privacy</strong><p>Repositories stay on this device. Codic sends the prompt and required code context to the Codeva model gateway.</p></div></div>
              </div>}
            </div>
          </div>
        </section>
      </div>}
    </div>
  )
}
