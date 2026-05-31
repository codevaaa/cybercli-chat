import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'
import { useAuthStore } from './stores/authStore.js'
import { Analytics } from '@vercel/analytics/react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Use HashRouter in desktop (file:// protocol) — BrowserRouter needs a server
const isDesktop = typeof window !== 'undefined' && !!window.electronAPI
const Router = isDesktop ? HashRouter : BrowserRouter

function AppWrapper() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <>
      <App />
      <Analytics />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppWrapper />
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
