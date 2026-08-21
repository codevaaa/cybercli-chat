/**
 * SettingsPage — Exact Antigravity-style settings panel.
 *
 * Layout: Left nav (sections + projects + Shortcuts/Feedback) + Right content area
 * Sections match screenshots exactly:
 *   - Account (Telemetry, Marketing Emails, Plan, Email/Sign Out)
 *   - General (same as before)
 *   - Appearance (Verbose Agent Chat, Conversation Width, Theme icons, Color pickers)
 *   - Models (Plan, AI Credits toggle, Weekly/5h Limit circles)
 *   - Customizations (Token Usage bar, Skills count, Rules, MCP Tools, Installed MCP Servers)
 *   - Browser (JS Execution Policy dropdown with options, Actuation Permissions)
 *   - App (Prevent Sleep, Keep In Menu Bar, Notifications)
 *   - Shortcuts (keyboard shortcuts list)
 *   - Provide Feedback (Bug Report, Feature Request, form)
 */
import React, { useState } from 'react'
import clsx from 'clsx'
import { usePlatformStore } from '../store/platformStore.js'
import {
  X, Monitor, Sun, Moon, Keyboard, MessageSquare,
  ExternalLink, ChevronRight
} from 'lucide-react'

const SECTIONS = [
  { id: 'account',        label: 'Account'        },
  { id: 'general',        label: 'General'        },
  { id: 'appearance',     label: 'Appearance'     },
  { id: 'models',         label: 'Models'         },
  { id: 'customizations', label: 'Customizations' },
  { id: 'browser',        label: 'Browser'        },
  { id: 'app',            label: 'App'            },
]

const PROJECTS = ['firwall_security', 'forensicplatform3', 'ppt_dynamic']

export default function SettingsPage({ user, onLogout, onClose, isOverlay }) {
  const [active, setActive] = useState('account')
  const [settings, setSettings] = useState(() => loadSettings())
  const { skills } = usePlatformStore()

  const update = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    saveSettings(next)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══ LEFT NAV ═══ */}
      <div className="w-[180px] flex-shrink-0 border-r border-border bg-[#0d0d14] overflow-y-auto py-3 flex flex-col">
        {/* Title */}
        <div className="px-4 pb-2">
          <span className="text-sm font-semibold text-accent">Settings</span>
        </div>

        {/* Main sections */}
        <nav className="px-2 space-y-0.5">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={clsx(
                'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all',
                active === id
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Projects */}
        <div className="mt-4 px-4">
          <div className="text-xs text-muted/60 font-medium mb-1">Projects</div>
          {PROJECTS.map(p => (
            <div key={p} className="text-xs text-white/60 py-1 truncate">{p}</div>
          ))}
          <button className="text-xs text-muted hover:text-accent mt-1">Show all</button>
        </div>

        <div className="mt-2 px-4">
          <div className="text-xs text-muted/60 font-medium mb-1">Not in Project</div>
          <div className="text-xs text-white/60 py-1">Conversations</div>
        </div>

        {/* Bottom links */}
        <div className="mt-auto px-2 pt-3 space-y-0.5">
          <button
            onClick={() => setActive('shortcuts')}
            className={clsx(
              'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all',
              active === 'shortcuts' ? 'bg-accent/15 text-accent font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            Shortcuts
          </button>
          <button
            onClick={() => setActive('feedback')}
            className={clsx(
              'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all',
              active === 'feedback' ? 'bg-accent/15 text-accent font-medium' : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            Provide Feedback
          </button>
        </div>
      </div>

      {/* ═══ RIGHT CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl relative">
        {/* Close button */}
        {isOverlay && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {active === 'account'        && <AccountSection settings={settings} update={update} user={user} onLogout={onLogout} />}
        {active === 'general'        && <GeneralSection settings={settings} update={update} />}
        {active === 'appearance'     && <AppearanceSection settings={settings} update={update} />}
        {active === 'models'         && <ModelsSection settings={settings} update={update} />}
        {active === 'customizations' && <CustomizationsSection settings={settings} update={update} skills={skills} />}
        {active === 'browser'        && <BrowserSection settings={settings} update={update} />}
        {active === 'app'            && <AppSection settings={settings} update={update} />}
        {active === 'shortcuts'      && <ShortcutsSection />}
        {active === 'feedback'       && <FeedbackSection user={user} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════
function AccountSection({ settings, update, user, onLogout }) {
  return (
    <div>
      <SectionTitle title="Account" subtitle="Manage your plan, credentials, and general preferences." />

      <GroupTitle title="General" />
      <SettingRow
        title="Enable Telemetry"
        description="When toggled on, CodeVaa collects usage data to help enhance performance and features."
        control={<Toggle value={settings.telemetry !== false} onChange={v => update('telemetry', v)} />}
      />
      <SettingRow
        title="Marketing Emails"
        description="Receive product updates, tips, and promotions from CodeVaa via email."
        control={<Toggle value={settings.marketingEmails || false} onChange={v => update('marketingEmails', v)} />}
      />

      <GroupTitle title="Account" />
      <SettingRow
        title={<><span className="font-semibold">Your Plan: CodeVaa Pro</span></>}
        description="You can upgrade to a CodeVaa Ultra plan to receive higher rate limits."
        control={<button className="btn-primary text-xs px-4">Upgrade</button>}
      />
      <SettingRow
        title="Email"
        description={user?.email || 'chandanabhay458@gmail.com'}
        control={<button onClick={onLogout} className="btn-ghost text-xs">Sign Out</button>}
      />

      <p className="text-xs text-muted mt-6">
        By using this app, you agree to its <a href="#" className="text-accent hover:underline">Terms of Service</a>
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERAL
// ═══════════════════════════════════════════════════════════════════════════
function GeneralSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="General" subtitle="Configure agent execution, queued message delivery, and permissions." />
      <GroupTitle title="Execution" />
      <SettingRow title="Queued Messages" description="Configure when follow-up messages are sent."
        control={<SegmentedControl options={['Queue','Send Immediately']} value={settings.queuedMessages || 'Queue'} onChange={v => update('queuedMessages', v)} />} />
      <GroupTitle title="Agent Settings" />
      <SettingRow title="Security Preset" description="Controls terminal auto-execution and file access policy."
        control={<Dropdown options={['Default','Strict','Permissive']} value={settings.securityPreset || 'Default'} onChange={v => update('securityPreset', v)} />} />
      <GroupTitle title="Agent Behavior" />
      <SettingRow title="Artifact Review Policy" description="Specifies Agent's behavior when asking for review on artifacts."
        control={<Dropdown options={['Always Ask','Auto-approve','Never Create']} value={settings.artifactReview || 'Always Ask'} onChange={v => update('artifactReview', v)} />} />
      <GroupTitle title="File Permissions" />
      <SettingRow title="File Access Rules" description="Configure allowed and denied paths for file reads and writes." badge="1"
        control={<button className="btn-ghost text-xs">Open</button>} />
      <GroupTitle title="Network Permissions" />
      <SettingRow title="Allowed Domains" description="Configure which domains agents can access."
        control={<button className="btn-ghost text-xs">Configure</button>} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// APPEARANCE (matches Antigravity exactly)
// ═══════════════════════════════════════════════════════════════════════════
function AppearanceSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="Appearance" subtitle="Configure the agent's visual theme and display preferences." />

      <GroupTitle title="Chat Settings" />
      <SettingRow title="Verbose Agent Chat" description="Display and preserve intermediate thinking steps."
        control={<Toggle value={settings.verboseChat !== false} onChange={v => update('verboseChat', v)} />} />
      <SettingRow title="Conversation Width" description="Configure the maximum width of the conversation panel."
        control={<SegmentedControl options={['Default','Narrow','Wide']} value={settings.conversationWidth || 'Default'} onChange={v => update('conversationWidth', v)} />} />

      <GroupTitle title="Appearance" />
      <SettingRow title="Appearance" description="Select light, dark, or inherit system settings."
        control={
          <div className="flex border border-border rounded-lg overflow-hidden">
            <ThemeBtn icon={<Monitor size={14} />} active={settings.theme === 'system'} onClick={() => update('theme', 'system')} />
            <ThemeBtn icon={<Sun size={14} />} active={settings.theme === 'light'} onClick={() => update('theme', 'light')} />
            <ThemeBtn icon={<Moon size={14} />} active={settings.theme === 'dark' || !settings.theme} onClick={() => update('theme', 'dark')} />
          </div>
        }
      />

      <GroupTitle title="Light Theme" />
      <ColorRow label="Preset" type="dropdown" options={['Default Light']} value={settings.lightPreset || 'Default Light'} onChange={v => update('lightPreset', v)} />
      <ColorRow label="Background" value={settings.lightBg || '#EEEEEE'} onChange={v => update('lightBg', v)} />
      <ColorRow label="Foreground" value={settings.lightFg || '#101010'} onChange={v => update('lightFg', v)} />
      <ColorRow label="Accent" value={settings.lightAccent || '#007ACC'} onChange={v => update('lightAccent', v)} />

      <GroupTitle title="Dark Theme" />
      <ColorRow label="Preset" type="dropdown" options={['Default Dark']} value={settings.darkPreset || 'Default Dark'} onChange={v => update('darkPreset', v)} />
      <ColorRow label="Background" value={settings.darkBg || '#101010'} onChange={v => update('darkBg', v)} />
      <ColorRow label="Foreground" value={settings.darkFg || '#CCCCCC'} onChange={v => update('darkFg', v)} />
      <ColorRow label="Accent" value={settings.darkAccent || '#007ACC'} onChange={v => update('darkAccent', v)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODELS & USAGE
// ═══════════════════════════════════════════════════════════════════════════
function ModelsSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="Models & Usage" subtitle="Manage your model quota and credits." />

      <GroupTitle title="Plan" />
      <SettingRow title={<span className="font-semibold">Your Plan: CodeVaa Pro</span>} description="You can upgrade to a CodeVaa Ultra plan to receive higher rate limits."
        control={<button className="btn-primary text-xs px-4">Upgrade</button>} />

      <GroupTitle title="Model Credits" />
      <SettingRow title="Enable AI Credit Overages" description="When toggled on, CodeVaa will use your AI credits to fulfill model requests once you're out of model quota."
        control={<Toggle value={settings.creditOverages || false} onChange={v => update('creditOverages', v)} />} />

      <GroupTitle title="CodeVaa Models" />
      <UsageCircle label="Weekly Limit Remaining" percent={98} description="You have used some of your weekly limit, it will fully refresh in 2 days, 1 hour." />
      <UsageCircle label="Five Hour Limit Remaining" percent={100} />

      <GroupTitle title="Council & Premium Models" />
      <UsageCircle label="Weekly Limit Remaining" percent={100} />
      <UsageCircle label="Five Hour Limit Remaining" percent={100} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMIZATIONS (with Token Usage bar + Skills count + MCP)
// ═══════════════════════════════════════════════════════════════════════════
function CustomizationsSection({ settings, update, skills = [] }) {
  const skillCount = skills.length || 5
  const mcpToolCount = settings.mcpServers?.length || 0

  return (
    <div>
      <SectionTitle title="Customizations" subtitle={<>Configure default behaviors, skills, and MCP servers. <a href="#" className="text-accent hover:underline">Learn more</a>.</>} />

      <GroupTitle title="Token Usage" />
      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <p className="text-xs text-muted mb-2">The breakdown below shows token usage from customizations like skills, rules, and MCP. If the budget is exceeded, large customizations will be truncated automatically.</p>
        {/* Warning bar */}
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5 mb-3">
          <span className="text-warning text-xs">⚠ Customization token budget exceeded. Large customizations will be truncated.</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #2196F3 1.1%, #4CAF50 76.4%, #9C27B0 0.6%)' }} />
        </div>
        {/* Legend */}
        <div className="space-y-1">
          <LegendRow color="#2196F3" label="Rules" tokens={220} percent="1.1%" action="Show 1 breakdown" />
          <LegendRow color="#4CAF50" label="Skills" tokens={152861} percent="764.3%" action={`Show ${skillCount} breakdowns`} />
          <LegendRow color="#9C27B0" label="Mcp Tools" tokens={117} percent="0.6%" action="Show 2 breakdowns" />
        </div>
      </div>

      {/* Skills collapsible */}
      <div className="flex items-center gap-2 py-2 px-3 text-sm text-white/70">
        <ChevronRight size={12} />
        <span>Skills</span>
        <span className="text-muted">({skillCount})</span>
      </div>

      <GroupTitle title="Rules" badge="1" />
      <div className="bg-surface border border-border rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-white">user_global</span>
          <span className="badge bg-success/15 text-success text-[10px]">Global</span>
        </div>
        <p className="text-xs text-muted font-mono line-clamp-2">
          {`<!-- # BEGIN CODEVA GLOBAL RULE --> --- alwaysApply: true always_on: true trigger: always_on applyTo: "*" description: Co...`}
        </p>
      </div>

      <GroupTitle title="Installed MCP Servers" />
      <div className="flex gap-2 mb-3">
        <button className="btn-ghost text-xs">Add MCP +</button>
        <button className="btn-ghost text-xs">Refresh ↻</button>
        <button className="btn-ghost text-xs">Open MCP Config</button>
      </div>
      <div className="space-y-2">
        <MCPServerRow name="Snyk" tools={12} enabled={true} />
        <MCPServerRow name="cloudrun" tools={8} enabled={true} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// BROWSER
// ═══════════════════════════════════════════════════════════════════════════
function BrowserSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="Browser Settings" subtitle={<>Configure the browser subagent. It requires <a href="#" className="text-accent hover:underline">Google Chrome</a> to be installed. The browser subagent can be invoked by typing /browser in the conversation input box.</>} />

      <GroupTitle title="General" />
      <SettingRow title="Browser Javascript Execution Policy" description="Controls whether the agent can run custom JavaScript to automate complex browser actions."
        control={<Dropdown options={['Disabled','Request Review','Always Proceed']} value={settings.browserJsPolicy || 'Request Review'} onChange={v => update('browserJsPolicy', v)} />} />

      <GroupTitle title="Actuation Permissions" />
      <SettingRow title="Browser Actuation Rules" description="Configure allowed and denied URLs for browser actions."
        control={<button className="btn-ghost text-xs">Configure</button>} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════
function AppSection({ settings, update }) {
  return (
    <div>
      <SectionTitle title="App Settings" subtitle="Manage application settings." />
      <GroupTitle title="General" />
      <SettingRow title="Prevent Sleep" description="Prevent the computer from sleeping while the app is running."
        control={<Toggle value={settings.preventSleep || false} onChange={v => update('preventSleep', v)} />} />
      <SettingRow title="Keep In Menu Bar" description="Keep the app accessible from the menu bar and running in the background when all windows are closed."
        control={<Toggle value={settings.keepInMenuBar || false} onChange={v => update('keepInMenuBar', v)} />} />

      <GroupTitle title="Notifications" />
      <SettingRow title="Notification Settings" description="To modify notification settings, open your operating system's system preferences."
        control={<button className="btn-ghost text-xs">Open System Preferences</button>} />

      <div className="mt-4 text-xs text-muted hover:text-accent cursor-pointer">
        Advanced Settings &gt;
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHORTCUTS (matches Antigravity exactly)
// ═══════════════════════════════════════════════════════════════════════════
function ShortcutsSection() {
  const shortcuts = {
    RECOMMENDED: [
      { label: 'Open Conversation Picker', keys: ['Ctrl', 'K'] },
      { label: 'Open File Search', keys: ['Ctrl', 'P'] },
      { label: 'Focus Input', keys: ['Ctrl', 'I'] },
      { label: 'New Conversation', keys: ['Ctrl', 'Shift', 'O'] },
    ],
    NAVIGATION: [
      { label: 'File Picker', keys: ['Ctrl', 'P'] },
      { label: 'New Conversation', keys: ['Ctrl', 'Shift', 'O'] },
      { label: 'Open Conversation Picker', keys: ['Ctrl', 'K'] },
      { label: 'Scheduled Tasks', keys: ['Ctrl', 'U'] },
      { label: 'Select Previous Conversation', keys: ['Alt', '↑'] },
      { label: 'Select Next Conversation', keys: ['Alt', '↓'] },
      { label: 'Previous Pane Tab', keys: ['Ctrl', 'Shift', ','] },
      { label: 'Next Pane Tab', keys: ['Ctrl', 'Shift', '.'] },
      { label: 'Open Settings', keys: ['Ctrl', ','] },
    ],
    CONVERSATION: [
      { label: 'New Conversation', keys: ['Ctrl', 'Shift', 'O'] },
      { label: 'Focus Input', keys: ['Ctrl', 'I'] },
      { label: 'Toggle Model Selector', keys: ['Ctrl', '/'] },
      { label: 'Toggle Voice Recording', keys: ['Ctrl', 'M'] },
      { label: 'Find in Pane', keys: ['Ctrl', 'F'] },
      { label: 'Add to Chat/Quote', keys: ['Ctrl', 'L'] },
    ],
    'LAYOUT CONTROLS': [
      { label: 'Toggle Sidebar', keys: ['Ctrl', 'B'] },
      { label: 'Toggle Auxiliary Pane', keys: ['Ctrl', 'Alt', 'B'] },
    ],
  }

  return (
    <div>
      <SectionTitle title="Shortcuts" subtitle="Keyboard shortcuts for quick navigation and control." />
      {Object.entries(shortcuts).map(([group, items]) => (
        <div key={group} className="mb-6">
          <div className="text-xs text-muted/60 uppercase tracking-wider font-semibold mb-2">{group}</div>
          <div className="space-y-1">
            {items.map(({ label, keys }) => (
              <div key={label} className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <Keyboard size={12} className="text-muted" />
                  {label}
                </div>
                <div className="flex gap-1">
                  {keys.map((k, i) => (
                    <kbd key={i} className="px-1.5 py-0.5 bg-[#1E1E2E] border border-border rounded text-[10px] text-muted font-mono min-w-[24px] text-center">{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDE FEEDBACK (matches Antigravity exactly)
// ═══════════════════════════════════════════════════════════════════════════
function FeedbackSection({ user }) {
  const [type, setType] = useState('bug')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [attachLogs, setAttachLogs] = useState(true)
  const [sendAsUser, setSendAsUser] = useState(true)

  return (
    <div>
      <SectionTitle title="Provide Feedback" />

      <GroupTitle title="Feedback Type" />
      <div className="space-y-2 mb-6">
        {[
          { id: 'bug', label: 'Bug Report' },
          { id: 'feature', label: 'Feature Request' },
          { id: 'auth', label: 'Auth and Billing' },
          { id: 'general', label: 'General Feedback' },
        ].map(opt => (
          <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
            <input type="radio" name="feedbackType" checked={type === opt.id} onChange={() => setType(opt.id)}
              className="w-3.5 h-3.5 accent-red-500" />
            <span className="text-sm text-white/80">{opt.label}</span>
          </label>
        ))}
      </div>

      <GroupTitle title="Description" />
      <p className="text-xs text-muted mb-2">Please describe the issue in detail. The more actionable your feedback, the quicker our team can address your request. Some helpful information includes:</p>
      <ul className="text-xs text-muted list-disc pl-5 mb-3 space-y-0.5">
        <li>Steps to reproduce the issue</li>
        <li>Expected behavior</li>
        <li>Actual behavior</li>
        <li>Any error messages</li>
        <li>Any relevant information</li>
      </ul>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Describe the bug you encountered..."
        className="input w-full h-28 text-sm mb-4"
      />

      {type === 'bug' && (
        <>
          <GroupTitle title="Steps to Reproduce" />
          <textarea
            value={steps}
            onChange={e => setSteps(e.target.value)}
            placeholder="Please list the steps to reproduce the issue..."
            className="input w-full h-24 text-sm mb-4"
          />
        </>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>📎</span> Attach a screenshot (optional)
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={attachLogs} onChange={e => setAttachLogs(e.target.checked)} className="w-3.5 h-3.5 accent-blue-500 rounded" />
          <span className="text-xs text-accent">Attach CodeVaa server logs</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={sendAsUser} onChange={e => setSendAsUser(e.target.checked)} className="w-3.5 h-3.5 accent-blue-500 rounded" />
          <span className="text-xs text-muted">Send feedback as {user?.email || 'user@codeva.ai'}</span>
        </label>
      </div>

      <button className="btn-primary px-6">Submit</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-accent">{title}</h1>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

function GroupTitle({ title, badge }) {
  return (
    <div className="mt-6 mb-3 pt-4 border-t border-border first:mt-0 first:pt-0 first:border-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {badge && <span className="badge bg-muted/20 text-muted text-[10px]">{badge}</span>}
      </div>
    </div>
  )
}

function SettingRow({ title, description, control, badge }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 px-4 rounded-xl bg-surface/50 border border-border/40 mb-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-white">{title}</div>
          {badge && <span className="badge bg-accent/15 text-accent text-[10px]">{badge}</span>}
        </div>
        {description && <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {control && <div className="flex-shrink-0 mt-0.5">{control}</div>}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className={clsx('w-11 h-6 rounded-full transition-colors duration-200 relative', value ? 'bg-accent' : 'bg-[#2a2a3a]')}>
      <div className={clsx('w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 shadow-sm', value ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}

function Dropdown({ options, value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input text-xs min-w-[130px] cursor-pointer bg-[#1E1E2E]">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex border border-border rounded-lg overflow-hidden">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} className={clsx('px-3 py-1.5 text-xs font-medium transition-colors', value === opt ? 'bg-white/10 text-white' : 'bg-transparent text-muted hover:text-white')}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function ThemeBtn({ icon, active, onClick }) {
  return (
    <button onClick={onClick} className={clsx('px-3 py-2 transition-colors', active ? 'bg-white/10 text-white' : 'text-muted hover:text-white')}>
      {icon}
    </button>
  )
}

function ColorRow({ label, value, onChange, type, options }) {
  if (type === 'dropdown') {
    return (
      <div className="flex items-center justify-between py-2.5 px-4 bg-surface/30 border border-border/30 rounded-lg mb-1.5">
        <span className="text-sm text-white/80">{label}</span>
        <Dropdown options={options} value={value} onChange={onChange} />
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-surface/30 border border-border/30 rounded-lg mb-1.5">
      <span className="text-sm text-white/80">{label}</span>
      <div className="flex items-center gap-2 bg-[#1E1E2E] border border-border rounded-lg px-2 py-1">
        <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: value }} />
        <span className="text-xs font-mono text-muted"># {(value || '').replace('#', '')}</span>
      </div>
    </div>
  )
}

function UsageCircle({ label, percent, description }) {
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-surface/30 border border-border/30 rounded-lg mb-1.5">
      <div>
        <div className="text-sm text-white/80">{label}</div>
        {description && <div className="text-xs text-muted mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-white">{percent}%</span>
        <svg width="40" height="40" className="-rotate-90">
          <circle cx="20" cy="20" r="18" stroke="#1E1E2E" strokeWidth="3" fill="none" />
          <circle cx="20" cy="20" r="18" stroke={percent > 80 ? '#4CAF50' : percent > 50 ? '#F59E0B' : '#EF4444'} strokeWidth="3" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

function LegendRow({ color, label, tokens, percent, action }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-muted">{label} ({percent}) {tokens.toLocaleString()}</span>
      </div>
      <button className="text-xs text-accent hover:underline">{action}</button>
    </div>
  )
}

function MCPServerRow({ name, tools, enabled }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-surface border border-border rounded-lg">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-white">{name}</span>
        <span className="w-2 h-2 rounded-full bg-success" />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">&gt; {tools} tools enabled</span>
        <Toggle value={enabled} onChange={() => {}} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
function loadSettings() { try { return JSON.parse(localStorage.getItem('codeva_settings') || '{}') } catch { return {} } }
function saveSettings(s) { localStorage.setItem('codeva_settings', JSON.stringify(s)) }
