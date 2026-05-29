import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Key, ArrowLeft, Mail, Globe, Lock, ShieldCheck, Copy, Check } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore.js'
import api from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'

export default function CliLoginPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || ''
  const port = searchParams.get('port') || ''
  const isCli = redirect === 'cli'

  const { user, session, signInWithEmail, loading: authLoading, error: authError } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)
  
  // Authorization status
  const [authStatus, setAuthStatus] = useState('idle') // 'idle' | 'authorizing' | 'success' | 'manual'
  const [generatedKey, setGeneratedKey] = useState('')
  const [copied, setCopied] = useState(false)

  // Clear errors when typing
  useEffect(() => {
    setLocalError(null)
  }, [email, password])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setLocalError(null)
    try {
      const result = await signInWithEmail(email, password)
      if (!result.success) {
        setLocalError(result.error || 'Invalid email or password')
      }
    } catch (err) {
      setLocalError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLocalError(null)
    try {
      const nextPath = `/login?redirect=cli&port=${port}`
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      })
      if (error) throw error
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setLocalError(err.message || 'OAuth error')
    }
  }

  const handleAuthorize = async () => {
    if (!port) {
      setAuthStatus('manual')
      return
    }
    
    setAuthStatus('authorizing')
    setLocalError(null)
    
    try {
      // Generate a new CLI API key
      const keyName = `CyberCoder CLI (${navigator.platform || 'Local Machine'})`
      const { data } = await api.post('/api-keys', { name: keyName })
      const apiKey = data.key
      setGeneratedKey(apiKey)

      // Send key to local HTTP server
      const localResponse = await fetch(`http://127.0.0.1:${port}/auth?token=${encodeURIComponent(apiKey)}`)
      if (localResponse.ok) {
        setAuthStatus('success')
      } else {
        // Fallback to manual display
        setAuthStatus('manual')
      }
    } catch (err) {
      console.error('Failed to automatically authorize CLI:', err)
      setAuthStatus('manual')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-[#7C3AED]/5 rounded-full blur-[120px] opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D97736]" />
            <span className="text-white text-xl font-semibold">CyberCli</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#13131A] border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
          <AnimatePresence>
            {(localError || authError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
              >
                {localError || authError}
              </motion.div>
            )}
          </AnimatePresence>

          {user ? (
            /* Logged in: show authorization prompt */
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-white text-2xl font-semibold mb-2">Authorize CLI</h1>
                <p className="text-gray-400 text-sm">
                  Grant CyberCoder CLI access to your account <span className="text-white font-medium">({user.email})</span>.
                </p>
              </div>

              {authStatus === 'idle' && (
                <div className="space-y-4">
                  <button
                    onClick={handleAuthorize}
                    className="w-full bg-[#D97736] hover:bg-[#c2652b] text-white rounded-lg py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-5 h-5" />
                    Authorize CyberCoder CLI
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    This generates an API key and connects it securely to your CLI agent.
                  </p>
                </div>
              )}

              {authStatus === 'authorizing' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <span className="animate-spin w-8 h-8 border-4 border-[#D97736] border-t-transparent rounded-full" />
                  <p className="text-white text-sm">Sending authentication key to local server...</p>
                </div>
              )}

              {authStatus === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-white text-lg font-semibold">Authentication Successful!</h2>
                  <p className="text-gray-400 text-sm max-w-xs">
                    You can close this tab and return to the terminal.
                  </p>
                </div>
              )}

              {authStatus === 'manual' && (
                <div className="space-y-4">
                  <p className="text-red-400 text-sm">
                    Could not connect automatically to local CLI server. Please copy this API Key and paste it into the CLI manually.
                  </p>
                  
                  {generatedKey ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 bg-[#1A1A24] border border-white/[0.08] p-3 rounded-lg relative group">
                        <code className="text-xs text-orange-400 select-all break-all pr-8">
                          {generatedKey}
                        </code>
                        <button
                          onClick={copyToClipboard}
                          className="absolute right-2 text-gray-400 hover:text-white transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        In CLI, choose Option 2 "API key (BYOK)" and paste this key.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const { data } = await api.post('/api-keys', { name: 'CyberCoder CLI (Manual)' })
                          setGeneratedKey(data.key)
                        } catch (err) {
                          setLocalError('Failed to generate key')
                        }
                      }}
                      className="w-full bg-[#1A1A24] border border-white/[0.08] hover:border-white/[0.16] text-white rounded-lg py-3 px-4 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      Generate API Key
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Logged out: show login portal */
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-white text-2xl font-semibold mb-2">
                  {isCli ? 'Sign in to CyberCli Code' : 'Sign in to CyberCli'}
                </h1>
                <p className="text-gray-400 text-sm">
                  Log in to authorize the coding CLI agent.
                </p>
              </div>

              {/* Google login */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg py-3 px-4 font-medium hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Globe className="w-5 h-5" />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-gray-500 text-xs font-semibold">OR</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Login Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-[#1A1A24] border border-white/[0.08] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D97736] transition-colors"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#1A1A24] border border-white/[0.08] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D97736] transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-gray-900 rounded-lg py-3 px-4 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-spin w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Sign in with Email
                    </>
                  )}
                </button>
              </form>

              {/* API Key BYOK redirect option */}
              {isCli && (
                <div className="pt-4 border-t border-white/[0.06] text-center">
                  <p className="text-gray-500 text-xs mb-2">Want to bypass cloud login?</p>
                  <Link
                    to="/product"
                    className="inline-flex items-center gap-1.5 text-[#D97736] text-xs font-semibold hover:underline"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Use API key (BYOK) instead
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
