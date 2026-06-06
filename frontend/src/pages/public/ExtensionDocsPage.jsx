import { Link } from 'react-router-dom'
import { Tooltip } from '@components/ui/Tooltip'
import { Code2, Terminal, Zap, Shield, Key, Download, ArrowRight, CheckCircle2 } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import SEOHead from '@components/seo/SEOHead'

/**
 * /docs/vscode-extension — Full documentation for the CyberCoder VS Code extension.
 */

const TOOLS = [
  { name: 'read_file', desc: 'Read any file in the workspace (with line numbers)' },
  { name: 'list_dir', desc: 'List directory contents' },
  { name: 'grep', desc: 'Search the codebase for patterns' },
  { name: 'write_file', desc: 'Create or overwrite files (shows diff)' },
  { name: 'edit_file', desc: 'Surgical string replacement in files' },
  { name: 'run_command', desc: 'Execute shell commands (build, test, install)' },
  { name: 'git', desc: 'Git operations (status, diff, add, commit, branch, push)' },
  { name: 'spawn_subagent', desc: 'Delegate tasks to parallel sub-agents' },
  { name: 'schedule_task', desc: 'Schedule tasks for later or recurring execution' },
]

const MODES = [
  { name: 'Ask before edits', desc: 'Asks approval for every file change. Safest.' },
  { name: 'Edit automatically', desc: 'Edits without asking (shows diffs). Fast.' },
  { name: 'Plan mode', desc: 'Read-only exploration, presents a plan first.' },
  { name: 'Auto mode', desc: 'AI decides the permission level per action.' },
  { name: 'Bypass permissions', desc: 'No approval needed. Use with caution.' },
]

export default function ExtensionDocsPage() {
  return (
    <div className="min-h-screen bg-[#1a1a18] pt-32 pb-20 px-6">
      <SEOHead title="CyberCoder VS Code Extension — Documentation" path="/docs/vscode-extension" />
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <h1 className="text-3xl font-serif font-normal text-[#f5f4ef] mb-3" style={{ fontFamily: "'Instrument Serif', serif" }}>CyberCoder for VS Code</h1>
          <p className="text-sm text-gray-400 mb-10 max-w-lg">Full documentation for the agentic AI coding extension. Read/write files, run commands, search code, git operations — all from your editor.</p>
        </ScrollReveal>

        {/* Install */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#f5f4ef] mb-4 flex items-center gap-2"><Download className="w-5 h-5 text-[#C96442]" /> Install</h2>
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] space-y-3">
              <p className="text-sm text-gray-300">Option 1: Download the .vsix from the <Link to="/downloads" className="text-[#C96442] hover:underline">Downloads page</Link> and install via Extensions → "…" → Install from VSIX.</p>
              <p className="text-sm text-gray-300">Option 2: From the VS Code Marketplace (search "CyberCoder").</p>
              <code className="block bg-black/20 px-3 py-2 rounded-lg text-xs text-gray-300 font-mono">code --install-extension cybercoder.vsix --force</code>
            </div>
          </section>
        </ScrollReveal>

        {/* Auth */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#f5f4ef] mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-[#C96442]" /> Authentication</h2>
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] space-y-3">
              <p className="text-sm text-gray-300">The extension supports multiple auth methods:</p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /> <b className="text-gray-200">Codeva API Key</b> — create at <Link to="/api-keys" className="text-[#C96442] hover:underline">/api-keys</Link>, paste in extension</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /> <b className="text-gray-200">BYOK (Anthropic/OpenAI/Groq/Gemini)</b> — paste your provider key directly</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" /> <b className="text-gray-200">Ollama (local/cloud)</b> — set host, pick model (gemma4:31b-cloud, kimi-k2.5:cloud, etc.)</li>
              </ul>
            </div>
          </section>
        </ScrollReveal>

        {/* Tools */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#f5f4ef] mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-[#C96442]" /> Agentic Tools ({TOOLS.length})</h2>
            <div className="rounded-2xl border border-white/[0.06] bg-[#211f1c] divide-y divide-white/[0.04]">
              {TOOLS.map(t => (
                <div key={t.name} className="px-5 py-3 flex items-center gap-3">
                  <code className="text-xs font-mono text-[#C96442] bg-[#C96442]/10 px-2 py-0.5 rounded">{t.name}</code>
                  <span className="text-sm text-gray-400">{t.desc}</span>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Modes */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#f5f4ef] mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-[#C96442]" /> Permission Modes</h2>
            <div className="rounded-2xl border border-white/[0.06] bg-[#211f1c] divide-y divide-white/[0.04]">
              {MODES.map(m => (
                <div key={m.name} className="px-5 py-3">
                  <p className="text-sm font-medium text-[#f5f4ef]">{m.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">Switch modes via the mode indicator in the composer, or press ⇧+Tab.</p>
          </section>
        </ScrollReveal>

        {/* Models */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#f5f4ef] mb-4 flex items-center gap-2"><Code2 className="w-5 h-5 text-[#C96442]" /> Available Models</h2>
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] space-y-2 text-sm text-gray-400">
              <p><b className="text-gray-200">Codeva:</b> Madhav, Bheem, Arjun, Chanakya, Vishwakarma, Panchayat (Council)</p>
              <p><b className="text-gray-200">Anthropic:</b> Claude 3.5 Sonnet, Haiku</p>
              <p><b className="text-gray-200">OpenAI:</b> GPT-4o, GPT-4o-mini</p>
              <p><b className="text-gray-200">Groq (free):</b> Llama 3.3 70B, Llama 3.1 8B</p>
              <p><b className="text-gray-200">Gemini (free):</b> 2.0 Flash, 2.5 Pro</p>
              <p><b className="text-gray-200">Ollama Cloud:</b> kimi-k2.5:cloud, glm-5:cloud, minimax-m2.7:cloud, qwen3.5:cloud, gemma4:31b-cloud</p>
              <p><b className="text-gray-200">Ollama Local:</b> llama3.2, qwen2.5-coder:32b, any installed model</p>
            </div>
          </section>
        </ScrollReveal>

        {/* Keyboard shortcuts */}
        <ScrollReveal>
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-[#f5f4ef] mb-4">Keyboard Shortcuts</h2>
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c] space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Open CyberCoder</span><code className="text-xs text-gray-300 bg-black/20 px-2 py-0.5 rounded">Ctrl+Shift+I</code></div>
              <div className="flex justify-between"><span className="text-gray-400">Add selection to chat</span><code className="text-xs text-gray-300 bg-black/20 px-2 py-0.5 rounded">Ctrl+Shift+L</code></div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Tooltip content="Visit the Help Center">
              <Link to="/help" className="px-5 py-2.5 rounded-xl bg-[#C96442] text-white text-sm font-semibold hover:bg-[#b9573a] transition-colors">Help Center</Link>
            </Tooltip>
            <Tooltip content="Learn more about the CLI">
              <Link to="/product" className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-[#f5f4ef] text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-1.5">CyberCoder CLI <ArrowRight className="w-3.5 h-3.5" /></Link>
            </Tooltip>
          </div>
        </ScrollReveal>
      </div>
    </div>
  )
}
