import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Zap, ChevronDown, LogOut, User } from 'lucide-react'
import { NAV_LINKS } from '@lib/constants'
import { useAuthStore } from '@stores/authStore.js'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isAppRoute = location.pathname.startsWith('/chat') || location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/library') || location.pathname.startsWith('/agents') || location.pathname.startsWith('/voice')

  if (isAppRoute) return null

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass border-b border-border-subtle py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="section-padding">
        <nav className="container-custom flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center transition-transform group-hover:scale-105">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Cyber<span className="text-accent">Cli</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === link.href
                    ? 'text-accent'
                    : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/chat"
                  className="btn-primary text-sm"
                >
                  Go to Chat
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background-tertiary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-background-secondary border border-border-subtle rounded-lg shadow-xl overflow-hidden">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Settings
                      </Link>
                      <hr className="border-border-subtle" />
                      <button
                        onClick={() => { handleSignOut(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="text-sm font-medium text-foreground-secondary hover:text-foreground-primary transition-colors px-4 py-2"
                >
                  Log in
                </Link>
                <Link
                  to="/auth/signup"
                  className="btn-primary text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-background-tertiary transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </div>

      {mobileOpen && (
        <div className="lg:hidden glass border-b border-border-subtle">
          <div className="section-padding py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.href
                    ? 'text-accent bg-accent/10'
                    : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-border-subtle space-y-2">
              {user ? (
                <>
                  <Link
                    to="/chat"
                    className="block btn-primary text-center text-sm"
                  >
                    Go to Chat
                  </Link>
                  <Link
                    to="/profile"
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/auth/signup"
                    className="block btn-primary text-center text-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
