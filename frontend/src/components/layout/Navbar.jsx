import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu, X, ChevronDown, LogOut, User, 
  Sparkles, Cpu, CreditCard, History, 
  BookOpen, Terminal, Rss, Gift, 
  Building2, Briefcase, Mail 
} from 'lucide-react'
import { useAuthStore } from '@stores/authStore.js'
import { CyberCliWordmark } from '@components/ui/CyberCliLogo'
import { motion, AnimatePresence } from 'framer-motion'

const ICON_MAP = {
  Sparkles, Cpu, CreditCard, History,
  BookOpen, Terminal, Rss, Gift,
  Building2, Briefcase, Mail
}

const MENU_GROUPS = [
  {
    label: 'Product',
    items: [
      { label: 'Features', href: '/features', desc: 'Explore the ultimate agentic capabilities', icon: 'Sparkles' },
      { label: 'Models', href: '/models', desc: 'Browse our unified 200K+ model proxy', icon: 'Cpu' },
      { label: 'Pricing', href: '/pricing', desc: 'Flexible free and Pro options', icon: 'CreditCard' },
      { label: 'Changelog', href: '/changelog', desc: 'See what\'s new in the platform', icon: 'History' },
    ]
  },
  {
    label: 'Resources',
    items: [
      { label: 'Documentation', href: '/docs', desc: 'Getting started guides & references', icon: 'BookOpen' },
      { label: 'API Reference', href: '/api-reference', desc: 'Integrate CyberCli into your app', icon: 'Terminal' },
      { label: 'Blog', href: '/blog', desc: 'Read research by Chandan Pandey', icon: 'Rss' },
      { label: 'Affiliate', href: '/affiliate', desc: 'Earn by promoting CyberCli', icon: 'Gift' },
    ]
  },
  {
    label: 'Company',
    items: [
      { label: 'About Us', href: '/about', desc: 'Our mission and Chandan\'s bio', icon: 'Building2' },
      { label: 'Careers', href: '/careers', desc: 'Join our team to shape the AI future', icon: 'Briefcase' },
      { label: 'Contact', href: '/contact', desc: 'Get in touch with support & sales', icon: 'Mail' },
    ]
  }
]

export default function Navbar() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null) // 'Product' | 'Resources' | 'Company' | null
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [mobileAccordions, setMobileAccordions] = useState({ Product: false, Resources: false, Company: false })
  const location = useLocation()
  const userDropdownRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setActiveDropdown(null)
    setUserDropdownOpen(false)
  }, [location])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const toggleMobileAccordion = (group) => {
    setMobileAccordions(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  const isAppRoute =
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/library') ||
    location.pathname.startsWith('/agents') ||
    location.pathname.startsWith('/voice')

  const isAuthRoute = location.pathname.startsWith('/auth')

  if (isAppRoute || isAuthRoute) return null

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0f0f15]/80 backdrop-blur-md border-b border-white/[0.06] py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="section-padding">
        <nav className="container-custom flex items-center justify-between">
          {/* ── Logo ── */}
          <Link
            to="/"
            className="group transition-opacity hover:opacity-90"
            aria-label="CyberCli – go to homepage"
          >
            <CyberCliWordmark size={24} />
          </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden lg:flex items-center gap-2">
            {MENU_GROUPS.map((group) => (
              <div
                key={group.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(group.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:text-white ${
                    activeDropdown === group.label ? 'text-white bg-white/5' : 'text-gray-400'
                  }`}
                >
                  {group.label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    activeDropdown === group.label ? 'rotate-180 text-white' : 'text-gray-500'
                  }`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {activeDropdown === group.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 bg-[#0f0f14]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3 shadow-[0_16px_36px_rgba(0,0,0,0.4)] overflow-hidden"
                    >
                      <div className="grid gap-1">
                        {group.items.map((item) => {
                          const IconComponent = ICON_MAP[item.icon]
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group/item"
                            >
                              <div className="mt-0.5 p-1.5 rounded-md bg-white/5 text-gray-400 group-hover/item:text-accent group-hover/item:bg-accent/10 transition-colors">
                                {IconComponent && <IconComponent className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-white group-hover/item:text-accent transition-colors">
                                  {item.label}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 font-medium leading-normal">
                                  {item.desc}
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* ── Desktop auth buttons ── */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/chat" className="btn-primary text-sm font-medium">
                  Go to Chat
                </Link>
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  </button>
                  
                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-[#0f0f14]/95 border border-white/[0.08] rounded-xl shadow-xl overflow-hidden"
                      >
                        <Link
                          to="/profile"
                          className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          to="/settings"
                          className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Settings
                        </Link>
                        <hr className="border-white/[0.06]" />
                        <button
                          onClick={() => { handleSignOut(); setUserDropdownOpen(false) }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-4 py-2"
                >
                  Log in
                </Link>
                <Link to="/auth/signup" className="btn-primary text-sm font-medium">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0f0f15]/95 backdrop-blur-xl border-b border-white/[0.08] overflow-hidden"
          >
            <div className="section-padding py-4 space-y-2 max-h-[85vh] overflow-y-auto">
              {/* Accordion groups */}
              {MENU_GROUPS.map((group) => {
                const isOpen = mobileAccordions[group.label]
                return (
                  <div key={group.label} className="border-b border-white/[0.04] pb-1">
                    <button
                      onClick={() => toggleMobileAccordion(group.label)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-4 pr-2 py-1 grid gap-1 overflow-hidden"
                        >
                          {group.items.map((item) => {
                            const IconComponent = ICON_MAP[item.icon]
                            return (
                              <Link
                                key={item.href}
                                to={item.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                              >
                                {IconComponent && <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                                <div>
                                  <div className="font-medium text-white">{item.label}</div>
                                  <div className="text-[11px] text-gray-500 truncate max-w-[240px] mt-0.5">{item.desc}</div>
                                </div>
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              <div className="pt-3 space-y-2">
                {user ? (
                  <>
                    <Link to="/chat" className="block btn-primary text-center text-sm font-medium">
                      Go to Chat
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => { handleSignOut(); setMobileOpen(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth/login"
                      className="block px-4 py-3 rounded-lg text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link to="/auth/signup" className="block btn-primary text-center text-sm font-medium">
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
