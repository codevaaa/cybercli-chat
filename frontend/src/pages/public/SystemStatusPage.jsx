import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Server, Activity, Timer, AlertTriangle, Clock, ArrowLeft } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const CLUSTERS = [
  {
    name: 'Madhav (Pro Gateway)',
    type: 'Gemini 2.5 Pro Core',
    status: 'Operational',
    uptime: '99.98%',
    latency: '1.4s',
    load: 'Medium',
  },
  {
    name: 'Nakul (Strategic Reasoning)',
    type: 'Groq Llama-3.1-70B',
    status: 'Operational',
    uptime: '99.95%',
    latency: '0.7s',
    load: 'Light',
  },
  {
    name: 'Bheem (Reliable Core)',
    type: 'OpenRouter GPT-4o Mini',
    status: 'Operational',
    uptime: '99.90%',
    latency: '1.1s',
    load: 'Medium',
  },
  {
    name: 'Arjun (Swift Inference)',
    type: 'Groq Llama-3.1-8B',
    status: 'Operational',
    uptime: '99.99%',
    latency: '0.3s',
    load: 'Light',
  },
  {
    name: 'Sahadeva (Multimodal Gateway)',
    type: 'Gemini 2.5 Flash Core',
    status: 'Operational',
    uptime: '99.97%',
    latency: '0.8s',
    load: 'Light',
  },
  {
    name: 'Vishwakarma (Divine Architect)',
    type: 'Qwen 2.5 Coder 32B',
    status: 'Operational',
    uptime: '99.96%',
    latency: '0.9s',
    load: 'Medium',
  },
  {
    name: 'Kali (Uncensored Flagship)',
    type: 'Dolphin Qwen-72B',
    status: 'Operational',
    uptime: '99.88%',
    latency: '1.5s',
    load: 'Heavy',
  },
  {
    name: 'Panchayat (Council debates)',
    type: 'Consensus API Synthesis Layer',
    status: 'Operational',
    uptime: '99.92%',
    latency: '2.1s',
    load: 'Light',
  },
  {
    name: 'Voice Streaming Sync',
    type: 'Puter ElevenLabs API Bridge',
    status: 'Operational',
    uptime: '99.94%',
    latency: '150ms',
    load: 'Light',
  },
]

export default function SystemStatusPage() {
  const [incidents] = useState([
    {
      date: 'May 24, 2026',
      title: 'Kali Compute Node Under Heavy Load',
      status: 'Resolved',
      duration: '14 mins',
      details: 'Traffic spike triggered queue delays on the Uncensored Flagship cluster. Failover proxies correctly redistributed active free requests to free backup nodes.',
    },
    {
      date: 'May 12, 2026',
      title: 'Panchayat Gateway Router Upgrade',
      status: 'Resolved (Scheduled Maintenance)',
      duration: '8 mins',
      details: 'Scheduled cluster node software updates completed successfully. Uptime SLA metrics remained unaffected.',
    },
  ])

  return (
    <div className="min-h-screen bg-[#07070a] text-gray-300 pt-32 pb-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-accent/5 rounded-full blur-[130px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-semibold mb-8 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Global Operational Header */}
        <div className="border border-emerald-500/20 bg-emerald-950/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">All Systems Operational</h1>
              <p className="text-xs text-gray-450 leading-relaxed mt-1.5 font-medium">
                Our mythology-themed compute clusters and unified API routes are performing normally. No active disruptions.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end flex-shrink-0 bg-emerald-950/20 px-4 py-2.5 rounded-xl border border-emerald-500/10">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">90-Day SLA</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">99.96%</span>
          </div>
        </div>

        {/* Cluster list grid */}
        <section className="mb-16">
          <ScrollReveal>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Compute Cluster Status</h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-4">
            {CLUSTERS.map((cluster, idx) => (
              <ScrollReveal key={cluster.name} delay={idx * 0.04}>
                <div className="p-5 rounded-2xl border border-white/[0.04] bg-[#0c0c12]/60 hover:border-white/[0.08] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-white mb-0.5">{cluster.name}</h3>
                      <p className="text-[10px] text-gray-550 font-medium">{cluster.type}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {cluster.status}
                    </span>
                  </div>

                  {/* 90-Day Visual Uptime Bars */}
                  <div className="flex items-center gap-[2px] h-4 mb-4">
                    {Array.from({ length: 45 }).map((_, i) => {
                      const isIncident = i === 12 && cluster.name.includes('Kali')
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-full rounded-sm opacity-80 ${isIncident ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          title={isIncident ? 'Load Incident on May 24' : 'Operational'}
                        />
                      )
                    })}
                  </div>

                  {/* Metrics */}
                  <div className="flex justify-between text-[10px] text-gray-500 pt-2 border-t border-white/[0.03] font-mono">
                    <span className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-gray-600" />
                      Latency: <span className="text-gray-300 font-bold">{cluster.latency}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Server className="w-3.5 h-3.5 text-gray-600" />
                      Load: <span className="text-gray-300 font-bold">{cluster.load}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-gray-600" />
                      Uptime: <span className="text-gray-300 font-bold">{cluster.uptime}</span>
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Incidents logs */}
        <section>
          <ScrollReveal>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Incident History (Last 30 Days)</h2>
          </ScrollReveal>

          <div className="space-y-4">
            {incidents.map((inc, i) => (
              <ScrollReveal key={inc.title} delay={i * 0.08}>
                <div className="p-6 rounded-2xl border border-white/[0.04] bg-[#0c0c12]/30 space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-semibold text-gray-500">{inc.date}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                        {inc.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-650 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Duration: {inc.duration}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                  <p className="text-xs text-gray-450 leading-relaxed font-medium">
                    {inc.details}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
