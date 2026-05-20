import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, Sparkles, Zap, Settings } from 'lucide-react'
import { useTTS } from '../../hooks/useTTS.js'
import VoiceChatModal from '../../components/chat/VoiceChatModal.jsx'

export default function VoiceChatPage() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)
  
  const { speak, stop, isPlaying, isLoading: ttsLoading } = useTTS()

  useEffect(() => {
    // Initialize Web Speech API
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleSendMessage = async (text) => {
    if (!text.trim()) return

    const userMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setTranscript('')
    setIsProcessing(true)

    try {
      // Simulate AI response (replace with actual API call)
      setTimeout(() => {
        const aiMessage = { 
          role: 'assistant', 
          content: `I heard you say: "${text}". This is a simulated response. Connect to your backend API for real AI responses.` 
        }
        setMessages(prev => [...prev, aiMessage])
        setIsProcessing(false)
        
        // Auto-speak the AI response
        speak(aiMessage.content)
      }, 1000)
    } catch (error) {
      console.error('Error sending message:', error)
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background-primary">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-background-secondary/80 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <Link to="/chat" className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground-primary" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground-primary">Voice Chat</h1>
              <p className="text-xs text-foreground-muted">Hands-free conversation</p>
            </div>
          </div>
        </div>
        <Link to="/voice-settings" className="p-2 rounded-lg hover:bg-background-tertiary transition-colors">
          <Settings className="w-5 h-5 text-foreground-primary" />
        </Link>
      </header>

      {/* Main Content - 3D-like visualization */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 pointer-events-none" />
        
        {/* 3D Orb Visualization */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated orb */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8">
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full border-2 border-accent/20 transition-all duration-300 ${
              isListening ? 'animate-pulse scale-110 border-accent/40' : ''
            }`} />
            
            {/* Middle ring */}
            <div className={`absolute inset-4 rounded-full border border-accent/30 transition-all duration-300 ${
              isListening ? 'animate-pulse scale-105 border-accent/50' : ''
            }`} style={{ animationDelay: '100ms' }} />
            
            {/* Inner ring */}
            <div className={`absolute inset-8 rounded-full border border-accent/40 transition-all duration-300 ${
              isListening ? 'animate-pulse scale-100 border-accent/60' : ''
            }`} style={{ animationDelay: '200ms' }} />
            
            {/* Center orb */}
            <div className={`absolute inset-12 rounded-full bg-gradient-to-br from-accent to-accent-light transition-all duration-300 ${
              isListening ? 'scale-110 shadow-[0_0_60px_rgba(124,58,237,0.5)]' : 'scale-100 shadow-[0_0_30px_rgba(124,58,237,0.3)]'
            } flex items-center justify-center`}>
              {isListening ? (
                <Mic className="w-12 h-12 text-white animate-pulse" />
              ) : isProcessing ? (
                <Sparkles className="w-12 h-12 text-white animate-spin" />
              ) : isPlaying ? (
                <Volume2 className="w-12 h-12 text-white animate-pulse" />
              ) : (
                <Zap className="w-12 h-12 text-white" />
              )}
            </div>

            {/* Sound waves */}
            {isListening && (
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-full border border-accent/30 animate-ping"
                    style={{
                      animationDelay: `${i * 300}ms`,
                      animationDuration: '2s',
                    }}
                  />
                ))}
              </>
            )}
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            {isListening && (
              <div className="flex items-center gap-2 text-accent mb-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="text-lg font-medium">Listening...</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center gap-2 text-foreground-muted mb-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-lg">Processing...</span>
              </div>
            )}
            {isPlaying && (
              <div className="flex items-center gap-2 text-accent mb-2">
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span className="text-lg font-medium">Speaking...</span>
              </div>
            )}
            {!isListening && !isProcessing && !isPlaying && (
              <p className="text-lg text-foreground-muted">Tap to start voice chat</p>
            )}
          </div>

          {/* Transcript preview */}
          {transcript && (
            <div className="max-w-md w-full bg-background-secondary/80 backdrop-blur-sm border border-border-subtle rounded-2xl p-4 mb-6">
              <p className="text-foreground-primary text-center">{transcript}</p>
            </div>
          )}

          {/* Main action button */}
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening
                ? 'bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:scale-105'
                : 'bg-accent text-white shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-105'
            }`}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          {/* Helper text */}
          <p className="text-sm text-foreground-muted mt-4 text-center max-w-xs">
            {isListening
              ? 'Speak clearly to send a message'
              : 'Tap the button to start listening'}
          </p>
        </div>

        {/* Messages preview (collapsed) */}
        {messages.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 max-w-2xl mx-auto">
            <div className="bg-background-secondary/90 backdrop-blur-sm border border-border-subtle rounded-2xl p-4 max-h-32 overflow-y-auto">
              {messages.slice(-2).map((msg, i) => (
                <div key={i} className={`text-sm mb-2 ${msg.role === 'user' ? 'text-accent' : 'text-foreground-primary'}`}>
                  <span className="font-medium">{msg.role === 'user' ? 'You: ' : 'AI: '}</span>
                  {msg.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Voice Chat Modal */}
      <VoiceChatModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSendMessage={handleSendMessage}
      />
    </div>
  )
}
