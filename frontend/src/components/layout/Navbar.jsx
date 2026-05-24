import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu, X, ChevronDown, LogOut, User, 
  Sparkles, Cpu, CreditCard, History, 
  BookOpen, Terminal, Rss, Gift, 
  Building2, Briefcase, Mail, Bot, Code2,
  FolderOpen, Layers, Globe
} from 'lucide-react'
import { useAuthStore } from '@stores/authStore.js'
import { CyberCliWordmark } from '@components/ui/CyberCliLogo'
import { motion, AnimatePresence } from 'framer-motion'

const ICON_MAP = {
  Sparkles, Cpu, CreditCard, History,
  BookOpen, Terminal, Rss, Gift,
  Building2, Briefcase, Mail, Bot, Code2,
  FolderOpen, Layers, Globe
}

const MENU_GROUPS = [
  {
    label: 'Product',
    items: [
      { label: 'Features', href: '/features', desc: 'Explore the ultimate agentic capabilities', icon: 'Sparkles' },
      { label: 'Models', href: '/models', desc: 'Browse our unified 200K+ model proxy', icon: 'Cpu' },
      { label: 'AI Agents', href: '/ai-agents', desc: 'Deploy custom autonomous agents', icon: 'Bot' },
      { label: 'Projects', href: '/projects', desc: 'Manage your isolated workspaces', icon: 'FolderOpen' },
      { label: 'Workflows', href: '/workflows', desc: 'Automate multi-agent operations', icon: 'Layers' },
      { label: 'Discover', href: '/discover', desc: 'Find custom agents and prompt cards', icon: 'Globe' },
      { label: 'Developers', href: '/developers', desc: 'Unified SDK & builder portal', icon: 'Code2' },
      { label: 'Pricing', href: '/pricing', desc: 'Flexible free and Pro options', icon: 'CreditCard' },
      { label: 'Usage Statistics', href: '/usage', desc: 'Track your agent execution token usage', icon: 'History' },
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
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          to="/projects"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Projects
                        </Link>
                        <Link
                          to="/workflows"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Workflows
                        </Link>
                        <Link
                          to="/discover"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Discover
                        </Link>
                        <Link
                          to="/usage"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Usage & Stats
                        </Link>
                        <Link
                          to="/settings"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
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

      {/* ── Mobile full-screen slide-in panel ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              key="mobile-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-sm flex flex-col overflow-y-auto"
              style={{ background: '#0f0f15', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-white/[0.06] flex-shrink-0">
                <Link to="/" onClick={() => setMobileOpen(false)}>
                  <CyberCliWordmark size={22} />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Groups */}
              <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {MENU_GROUPS.map((group) => {
                  const isOpen = mobileAccordions[group.label]
                  return (
                    <div key={group.label}>
                      <button
                        onClick={() => toggleMobileAccordion(group.label)}
                        className="w-full flex items-center justify-between px-3 py-3 text-sm font-semibold text-white hover:bg-white/[0.05] rounded-xl transition-colors"
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
                            className="overflow-hidden ml-1"
                          >
                            <div className="py-1 space-y-0.5">
                              {group.items.map((item) => {
                                const IconComponent = ICON_MAP[item.icon]
                                return (
                                  <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
                                  >
                                    {IconComponent && (
                                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                                        <IconComponent className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium text-white text-sm">{item.label}</div>
                                      <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.desc}</div>
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>

              {/* Bottom CTAs */}
              <div className="px-4 py-5 border-t border-white/[0.06] flex-shrink-0 space-y-3">
                {user ? (
                  <>
                    <Link
                      to="/chat"
                      onClick={() => setMobileOpen(false)}
                      className="block btn-primary text-center text-sm font-semibold w-full"
                    >
                      Go to Chat
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="text-center px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06]"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/projects"
                        onClick={() => setMobileOpen(false)}
                        className="text-center px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06]"
                      >
                        Projects
                      </Link>
                      <Link
                        to="/workflows"
                        onClick={() => setMobileOpen(false)}
                        className="text-center px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06]"
                      >
                        Workflows
                      </Link>
                      <Link
                        to="/discover"
                        onClick={() => setMobileOpen(false)}
                        className="text-center px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06]"
                      >
                        Discover
                      </Link>
                      <Link
                        to="/usage"
                        onClick={() => setMobileOpen(false)}
                        className="text-center px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06]"
                      >
                        Usage
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="text-center px-3 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06]"
                      >
                        Settings
                      </Link>
                    </div>
                    <button
                      onClick={() => { handleSignOut(); setMobileOpen(false) }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth/signup"
                      onClick={() => setMobileOpen(false)}
                      className="block btn-primary text-center text-sm font-semibold w-full"
                    >
                      Get Started — It's Free
                    </Link>
                    <Link
                      to="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="block text-center px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/[0.06] w-full"
                    >
                      Log in
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
