import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAuthStore } from '../../stores/authStore.js'
import { CodevaMark } from '../../components/ui/CodevaLogo'
import { authDestination, authFlowQuery, authPagePath, authErrorMessage, resolveAuthSession } from '../../lib/authFlow.js'
import { returnToEditor } from '../../lib/editorAuth.js'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { initialize } = useAuthStore()
  const [status, setStatus] = useState('processing')
  const [errorMessage, setErrorMessage] = useState('')
  const [isDesktopRedirect, setIsDesktopRedirect] = useState(false)
  const returnToLogin = () => {
    try { navigate(authPagePath('login', window.location.search)) } catch { navigate('/auth/login') }
  }

  useEffect(() => {
    let cancelled = false, redirectTimer
    const handleAuthCallback = async () => {
      try {
        const href = window.location.href, params = new URLSearchParams(window.location.search)
        const hash = new URLSearchParams(window.location.hash.slice(1))
        authFlowQuery(params) // Reject unsafe native callback destinations first.
        const session = await resolveAuthSession(supabase, href)
        await initialize()
        if (cancelled) return
        const state = useAuthStore.getState()
        if (!state.accountReady) throw new Error(state.error || 'Could not finish connecting your account. Please try again.')
        // Remove credentials and single-use codes from browser history.
        window.history.replaceState(null, '', `/auth/callback?${authFlowQuery(params)}`)
        const target = params.get('redirect')
        setIsDesktopRedirect(['ide', 'cli', 'desktop'].includes(target))
        if (target === 'ide') returnToEditor(session, params)
        else if (target === 'cli') window.location.href = `http://127.0.0.1:${params.get('port')}/callback?token=${encodeURIComponent(session.access_token)}&refresh=${encodeURIComponent(session.refresh_token || '')}`
        else if (target === 'desktop') window.location.href = `codeva://auth?token=${encodeURIComponent(session.access_token)}&refresh=${encodeURIComponent(session.refresh_token || '')}`
        else {
          const recovery = hash.get('type') === 'recovery' || params.get('type') === 'recovery'
          redirectTimer = setTimeout(() => navigate(recovery ? '/auth/reset-password' : authDestination(params), { replace: true }), 500)
        }
        setStatus('success')
      } catch (error) {
        if (!cancelled) { setStatus('error'); setErrorMessage(authErrorMessage(error)) }
      }
    }
    handleAuthCallback()
    return () => { cancelled = true; clearTimeout(redirectTimer) }
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
          <CodevaMark size={60} className="animate-pulse" />
          <h1 className="text-3xl font-semibold text-foreground-primary tracking-tight font-serif mt-6">
            Codeva Secure Auth
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
              <p className="text-xs text-foreground-muted mt-2">
                {isDesktopRedirect ? 'Opening Codeva Desktop...' : 'Redirecting you to the console...'}
              </p>
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
                onClick={returnToLogin}
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
