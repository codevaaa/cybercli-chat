import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Send, ArrowRight, MessageSquare, BookOpen, AlertCircle, CheckCircle, Shield, ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import api from '../../lib/api.js'

const HELP_COLLECTIONS = [
  {
    title: 'Codeva Basics',
    desc: 'Core features and how to use multi-model AI.',
    articles: [
      {
        title: 'What is Panchayat (Council Mode)?',
        content: 'Panchayat (Council Mode) is a multi-model debate synthesis tool. When you select Panchayat, your query is sent to multiple flagship AI models (like Gemini, Llama, and Mistral) simultaneously. It displays their responses side-by-side in comparative cards, letting you compare answers instantly and choose the best reasoning route.'
      },
      {
        title: 'How does Conversation Branching work?',
        content: 'Conversation branching allows you to fork a chat thread from any previous message. If you want to explore an alternative line of inquiry or try a different model response, hover over any message bubble and click the "Branch" icon. This clones the conversation history up to that point into a new thread without modifying your original chat.'
      },
      {
        title: 'What are Custom AI Personas?',
        content: 'Personas are pre-configured system instructions that change Codeva\'s tone, knowledge base, and style. You can create customized personas (e.g. Code Reviewer, threat modeling expert) from the Customize panel, setting specialized prompts that apply to all messages in a thread.'
      }
    ]
  },
  {
    title: 'Workspace & VS Code Extension',
    desc: 'Setting up the official VS Code Extension for local editing.',
    articles: [
      {
        title: 'How does the VS Code Extension work?',
        content: 'The VS Code Extension allows the Codeva agent to read/write local codebase files and execute commands directly from your editor. When active, it runs an RPC server that securely processes local workspace commands and syncs with your active files.'
      },
      {
        title: 'How do I install the VS Code Extension?',
        content: 'To install the extension, generate an API Access Key from the Code tab, install the Codeva VS Code Extension from the marketplace, and configure your API key in the extension settings. Once configured, your local workspace will be connected.'
      }
    ]
  },
  {
    title: 'Billing & Pricing Plans',
    desc: 'Managing subscriptions and the Pro tier.',
    articles: [
      {
        title: 'How does the free tier work?',
        content: 'Early adopters get 50+ free models with a limit of 50 messages per hour. There is no credit card required, and we route to the best available free API provider nodes dynamically to minimize latency.'
      },
      {
        title: 'What features are in the Pro plan?',
        content: 'The Pro plan offers unlimited completions, priority model routing, early access to next-gen reasoning models, developer API credentials, increased rate limits (500 messages/hour), and specialized agent creation dashboards. You can click "Upgrade" in the header or profile menu to learn more.'
      }
    ]
  }
]

export default function HelpCenterPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('home') // home | messages | help
  const [searchQuery, setSearchQuery] = useState('')
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [acceptingTerms, setAcceptingTerms] = useState(false)
  
  // Accordion articles state
  const [expandedArticles, setExpandedArticles] = useState({})

  const chatEndRef = useRef(null)

  // Fetch support thread on mount or when opening panel
  useEffect(() => {
    if (isOpen) {
      fetchSupportThread()
    }
  }, [isOpen])

  // Scroll to bottom when message log changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchSupportThread() {
    try {
      const { data } = await api.get('/support/thread')
      if (data) {
        setActiveThread(data)
        if (data.accepted_terms) {
          fetchMessages(data._id)
        }
      }
    } catch (err) {
      console.error('Error fetching support thread:', err)
    }
  }

  async function fetchMessages(threadId) {
    setLoadingHistory(true)
    try {
      const { data } = await api.get(`/support/messages/${threadId}`)
      setMessages(data || [])
    } catch (err) {
      console.error('Error loading support messages:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleAcceptTerms() {
    setAcceptingTerms(true)
    try {
      const { data } = await api.post('/support/thread')
      setActiveThread(data)
      fetchMessages(data._id)
    } catch (err) {
      console.error('Error accepting support terms:', err)
    } finally {
      setAcceptingTerms(false)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim() || !activeThread || sendingMessage) return

    const userText = newMessage.trim()
    setNewMessage('')
    setSendingMessage(true)

    // Optimistically push user message
    const tempUserMsg = { _id: Date.now().toString(), sender: 'user', content: userText }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const { data } = await api.post(`/support/messages/${activeThread._id}`, { content: userText })
      // Replace optimistic message list with real history or append agent response
      setMessages(prev => [...prev.filter(m => m._id !== tempUserMsg._id), tempUserMsg, data])
    } catch (err) {
      console.error('Failed to send support message:', err)
      setMessages(prev => [
        ...prev,
        {
          _id: `err-${Date.now()}`,
          sender: 'agent',
          content: 'Sorry, I am having trouble connecting to support. Please verify your connection or email us at cybermindcli@cybermindcli.com.'
        }
      ])
    } finally {
      setSendingMessage(false)
    }
  }

  const toggleArticle = (title) => {
    setExpandedArticles(prev => ({ ...prev, [title]: !prev[title] }))
  }

  // Filter collections and articles dynamically based on search
  const filteredCollections = HELP_COLLECTIONS.map(collection => {
    const articles = collection.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    return { ...collection, articles }
  }).filter(collection => collection.articles.length > 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 pointer-events-auto"
          />

          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#0A0A0F] border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden font-sans"
          >
            {/* Header Area */}
            <div className="p-5 border-b border-white/[0.04] bg-[#08080C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 flex items-center justify-center border border-[#D97757]/20">
                  <Sparkles className="w-4 h-4 text-[#D97757]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">Help Center</h2>
                  <span className="text-[10px] text-foreground-muted tracking-wider uppercase font-semibold">Support Desk</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0A0A0F]/50">
              {activeTab === 'home' && (
                <div className="p-6 space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">All Systems Operational</p>
                      <p className="text-[10px] text-emerald-400/80">Support agents & AI route nodes online</p>
                    </div>
                  </div>

                  {/* Send a message block */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-[#D97757]/30 transition-all flex flex-col gap-4 relative group">
                    <div className="w-10 h-10 rounded-xl bg-[#D97757]/15 flex items-center justify-center text-[#D97757] border border-[#D97757]/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Send us a message</h3>
                      <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                        Talk with our automated support AI agent in real time. Our AI assistant is trained on Codeva guides and can answer queries instantly.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className="mt-2 w-full py-2.5 rounded-xl bg-white text-black hover:bg-white/95 font-bold text-xs flex items-center justify-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(217,119,87,0.2)]"
                    >
                      <span>Start Conversation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Search */}
                  <div>
                    <label className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Search FAQ</label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search for articles or topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent/40 outline-none text-xs text-white placeholder-white/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Frequently Asked Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Common Questions</h4>
                    <div className="space-y-2">
                      {HELP_COLLECTIONS[0].articles.map(article => (
                        <button
                          key={article.title}
                          onClick={() => {
                            setActiveTab('help')
                            setSearchQuery(article.title)
                          }}
                          className="w-full p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.04] border border-white/[0.04] flex items-center justify-between text-left transition-all group"
                        >
                          <span className="text-xs text-foreground-secondary group-hover:text-white transition-colors">{article.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="h-full flex flex-col justify-between">
                  {(!activeThread || !activeThread.accepted_terms) ? (
                    /* Terms Agreement view */
                    <div className="p-8 flex flex-col justify-center items-center text-center h-96">
                      <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent mb-6 animate-pulse">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">Accept Support terms</h3>
                      <p className="text-xs text-foreground-muted leading-relaxed max-w-sm mb-8">
                        To chat with our support team and AI assistant, please agree to the support terms. We protect your privacy and do not sell your conversations.
                      </p>

                      <button
                        onClick={handleAcceptTerms}
                        disabled={acceptingTerms}
                        className="w-full max-w-[240px] py-3 rounded-xl bg-accent hover:bg-accent/95 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        {acceptingTerms ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Initializing...
                          </>
                        ) : (
                          <>
                            <span>Accept & Start Chat</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Active Chat conversation view */
                    <div className="flex flex-col h-[calc(100vh-140px)] justify-between">
                      {/* Message area */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loadingHistory ? (
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 text-accent animate-spin" />
                          </div>
                        ) : (
                          messages.map(msg => {
                            const isUser = msg.sender === 'user'
                            return (
                              <div
                                key={msg._id}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                                    isUser
                                      ? 'bg-accent/10 border border-accent/20 text-white rounded-tr-none'
                                      : 'bg-white/[0.03] border border-white/[0.06] text-foreground-secondary rounded-tl-none'
                                  }`}
                                >
                                  {!isUser && (
                                    <div className="flex items-center gap-1.5 mb-1 text-[#D97757] font-semibold text-[10px] uppercase tracking-wider select-none">
                                      <Sparkles className="w-3 h-3" />
                                      <span>Agent</span>
                                    </div>
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              </div>
                            )
                          })
                        )}
                        {sendingMessage && (
                          <div className="flex justify-start">
                            <div className="bg-white/[0.03] border border-white/[0.06] p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 text-[#D97757] animate-spin" />
                              <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider animate-pulse">Thinking...</span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input form */}
                      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/[0.04] bg-[#08080C] flex gap-2">
                        <input
                          required
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your question..."
                          className="flex-1 px-4 py-2.5 rounded-xl bg-[#0F0F15] border border-white/[0.08] focus:border-accent/40 outline-none text-xs text-white placeholder-white/20 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || sendingMessage}
                          className="p-2.5 rounded-xl bg-accent text-black hover:bg-accent/95 disabled:opacity-50 transition-all"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'help' && (
                <div className="p-6 space-y-6">
                  {/* Search box inside help tab */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-accent/40 outline-none text-xs text-white placeholder-white/20 transition-all"
                    />
                  </div>

                  {/* Collections List */}
                  <div className="space-y-6">
                    {filteredCollections.map(collection => (
                      <div key={collection.title} className="space-y-3">
                        <div>
                          <h3 className="text-xs font-bold text-white">{collection.title}</h3>
                          <p className="text-[10px] text-foreground-muted mt-0.5">{collection.desc}</p>
                        </div>
                        <div className="space-y-2">
                          {collection.articles.map(article => {
                            const isExpanded = !!expandedArticles[article.title]
                            return (
                              <div
                                key={article.title}
                                className="rounded-xl border border-white/[0.04] bg-white/[0.01] overflow-hidden"
                              >
                                <button
                                  onClick={() => toggleArticle(article.title)}
                                  className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                                >
                                  <span className="text-xs font-semibold text-foreground-secondary">{article.title}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )}
                                </button>
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: 'auto' }}
                                      exit={{ height: 0 }}
                                      className="overflow-hidden border-t border-white/[0.04]"
                                    >
                                      <p className="p-4 text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap">
                                        {article.content}
                                      </p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {filteredCollections.length === 0 && (
                      <div className="text-center py-12 text-xs text-foreground-muted">
                        No articles match "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Tabs navigation bar */}
            <div className="p-3 border-t border-white/[0.04] bg-[#08080C] flex items-center justify-around flex-shrink-0">
              {[
                { id: 'home', label: 'Home', Icon: CheckCircle },
                { id: 'messages', label: 'Messages', Icon: MessageSquare },
                { id: 'help', label: 'Help', Icon: BookOpen }
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setActiveTab(id)
                    if (id !== 'help') setSearchQuery('')
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === id
                      ? 'text-accent font-semibold'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
