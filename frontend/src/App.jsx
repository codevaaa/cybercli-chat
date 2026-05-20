import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from '@components/layout/Navbar'
import Footer from '@components/layout/Footer'
import CookieConsent from '@components/legal/CookieConsent'
import ProtectedRoute from '@components/auth/ProtectedRoute.jsx'

import HomePage from '@pages/public/HomePage'
import FeaturesPage from '@pages/public/FeaturesPage'
import ModelsPage from '@pages/public/ModelsPage'
import PricingPage from '@pages/public/PricingPage'
import ContactPage from '@pages/public/ContactPage'
import AboutPage from '@pages/public/AboutPage'
import CareersPage from '@pages/public/CareersPage'
import AffiliatePage from '@pages/public/AffiliatePage'
import BlogPage from '@pages/public/BlogPage'
import BlogPostPage from '@pages/public/BlogPostPage'
import DocsPage from '@pages/public/DocsPage'
import DocsArticlePage from '@pages/public/DocsArticlePage'
import PrivacyPolicyPage from '@pages/public/PrivacyPolicyPage'
import TermsPage from '@pages/public/TermsPage'
import CookiePolicyPage from '@pages/public/CookiePolicyPage'
import AcceptableUsePage from '@pages/public/AcceptableUsePage'
import GDPRPage from '@pages/public/GDPRPage'

import SignupPage from '@pages/auth/SignupPage'
import LoginPage from '@pages/auth/LoginPage'
import ForgotPasswordPage from '@pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@pages/auth/ResetPasswordPage'
import MagicLinkPage from '@pages/auth/MagicLinkPage'
import VerifyEmailPage from '@pages/auth/VerifyEmailPage'

import ChatPage from '@pages/app/ChatPage'
import SettingsPage from '@pages/app/SettingsPage'
import ProfilePage from '@pages/app/ProfilePage'
import LibraryPage from '@pages/app/LibraryPage'
import AgentsPage from '@pages/app/AgentsPage'
import VoicePage from '@pages/app/VoicePage'

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const isPublicRoute = () => {
    const publicPaths = ['/', '/features', '/models', '/pricing', '/contact', '/about', '/careers', '/affiliate', '/blog', '/docs', '/privacy-policy', '/terms-of-service', '/cookie-policy', '/acceptable-use', '/gdpr']
    const authPaths = ['/auth/signup', '/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/magic-link', '/auth/verify']
    return publicPaths.includes(window.location.pathname) || authPaths.some(p => window.location.pathname.startsWith(p))
  }

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/affiliate" element={<AffiliatePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocsArticlePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />
          <Route path="/acceptable-use" element={<AcceptableUsePage />} />
          <Route path="/gdpr" element={<GDPRPage />} />

          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/magic-link" element={<MagicLinkPage />} />
          <Route path="/auth/verify" element={<VerifyEmailPage />} />

          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:threadId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/billing" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/api-keys" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/personas" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/settings/security" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
          <Route path="/voice" element={<ProtectedRoute><VoicePage /></ProtectedRoute>} />
        </Routes>
      </main>
      {isPublicRoute() && <Footer />}
      <CookieConsent />
    </div>
  )
}

export default App
