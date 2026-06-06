import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Clock, Zap, MessageSquare, Cpu } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { Tooltip } from '../../components/ui/Tooltip.jsx'
import api from '../../lib/api'

export default function UsagePage() {
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['usageStats'],
    queryFn: async () => {
      const [statsRes, historyRes] = await Promise.all([
        api.get('/usage'),
        api.get('/usage/history')
      ])
      return {
        stats: statsRes.data,
        history: historyRes.data.history || []
      }
    }
  })

  const stats = data?.stats || {
    total_messages: 0,
    total_tokens_in: 0,
    total_tokens_out: 0,
    current_plan: 'free',
    rate_limit_remaining: 50,
    rate_limit_total: 50
  }
  const history = data?.history || []

  // Calculate 7-day weekly usage data
  const today = new Date()
  const weeklyUsage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(today.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    
    // Sum requests for this date
    const dayHistory = history.filter(h => h.date === dateStr)
    const daySum = dayHistory.reduce((sum, h) => sum + h.requests, 0)
    return daySum
  })

  const maxVal = Math.max(...weeklyUsage, 1)
  const minVal = Math.min(...weeklyUsage)
  const svgPath = weeklyUsage
    .map((val, index) => {
      const x = (index / (weeklyUsage.length - 1)) * 100
      const y = 80 - ((val - minVal) / (maxVal - minVal || 1)) * 60
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  // Calculate Model breakdown percentages
  const modelMap = {}
  let totalRequests = 0
  history.forEach(h => {
    const model = h.model || 'Unknown'
    modelMap[model] = (modelMap[model] || 0) + h.requests
    totalRequests += h.requests
  })

  const colors = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#06B6D4', '#F43F5E']
  const modelBreakdown = Object.entries(modelMap).map(([name, count], index) => {
    const percentage = totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0
    return {
      name,
      count,
      percentage,
      color: colors[index % colors.length]
    }
  }).sort((a, b) => b.count - a.count)

  const planName = stats.current_plan === 'pro' ? 'Pro Tier' : 'Free Tier'
  const messagesSent = stats.total_messages
  const messagesLimit = stats.rate_limit_total
  const percentUsed = Math.min(100, Math.round((messagesSent / (messagesLimit || 1)) * 100))

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary">
        <div className="section-padding">
          <div className="container-custom max-w-4xl space-y-10">
            <div className="space-y-4">
              <Skeleton variant="text" width="40%" className="h-8" />
              <Skeleton variant="text" width="60%" />
            </div>
            <div className="grid md:grid-cols-12 gap-6 mt-10">
              <div className="md:col-span-8 card p-6 space-y-6">
                <Skeleton variant="rectangular" className="w-full h-8" />
                <Skeleton variant="rectangular" className="w-full h-32" />
              </div>
              <div className="md:col-span-4 card p-6 space-y-6">
                <Skeleton variant="rectangular" className="w-full h-8" />
                <Skeleton variant="rectangular" className="w-full h-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 card p-6 max-w-sm text-center">
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold">Error Loading Statistics</h2>
          <p className="text-xs text-foreground-muted">{error.message || 'Failed to load'}</p>
          <Link to="/chat" className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg transition-colors">
            Back to chat
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary">
      <div className="section-padding">
        <div className="container-custom max-w-4xl">
          <div>
            <Tooltip content="Return to Chat" position="right">
              <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground-primary transition-colors mb-4 group">
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Back to chat
              </Link>
            </Tooltip>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight animate-fade-in">Usage Statistics</h1>
            <p className="text-xs text-foreground-muted mt-1 leading-normal">
              Monitor your compute gateway tokens, message history, and current limits.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-6 mt-10">
            {/* Limit Tracker Card */}
            <div className="md:col-span-8 card p-6 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-border-subtle/50">
                <h3 className="text-sm font-bold text-foreground-primary uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-accent" />
                  Monthly Message Usage
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent uppercase tracking-wide">
                  {planName}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground-secondary">Messages Sent</span>
                  <span className="text-foreground-primary">{messagesSent} / {messagesLimit}</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden border border-border-subtle/30">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentUsed}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-background-secondary border border-border-subtle/20">
                    <span className="block text-[10px] text-foreground-muted uppercase font-bold tracking-wider">Tokens In</span>
                    <span className="text-sm font-mono font-bold text-foreground-primary">{stats.total_tokens_in.toLocaleString()}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-background-secondary border border-border-subtle/20">
                    <span className="block text-[10px] text-foreground-muted uppercase font-bold tracking-wider">Tokens Out</span>
                    <span className="text-sm font-mono font-bold text-foreground-primary">{stats.total_tokens_out.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-[10px] text-foreground-muted flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Usage limit resets automatically with your tier plan billing cycle.
                </p>
              </div>

              {/* Sparkline */}
              <div className="space-y-3 pt-6 border-t border-border-subtle/30">
                <h4 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  7-Day Request Activity
                </h4>
                {totalRequests === 0 ? (
                  <div className="h-20 flex items-center justify-center border border-dashed border-border-subtle/30 rounded-lg text-[11px] text-foreground-muted">
                    No request activity recorded in the last 7 days.
                  </div>
                ) : (
                  <>
                    <div className="h-20 w-full relative pt-2">
                      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 80" preserveAspectRatio="none">
                        <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                        <line x1="0" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                        
                        <motion.path
                          d={svgPath}
                          fill="none"
                          stroke="#7C3AED"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                      <span>7 days ago</span>
                      <span>Today</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Model Breakdown */}
            <div className="md:col-span-4 card p-6 space-y-6">
              <h3 className="text-sm font-bold text-foreground-primary uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-border-subtle/50">
                <Cpu className="w-4.5 h-4.5 text-accent" />
                Model Distribution
              </h3>

              {modelBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-foreground-muted">
                  No model usage data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {modelBreakdown.map((item) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-foreground-secondary truncate max-w-[150px]" title={item.name}>{item.name}</span>
                        <span className="text-foreground-primary font-mono text-[11px]">{item.count} ({item.percentage}%)</span>
                      </div>
                      <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-foreground-muted leading-relaxed pt-4 border-t border-border-subtle/30 font-medium">
                * Swift models consume 1 request quota token. Flagship models consume 5 tokens due to larger resource requirements.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

