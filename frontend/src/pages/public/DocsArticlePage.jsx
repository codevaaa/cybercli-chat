import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, Menu, Clock, Calendar, ThumbsUp, ThumbsDown, Sparkles, Hash, ArrowLeft, ArrowRight, Zap, Bug
} from 'lucide-react'
import { CATEGORIES, DocsSidebar } from './DocsPage'

/* ─── Callout Components ─── */
export function Note({ children }) {
  return (
    <div className="my-5 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex gap-3 text-[13px] leading-relaxed text-foreground-secondary">
      <div className="text-accent flex-shrink-0 font-bold uppercase tracking-wider text-[10px] mt-0.5 px-2 py-0.5 rounded bg-accent/10 border border-accent/20">Note</div>
      <div className="flex-1 mt-0.5">{children}</div>
    </div>
  )
}

export function Tip({ children }) {
  return (
    <div className="my-5 p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.02] flex gap-3 text-[13px] leading-relaxed text-foreground-secondary">
      <div className="text-emerald-400 flex-shrink-0 font-bold uppercase tracking-wider text-[10px] mt-0.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Tip</div>
      <div className="flex-1 mt-0.5">{children}</div>
    </div>
  )
}

export function Warning({ children }) {
  return (
    <div className="my-5 p-4 rounded-xl border border-[#D97757]/20 bg-[#D97757]/[0.03] flex gap-3 text-[13px] leading-relaxed text-foreground-secondary">
      <div className="text-[#D97757] flex-shrink-0 font-bold uppercase tracking-wider text-[10px] mt-0.5 px-2 py-0.5 rounded bg-[#D97757]/10 border border-[#D97757]/20">Warning</div>
      <div className="flex-1 mt-0.5">{children}</div>
    </div>
  )
}

export function Caution({ children }) {
  return (
    <div className="my-5 p-4 rounded-xl border border-rose-500/10 bg-rose-500/[0.02] flex gap-3 text-[13px] leading-relaxed text-foreground-secondary">
      <div className="text-rose-400 flex-shrink-0 font-bold uppercase tracking-wider text-[10px] mt-0.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">Caution</div>
      <div className="flex-1 mt-0.5">{children}</div>
    </div>
  )
}

/* ─── Article content database ─── */
const ARTICLE_CONTENT = {
  'quick-start-guide': {
    title: 'Quick Start Guide',
    category: 'Getting Started',
    categoryId: 'getting-started',
    lastUpdated: 'May 18, 2026',
    readTime: '3 min',
    intro: 'Get up and running with CyberCli Chat in under 5 minutes.',
    sections: [
      {
        id: 'create-account',
        heading: 'Step 1: Create an Account',
        content: `Sign up with your email, Google, or GitHub account. You'll receive a verification email — click the link to activate your account. Free accounts get full access to all free-tier models immediately.`,
      },
      {
        id: 'first-chat',
        heading: 'Step 2: Start Your First Chat',
        content: `Click "New Chat" from the sidebar. Select any model from the model picker (we recommend Gemini 2.5 Flash to start). Type your first message and press Enter. Your response streams in real time.`,
      },
      {
        id: 'explore-features',
        heading: 'Step 3: Explore Key Features',
        content: `Once comfortable with basic chat, try these power features: Council Mode (three models debate your question), Voice Chat (hold spacebar to talk), and Conversation Branching (right-click any message to fork a new thread).`,
      },
      {
        id: 'keyboard-shortcuts',
        heading: 'Useful Keyboard Shortcuts',
        content: `Press Ctrl+K to open the command palette. Use Ctrl+Enter to send a message. Press Escape to cancel a streaming response. Use Alt+N for a new chat thread.`,
      },
    ],
  },
  'changelog': {
    title: 'Changelog',
    category: 'Getting Started',
    categoryId: 'getting-started',
    lastUpdated: 'May 21, 2026',
    readTime: '3 min',
    intro: 'Keep up with the latest features, improvements, and updates to the CyberCli Chat platform.',
    sections: [
      {
        id: 'v1-3-0',
        heading: 'v1.3.0 — May 21, 2026',
        content: (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground-primary">Claude-style chat interface, voice waveform & Lenis scroll</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Claude-style streaming chat interface with threaded conversation history</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Voice waveform modal with real-time audio visualization</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Lenis smooth scroll integrated across all public pages</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Improved</span>
                <span>Message rendering performance — 40% faster on long threads</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Improved</span>
                <span>Mobile sidebar: swipe-to-close gesture support</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Fixed</span>
                <span>SSE stream truncation on slow connections</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'v1-2-0',
        heading: 'v1.2.0 — May 10, 2026',
        content: (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground-primary">Council Mode synthesis engine & conversation branching</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Council Mode: synthesize responses from multiple AI models simultaneously</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Conversation branching — fork any message into a parallel thread</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Fork API endpoint: POST /api/v1/chat/:id/fork</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Improved</span>
                <span>Provider routing: automatic fallback when primary model is unavailable</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Fixed</span>
                <span>Race condition in concurrent council mode requests</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'v1-1-0',
        heading: 'v1-1-0 — April 28, 2026',
        content: (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground-primary">ElevenLabs TTS via Puter.js & 5 voice models</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>ElevenLabs text-to-speech via Puter.js (unlimited, client-side)</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>5 voice models: Aria, Brian, Callum, Charlotte, Daniel</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Voice settings panel: speed, pitch, stability controls</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Improved</span>
                <span>Voice playback: buffer-based streaming for lower latency</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Fixed</span>
                <span>Voice not stopping when navigating away from chat</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'v1-0-0',
        heading: 'v1.0.0 — April 15, 2026',
        content: (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground-primary">Initial launch — 8 AI providers & folder organization</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Proprietary multi-cluster AI gateway containing 8 distributed high-performance computing clusters</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Basic chat with streaming responses and markdown rendering</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Folder organization for conversation history</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Supabase auth with JWT and Row Level Security</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>MongoDB Atlas for chat and message persistence</span>
              </li>
            </ul>
          </div>
        )
      },
      {
        id: 'v0-9-0',
        heading: 'v0.9.0 Beta — April 1, 2026',
        content: (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground-primary">Beta launch — public pages, auth system & design system</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Full public marketing website: Home, Features, Models, Pricing, Contact, About</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Auth system: Signup, Login, Forgot Password, Magic Link, Email Verify</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20 uppercase tracking-wider mt-0.5 flex-shrink-0">New</span>
                <span>Design system: dark theme with terracotta accent, Inter typography</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Improved</span>
                <span>TailwindCSS v4 configuration with custom design tokens</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-foreground-secondary">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider mt-0.5 flex-shrink-0">Fixed</span>
                <span>Hydration issues on public pages with Framer Motion</span>
              </li>
            </ul>
          </div>
        )
      }
    ]
  },
  'council-mode-deep-dive': {
    title: 'Council Mode Deep Dive',
    category: 'Advanced Features',
    categoryId: 'advanced-features',
    lastUpdated: 'May 15, 2026',
    readTime: '7 min',
    intro: 'Council Mode is CyberCli\'s flagship feature — it sends your question to three AI models simultaneously and synthesizes the best answer.',
    sections: [
      {
        id: 'how-it-works',
        heading: 'How Council Mode Works',
        content: `When you enable Council Mode, your query is dispatched to three different models chosen based on the task type. Each model responds independently. A synthesis model then reads all three responses and generates a unified, best-of-all-worlds answer with citations to which model contributed what insight.`,
      },
      {
        id: 'choosing-models',
        heading: 'Choosing Your Council',
        content: `By default, CyberCli auto-selects the best three models for your query. You can manually pick models from the Council Configuration panel. We recommend combining a reasoning model (Cyber-Smart), a creative model (Cyber-Pro), and a fast model (Cyber-Fast) for general use.`,
      },
      {
        id: 'when-to-use',
        heading: 'When to Use Council Mode',
        content: `Council Mode excels at complex research questions, Nuanced ethical dilemmas, creative projects requiring multiple perspectives, and any task where a single model's bias might mislead. It's less ideal for quick factual lookups or simple coding tasks where speed matters more than depth.`,
      },
      {
        id: 'reading-output',
        heading: 'Reading Council Output',
        content: `The synthesis output includes color-coded attribution showing which parts came from which model. You can expand any individual model's raw response using the "Show Individual Responses" toggle. Each model response also shows a confidence indicator.`,
      },
    ],
  },
  'authentication-api-keys': {
    title: 'Authentication & API Keys',
    category: 'API Reference',
    categoryId: 'api-reference',
    lastUpdated: 'May 21, 2026',
    readTime: '5 min',
    intro: 'Learn how to authenticate with the CyberCli API using JWT tokens and long-lived API keys.',
    sections: [
      {
        id: 'jwt-auth',
        heading: 'JWT Authentication',
        content: (
          <div className="space-y-3">
            <p>All user-facing client API requests must include an Authorization header with a Bearer token. To authenticate via JWT, send a POST request with user credentials to the login route:</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`curl -X POST https://api.cybermindcli.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "password": "yourpassword"}'`}</code>
            </pre>
            <p>This returns a JSON payload containing your access JWT token. Pass this token in the header of subsequent requests:</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`Authorization: Bearer <your_jwt_token>`}</code>
            </pre>
          </div>
        ),
      },
      {
        id: 'api-keys',
        heading: 'Creating API Keys',
        content: (
          <div className="space-y-3">
            <p>For server-to-server integrations, automated scripts, or local CLI daemon setups, generate an API key from <strong>Settings → Developer Settings</strong>. These keys start with the prefix <code>sk_cyber_</code> and do not expire unless explicitly revoked.</p>
            <Caution>
              Treat your API keys as passwords. Never expose them in public GitHub repositories, client-side browser code, or shared execution logs.
            </Caution>
            <p>Pass the API key in the standard Authorization header:</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`Authorization: Bearer sk_cyber_live_...`}</code>
            </pre>
          </div>
        ),
      },
      {
        id: 'scopes',
        heading: 'Permission Scopes',
        content: (
          <div className="space-y-3">
            <p>Granular access control can be assigned to API keys during creation to restrict permissions. The following scopes are supported:</p>
            <div className="overflow-x-auto my-4 rounded-xl border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs text-foreground-secondary">
                <thead>
                  <tr className="bg-background-secondary border-b border-border-subtle text-foreground-primary font-semibold">
                    <th className="p-3">Scope</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr>
                    <td className="p-3 font-mono text-accent">chat:read</td>
                    <td className="p-3">Retrieve details and message lists of chat threads.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">chat:write</td>
                    <td className="p-3">Create new chats, send messages, and fork conversation branches.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">models:read</td>
                    <td className="p-3">List available AI models and their technical parameters.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">tts:read</td>
                    <td className="p-3">Call Gemini Flash TTS and ElevenLabs text-to-speech generators.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        id: 'supabase-redirect-troubleshooting',
        heading: 'Supabase Dynamic Redirect Troubleshooting',
        content: (
          <div className="space-y-3">
            <p>When running in a staging or production environment, authentication verification emails (such as Signup confirmation or Magic Links) may redirect you to a broken <code>localhost:5173</code> URL.</p>
            <Tip>
              <strong className="block mb-1 text-foreground-primary">Dynamic Redirect Troubleshooting</strong>
              Supabase ignores custom <code>emailRedirectTo</code> query parameters unless the redirect domain is explicitly whitelisted. By default, it falls back to the default Site URL configured in the dashboard (usually localhost in development).
            </Tip>
            <p className="font-semibold mt-4">To resolve this in your Supabase Console:</p>
            <ol className="list-decimal list-inside space-y-2 pl-1 text-sm text-foreground-secondary">
              <li>Navigate to <strong>Authentication → URL Configuration</strong> in the sidebar.</li>
              <li>Under <strong>Redirect URLs</strong>, click the <strong>Add URL</strong> button.</li>
              <li>Enter your production domain (e.g. <code>https://cybercli-chat.vercel.app</code> or <code>https://cybermindcli.com</code>).</li>
              <li>Set the base <strong>Site URL</strong> to your staging or production domain as needed.</li>
              <li>Save changes and retry verification.</li>
            </ol>
          </div>
        ),
      },
    ],
  },
  'chat-completions-endpoint': {
    title: 'Chat Completions Endpoint',
    category: 'API Reference',
    categoryId: 'api-reference',
    lastUpdated: 'May 21, 2026',
    readTime: '6 min',
    intro: 'Send messages, select models, and stream completions from the unified AI Gateway.',
    sections: [
      {
        id: 'endpoint-headers',
        heading: 'Endpoint & Headers',
        content: (
          <div className="space-y-3">
            <p>Initiate text generation or Council Mode completions through our primary completion API route. The request must use a POST method with headers specifying JSON payload formatting and authentication.</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`POST /api/v1/chat/completions HTTP/1.1
Host: api.cybermindcli.com
Authorization: Bearer sk_cyber_live_...
Content-Type: application/json`}</code>
            </pre>
          </div>
        ),
      },
      {
        id: 'request-payload',
        heading: 'Request Payload Settings',
        content: (
          <div className="space-y-3">
            <p>Configure the request by submitting a JSON payload in the request body. Below are the supported properties:</p>
            <div className="overflow-x-auto my-4 rounded-xl border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs text-foreground-secondary">
                <thead>
                  <tr className="bg-background-secondary border-b border-border-subtle text-foreground-primary font-semibold">
                    <th className="p-3">Field</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Required</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr>
                    <td className="p-3 font-mono text-accent">model</td>
                    <td className="p-3 font-mono">string</td>
                    <td className="p-3 font-semibold text-green-600 dark:text-green-400">Yes</td>
                    <td className="p-3">Target model, e.g. <code>gemini/gemini-2.5-flash</code>, <code>groq/llama-3.1-70b</code>, or <code>council</code>.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">messages</td>
                    <td className="p-3 font-mono">array</td>
                    <td className="p-3 font-semibold text-green-600 dark:text-green-400">Yes</td>
                    <td className="p-3">List of message objects representing dialogue history. Format: <code>{"[{\"role\": \"user\", \"content\": \"hello\"}]"}</code>.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">stream</td>
                    <td className="p-3 font-mono">boolean</td>
                    <td className="p-3">No</td>
                    <td className="p-3">Enable Server-Sent Events (SSE) streaming. Defaults to <code>false</code>.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">temperature</td>
                    <td className="p-3 font-mono">number</td>
                    <td className="p-3">No</td>
                    <td className="p-3">Sampling temperature between <code>0.0</code> and <code>2.0</code>. Defaults to <code>0.7</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        id: 'json-response',
        heading: 'Standard JSON Response Format',
        content: (
          <div className="space-y-3">
            <p>When <code>stream</code> is set to <code>false</code>, the endpoint returns a single complete JSON response payload once the text completion completes:</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`{
  "id": "chatcmpl_9872138",
  "object": "chat.completion",
  "created": 1779342000,
  "model": "groq/llama-3.1-70b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I am CyberCli. How can I assist you with your project today?"
      },
      "finish_reason": "stop"
    }
  ]
}`}</code>
            </pre>
          </div>
        ),
      },
      {
        id: 'sse-streaming',
        heading: 'Streaming Response Chunks',
        content: (
          <div className="space-y-3">
            <p>To enable interactive streaming, set <code>stream: true</code>. The server sends real-time chunk updates using standard Server-Sent Events (SSE) protocol (<code>text/event-stream</code>):</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`data: {"id":"chatcmpl_98","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}

data: {"id":"chatcmpl_98","object":"chat.completion.chunk","choices":[{"delta":{"content":"!"}}]}

data: [DONE]`}</code>
            </pre>
          </div>
        ),
      },
    ],
  },
  'local-cli-daemon-bridge': {
    title: 'Local CLI Daemon Bridge',
    category: 'API Reference',
    categoryId: 'api-reference',
    lastUpdated: 'May 21, 2026',
    readTime: '5 min',
    intro: 'Establish a secure link between your local files and the web chat interface.',
    sections: [
      {
        id: 'ws-architecture',
        heading: 'WebSocket Connection Architecture',
        content: (
          <div className="space-y-3">
            <p>The Local CLI Daemon Bridge establishes a secure, duplex communication channel between your web-based chat agent and your local workspace. By leveraging WebSockets (<code>wss://</code>) routed through our cloud gateways, the AI assistant can request permission to examine directories, read files, or run terminal commands within a designated folder on your machine.</p>
          </div>
        ),
      },
      {
        id: 'daemon-setup',
        heading: 'CLI Daemon Installation & Setup',
        content: (
          <div className="space-y-3">
            <p>To run the CLI daemon locally, clone or navigate to the <code>cli-daemon</code> folder inside the project and install the dependencies:</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`cd cli-daemon
npm install
node daemon.js --key=sk_cyber_live_YOUR_API_KEY`}</code>
            </pre>
            <p>The CLI daemon will establish a secure connection to the WebSocket server and listen for incoming execution requests authorized by your API key.</p>
          </div>
        ),
      },
      {
        id: 'hitl-terminal',
        heading: 'Secure Human-in-the-Loop Approval',
        content: (
          <div className="space-y-3">
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 my-4 flex gap-3 text-sm">
              <span className="text-accent font-bold">🔒 MANDATORY USER APPROVAL (HITL):</span>
              <div className="text-foreground-secondary leading-relaxed">
                Security is our highest priority. To prevent arbitrary code execution, the daemon employs a strict <strong>Human-in-the-Loop (HITL)</strong> model. No commands are run, and no files are written without explicit console authorization.
              </div>
            </div>
            <p>When the assistant requests to read a directory, check code file contents, or execute a script, the CLI daemon prompts you directly in your terminal:</p>
            <pre className="bg-[#1C1917] text-[#F5F5F4] p-4 rounded-xl font-mono text-xs overflow-x-auto border border-stone-850 my-3">
              <code>{`[CyberCli Daemon] Incoming Action: command
[CyberCli Daemon] Command: npm run test
[CyberCli Daemon] Allow this action? (y/n): _`}</code>
            </pre>
            <p>You can reject the action by pressing <code>n</code>, preventing any malicious execution or unapproved access to your files.</p>
          </div>
        ),
      },
    ],
  },
  'rate-limits-quotas': {
    title: 'Rate Limits & Quotas',
    category: 'API Reference',
    categoryId: 'api-reference',
    lastUpdated: 'May 21, 2026',
    readTime: '3 min',
    intro: 'Details on user tier rates, HTTP headers, and backing off on rate limits.',
    sections: [
      {
        id: 'tier-limits',
        heading: 'Free Tier vs Pro Tier Comparison',
        content: (
          <div className="space-y-3">
            <p>Usage quotas and API request rate limits are enforced dynamically depending on your account plan tier to ensure server stability and resource allocation.</p>
            <div className="overflow-x-auto my-4 rounded-xl border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs text-foreground-secondary">
                <thead>
                  <tr className="bg-background-secondary border-b border-border-subtle text-foreground-primary font-semibold">
                    <th className="p-3">Feature / Limit</th>
                    <th className="p-3">Free Tier</th>
                    <th className="p-3">Pro Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr>
                    <td className="p-3 font-semibold text-foreground-primary">API Request Rate Limit</td>
                    <td className="p-3">50 requests / hour</td>
                    <td className="p-3 text-accent font-bold">500 requests / hour</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground-primary">Available Models</td>
                    <td className="p-3">Gemini 2.5 Flash, LLaMA 3.1 8B</td>
                    <td className="p-3">Gemini 2.5 Pro, LLaMA 3.1 70b, Council Mode</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground-primary">CLI Daemon Access</td>
                    <td className="p-3 text-red-500 font-medium">Disabled</td>
                    <td className="p-3 text-green-600 dark:text-green-400 font-semibold">Enabled</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground-primary">Unlimited TTS (Voices)</td>
                    <td className="p-3">Standard Gemini TTS only</td>
                    <td className="p-3">25+ premium ElevenLabs voices</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        id: 'limit-headers',
        heading: 'API Rate Limit Response Headers',
        content: (
          <div className="space-y-3">
            <p>Every response returned from the CyberCli API includes custom HTTP headers that communicate your current usage quota and window remaining metrics:</p>
            <div className="overflow-x-auto my-4 rounded-xl border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs text-foreground-secondary">
                <thead>
                  <tr className="bg-background-secondary border-b border-border-subtle text-foreground-primary font-semibold">
                    <th className="p-3">Header Name</th>
                    <th className="p-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  <tr>
                    <td className="p-3 font-mono text-accent">X-RateLimit-Limit</td>
                    <td className="p-3">The total request quota count allocated to your tier in the current hour.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">X-RateLimit-Remaining</td>
                    <td className="p-3">The number of requests remaining in the current hour window.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-accent">X-RateLimit-Reset</td>
                    <td className="p-3">The Unix timestamp when the current rate limit window resets.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ),
      },
      {
        id: 'rate-limit-errors',
        heading: 'Handling Rate Limit Errors (429)',
        content: (
          <div className="space-y-3">
            <p>If you exceed the limit, the server returns an HTTP status code <code>429 Too Many Requests</code> with a standard JSON body:</p>
            <pre className="bg-background-secondary text-foreground-primary p-4 rounded-xl font-mono text-xs overflow-x-auto border border-border-subtle my-3">
              <code>{`{
  "error": {
    "status": 429,
    "message": "Rate limit exceeded. Please wait before retrying.",
    "retry_after_seconds": 240
  }
}`}</code>
            </pre>
            <p>Read the <code>retry_after_seconds</code> property or the <code>Retry-After</code> response header to determine the duration to backoff before resending the request.</p>
          </div>
        ),
      },
    ],
  },
  'setting-up-voice-chat': {
    title: 'Setting Up Voice Chat',
    category: 'Voice & TTS',
    categoryId: 'voice-tts',
    lastUpdated: 'May 14, 2026',
    readTime: '4 min',
    intro: 'Enable walkie-talkie style voice conversations with CyberCli\'s AI voices.',
    sections: [
      {
        id: 'browser-permissions',
        heading: 'Browser Microphone Permissions',
        content: `Voice Chat requires microphone access. On first use, your browser will ask for permission — click Allow. If you accidentally denied access, go to your browser settings and reset microphone permissions for cybercli.chat.`,
      },
      {
        id: 'using-voice',
        heading: 'Using Voice Chat',
        content: `Navigate to /voice-chat or press the microphone icon in the chat sidebar. Hold Spacebar (or the large mic button) to speak. Release to send. The AI responds automatically using text-to-speech. It's exactly like a walkie-talkie.`,
      },
      {
        id: 'choosing-voice',
        heading: 'Choosing a TTS Voice',
        content: `Go to Settings → Voice to pick from 5 unique AI voices. Free tier voices use Gemini Flash TTS. Pro tier unlocks 25+ ElevenLabs voices via Puter.js for ultra-realistic speech with no usage cost.`,
      },
      {
        id: 'troubleshooting',
        heading: 'Common Issues',
        content: `If voice isn't working: ensure your browser supports Web Speech API (Chrome and Edge are recommended). Check that your microphone is not being used by another application. Try refreshing the page if the session appears stuck.`,
      },
    ],
  },
}

// Fallback article for unknown slugs
const FALLBACK_ARTICLE = {
  title: 'Documentation Article',
  category: 'Getting Started',
  categoryId: 'getting-started',
  lastUpdated: 'May 2026',
  readTime: '3 min',
  intro: 'This article is being written. Check back soon!',
  sections: [
    { id: 'coming-soon', heading: 'Coming Soon', content: 'This documentation page is under construction. Browse other articles in the sidebar.' },
  ],
}

/* ─── Table of Contents ─── */
function TableOfContents({ sections, activeSectionId }) {
  return (
    <div className="w-52 flex-shrink-0 hidden xl:block">
      <div className="sticky top-24 pl-4 border-l border-white/[0.04] -ml-[1px]">
        <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-widest mb-3">On this page</p>
        <nav className="space-y-2 relative">
          {sections.map(s => {
            const isActive = activeSectionId === s.id
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-xs py-0.5 transition-colors duration-200 hover:text-foreground-primary relative"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted, #8E8E9F)' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="toc-active"
                    className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-accent"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className={`line-clamp-2 ${isActive ? 'font-medium' : ''}`}>{s.heading}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function DocsArticlePage() {
  const { slug } = useParams()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [helpfulVote, setHelpfulVote] = useState(null) // 'yes' | 'no' | null
  const sectionRefs = useRef({})

  const article = ARTICLE_CONTENT[slug] || FALLBACK_ARTICLE

  // Find category data
  const categoryData = CATEGORIES.find(c => c.id === article.categoryId)

  // Find prev/next articles in same category
  const catArticles = categoryData?.articles || []
  const currentIdx = catArticles.findIndex(a => a.slug === slug)
  const prevArticle = currentIdx > 0 ? catArticles[currentIdx - 1] : null
  const nextArticle = currentIdx < catArticles.length - 1 ? catArticles[currentIdx + 1] : null

  // Intersection observer for ToC
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSectionId(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    article.sections.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) { sectionRefs.current[s.id] = el; observer.observe(el) }
    })
    return () => observer.disconnect()
  }, [slug, article.sections])

  // Close mobile sidebar on resize
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileSidebarOpen(false) }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background-primary pt-16">
      <div className="flex relative" style={{ minHeight: 'calc(100vh - 64px)' }}>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col sticky top-16 h-[calc(100vh-64px)]">
          <DocsSidebar activeSlug={slug} />
        </div>

        {/* Mobile Sidebar Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                className="fixed left-0 top-0 bottom-0 z-50 w-72 lg:hidden"
                initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              >
                <DocsSidebar activeSlug={slug} onClose={() => setMobileSidebarOpen(false)} isMobile />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 lg:px-8 py-3 border-b border-border-subtle bg-background-primary/80 backdrop-blur-md sticky top-16 z-20">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="w-4 h-4" />
              </button>
              <nav className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Link to="/" className="hover:text-foreground-primary transition-colors">Home</Link>
                <ChevronRight className="w-3 h-3" />
                <Link to="/docs" className="hover:text-foreground-primary transition-colors">Docs</Link>
                <ChevronRight className="w-3 h-3" />
                {categoryData && (
                  <>
                    <span className="hover:text-foreground-primary transition-colors" style={{ color: categoryData.color }}>
                      {categoryData.title}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
                <span className="text-foreground-secondary line-clamp-1 max-w-[200px]">{article.title}</span>
              </nav>
            </div>
            <Link
              to="/chat"
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors border border-accent/20 px-3 py-1.5 rounded-lg hover:bg-accent/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask AI
            </Link>
          </div>

          {/* Content + ToC */}
          <div className="flex gap-8 px-5 lg:px-10 xl:px-16 pt-10 pb-16 flex-1">
            {/* Article */}
            <article className="flex-1 min-w-0 max-w-3xl">
              {/* Article header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {categoryData && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase mb-4 px-2.5 py-1 rounded-full"
                    style={{ color: categoryData.color, background: categoryData.bg, border: `1px solid ${categoryData.border}` }}
                  >
                    <categoryData.icon className="w-3 h-3" />
                    {categoryData.title}
                  </span>
                )}
                <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground-primary leading-tight tracking-tight mb-4">
                  {article.title}
                </h1>
                <div className="flex items-center gap-4 text-xs text-foreground-muted mb-6">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Updated {article.lastUpdated}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {article.readTime} read
                  </span>
                </div>
                <p className="text-base text-foreground-secondary leading-relaxed mb-8 border-l-2 border-accent/40 pl-4">
                  {article.intro}
                </p>
              </motion.div>

              {/* Sections */}
              <div className="space-y-10">
                {article.sections.map((section, i) => (
                  <motion.section
                    key={section.id}
                    id={section.id}
                    className={`relative ${slug === 'changelog' ? 'pl-8 pb-4' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Timeline Line */}
                    {slug === 'changelog' && i < article.sections.length - 1 && (
                      <div className="absolute left-3 top-3.5 bottom-0 w-[2px] bg-white/[0.04]" />
                    )}
                    {slug === 'changelog' && i === article.sections.length - 1 && (
                      <div className="absolute left-3 top-3.5 h-16 w-[2px] bg-gradient-to-b from-white/[0.04] to-transparent" />
                    )}

                    {/* Timeline Dot */}
                    {slug === 'changelog' && (
                      <div 
                        className="absolute left-3 top-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-[3px] border-accent z-10 shadow-[0_0_12px_rgba(217,119,87,0.4)]" 
                        style={{ backgroundColor: '#0A0A0F' }}
                      />
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      {slug !== 'changelog' && (
                        <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                          <Hash className="w-3.5 h-3.5 text-accent" />
                        </div>
                      )}
                      <h2 className="text-lg font-semibold text-foreground-primary">{section.heading}</h2>
                    </div>
                    <div className={`text-foreground-secondary leading-relaxed text-[0.9375rem] space-y-4 ${slug === 'changelog' ? 'pl-0' : 'ml-9'}`}>
                      {section.content}
                    </div>
                  </motion.section>
                ))}
              </div>

              {/* Was this helpful? */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-12 pt-8 border-t border-border-subtle"
              >
                <p className="text-sm font-medium text-foreground-primary mb-3">Was this article helpful?</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setHelpfulVote('yes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                      helpfulVote === 'yes'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-border-subtle text-foreground-muted hover:border-border-medium hover:text-foreground-primary'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Yes
                  </button>
                  <button
                    onClick={() => setHelpfulVote('no')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${
                      helpfulVote === 'no'
                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                        : 'border-border-subtle text-foreground-muted hover:border-border-medium hover:text-foreground-primary'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    No
                  </button>
                  <AnimatePresence>
                    {helpfulVote && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-foreground-muted"
                      >
                        {helpfulVote === 'yes' ? '🎉 Thanks for the feedback!' : '😢 We\'ll work on improving this.'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Prev / Next */}
              {(prevArticle || nextArticle) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="mt-8 grid grid-cols-2 gap-4"
                >
                  {prevArticle ? (
                    <Link
                      to={`/docs/${prevArticle.slug}`}
                      className="group flex flex-col gap-1 p-4 rounded-xl border border-border-subtle bg-background-secondary hover:border-accent/25 transition-all duration-200"
                    >
                      <span className="flex items-center gap-1 text-[11px] text-foreground-muted group-hover:text-accent transition-colors">
                        <ArrowLeft className="w-3 h-3" />
                        Previous
                      </span>
                      <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground-primary transition-colors line-clamp-2">
                        {prevArticle.title}
                      </span>
                    </Link>
                  ) : <div />}
                  {nextArticle ? (
                    <Link
                      to={`/docs/${nextArticle.slug}`}
                      className="group flex flex-col gap-1 p-4 rounded-xl border border-border-subtle bg-background-secondary hover:border-accent/25 transition-all duration-200 text-right"
                    >
                      <span className="flex items-center justify-end gap-1 text-[11px] text-foreground-muted group-hover:text-accent transition-colors">
                        Next
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground-primary transition-colors line-clamp-2">
                        {nextArticle.title}
                      </span>
                    </Link>
                  ) : <div />}
                </motion.div>
              )}
            </article>

            {/* Right ToC */}
            <TableOfContents sections={article.sections} activeSectionId={activeSectionId} />
          </div>
        </div>
      </div>
    </div>
  )
}
