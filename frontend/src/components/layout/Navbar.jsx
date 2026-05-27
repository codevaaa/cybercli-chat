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
import { motion, AnimatePresence } from 'framer-motion'
import SubNavbar from './SubNavbar'
import { CyberCliWordmark, CyberCliMark } from '@components/ui/CyberCliLogo'
import { MessageSquare } from 'lucide-react'

const ICON_MAP = {
  Sparkles, Cpu, CreditCard, History,
  BookOpen, Terminal, Rss, Gift,
  Building2, Briefcase, Mail, Bot, Code2,
  FolderOpen, Layers, Globe
}

const MENU_GROUPS = [
  {
    label: 'Product',
    columns: 2,
    featured: {
      title: 'CyberCli Code',
      desc: 'Meet the new agentic AI coding assistant that lives in your terminal.',
      href: '/code',
      img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=400&h=300'
    },
    items: [
      { label: 'CyberCli Chat', href: '/chat', desc: 'Advanced AI chat interface', icon: 'MessageSquare' },
      { label: 'Models', href: '/models', desc: 'Browse our 200K+ model proxy', icon: 'Cpu' },
      { label: 'Workflows', href: '/workflows', desc: 'Automate multi-agent tasks', icon: 'Layers' },
      { label: 'Discover', href: '/discover', desc: 'Find custom agents', icon: 'Globe' },
    ]
  },
  {
    label: 'Use Cases',
    columns: 2,
    featured: {
      title: 'Enterprise AI Solutions',
      desc: 'Secure, scalable AI deployment for modern organizations.',
      href: '/use-cases/enterprise',
      img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400&h=300'
    },
    items: [
      { label: 'For Developers', href: '/use-cases/developers', desc: 'Ship code faster', icon: 'Code2' },
      { label: 'For Enterprise', href: '/use-cases/enterprise', desc: 'Secure AI deployment', icon: 'Building2' },
      { label: 'For Researchers', href: '/use-cases/researchers', desc: 'Deep data analysis', icon: 'BookOpen' },
    ]
  },
  {
    label: 'Developers',
    columns: 2,
    featured: {
      title: 'Build with CyberCli API',
      desc: 'Integrate advanced multi-agent intelligence directly into your apps.',
      href: '/api',
      img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400&h=300'
    },
    items: [
      { label: 'API Reference', href: '/api', desc: 'Integrate into your app', icon: 'Terminal' },
      { label: 'SDKs', href: '/sdks', desc: 'Official libraries', icon: 'FolderOpen' },
      { label: 'Documentation', href: '/docs', desc: 'Guides and tutorials', icon: 'BookOpen' },
    ]
  },
  {
    label: 'Resources',
    columns: 2,
    featured: {
      title: 'CyberCli Masterclass',
      desc: 'Learn how to maximize your productivity with agentic AI.',
      href: '/blog',
      img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400&h=300'
    },
    items: [
      { label: 'Blog', href: '/blog', desc: 'Latest updates', icon: 'Rss' },
      { label: 'Community', href: '/community', desc: 'Join the discussion', icon: 'Globe' },
      { label: 'Help Center', href: '/help', desc: 'Support & FAQs', icon: 'Sparkles' },
    ]
  },
  {
    label: 'Company',
    columns: 2,
    featured: {
      title: 'Join Our Mission',
      desc: 'Help us democratize access to advanced artificial intelligence.',
      href: '/careers',
      img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=400&h=300'
    },
    items: [
      { label: 'About', href: '/about', desc: 'Our mission', icon: 'Building2' },
      { label: 'Careers', href: '/careers', desc: 'Join the team', icon: 'Briefcase' },
      { label: 'Contact', href: '/contact', desc: 'Get in touch', icon: 'Mail' },
    ]
  },
  {
    label: 'Pricing',
    href: '/pricing',
    items: []
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

  // Define global sub-navbar items (similar to Claude Code's sub-nav)
  const subNavItems = [
    { label: 'Overview', href: '/' },
    { label: 'Features', href: '/features' },
    { label: 'Models', href: '/models' },
    { label: 'CyberCli Code', href: '/code' },
    { label: 'Downloads', href: '/downloads' },
    { label: 'Documentation', href: '/docs' }
  ]

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0f0f14]/95 backdrop-blur-md border-b border-white/[0.04]'
            : 'bg-[#0a0a0f] border-b border-white/[0.02]'
        }`}
      >
        <div className="section-padding">
          <nav className="container-custom flex items-center justify-between h-14">
            {/* ── Logo ── */}
            <Link
              to="/"
              className="flex items-center group transition-opacity hover:opacity-90"
              aria-label="CyberCli – go to homepage"
            >
              <div className="flex items-center gap-2">
                <CyberCliMark size={28} />
                <CyberCliWordmark size={32} />
              </div>
            </Link>

          {/* ── Desktop nav links ── */}
          <div className="hidden lg:flex items-center gap-1.5">
            {MENU_GROUPS.map((group) => {
              if (!group.items || group.items.length === 0) {
                return (
                  <Link
                    key={group.label}
                    to={group.href}
                    className="px-3 py-1.5 text-[14px] font-medium text-[#a3a3a3] hover:text-white hover:bg-white/5 transition-colors rounded-md"
                  >
                    {group.label}
                  </Link>
                )
              }

              return (
              <div
                key={group.label}
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveDropdown(group.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium transition-colors rounded-md ${
                    activeDropdown === group.label ? 'text-white bg-white/5' : 'text-[#a3a3a3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {group.label}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    activeDropdown === group.label ? 'rotate-180 text-foreground-primary' : 'text-foreground-muted'
                  }`} />
                </button>

                {/* Mega Menu Dropdown */}
                <AnimatePresence>
                  {activeDropdown === group.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 ${group.featured ? 'w-[640px]' : group.columns === 2 ? 'w-[500px]' : 'w-80'} bg-[#0a0a0f]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_24px_50px_rgba(0,0,0,0.8)] overflow-hidden flex`}
                    >
                      {/* Left: Link Grid */}
                      <div className={`p-3 w-full grid ${group.columns === 2 && !group.featured ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 flex-1`}>
                        {group.items.map((item) => {
                          const IconComponent = ICON_MAP[item.icon]
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#D97757]/10 transition-all group/item"
                            >
                              <div className="mt-0.5 p-2 rounded-lg bg-[#151515] text-[#888888] group-hover/item:text-[#D97757] group-hover/item:bg-[#D97757]/20 transition-colors border border-white/5 group-hover/item:border-[#D97757]/30 shadow-inner">
                                {IconComponent && <IconComponent className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-[#e5e5e5] group-hover/item:text-white transition-colors">
                                  {item.label}
                                </div>
                                <div className="text-[13px] text-[#888888] mt-0.5 font-medium leading-relaxed group-hover/item:text-[#a1a1a1]">
                                  {item.desc}
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>

                      {/* Right: Featured Banner */}
                      {group.featured && (
                        <div className="w-[280px] bg-[#12121a] border-l border-white/5 p-4 flex flex-col justify-between group/featured">
                          <div>
                            <div className="rounded-xl overflow-hidden mb-4 border border-white/10 h-32 relative">
                              <div className="absolute inset-0 bg-[#D97757]/20 mix-blend-overlay z-10 group-hover/featured:bg-transparent transition-colors" />
                              <img src={group.featured.img} alt="Featured" className="w-full h-full object-cover grayscale group-hover/featured:grayscale-0 transition-all duration-500 transform group-hover/featured:scale-105" />
                            </div>
                            <h4 className="text-sm font-bold text-white mb-1.5">{group.featured.title}</h4>
                            <p className="text-xs text-[#888888] leading-relaxed mb-4">
                              {group.featured.desc}
                            </p>
                          </div>
                          <Link to={group.featured.href} className="text-xs font-bold text-[#D97757] hover:text-[#e08f75] flex items-center gap-1">
                            Learn more <span className="text-lg leading-none transition-transform group-hover/featured:translate-x-1">→</span>
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <>
                <Link to="/chat" className="btn-primary text-[13px] font-medium h-8 px-4 rounded-md">
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
                  className="text-[13px] font-medium text-[#a3a3a3] hover:text-white transition-colors px-3 py-1.5 hover:bg-white/5 rounded-md"
                >
                  Log in
                </Link>
                <Link to="/auth/signup" className="btn-primary text-[13px] font-medium h-8 px-4 rounded-md flex items-center justify-center">
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
    </header>

      {/* ── Sub Navbar (Claude Code style) ── */}
      <div className="fixed top-14 left-0 right-0 z-40 hidden lg:block">
        <SubNavbar items={subNavItems} />
      </div>

      {/* ── Mobile full-screen slide-in panel ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
        )}

        {mobileOpen && (
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
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <CyberCliMark size={26} />
                    <CyberCliWordmark size={30} />
                  </div>
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
                  if (!group.items || group.items.length === 0) {
                    return (
                      <div key={group.label} className="mb-1">
                        <Link
                          to={group.href}
                          onClick={() => setMobileOpen(false)}
                          className="w-full flex items-center justify-between px-3 py-3 text-white font-medium hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <span className="text-[15px]">{group.label}</span>
                        </Link>
                      </div>
                    )
                  }

                  const isOpen = mobileAccordions[group.label]
                  return (
                    <div key={group.label} className="mb-1">
                      <button
                        onClick={() => setMobileAccordions(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                        className="w-full flex items-center justify-between px-3 py-3 text-white font-medium hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <span className="text-[15px]">{group.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : 'text-gray-500'}`} />
                      </button>
                      
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-3 py-1 pr-2 space-y-1">
                              {group.items.map((item) => {
                                const IconComponent = ICON_MAP[item.icon]
                                return (
                                  <Link
                                    key={item.label}
                                    to={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors group/item"
                                  >
                                    <div className="p-1.5 rounded-md bg-white/5 text-gray-400 group-hover/item:text-white group-hover/item:bg-[#D97757]/20 transition-colors">
                                      {IconComponent && <IconComponent className="w-4 h-4" />}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{item.label}</div>
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

              {/* Mobile Footer / Auth */}
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
        )}
      </AnimatePresence>
    </>
  )
}
