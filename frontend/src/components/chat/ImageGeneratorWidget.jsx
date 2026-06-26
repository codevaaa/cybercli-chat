import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCw, Download } from 'lucide-react'
import { API_BASE } from '../../lib/api.js'

export function MidnightCountdown() {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const diff = tomorrow - now

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 1000 / 60) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded ml-1 mr-1">{timeLeft}</span>
}

export function ImageGeneratorWidget({ src, alt }) {
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    const timeoutId = setTimeout(() => {
      const generateImage = async () => {
        setLoading(true)
        setError(null)
        try {
          let prompt = alt || 'A beautiful generated image'
          if (src.includes('/p/')) {
            const parts = src.split('/p/')
            if (parts[1]) {
              const promptPart = parts[1].split('?')[0]
              prompt = decodeURIComponent(promptPart)
            }
          } else if (src.includes('prompt=')) {
            const urlObj = new URL(src, window.location.origin)
            const p = urlObj.searchParams.get('prompt')
            if (p) prompt = p
          }

          const token = localStorage.getItem('sb-access-token')
          const response = await fetch(`${API_BASE}/art/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ prompt })
          })

          if (!response.ok) {
            let errData
            try {
              errData = await response.json()
            } catch {
              throw new Error(`Error: ${response.status} ${response.statusText}`)
            }
            throw Object.assign(new Error(errData.error || `Error: ${response.status}`), { resetAt: errData.resetAt })
          }

          const data = await response.json()

          if (active) {
            setImageUrl(data.url)
            setLoading(false)
            window.dispatchEvent(new Event('image-generated'))
          }
        } catch (err) {
          if (active) {
            setError({ message: err.message, resetAt: err.resetAt })
            setLoading(false)
          }
        }
      }
      generateImage()
    }, 1500) // debounce by 1.5s to prevent firing constantly during LLM streaming

    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [src, alt, retryCount])

  if (loading) {
    return (
      <div className="my-3 rounded-xl border border-border-subtle bg-background-secondary p-6 flex flex-col items-center justify-center gap-4 max-w-lg">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <div className="text-xs text-foreground-muted animate-pulse">Generating your premium image...</div>
      </div>
    )
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : error.message
    const isLimit = errorMessage.toLowerCase().includes('limit')

    return (
      <div className="my-3 rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col items-start gap-3 max-w-lg">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{isLimit ? 'Image Generation Limit Exceeded' : 'Image Generation Failed'}</span>
        </div>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {isLimit 
            ? <>You have reached your daily limit of 5 free image generations. Resets in <MidnightCountdown /> (local time). Please upgrade to Pro for unlimited image generation.</>
            : errorMessage}
        </p>
        <div className="flex gap-2.5 mt-1">
          <Link to="/upgrade" className="px-3 py-1.5 rounded-lg bg-[#D97757] hover:bg-[#D97757]/80 text-[10px] uppercase tracking-wider font-bold text-white transition-all">
            Upgrade to Pro
          </Link>
          <button 
            onClick={() => setRetryCount(c => c + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] uppercase tracking-wider font-bold text-white/80 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-border-subtle bg-background-secondary relative group max-w-lg animate-fade-in">
      <img src={imageUrl} alt={alt} className="w-full h-auto object-cover max-h-[512px]" />
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
        <button
          onClick={() => window.open(imageUrl, '_blank')}
          className="p-2 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all"
          title="Open in new tab"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
