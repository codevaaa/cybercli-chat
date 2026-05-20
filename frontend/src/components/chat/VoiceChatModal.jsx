import { useState, useEffect, useRef } from 'react'
import { X, Mic, MicOff, Volume2, VolumeX, Settings, Send, Sparkles } from 'lucide-react'
import { useTTS } from '../../hooks/useTTS.js'

export default function VoiceChatModal({ isOpen, onClose, onSendMessage }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef(null)
  const { speak, stop, isPlaying, isLoading: ttsLoading } = useTTS()

  useEffect(() => {
    // Initialize Web Speech API for speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setTranscript(finalTranscript + interimTranscript)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start()
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isListening])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSend = () => {
    if (transcript.trim()) {
      onSendMessage(transcript)
      setTranscript('')
      setIsListening(false)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-background-secondary rounded-3xl border border-border-subtle shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground-primary">Voice Chat</h3>
              <p className="text-xs text-foreground-muted">Speak to send a message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Visualizer */}
          <div className="flex items-center justify-center gap-1 mb-6 h-24">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-accent rounded-full transition-all duration-150 ${
                  isListening
                    ? 'animate-pulse'
                    : 'opacity-30'
                }`}
                style={{
                  height: isListening
                    ? `${20 + Math.random() * 60}px`
                    : '20px',
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>

          {/* Transcript */}
          <div className="mb-6">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isListening ? 'Listening...' : 'Type or speak your message...'}
              rows={4}
              className="w-full bg-background-tertiary border border-border-subtle rounded-xl px-4 py-3 text-foreground-primary placeholder-foreground-muted/50 resize-none focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {isListening && (
              <div className="flex items-center gap-2 text-accent">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-sm font-medium">Listening...</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 text-foreground-muted">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
            )}
            {ttsLoading && (
              <div className="flex items-center gap-2 text-accent">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">Speaking...</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isListening
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
                  : 'bg-accent text-white hover:bg-accent-light'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start Listening
                </>
              )}
            </button>

            {transcript.trim() && (
              <button
                onClick={handleSend}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background-tertiary border border-border-subtle hover:border-accent/30 hover:text-accent transition-all font-medium"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            )}

            {isPlaying && (
              <button
                onClick={stop}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-background-tertiary border border-border-subtle hover:border-accent/30 hover:text-accent transition-all"
              >
                <VolumeX className="w-5 h-5" />
                Stop Audio
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-background-tertiary/50">
          <p className="text-xs text-center text-foreground-muted">
            Powered by Web Speech API • Works best in Chrome or Edge
          </p>
        </div>
      </div>
    </div>
  )
}
