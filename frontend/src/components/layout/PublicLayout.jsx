import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { applyAppearanceTheme } from '@lib/theme.js'

/**
 * PublicLayout — wrapper for all public-facing pages.
 * - Forces Codevaa brand dark on every public page (never inherit app light theme)
 * - Initializes Lenis smooth scroll (luxury inertia feel)
 * - Scrolls to top on every route change
 * - Destroys Lenis on unmount to avoid conflicts with the app workspace
 */
export default function PublicLayout({ children }) {
  const lenisRef = useRef(null)
  const rafRef = useRef(null)
  const { pathname } = useLocation()

  // Marketing/site pages are always Codevaa dark — ignore workspace light preference
  useEffect(() => {
    applyAppearanceTheme('dark', { forceDark: true })
  }, [pathname])

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    }
  }, [pathname])

  // Initialize Lenis
  useEffect(() => {
    lenisRef.current = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    })

    const raf = (time) => {
      lenisRef.current?.raf(time)
      rafRef.current = requestAnimationFrame(raf)
    }
    rafRef.current = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafRef.current)
      lenisRef.current?.destroy()
      lenisRef.current = null
    }
  }, [])

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      {children}
    </div>
  )
}
