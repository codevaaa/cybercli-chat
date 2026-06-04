import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Shield, AlertTriangle, Cpu, Globe, Crosshair } from 'lucide-react'
import MatrixRain from './MatrixRain'

export default function KaliKalView({
  threads,
  messages,
  input,
  setInput,
  handleSend,
  loading,
  handleCreateThread,
  navigate,
  userPlan
}) {
  const [initComplete, setInitComplete] = useState(false)
  const kaliThreads = threads.filter(t => t.mode === 'kali_kal')

  useEffect(() => {
    // Simulate terminal boot sequence
    const timer = setTimeout(() => {
      setInitComplete(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleStartSession = async (prompt) => {
    const threadId = await handleCreateThread('New Target', null, 'kali_kal')
    if (threadId) {
      if (prompt) {
        // Optional: pre-fill input or trigger send automatically
        // For simplicity, we navigate to the thread and the user can type
        // Or we can invoke handleSend directly if ChatPage logic permits.
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden font-mono bg-black w-full h-full">
      {/* Matrix Background */}
      <div className="absolute inset-0 z-0 opacity-20">
        <MatrixRain color="#D91624" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#1A0505]/80 via-transparent to-[#1A0505]/90 pointer-events-none z-1" />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 w-full max-w-4xl p-6 flex flex-col h-full"
      >
        {!initComplete ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-t-2 border-r-2 border-red-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-b-2 border-l-2 border-red-700 rounded-full animate-spin-reverse"></div>
              <Crosshair className="w-6 h-6 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-red-500 text-sm tracking-[0.2em] uppercase animate-pulse">Initializing Override Protocols...</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-red-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-red-950/50 border border-red-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-red-500 tracking-wider">KALI_KAL // SYSTEM</h1>
                  <p className="text-[10px] text-red-400/60 uppercase tracking-widest">Autonomous Red-Teaming Engine</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-red-400/80 uppercase">Access Level</div>
                <div className="text-xs font-bold text-red-500">{userPlan === 'pro' ? 'GOD MODE (PRO)' : 'LIMITED (FREE - 10 Req)'}</div>
              </div>
            </div>

            {/* Dashboard / History */}
            <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-red-950/20 border border-red-900/40 rounded shadow-lg backdrop-blur-sm hover:bg-red-950/40 transition-colors cursor-pointer" onClick={() => setInput('Analyze the perimeter for vulnerabilities.')}>
                  <Globe className="w-5 h-5 text-red-400 mb-2" />
                  <h3 className="text-sm font-bold text-red-500 mb-1">Perimeter Recon</h3>
                  <p className="text-[10px] text-red-400/70">Initiate automated footprinting and OSINT gathering.</p>
                </div>
                <div className="p-4 bg-red-950/20 border border-red-900/40 rounded shadow-lg backdrop-blur-sm hover:bg-red-950/40 transition-colors cursor-pointer" onClick={() => setInput('Initiate deeper code review for potential RCE.')}>
                  <Cpu className="w-5 h-5 text-red-400 mb-2" />
                  <h3 className="text-sm font-bold text-red-500 mb-1">Static Code Analysis</h3>
                  <p className="text-[10px] text-red-400/70">Uncensored deep-dive into source code vulnerabilities.</p>
                </div>
              </div>

              {kaliThreads.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-red-500/80 tracking-widest uppercase border-b border-red-900/30 pb-2">Active Targets</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {kaliThreads.map(thread => (
                      <div 
                        key={thread._id} 
                        onClick={() => { navigate(`/chat/${thread._id}`); }}
                        className="flex items-center justify-between p-3 bg-black/40 border border-red-900/30 rounded hover:border-red-500/50 hover:bg-red-950/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <Terminal className="w-4 h-4 text-red-500/50 group-hover:text-red-500 transition-colors" />
                          <span className="text-sm text-red-400/80 group-hover:text-red-400 font-medium">{thread.title}</span>
                        </div>
                        <span className="text-[10px] text-red-500/40">{new Date(thread.updatedAt || thread.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {kaliThreads.length === 0 && (
                <div className="text-center py-12 border border-dashed border-red-900/30 rounded bg-black/20">
                  <AlertTriangle className="w-8 h-8 text-red-500/50 mx-auto mb-3" />
                  <p className="text-sm text-red-400/70">No active sessions. Awaiting command...</p>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="mt-auto">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!input.trim() || loading) return
                  await handleStartSession(input)
                }}
                className="relative flex items-center bg-black/60 border border-red-500/40 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.1)] focus-within:shadow-[0_0_20px_rgba(220,38,38,0.2)] focus-within:border-red-500 transition-all"
              >
                <div className="pl-4 pr-2 text-red-500 font-bold">$</div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter target or command (1000% Uncensored)..."
                  className="flex-1 bg-transparent border-none text-red-100 placeholder:text-red-500/40 focus:outline-none focus:ring-0 py-4 text-sm"
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || loading}
                  className="px-6 py-4 bg-red-950/50 text-red-500 font-bold hover:bg-red-900 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l border-red-500/20"
                >
                  {loading ? 'EXECUTING...' : 'INITIALIZE'}
                </button>
              </form>
              <div className="mt-2 text-center text-[10px] text-red-500/40 uppercase tracking-widest">
                Warning: Advanced capabilities active. Use responsibly.
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
