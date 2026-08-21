/**
 * CodeVaa Agent Platform — Root App Component
 *
 * Routing:
 *   - Not logged in → LoginPage
 *   - Logged in:
 *     - "/" → ConversationPage (full-width, own sidebar)
 *     - "/manager" → AgentManager (with global sidebar)
 *     - "/sessions", "/skills", "/agents" → Pages with global sidebar
 *   - Settings opens as a full-screen overlay from any route
 */
import React, { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { usePlatformStore } from './store/platformStore.js'
import LoginPage        from './pages/LoginPage.jsx'
import Sidebar          from './components/Sidebar.jsx'
import ConversationPage from './pages/ConversationPage.jsx'
import AgentManager     from './pages/AgentManager.jsx'
import SkillsPage       from './pages/SkillsPage.jsx'
import AgentsPage       from './pages/AgentsPage.jsx'
import SessionsPage     from './pages/SessionsPage.jsx'
import SettingsPage     from './pages/SettingsPage.jsx'
import { AnimatePresence, motion } from 'framer-motion'

export default function App() {
  const { connect, checkPlatformHealth, fetchSkills, fetchAgents } = usePlatformStore()
  const location = useLocation()

  // Auth state (persisted to localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('codeva_logged_in') === 'true'
  })
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('codeva_user') || 'null') } catch { return null }
  })

  // Settings overlay state
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      connect()
      checkPlatformHealth()
      fetchSkills()
      fetchAgents()
    }
  }, [isLoggedIn])

  const handleLogin = useCallback((data) => {
    setIsLoggedIn(true)
    setUser(data?.user || { email: 'user@codeva.ai', plan: 'free' })
    localStorage.setItem('codeva_logged_in', 'true')
    localStorage.setItem('codeva_user', JSON.stringify(data?.user || {}))
  }, [])

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false)
    setUser(null)
    localStorage.removeItem('codeva_logged_in')
    localStorage.removeItem('codeva_user')
  }, [])

  // Not logged in → show login
  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  // ConversationPage has its own sidebar — hide global sidebar on "/"
  const showGlobalSidebar = location.pathname !== '/'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-white font-sans">
      {showGlobalSidebar && <Sidebar onOpenSettings={() => setShowSettings(true)} />}
      <main className="flex-1 overflow-hidden">
        <Routes>
          {/* Main chat — Antigravity-style (full-width, own sidebar) */}
          <Route path="/" element={<ConversationPage onOpenSettings={() => setShowSettings(true)} onLogout={handleLogout} user={user} />} />
          {/* Agent Manager — task graph view */}
          <Route path="/manager"   element={<AgentManager />} />
          <Route path="/sessions"  element={<SessionsPage />} />
          <Route path="/skills"    element={<SkillsPage />}   />
          <Route path="/agents"    element={<AgentsPage />}   />
          <Route path="/settings"  element={<SettingsPage user={user} onLogout={handleLogout} />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Settings Overlay (opens on top of everything) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full"
            >
              <SettingsPage
                user={user}
                onLogout={handleLogout}
                onClose={() => setShowSettings(false)}
                isOverlay={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: '#111118', color: '#fff', border: '1px solid #1E1E2E' },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
    </div>
  )
}
