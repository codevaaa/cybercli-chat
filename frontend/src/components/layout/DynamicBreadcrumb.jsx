import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Home } from 'lucide-react'

/**
 * DynamicBreadcrumb — Real-time page flow tracker
 * 
 * Shows the actual navigation path the user took to reach the current page,
 * NOT pre-defined static options. Updates instantly on route changes with
 * smooth animated transitions.
 */

// Map route patterns to human-readable labels
const ROUTE_LABELS = {
  '/': { label: 'Home', icon: Home },
  '/features': { label: 'Features' },
  '/models': { label: 'Models' },
  '/pricing': { label: 'Pricing' },
  '/contact': { label: 'Contact' },
  '/about': { label: 'About' },
  '/careers': { label: 'Careers' },
  '/affiliate': { label: 'Affiliate' },
  '/blog': { label: 'Blog' },
  '/docs': { label: 'Docs' },
  '/downloads': { label: 'Downloads' },
  '/downloads/windows': { label: 'Windows' },
  '/downloads/mac': { label: 'macOS' },
  '/downloads/linux': { label: 'Linux' },
  '/api-reference': { label: 'API Reference' },
  '/developers': { label: 'Developers' },
  '/product': { label: 'CyberCoder CLI' },
  '/status': { label: 'System Status' },
  '/research': { label: 'Research' },
  '/company': { label: 'Company' },
  '/trust': { label: 'Trust Center' },
  '/council-mode': { label: 'Council Mode' },
  '/legal/consumer-terms': { label: 'Consumer Terms' },
  '/legal/commercial-terms': { label: 'Commercial Terms' },
  '/legal/privacy': { label: 'Privacy Policy' },
  '/legal/aup': { label: 'Acceptable Use' },
  '/privacy-policy': { label: 'Privacy Policy' },
  '/terms-of-service': { label: 'Terms' },
  '/cookie-policy': { label: 'Cookie Policy' },
  '/acceptable-use': { label: 'Acceptable Use' },
  '/gdpr': { label: 'GDPR' },
  '/responsible-disclosure-policy': { label: 'Disclosure Policy' },
  '/usage-limit-best-practices': { label: 'Usage Best Practices' },
  '/changelog': { label: 'Changelog' },
  '/login': { label: 'CLI Login' },
  '/subscribe': { label: 'Subscribe' },
}

function getBreadcrumbPath(pathname) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs = []
  let currentPath = ''

  // Always start with Home
  crumbs.push({ path: '/', label: 'Home', icon: Home })

  for (const segment of segments) {
    currentPath += `/${segment}`
    const match = ROUTE_LABELS[currentPath]
    if (match) {
      crumbs.push({ path: currentPath, label: match.label, icon: match.icon })
    } else if (currentPath.startsWith('/features/')) {
      crumbs.push({ path: currentPath, label: 'Feature Detail' })
    } else if (currentPath.startsWith('/models/')) {
      crumbs.push({ path: currentPath, label: 'Model Detail' })
    } else if (currentPath.startsWith('/blog/')) {
      crumbs.push({ path: currentPath, label: 'Blog Post' })
    } else if (currentPath.startsWith('/docs/')) {
      crumbs.push({ path: currentPath, label: 'Article' })
    }
  }

  return crumbs
}

export default function DynamicBreadcrumb() {
  const location = useLocation()
  const crumbs = getBreadcrumbPath(location.pathname)
  const isHome = location.pathname === '/'

  if (isHome) return null // No breadcrumb on homepage

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-14 left-0 right-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]"
    >
      <div className="container-custom">
        <nav className="flex items-center gap-1 py-2.5 text-sm overflow-x-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              const Icon = crumb.icon

              return (
                <motion.div
                  key={crumb.path}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="flex items-center gap-1 shrink-0"
                >
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 mx-0.5" />
                  )}
                  {isLast ? (
                    <span className="flex items-center gap-1.5 font-medium text-white whitespace-nowrap">
                      {Icon && <Icon className="w-3.5 h-3.5 text-[#D97757]" />}
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="flex items-center gap-1.5 text-[#888888] hover:text-white transition-colors whitespace-nowrap"
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {crumb.label}
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Current page indicator dot */}
          <motion.span
            layoutId="breadcrumb-active"
            className="ml-2 w-1.5 h-1.5 rounded-full bg-[#D97757]"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </nav>
      </div>
    </motion.div>
  )
}
