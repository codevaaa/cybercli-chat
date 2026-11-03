import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore.js'
import BrowserMark from '../../components/ui/BrowserMark'

export default function ExtensionConnectPage() {
  const { session, accountReady, loading, error, initialize } = useAuthStore()
  const [result, setResult] = useState({ state: 'waiting', message: 'Connecting your account to the extension…' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!session || !accountReady) return
    setResult({ state: 'waiting', message: 'Connecting your account to the extension…' })
    const requestId = crypto.randomUUID()
    const listener = event => {
      if (event.source !== window || event.origin !== window.location.origin || event.data?.type !== 'CODEVA_EXTENSION_AUTH_RESULT' || event.data.requestId !== requestId) return
      clearTimeout(timer)
      setResult(event.data.ok ? { state: 'connected', message: 'Your Codeva extension is connected. Open the Chrome toolbar icon to continue.' } : { state: 'error', message: event.data.error || 'The extension could not connect. Please try again.' })
    }
    window.addEventListener('message', listener)
    const timer = setTimeout(() => setResult({ state: 'error', message: 'The extension did not respond. Install or reload the latest extension, then reload this page.' }), 10000)
    window.postMessage({ type: 'CODEVA_EXTENSION_REQUEST_SYNC', requestId }, window.location.origin)
    return () => { clearTimeout(timer); window.removeEventListener('message', listener) }
  }, [session, accountReady, attempt])
  return <main className="min-h-screen bg-background-primary flex items-center justify-center p-6"><div className="max-w-md space-y-5 text-foreground-primary">
    <BrowserMark size={52} />
    <h1 className="text-3xl font-serif">{result.state === 'connected' ? 'Your workspace is ready.' : 'Connect Codeva for Chrome'}</h1>
    <p role="status" aria-live="polite">{loading ? 'Finishing account sign-in…' : error || (!session ? 'Sign in to your Codeva account to connect the extension.' : result.message)}</p>
    <div className="flex flex-wrap gap-3">
      {!session ? <Link className="px-4 py-3 rounded-lg bg-accent text-white" to="/auth/login?from=extension">Sign in</Link> : result.state !== 'connected' && <button disabled={loading} className="px-4 py-3 rounded-lg bg-accent text-white disabled:opacity-50" onClick={async () => { if (!accountReady) await initialize(); setAttempt(value => value + 1) }}>Try again</button>}
      <Link className="px-4 py-3 rounded-lg border border-border-subtle" to="/chrome-extension">Install extension</Link>
      <Link className="px-4 py-3 rounded-lg border border-border-subtle" to="/chat">Open web chat</Link>
    </div>
  </div></main>
}
