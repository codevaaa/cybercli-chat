import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Flame } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'kali_kal_banner_dismissed_v2'

export default function KaliKalBanner({ onActivateKali }) {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  const handleTryNow = () => {
    if (onActivateKali) {
      onActivateKali()
    } else {
      // Default action if used on public pages
      localStorage.setItem('force_kali_mode', 'true')
      navigate('/chat')
    }
    handleDismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="kali-banner-root"
          style={{
            position: 'relative',
            zIndex: 50,
            width: '100%',
            background: 'linear-gradient(135deg, #1a0000 0%, #2d0a0a 40%, #1a0000 100%)',
            borderBottom: '1px solid rgba(217, 22, 36, 0.25)',
            overflow: 'hidden',
          }}
        >
          {/* Animated shimmer overlay */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 4,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255, 0, 51, 0.06), transparent)',
              pointerEvents: 'none',
            }}
          />

          {/* Subtle top glow line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 0, 51, 0.5), rgba(217, 22, 36, 0.7), rgba(255, 0, 51, 0.5), transparent)',
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '10px 16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Fire icon with pulse */}
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ flexShrink: 0 }}
            >
              <Flame
                style={{
                  width: '18px',
                  height: '18px',
                  color: '#FF0033',
                  filter: 'drop-shadow(0 0 6px rgba(255, 0, 51, 0.5))',
                }}
              />
            </motion.div>

            {/* Banner text */}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#ECECEC',
                letterSpacing: '0.3px',
                textAlign: 'center',
              }}
            >
              <span style={{ color: '#FF0033', fontWeight: 700 }}>Introducing Kali_Kal Mode</span>
              <span style={{ color: '#888', margin: '0 8px' }}>—</span>
              <span style={{ color: '#d4d4d4' }}>The Fully Uncensored AI Engine</span>
            </span>

            {/* Try Now button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleTryNow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: '#fff',
                background: 'linear-gradient(135deg, #D91624, #8B0000)',
                border: '1px solid rgba(255, 0, 51, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(217, 22, 36, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
                transition: 'box-shadow 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 24px rgba(217, 22, 36, 0.45), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 16px rgba(217, 22, 36, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
              }}
            >
              Try Now
              <ArrowRight style={{ width: '12px', height: '12px' }} />
            </motion.button>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px',
                color: '#666',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'color 0.15s ease, background 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#d4d4d4'
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666'
                e.currentTarget.style.background = 'transparent'
              }}
              title="Dismiss"
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
