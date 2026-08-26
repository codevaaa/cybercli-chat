import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, Clock, Trophy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { API_BASE, getFreshToken } from '../../lib/api.js'

/**
 * CompareView — Side-by-side multi-model comparison UI.
 * Sends the same prompt to 2-3 models and shows responses in columns.
 */
export default function CompareView({ isOpen, onClose, prompt, models, onSelectBest }) {
  const [responses, setResponses] = useState({})
  const [statuses, setStatuses] = useState({})
  const [selectedBest, setSelectedBest] = useState(null)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    if (!isOpen || !prompt || !models?.length) return

    // Reset state
    setResponses({})
    setStatuses({})
    setSelectedBest(null)
    setAllDone(false)

    const initial = {}
    models.forEach(m => { initial[m] = 'loading' })
    setStatuses(initial)

    // Stream from compare endpoint
    const runCompare = async () => {
      try {
        const token = await getFreshToken()
        const res = await fetch(`${API_BASE}/compare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            models,
          }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') { setAllDone(true); return }
            try {
              const parsed = JSON.parse(raw)
              if (parsed.type === 'model_start') {
                setStatuses(prev => ({ ...prev, [parsed.model]: 'loading' }))
              } else if (parsed.type === 'model_token') {
                setResponses(prev => ({
                  ...prev,
                  [parsed.model]: (prev[parsed.model] || '') + parsed.content,
                }))
              } else if (parsed.type === 'model_done') {
                setStatuses(prev => ({ ...prev, [parsed.model]: 'done' }))
              } else if (parsed.type === 'model_error') {
                setStatuses(prev => ({ ...prev, [parsed.model]: 'error' }))
                setResponses(prev => ({
                  ...prev,
                  [parsed.model]: `Error: ${parsed.error}`,
                }))
              } else if (parsed.type === 'all_done') {
                setAllDone(true)
              }
            } catch {}
          }
        }
        setAllDone(true)
      } catch (err) {
        console.error('Compare stream error:', err)
        setAllDone(true)
      }
    }

    runCompare()
  }, [isOpen, prompt, models])

  const handlePickBest = (modelId) => {
    setSelectedBest(modelId)
    onSelectBest?.(modelId, responses[modelId])
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background-primary border border-border-subtle rounded-2xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground-primary">Multi-Model Comparison</h2>
              <p className="text-xs text-foreground-muted mt-0.5 truncate max-w-md">"{prompt?.slice(0, 80)}{prompt?.length > 80 ? '...' : ''}"</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-foreground-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body — side-by-side columns */}
          <div className="flex-1 overflow-hidden flex gap-0">
            {models.map((modelId, idx) => (
              <div
                key={modelId}
                className={`flex-1 flex flex-col min-w-0 ${idx < models.length - 1 ? 'border-r border-border-subtle' : ''}`}
              >
                {/* Model header */}
                <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2 flex-shrink-0 bg-background-secondary/50">
                  <div className={`w-2 h-2 rounded-full ${
                    statuses[modelId] === 'loading' ? 'bg-yellow-400 animate-pulse' :
                    statuses[modelId] === 'done' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-xs font-semibold text-foreground-primary truncate">{modelId.split('/').pop()}</span>
                  {statuses[modelId] === 'loading' && <Loader2 className="w-3 h-3 animate-spin text-foreground-muted ml-auto" />}
                  {statuses[modelId] === 'done' && (
                    <span className="ml-auto text-[10px] text-foreground-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>

                {/* Response content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-foreground-secondary leading-relaxed prose-custom">
                  {responses[modelId] ? (
                    <ReactMarkdown>{responses[modelId]}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-foreground-muted text-xs">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Waiting for response...
                    </div>
                  )}
                </div>

                {/* Pick best button */}
                {allDone && statuses[modelId] === 'done' && (
                  <div className="px-4 py-2 border-t border-border-subtle flex-shrink-0">
                    <button
                      onClick={() => handlePickBest(modelId)}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all ${
                        selectedBest === modelId
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-background-tertiary hover:bg-background-elevated text-foreground-secondary hover:text-foreground-primary border border-border-subtle'
                      }`}
                    >
                      {selectedBest === modelId ? (
                        <>
                          <Trophy className="w-3.5 h-3.5" /> Best Response
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" /> Pick as Best
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
