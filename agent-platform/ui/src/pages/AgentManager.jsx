/**
 * AgentManager — The main page of the CodeVaa Agent Platform UI.
 *
 * Layout:
 *   Left column  — Goal input, session controls, stats, result
 *   Center       — Live Task Graph (dependency view)
 *   Right column — Agent cards (one per active agent type)
 */
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlatformStore } from '../store/platformStore.js'
import TaskGraph  from '../components/TaskGraph.jsx'
import AgentCard  from '../components/AgentCard.jsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import clsx from 'clsx'
import {
  Play, StopCircle, Zap, AlertCircle, CheckCircle,
  Clock, Loader, ChevronDown, FolderOpen
} from 'lucide-react'

const EXAMPLE_GOALS = [
  'Build a REST API for a todo app with authentication',
  'Create a React dashboard component with charts',
  'Write comprehensive tests for the auth module',
  'Set up Docker and CI/CD for this project',
  'Audit the codebase for security vulnerabilities',
  'Build a web scraper that extracts product data',
]

const AGENT_TYPES = ['coder','tester','debugger','devops','researcher','writer','reviewer','security']

const STATUS_CONFIG = {
  idle:         { label: 'Ready',        color: 'text-muted',   icon: <Clock   size={14} /> },
  planning:     { label: 'Planning...',  color: 'text-warning', icon: <Loader  size={14} className="animate-spin" /> },
  running:      { label: 'Running',      color: 'text-accent',  icon: <Loader  size={14} className="animate-spin" /> },
  synthesizing: { label: 'Synthesizing', color: 'text-accent',  icon: <Loader  size={14} className="animate-spin" /> },
  completed:    { label: 'Completed',    color: 'text-success', icon: <CheckCircle size={14} /> },
  failed:       { label: 'Failed',       color: 'text-danger',  icon: <AlertCircle size={14} /> },
}

export default function AgentManager() {
  const {
    runGoal, cancelSession, sessionStatus, tasks, planSummary,
    estimatedDuration, result, platformOnline, connected, activeSession,
  } = usePlatformStore()

  const [goal,        setGoal]        = useState('')
  const [projectPath, setProjectPath] = useState(window.electronAPI?.getProjectPath?.() || '')
  const [maxParallel, setMaxParallel] = useState(4)
  const [showExamples, setShowExamples] = useState(false)
  const textareaRef = useRef(null)

  const stats = (() => {
    const all = Object.values(tasks)
    return {
      total:     all.length,
      completed: all.filter(t => t.status === 'completed').length,
      running:   all.filter(t => t.status === 'running').length,
      failed:    all.filter(t => t.status === 'failed').length,
      pending:   all.filter(t => t.status === 'pending' || t.status === 'ready').length,
    }
  })()

  const isRunning  = sessionStatus === 'running' || sessionStatus === 'planning' || sessionStatus === 'synthesizing'
  const statusConf = STATUS_CONFIG[sessionStatus] || STATUS_CONFIG.idle

  // Active agent types
  const activeAgentTypes = [...new Set(Object.values(tasks).map(t => t.agentType))]

  const handleRun = () => {
    if (!goal.trim()) return
    runGoal(goal.trim(), { projectPath, maxParallel })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun()
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left Panel — Input & Result ── */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-bold text-base">Agent Manager</h1>
            <div className={clsx('flex items-center gap-1.5 text-xs', statusConf.color)}>
              {statusConf.icon}
              {statusConf.label}
            </div>
          </div>
          {planSummary && (
            <p className="text-xs text-muted mt-1 leading-relaxed">{planSummary}</p>
          )}
          {estimatedDuration && (
            <p className="text-xs text-muted/60 mt-0.5">Est. {estimatedDuration}</p>
          )}
        </div>

        {/* Stats bar */}
        {stats.total > 0 && (
          <div className="px-4 py-2 border-b border-border flex gap-3">
            <Stat label="Total"   value={stats.total}     color="text-white"   />
            <Stat label="Running" value={stats.running}   color="text-accent"  />
            <Stat label="Done"    value={stats.completed} color="text-success" />
            {stats.failed > 0 && <Stat label="Failed" value={stats.failed} color="text-danger" />}
          </div>
        )}

        {/* Goal input */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your goal... (⌘Enter to run)"
              rows={4}
              disabled={isRunning}
              className="input w-full resize-none text-sm leading-relaxed disabled:opacity-50"
            />
            {/* Example goals */}
            <button
              className="absolute bottom-2 right-2 text-xs text-muted hover:text-accent transition-colors"
              onClick={() => setShowExamples(v => !v)}
            >
              Examples <ChevronDown size={10} className="inline" />
            </button>
          </div>

          <AnimatePresence>
            {showExamples && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {EXAMPLE_GOALS.map((eg, i) => (
                  <button
                    key={i}
                    className="w-full text-left text-xs text-muted hover:text-accent hover:bg-accent/5 px-2 py-1.5 rounded transition-colors"
                    onClick={() => { setGoal(eg); setShowExamples(false) }}
                  >
                    {eg}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Project path */}
          <div className="flex gap-2">
            <input
              type="text"
              value={projectPath}
              onChange={e => setProjectPath(e.target.value)}
              placeholder="Project path (optional)"
              className="input flex-1 text-xs"
            />
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!isRunning ? (
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleRun}
                disabled={!goal.trim() || !connected}
                title={!connected ? 'Platform not connected' : ''}
              >
                <Play size={14} />
                Run
              </button>
            ) : (
              <button
                className="btn flex-1 flex items-center justify-center gap-2 bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25"
                onClick={() => cancelSession(activeSession)}
              >
                <StopCircle size={14} />
                Cancel
              </button>
            )}
            {/* Parallel agents selector */}
            <select
              value={maxParallel}
              onChange={e => setMaxParallel(Number(e.target.value))}
              className="input text-xs w-16"
              title="Max parallel agents"
            >
              {[1,2,3,4,6,8].map(n => <option key={n} value={n}>{n}×</option>)}
            </select>
          </div>

          {!platformOnline && (
            <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={12} />
              Platform offline — run: codeva start
            </div>
          )}
        </div>

        {/* Result */}
        <div className="flex-1 overflow-y-auto p-4">
          {result && (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-xs font-semibold text-success mb-2 flex items-center gap-1.5">
                <CheckCircle size={12} /> Final Result
              </div>
              <div className="bg-surface/50 border border-border rounded-xl p-3 text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" {...props}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-white/10 rounded px-1 text-xs" {...props}>{children}</code>
                      )
                    }
                  }}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          )}
          {!result && sessionStatus === 'idle' && (
            <div className="text-center text-muted text-sm py-8">
              <Zap size={32} className="mx-auto mb-3 opacity-20" />
              <p>Enter a goal and press Run</p>
              <p className="text-xs mt-1 opacity-60">The agent swarm will plan, execute, and deliver</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Center — Task Graph ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-white">Task Graph</h2>
          {stats.total > 0 && (
            <div className="mt-1 w-full bg-border rounded-full h-1">
              <motion.div
                className="bg-gradient-to-r from-accent to-success h-1 rounded-full"
                animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <TaskGraph />
        </div>
      </div>

      {/* ── Right — Agent Cards ── */}
      <div className="w-64 flex-shrink-0 border-l border-border overflow-y-auto p-3 space-y-2">
        <div className="px-1 py-1 text-xs font-semibold text-muted uppercase tracking-wider">
          Agent Team
        </div>
        {activeAgentTypes.length > 0 ? (
          activeAgentTypes.map(type => (
            <AgentCard key={type} agentType={type} />
          ))
        ) : (
          AGENT_TYPES.map(type => (
            <AgentCard key={type} agentType={type} />
          ))
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={clsx('text-lg font-bold leading-none', color)}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}
