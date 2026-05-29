import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Key, ArrowLeft, Mail, Globe } from 'lucide-react'

export default function CliLoginPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || ''
  const isCli = redirect === 'cli'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    // Simulate sending magic link
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D97736]" />
            <span className="text-white text-xl font-semibold">CyberCli</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-white text-2xl font-semibold text-center mb-2">
          {isCli ? 'Sign in to CyberCli Code' : 'Sign in to CyberCli'}
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          {isCli
            ? 'Enter your email to sign in or create an account.'
            : 'Enter your email to sign in to your account.'}
        </p>

        {/* Google Login */}
        <button
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg py-3 px-4 font-medium hover:bg-gray-100 transition-colors mb-4"
          onClick={() => {
            // OAuth redirect
            window.location.href = '/auth/callback?provider=google'
          }}
        >
          <Globe className="w-5 h-5" />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Email Login */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#D97736] transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-gray-900 rounded-lg py-3 px-4 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full" />
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Continue with email
              </>
            )}
          </button>
        </form>

        {/* API Key Option */}
        {isCli && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-gray-400 text-sm text-center mb-3">
              Prefer to use your own API key?
            </p>
            <Link
              to="/product"
              className="flex items-center justify-center gap-2 text-[#D97736] text-sm hover:underline"
            >
              <Key className="w-4 h-4" />
              Use API key (BYOK) instead
            </Link>
          </div>
        )}

        {/* Back Link */}
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

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-gray-600 text-xs">
          By continuing, you agree to CyberCli's{' '}
          <Link to="/terms-of-service" className="text-gray-400 hover:text-gray-300 underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="text-gray-400 hover:text-gray-300 underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
