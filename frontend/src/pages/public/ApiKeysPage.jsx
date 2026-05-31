import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Key, Copy, Check, Trash2, Plus, Shield, ArrowRight } from 'lucide-react'
import api, { isLoggedIn } from '../../lib/api.js'
import SEOHead from '@components/seo/SEOHead'

/**
 * /api-keys — Standalone API key management page. Works for both the website
 * and the VS Code extension's "Open API Keys page" flow. If the user isn't
 * logged in, shows a clear sign-in prompt. If logged in, shows key creation +
 * list + revoke — the same functionality as Settings → API Keys but accessible
 * without navigating through the full settings UI.
 */
export default function ApiKeysPage() {
  const [keys, setKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const loggedIn = isLoggedIn()

  const loadKeys = async () => {
    try {
      const { data } = await api.get('/api-keys')
      setKeys(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { if (loggedIn) loadKeys() }, [loggedIn])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.post('/api-keys', { name: newKeyName.trim() })
      setGeneratedKey(data.key)
      setNewKeyName('')
      loadKeys()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create API key. Please try again.')
    } finally { setLoading(false) }
  }

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? Any CLI/extension using it will disconnect.')) return
    try { await api.delete(`/api-keys/${id}`); loadKeys() } catch (err) { console.error(err) }
  }

  const handleCopy = () => {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#1a1a18] pt-32 pb-20 px-6">
      <SEOHead title="API Keys — CyberCoder & Extension Access" path="/api-keys" />
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Key className="w-6 h-6 text-[#C96442]" />
          <h1 className="text-2xl font-serif font-normal text-[#f5f4ef]" style={{ fontFamily: "'Instrument Serif', serif" }}>API Keys</h1>
        </div>
        <p className="text-sm text-gray-400 mb-8 max-w-lg">
          Create API keys to connect the CyberCoder CLI, VS Code extension, or any integration to your Codeva account.
        </p>

        {!loggedIn ? (
          <div className="p-8 rounded-2xl border border-white/[0.06] bg-[#211f1c] text-center">
            <Shield className="w-10 h-10 text-[#C96442] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#f5f4ef] mb-2">Sign in to manage API keys</h2>
            <p className="text-sm text-gray-400 mb-6">You need a Codeva account to create and manage API keys.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth/login" className="px-6 py-2.5 rounded-xl bg-[#C96442] text-white text-sm font-semibold hover:bg-[#b9573a] transition-colors">
                Sign in
              </Link>
              <Link to="/auth/signup" className="px-6 py-2.5 rounded-xl border border-white/[0.1] text-[#f5f4ef] text-sm font-medium hover:bg-white/5 transition-colors">
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Generated key banner */}
            {generatedKey && (
              <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 mb-6">
                <p className="text-sm font-semibold text-emerald-300 mb-2">✓ API Key created! Copy it now — it won't be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-emerald-500/20 text-xs font-mono text-white break-all select-all">{generatedKey}</code>
                  <button onClick={handleCopy} className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5">
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <button onClick={() => setGeneratedKey(null)} className="text-xs text-emerald-400 hover:underline mt-3">Done, I've copied it</button>
              </div>
            )}

            {/* Create form */}
            <form onSubmit={handleCreate} className="flex gap-3 mb-6">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. VS Code Extension)"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#211f1c] border border-white/[0.08] text-sm text-[#f5f4ef] placeholder:text-gray-500 focus:outline-none focus:border-[#C96442]"
              />
              <button type="submit" disabled={loading || !newKeyName.trim()} className="px-5 py-2.5 rounded-xl bg-[#C96442] text-white text-sm font-semibold hover:bg-[#b9573a] transition-colors disabled:opacity-50 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Create
              </button>
            </form>

            {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

            {/* Key list */}
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k._id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-[#211f1c]">
                  <div>
                    <p className="text-sm font-medium text-[#f5f4ef]">{k.name}</p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{k.key}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-500 hidden sm:inline">
                      {k.created_at ? new Date(k.created_at).toLocaleDateString() : ''}
                    </span>
                    <button onClick={() => handleRevoke(k._id)} className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors" title="Revoke">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {keys.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">No API keys yet. Create one above to connect the CLI or extension.</p>
              )}
            </div>

            {/* Usage hint */}
            <div className="mt-8 p-5 rounded-2xl border border-white/[0.06] bg-[#211f1c]">
              <h3 className="text-sm font-semibold text-[#f5f4ef] mb-2">How to use your API key</h3>
              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-[#C96442] font-bold mt-0.5">CLI:</span>
                  <code className="bg-black/20 px-2 py-1 rounded text-gray-300">cm login --key sk_cyber_…</code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#C96442] font-bold mt-0.5">VS Code:</span>
                  <span>Open CyberCoder → Sign In → paste the key</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#C96442] font-bold mt-0.5">API:</span>
                  <code className="bg-black/20 px-2 py-1 rounded text-gray-300">Authorization: Bearer sk_cyber_…</code>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
