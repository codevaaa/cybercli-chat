import { Link } from 'react-router-dom'
import { Terminal, Key, Globe, Cpu, Zap, ArrowRight, ExternalLink } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

/**
 * /providers — Provider setup guide. Shows how to connect each AI provider
 * (Codeva, Anthropic, OpenAI, Groq, Gemini, Ollama) to the CLI and extension.
 */

const PROVIDERS = [
  {
    id: 'codeva',
    name: 'Codeva Cloud',
    desc: 'Use your Codeva subscription (Free/Pro/Max). 30+ models routed automatically by plan.',
    color: '#C96442',
    steps: ['Create an account at /auth/signup', 'Go to /api-keys and create a key', 'In CLI: cm login --key sk_cyber_…', 'In VS Code: CyberCoder → Sign In → paste key'],
    free: true,
    link: '/api-keys',
  },
  {
    id: 'groq',
    name: 'Groq',
    desc: 'Free, blazing fast. Llama 3.3 70B in sub-second. Get a key at console.groq.com.',
    color: '#10B981',
    steps: ['Go to console.groq.com → API Keys → Create', 'Copy the key (starts with gsk_)', 'In CLI: cm /update-config → set groq key', 'In VS Code: CyberCoder → Connect Provider → Groq → paste'],
    free: true,
    link: 'https://console.groq.com',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    desc: 'Free tier available. Gemini 2.0 Flash (fast) and 2.5 Pro (deep reasoning).',
    color: '#4285F4',
    steps: ['Go to aistudio.google.com → Get API Key', 'Copy the key (starts with AIza)', 'In CLI: cm /update-config → set gemini key', 'In VS Code: CyberCoder → Connect Provider → Gemini → paste'],
    free: true,
    link: 'https://aistudio.google.com',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    desc: 'Claude 3.5 Sonnet/Haiku. Requires a paid API key from console.anthropic.com.',
    color: '#D97757',
    steps: ['Go to console.anthropic.com → API Keys', 'Copy the key (starts with sk-ant-)', 'In CLI: cm /update-config → set anthropic key', 'In VS Code: CyberCoder → Connect Provider → Anthropic → paste'],
    free: false,
    link: 'https://console.anthropic.com',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    desc: 'GPT-4o and GPT-4o-mini. Requires a paid API key from platform.openai.com.',
    color: '#10A37F',
    steps: ['Go to platform.openai.com → API Keys', 'Copy the key (starts with sk-)', 'In CLI: cm /update-config → set openai key', 'In VS Code: CyberCoder → Connect Provider → OpenAI → paste'],
    free: false,
    link: 'https://platform.openai.com',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local + Cloud)',
    desc: 'Run models locally (no internet) or use cloud models (kimi-k2.5, gemma4:31b, minimax-m2.7) without a GPU.',
    color: '#8B5CF6',
    steps: ['Install Ollama: ollama.com/download', 'Run: ollama serve', 'Cloud models: ollama/kimi-k2.5:cloud, ollama/gemma4:31b-cloud, ollama/minimax-m2.7:cloud', 'In VS Code: Connect Provider → Ollama → host (default localhost:11434)'],
    free: true,
    link: 'https://ollama.com/download',
  },
]

export default function ProvidersPage() {
  return (
    <div className="min-h-screen bg-[#1a1a18] pt-32 pb-20 px-6">
      <SEOHead title="Connect AI Providers — Codeva & CyberCoder" path="/providers" />
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <h1 className="text-3xl font-serif font-normal text-[#f5f4ef] text-center mb-3" style={{ fontFamily: "'Instrument Serif', serif" }}>Connect a Provider</h1>
          <p className="text-center text-sm text-gray-400 mb-12 max-w-xl mx-auto">
            CyberCoder works with multiple AI providers. Pick one (or several) and connect your key. Free options available.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-5">
          {PROVIDERS.map((p, i) => (
            <ScrollReveal key={p.id} delay={i * 0.05}>
              <div className="p-6 rounded-2xl border border-white/[0.06] bg-[#211f1c] h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-[#f5f4ef]">{p.name}</h2>
                  {p.free && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">FREE</span>}
                </div>
                <p className="text-sm text-gray-400 mb-4 flex-grow">{p.desc}</p>
                <ol className="space-y-2 mb-5">
                  {p.steps.map((s, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{j + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <a href={p.link.startsWith('/') ? undefined : p.link} target={p.link.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: p.color }}>
                  {p.link.startsWith('/') ? <Link to={p.link} className="flex items-center gap-1.5" style={{ color: p.color }}>Get started <ArrowRight className="w-3.5 h-3.5" /></Link> : <>{p.name} Console <ExternalLink className="w-3 h-3" /></>}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.3}>
          <div className="mt-12 p-6 rounded-2xl border border-white/[0.06] bg-[#211f1c] text-center">
            <h3 className="text-lg font-semibold text-[#f5f4ef] mb-2">Need help?</h3>
            <p className="text-sm text-gray-400 mb-4">Check the Help Center or contact support.</p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/help" className="px-5 py-2 rounded-xl bg-[#C96442] text-white text-sm font-semibold hover:bg-[#b9573a] transition-colors">Help Center</Link>
              <Link to="/docs" className="px-5 py-2 rounded-xl border border-white/[0.1] text-[#f5f4ef] text-sm font-medium hover:bg-white/5 transition-colors">Documentation</Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
