import { useState, useEffect } from 'react'
import { Cookie, X, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setTimeout(() => setVisible(true), 1000)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    }))
    setVisible(false)
  }

  const handleReject = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    }))
    setVisible(false)
  }

  const handleEssentialOnly = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
      <div className="container-custom mx-auto max-w-2xl">
        <div className="glass-strong rounded-2xl p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground-primary mb-1">
                We value your privacy
              </h3>
              <p className="text-sm text-foreground-muted leading-relaxed mb-4">
                We use cookies to enhance your experience, analyze site traffic, and serve personalized content. 
                By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
                <Link to="/cookie-policy" className="text-accent hover:underline">
                  Learn more
                </Link>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAccept}
                  className="btn-primary text-sm px-5 py-2.5"
                >
                  Accept All
                </button>
                <button
                  onClick={handleEssentialOnly}
                  className="btn-secondary text-sm px-5 py-2.5"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setPreferencesOpen(!preferencesOpen)}
                  className="text-sm text-foreground-muted hover:text-foreground-primary transition-colors flex items-center gap-1 px-3 py-2.5"
                >
                  Preferences
                  <ChevronRight className={`w-4 h-4 transition-transform ${preferencesOpen ? 'rotate-90' : ''}`} />
                </button>
                <button
                  onClick={handleReject}
                  className="ml-auto text-foreground-muted hover:text-foreground-primary transition-colors p-2"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {preferencesOpen && (
                <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
                  {[
                    { id: 'essential', label: 'Essential', desc: 'Required for the website to function properly.', required: true },
                    { id: 'analytics', label: 'Analytics', desc: 'Helps us understand how visitors interact with our website.', required: false },
                    { id: 'marketing', label: 'Marketing', desc: 'Used to deliver relevant advertisements.', required: false },
                  ].map((pref) => (
                    <div key={pref.id} className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-sm font-medium text-foreground-primary">{pref.label}</span>
                        <p className="text-xs text-foreground-muted">{pref.desc}</p>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative flex-shrink-0 transition-colors ${pref.required ? 'bg-accent/30' : 'bg-accent'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${pref.required ? 'left-0.5' : 'right-0.5'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
