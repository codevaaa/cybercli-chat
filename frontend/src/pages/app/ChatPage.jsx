import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Plus, Settings, Mic, Send, Sparkles, Zap, Menu, X } from 'lucide-react'
import { streamChat } from '../../lib/api.js'

const SAMPLE_THREADS = [
  { id: '1', title: 'Python async patterns', model: 'Groq', updated: '2m ago' },
  { id: '2', title: 'Startup idea validation', model: 'Council', updated: '1h ago' },
  { id: '3', title: 'Travel itinerary Japan', model: 'Gemini', updated: '3h ago' },
  { id: '4', title: 'Research: Quantum computing', model: 'Cerebras', updated: '1d ago' },
]

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Add empty assistant message that will be streamed into
    const assistantMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const messageHistory = messages.map(m => ({ role: m.role, content: m.content }))
      messageHistory.push({ role: 'user', content: userMessage.content })

      await streamChat(messageHistory, 'auto', (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          lastMessage.content += chunk
          return newMessages
        })
      })
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        lastMessage.content = `Error: ${error.message}`
        return newMessages
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex bg-background-primary">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-background-secondary border-r border-border-subtle transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground-primary">CyberCli</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-background-tertiary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-light transition-colors">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-2 px-2">Recent</p>
          <div className="space-y-1">
            {SAMPLE_THREADS.map((thread) => (
              <button
                key={thread.id}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-background-tertiary transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-primary truncate">{thread.title}</p>
                    <p className="text-xs text-foreground-muted">{thread.model} &middot; {thread.updated}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-border-subtle">
          <Link to="/settings" className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-background-tertiary transition-colors text-sm text-foreground-secondary">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-background-tertiary">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-foreground-primary">New Chat</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted bg-background-tertiary px-2.5 py-1 rounded-full">Free Tier</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-background-secondary text-foreground-primary rounded-bl-md border border-border-subtle'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border-subtle">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
            <div className="flex items-end gap-2 bg-background-secondary border border-border-subtle rounded-2xl p-2 focus-within:border-accent transition-colors">
              <button type="button" className="p-2.5 rounded-xl hover:bg-background-tertiary text-foreground-muted transition-colors flex-shrink-0">
                <Mic className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder="Ask anything..."
                rows={1}
                className="flex-1 bg-transparent text-foreground-primary text-sm resize-none py-2.5 focus:outline-none min-h-[44px] max-h-32"
                style={{ height: 'auto' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-accent text-white hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-foreground-muted text-center mt-2">
              CyberCli may produce inaccurate information. Verify important information.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
