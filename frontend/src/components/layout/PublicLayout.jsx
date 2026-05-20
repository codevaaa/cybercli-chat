import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Lenis from 'lenis'

/**
 * PublicLayout — wrapper for all public-facing pages.
 * - Initializes Lenis smooth scroll (luxury inertia feel)
 * - Scrolls to top on every route change
 * - Destroys Lenis on unmount to avoid conflicts with the app workspace
 */
export default function PublicLayout({ children }) {
  const lenisRef = useRef(null)
  const rafRef = useRef(null)
  const { pathname } = useLocation()

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

  return <>{children}</>
}
