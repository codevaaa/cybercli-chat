import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuthStore } from '../../stores/authStore.js'
import { CyberCliMark } from '../../components/ui/CyberCliLogo'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { initialize } = useAuthStore()
  const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse code from query parameters (for PKCE flow)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const next = params.get('next') || '/chat'

        // Check for error parameters in hash or search
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const errorDescription = params.get('error_description') || hashParams.get('error_description')
        const errorCode = params.get('error') || hashParams.get('error')

        if (errorCode || errorDescription) {
          throw new Error(errorDescription || 'Authentication failed')
        }

        if (code) {
          // Exchange code for session
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        // Fetch session to confirm auth is successful
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setStatus('success')
          // Initialize auth store to sync session details and state
          await initialize()
          
          // Small delay for showing success checkmark
          setTimeout(() => {
            navigate(next)
          }, 1500)
        } else {
          // If no session is found, we might have been navigated here directly or session setup is incomplete
          // Try to initialize anyway in case it was a hash redirect (implicit flow)
          await initialize()
          const currentSession = useAuthStore.getState().session
          if (currentSession) {
            setStatus('success')
            setTimeout(() => navigate(next), 1500)
          } else {
            throw new Error('No session could be established. Please try logging in directly.')
          }
        }
      } catch (err) {
        console.error('Authentication callback error:', err)
        setStatus('error')
        setErrorMessage(err.message || 'An error occurred during authentication.')
      }
    }

    handleAuthCallback()
  }, [navigate, initialize])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[100px] opacity-70" />
      </div>

      <motion.div
        className="w-full max-w-[460px] relative z-10 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col items-center mb-8">
          <CyberCliMark size={48} className="animate-pulse" />
          <h1 className="text-3xl font-semibold text-foreground-primary tracking-tight font-serif mt-6">
            CyberCli Secure Auth
          </h1>
        </div>

        <div className="bg-background-elevated border border-border-subtle rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
          {status === 'processing' && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
              <p className="text-foreground-primary font-medium">Verifying authorization code...</p>
              <p className="text-xs text-foreground-muted mt-2">Setting up your secure environment</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-foreground-primary font-medium">Session secured successfully!</p>
              <p className="text-xs text-foreground-muted mt-2">Redirecting you to the console...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center w-full">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-foreground-primary font-medium">Verification Failed</p>
              <p className="text-xs text-red-400 mt-2 text-center break-words max-w-[320px]">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/auth/login')}
                className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent-dark transition-all shadow-sm"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
