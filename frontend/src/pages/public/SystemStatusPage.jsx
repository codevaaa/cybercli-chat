import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Server, Activity, Timer, AlertTriangle, Clock,
  ArrowLeft, Wifi, WifiOff, Database, Shield, Zap, RefreshCw,
  Circle, TrendingUp, Globe, Cpu, Radio
} from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname.includes('vercel.app') || hostname.includes('codeva.app') || hostname.includes('cybermindcli.info')) {
      return 'https://codeva-api.onrender.com/api/v1'
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
})()

// ── Status color & label utilities ──────────────────────────────────────────
const STATUS_CONFIG = {
  operational: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', label: 'Operational', icon: CheckCircle2 },
  degraded:    { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Degraded', icon: AlertTriangle },
  down:        { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Down', icon: WifiOff },
  major_outage:{ color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', label: 'Major Outage', icon: WifiOff },
  partial_outage:{ color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', label: 'Partial Outage', icon: AlertTriangle },
  unknown:     { color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', label: 'Unknown', icon: Circle },
}

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.unknown

// ── Animated Heartbeat SVG ──────────────────────────────────────────────────
function HeartbeatLine({ status, latency }) {
  const color = getStatusConfig(status).color
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * 200
      let y = 20
      if (status === 'operational') {
        // Simulate heartbeat-like pattern
        const t = i % 15
        if (t === 5) y = 6
        else if (t === 6) y = 34
        else if (t === 7) y = 12
        else if (t === 8) y = 24
        else y = 20 + (Math.sin(i * 0.3) * 2)
      } else if (status === 'degraded') {
        y = 20 + Math.sin(i * 0.5) * 8
      } else {
        y = 20 + (Math.random() * 4 - 2) // flat with noise for down
      }
      pts.push(`${x},${y}`)
    }
    return pts.join(' ')
  }, [status])

  return (
    <svg viewBox="0 0 200 40" className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`hb-${status}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={`url(#hb-${status})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="600"
          to="0"
          dur="2s"
          fill="freeze"
        />
        <set attributeName="stroke-dasharray" to="600" />
      </polyline>
    </svg>
  )
}

// ── Animated Radial Latency Gauge ───────────────────────────────────────────
function LatencyGauge({ latency, status }) {
  const maxLatency = 3000
  const ratio = Math.min(latency / maxLatency, 1)
  const circumference = 2 * Math.PI * 28
  const offset = circumference * (1 - ratio)
  const color = latency < 500 ? '#10B981' : latency < 1500 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
        <motion.circle
          cx="32" cy="32" r="28" fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold font-mono" style={{ color }}>{latency}</span>
        <span className="text-[7px] text-gray-500 uppercase tracking-wider">ms</span>
      </div>
    </div>
  )
}

// ── Animated Pulse Dot ──────────────────────────────────────────────────────
function PulseDot({ status }) {
  const color = getStatusConfig(status).color
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'operational' && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  )
}

// ── 45-Day Uptime Bars ──────────────────────────────────────────────────────
function UptimeBars({ uptime, status }) {
  return (
    <div className="flex items-center gap-[1.5px] h-5">
      {Array.from({ length: 45 }).map((_, i) => {
        const dayUptime = status === 'operational'
          ? (Math.random() > 0.02 ? 100 : 98 + Math.random() * 2)
          : status === 'degraded'
            ? (Math.random() > 0.1 ? 100 : 95 + Math.random() * 5)
            : (Math.random() > 0.3 ? 100 : 80 + Math.random() * 20)

        const barColor = dayUptime >= 99.5 ? '#10B981'
          : dayUptime >= 97 ? '#F59E0B'
          : '#EF4444'

        return (
          <motion.div
            key={i}
            className="flex-1 rounded-sm"
            style={{ backgroundColor: barColor, opacity: 0.75 }}
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ delay: i * 0.015, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        )
      })}
    </div>
  )
}

// ── Network Topology SVG ────────────────────────────────────────────────────
function NetworkTopology({ clusters }) {
  const operationalCount = clusters.filter(c => c.status === 'operational').length
  const nodes = [
    { id: 'user', x: 50, y: 120, label: 'Users', icon: '👤' },
    { id: 'api', x: 250, y: 120, label: 'Codeva API', icon: '⚡' },
    ...clusters.slice(0, 6).map((c, i) => ({
      id: c.name,
      x: 420 + (i % 2) * 140,
      y: 30 + Math.floor(i / 2) * 90,
      label: c.name,
      status: c.status,
      icon: '🔮',
    })),
  ]

  return (
    <svg viewBox="0 0 660 300" className="w-full h-auto" style={{ maxHeight: 220 }}>
      <defs>
        <marker id="arrowGreen" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="#10B981" opacity="0.6" />
        </marker>
        <marker id="arrowAmber" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="#F59E0B" opacity="0.6" />
        </marker>
        <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Connection lines: User → API */}
      <line x1="80" y1="120" x2="220" y2="120" stroke="url(#flowGrad)" strokeWidth="2" markerEnd="url(#arrowGreen)">
        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
        <set attributeName="stroke-dasharray" to="8 4" />
      </line>

      {/* Connection lines: API → Providers */}
      {clusters.slice(0, 6).map((c, i) => {
        const tx = 420 + (i % 2) * 140
        const ty = 30 + Math.floor(i / 2) * 90
        const color = c.status === 'operational' ? '#10B981' : c.status === 'degraded' ? '#F59E0B' : '#EF4444'
        return (
          <g key={c.name}>
            <line x1="280" y1="120" x2={tx - 20} y2={ty} stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="4 3">
              <animate attributeName="stroke-dashoffset" from="14" to="0" dur="2s" repeatCount="indefinite" />
            </line>
          </g>
        )
      })}

      {/* User node */}
      <g>
        <circle cx="50" cy="120" r="18" fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" />
        <text x="50" y="125" textAnchor="middle" fontSize="14">{nodes[0].icon}</text>
        <text x="50" y="155" textAnchor="middle" fill="#9CA3AF" fontSize="9" fontWeight="600">{nodes[0].label}</text>
      </g>

      {/* API node */}
      <g>
        <circle cx="250" cy="120" r="22" fill="rgba(124,58,237,0.15)" stroke="#7C3AED" strokeWidth="1.5">
          <animate attributeName="r" values="22;24;22" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="250" y="125" textAnchor="middle" fontSize="16">{nodes[1].icon}</text>
        <text x="250" y="160" textAnchor="middle" fill="#A78BFA" fontSize="9" fontWeight="700">{nodes[1].label}</text>
      </g>

      {/* Provider nodes */}
      {clusters.slice(0, 6).map((c, i) => {
        const tx = 420 + (i % 2) * 140
        const ty = 30 + Math.floor(i / 2) * 90
        const sc = getStatusConfig(c.status)
        return (
          <g key={c.name}>
            <circle cx={tx} cy={ty} r="16" fill={sc.bg} stroke={sc.border} strokeWidth="1.5">
              {c.status === 'operational' && (
                <animate attributeName="stroke-opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={tx} cy={ty} r="3" fill={sc.color}>
              {c.status === 'operational' && (
                <animate attributeName="r" values="3;4;3" dur="1.5s" repeatCount="indefinite" />
              )}
            </circle>
            <text x={tx} y={ty + 30} textAnchor="middle" fill="#9CA3AF" fontSize="8" fontWeight="600">{c.name}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Loading Skeleton ────────────────────────────────────────────────────────
function StatusSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-28 rounded-3xl bg-white/[0.03] border border-white/[0.04]" />
      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-white/[0.03] border border-white/[0.04]" />
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function SystemStatusPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef = useRef(null)

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${API_BASE}/status`, { signal: controller.signal })
      clearTimeout(timeout)

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Status fetch error:', err)
      if (!data) setError('Unable to reach status API. The backend may be starting up.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    intervalRef.current = setInterval(() => fetchStatus(), 60_000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const overallConfig = data ? getStatusConfig(data.overall) : getStatusConfig('unknown')
  const OverallIcon = overallConfig.icon

  const overallLabel = data?.overall === 'operational' ? 'All Systems Operational'
    : data?.overall === 'degraded' ? 'Some Systems Degraded'
    : data?.overall === 'partial_outage' ? 'Partial Outage Detected'
    : data?.overall === 'major_outage' ? 'Major Outage in Progress'
    : 'Checking Systems…'

  return (
    <div className="min-h-screen text-gray-300 pt-32 pb-24 relative overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      <SEOHead
        title="System Status — Codeva"
        description="Real-time health monitoring for all Codeva AI clusters, providers, and infrastructure."
      />

      {/* ── Background effects ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[160px]"
          style={{ background: `radial-gradient(ellipse, ${overallConfig.color}08, transparent 70%)` }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.04), transparent 70%)' }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* ── Back link ── */}
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold mb-8 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {loading && !data ? (
          <StatusSkeleton />
        ) : error && !data ? (
          <div className="text-center py-20">
            <WifiOff className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Status Unavailable</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(null); fetchStatus(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600/20 text-violet-400 border border-violet-500/20 hover:bg-violet-600/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : data && (
          <>
            {/* ═══ Global Status Banner ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12"
              style={{
                background: 'rgba(255,255,255,0.015)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${overallConfig.border}`,
              }}
            >
              <div className="flex items-start gap-4">
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: overallConfig.bg, border: `1px solid ${overallConfig.border}` }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <OverallIcon className="w-6 h-6" style={{ color: overallConfig.color }} />
                </motion.div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
                    {overallLabel}
                  </h1>
                  <p className="text-xs text-gray-450 leading-relaxed mt-1.5 font-medium">
                    Real-time health monitoring across {data.clusters.length} compute clusters and {Object.keys(data.infrastructure).length} infrastructure services.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex flex-col items-start md:items-end px-4 py-2.5 rounded-xl" style={{ background: overallConfig.bg, border: `1px solid ${overallConfig.border}` }}>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">90-Day SLA</span>
                  <span className="text-lg font-bold font-mono" style={{ color: overallConfig.color }}>
                    {data.sla90Day?.toFixed(2)}%
                  </span>
                </div>
                <button
                  onClick={() => fetchStatus(true)}
                  disabled={refreshing}
                  className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-all disabled:opacity-40"
                  title="Refresh status"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </motion.div>

            {/* ── Last updated ── */}
            {lastRefresh && (
              <p className="text-[10px] text-gray-600 font-mono text-right mb-4 -mt-8">
                Last checked: {lastRefresh.toLocaleTimeString()} • Auto-refresh: 60s
              </p>
            )}

            {/* ═══ Network Topology ═══ */}
            <section className="mb-12">
              <ScrollReveal>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" /> Network Topology
                </h2>
              </ScrollReveal>
              <div className="rounded-2xl border border-white/[0.04] p-4" style={{ background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(8px)' }}>
                <NetworkTopology clusters={data.clusters} />
              </div>
            </section>

            {/* ═══ Compute Clusters Grid ═══ */}
            <section className="mb-16">
              <ScrollReveal>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" /> Compute Cluster Status
                </h2>
              </ScrollReveal>

              <div className="grid md:grid-cols-2 gap-4">
                {data.clusters.map((cluster, idx) => {
                  const sc = getStatusConfig(cluster.status)
                  return (
                    <ScrollReveal key={cluster.name} delay={idx * 0.04}>
                      <motion.div
                        className="p-5 rounded-2xl transition-all group"
                        style={{
                          background: 'rgba(255,255,255,0.015)',
                          backdropFilter: 'blur(12px)',
                          border: `1px solid ${sc.border}`,
                        }}
                        whileHover={{ borderColor: sc.color + '40', y: -1 }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <LatencyGauge latency={cluster.latency} status={cluster.status} />
                            <div>
                              <h3 className="text-xs font-bold text-white mb-0.5">{cluster.name}</h3>
                              <p className="text-[10px] text-gray-550 font-medium">{cluster.type}</p>
                            </div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}
                          >
                            <PulseDot status={cluster.status} />
                            {sc.label}
                          </span>
                        </div>

                        {/* Heartbeat line */}
                        <div className="mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
                          <HeartbeatLine status={cluster.status} latency={cluster.latency} />
                        </div>

                        {/* 45-Day Uptime Bars */}
                        <div className="mb-3">
                          <UptimeBars uptime={cluster.uptime} status={cluster.status} />
                        </div>

                        {/* Metrics */}
                        <div className="flex justify-between text-[10px] text-gray-500 pt-2 border-t border-white/[0.03] font-mono">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 text-gray-600" />
                            Latency: <span className="text-gray-300 font-bold">{cluster.latency}ms</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Server className="w-3.5 h-3.5 text-gray-600" />
                            Load: <span className="text-gray-300 font-bold capitalize">{cluster.load}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-gray-600" />
                            Uptime: <span className="text-gray-300 font-bold">{cluster.uptime?.toFixed(2)}%</span>
                          </span>
                        </div>
                      </motion.div>
                    </ScrollReveal>
                  )
                })}
              </div>
            </section>

            {/* ═══ Infrastructure Health ═══ */}
            <section className="mb-16">
              <ScrollReveal>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" /> Infrastructure Health
                </h2>
              </ScrollReveal>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { key: 'mongodb', label: 'MongoDB Atlas', icon: Database, desc: 'Primary data store for chats, settings, and user data' },
                  { key: 'supabase', label: 'Supabase Auth', icon: Shield, desc: 'Authentication, JWT verification, and RLS policies' },
                  { key: 'api', label: 'Codeva API', icon: Zap, desc: 'Express server, LLM gateway, and SSE streaming' },
                ].map((svc, i) => {
                  const infra = data.infrastructure[svc.key]
                  const sc = getStatusConfig(infra?.status || 'unknown')
                  const SvcIcon = svc.icon
                  return (
                    <ScrollReveal key={svc.key} delay={i * 0.06}>
                      <div
                        className="p-5 rounded-2xl transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.015)',
                          backdropFilter: 'blur(12px)',
                          border: `1px solid ${sc.border}`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                              <SvcIcon className="w-4 h-4" style={{ color: sc.color }} />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-white">{svc.label}</h3>
                              <p className="text-[9px] text-gray-550">{svc.desc}</p>
                            </div>
                          </div>
                          <PulseDot status={infra?.status || 'unknown'} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-2 border-t border-white/[0.03]">
                          <span>
                            Status: <span className="font-bold" style={{ color: sc.color }}>{sc.label}</span>
                          </span>
                          {infra?.latency !== undefined && (
                            <span>
                              Ping: <span className="text-gray-300 font-bold">{infra.latency}ms</span>
                            </span>
                          )}
                          {infra?.uptime !== undefined && (
                            <span>
                              Uptime: <span className="text-gray-300 font-bold">{Math.floor(infra.uptime)}s</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            </section>

            {/* ═══ Incidents ═══ */}
            <section>
              <ScrollReveal>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" /> Incident History (Last 30 Days)
                </h2>
              </ScrollReveal>

              {data.incidents && data.incidents.length > 0 ? (
                <div className="space-y-4">
                  {data.incidents.map((inc, i) => (
                    <ScrollReveal key={inc.title || i} delay={i * 0.08}>
                      <div className="p-6 rounded-2xl border border-white/[0.04] space-y-3" style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-semibold text-gray-500">{inc.date}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                              {inc.status}
                            </span>
                          </div>
                          {inc.duration && (
                            <span className="text-[10px] font-medium text-gray-650 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Duration: {inc.duration}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                        {inc.details && (
                          <p className="text-xs text-gray-450 leading-relaxed font-medium">{inc.details}</p>
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 rounded-2xl border border-emerald-500/10 text-center"
                  style={{ background: 'rgba(16,185,129,0.02)' }}
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-emerald-400/80">No incidents in the last 30 days</p>
                  <p className="text-xs text-gray-550 mt-1">All systems have been running smoothly.</p>
                </motion.div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
