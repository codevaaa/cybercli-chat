import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Clock, Zap, MessageSquare, Cpu, Layers } from 'lucide-react'

export default function UsagePage() {
  const [tierLimit] = useState({
    name: 'Free Tier',
    messagesSent: 124,
    messagesLimit: 1000,
    resetDate: 'June 1, 2026'
  })

  // Simulated 7-day usage data
  const weeklyUsage = [12, 18, 15, 24, 32, 10, 13]
  const maxVal = Math.max(...weeklyUsage)
  const minVal = Math.min(...weeklyUsage)
  const svgPath = weeklyUsage
    .map((val, index) => {
      const x = (index / (weeklyUsage.length - 1)) * 100
      const y = 80 - ((val - minVal) / (maxVal - minVal || 1)) * 60
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const modelBreakdown = [
    { name: 'Arjun (Swift)', count: 68, percentage: 55, color: '#10B981' },
    { name: 'Bheem (Core)', count: 32, percentage: 26, color: '#3B82F6' },
    { name: 'Madhav (Flagship)', count: 18, percentage: 14, color: '#F59E0B' },
    { name: 'Panchayat (Council)', count: 6, percentage: 5, color: '#D97757' }
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background-primary text-foreground-primary">
      <div className="section-padding">
        <div className="container-custom max-w-4xl">
          <div>
            <Link to="/chat" className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground-primary transition-colors mb-4 group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to chat
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Usage Statistics</h1>
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
                  {tierLimit.name}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground-secondary">Messages Sent</span>
                  <span className="text-foreground-primary">{tierLimit.messagesSent} / {tierLimit.messagesLimit}</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden border border-border-subtle/30">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(tierLimit.messagesSent / tierLimit.messagesLimit) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-foreground-muted flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Usage limit resets on {tierLimit.resetDate}
                </p>
              </div>

              {/* Sparkline */}
              <div className="space-y-3 pt-6 border-t border-border-subtle/30">
                <h4 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  7-Day Request Activity
                </h4>
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
              </div>
            </div>

            {/* Model Breakdown */}
            <div className="md:col-span-4 card p-6 space-y-6">
              <h3 className="text-sm font-bold text-foreground-primary uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-border-subtle/50">
                <Cpu className="w-4.5 h-4.5 text-accent" />
                Model Distribution
              </h3>

              <div className="space-y-4">
                {modelBreakdown.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground-secondary">{item.name}</span>
                      <span className="text-foreground-primary font-mono">{item.count} ({item.percentage}%)</span>
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
