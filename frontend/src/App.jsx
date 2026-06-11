import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from '@components/layout/Navbar'
import Footer from '@components/layout/Footer'
import PublicLayout from '@components/layout/PublicLayout'
import CookieConsent from '@components/legal/CookieConsent'
import ProtectedRoute from '@components/auth/ProtectedRoute.jsx'
import DesktopUpdateNotification from '@components/desktop/DesktopUpdateNotification.jsx'
import { ErrorBoundary } from '@components/layout/ErrorBoundary.jsx'
import { useAuthStore } from '@stores/authStore.js'

import HomePage from '@pages/public/HomePage'
import FeaturesPage from '@pages/public/FeaturesPage'
import FeatureDetailPage from '@pages/public/FeatureDetailPage'
import ModelsPage from '@pages/public/ModelsPage'
import ModelDetailPage from '@pages/public/ModelDetailPage'
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
import ConsumerTermsPage from '@pages/public/ConsumerTermsPage'
import CommercialTermsPage from '@pages/public/CommercialTermsPage'
import ResponsibleDisclosurePage from '@pages/public/ResponsibleDisclosurePage'
import TrustCenterPage from '@pages/public/TrustCenterPage'
import ResearchPage from '@pages/public/ResearchPage'
import UsageLimitBestPracticesPage from '@pages/public/UsageLimitBestPracticesPage'
import GDPRPage from '@pages/public/GDPRPage'
import ChangelogPage from '@pages/public/ChangelogPage'
import ApiReferencePage from '@pages/public/ApiReferencePage'
import DevelopersPage from '@pages/public/DevelopersPage'
import ClaudeCodePage from '@pages/public/ClaudeCodePage'
import SystemStatusPage from '@pages/public/SystemStatusPage'
import DownloadsPage from '@pages/public/DownloadsPage'
import DownloadWindowsPage from '@pages/public/DownloadWindowsPage'
import DownloadMacPage from '@pages/public/DownloadMacPage'
import DownloadLinuxPage from '@pages/public/DownloadLinuxPage'
import CouncilModePage from '@pages/public/CouncilModePage'
import UpgradePage from '@pages/public/UpgradePage'
import ApiKeysPage from '@pages/public/ApiKeysPage'
import HelpPage from '@pages/public/HelpPage'
import ProvidersPage from '@pages/public/ProvidersPage'
import ChromeExtensionPage from '@pages/public/ChromeExtensionPage'
import ExtensionDocsPage from '@pages/public/ExtensionDocsPage'
import CliLoginPage from '@pages/public/CliLoginPage'
import CliSubscribePage from '@pages/public/CliSubscribePage'
import KaliKalPage from '@pages/public/KaliKalPage'
import MadhavPage from '@pages/public/MadhavPage'
import RavanPage from '@pages/public/RavanPage'

import SignupPage from '@pages/auth/SignupPage'
import LoginPage from '@pages/auth/LoginPage'
import ForgotPasswordPage from '@pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@pages/auth/ResetPasswordPage'
import MagicLinkPage from '@pages/auth/MagicLinkPage'
import VerifyEmailPage from '@pages/auth/VerifyEmailPage'
import AuthCallbackPage from '@pages/auth/AuthCallbackPage'

import ChatPage from '@pages/app/ChatPage'
import SettingsPage from '@pages/app/SettingsPage'
import OrgDashboardPage from '@pages/app/OrgDashboardPage'
import ProfilePage from '@pages/app/ProfilePage'
import LibraryPage from '@pages/app/LibraryPage'
import AgentsPage from '@pages/app/AgentsPage'
import VoicePage from '@pages/app/VoicePage'
import VoiceChatPage from '@pages/app/VoiceChatPage'
import VoiceSettingsPage from '@pages/app/VoiceSettingsPage'
import ProjectsPage from '@pages/app/ProjectsPage'
import UsagePage from '@pages/app/UsagePage'
import WorkflowsPage from '@pages/app/WorkflowsPage'
import DiscoverPage from '@pages/app/DiscoverPage'
import PlaygroundPage from '@pages/app/PlaygroundPage'

const PUBLIC_PATHS = [
  '/', '/features', '/models', '/pricing', '/contact', '/about',
  '/careers', '/affiliate', '/blog', '/docs', '/privacy-policy',
  '/terms-of-service', '/cookie-policy', '/acceptable-use', '/gdpr',
  '/changelog', '/api-reference', '/developers', '/status', '/downloads',
  '/product', '/login', '/subscribe', '/council-mode',
  '/legal/consumer-terms', '/legal/commercial-terms', '/legal/privacy', '/legal/aup',
  '/responsible-disclosure-policy', '/trust', '/research', '/company', '/usage-limit-best-practices',
  '/kali-kal', '/kalikal', '/kali', '/madhav', '/ravan'
]
const AUTH_PATHS = [
  '/auth/signup', '/auth/login', '/auth/forgot-password',
  '/auth/reset-password', '/auth/magic-link', '/auth/verify-email', '/auth/callback'
]

function App() {
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const { session } = useAuthStore()

  // Desktop App auto-login: If the web app is loaded inside the desktop wrapper and a session exists,
  // tell the desktop app to show the main window (skipping the landing screen).
  useEffect(() => {
    if (session && window.electronAPI?.openMainWindow) {
      window.electronAPI.openMainWindow()
    }
  }, [session])

  const navigate = useNavigate()

  // Prevent desktop app from showing marketing pages
  useEffect(() => {
    if (window.electronAPI) {
      const isMarketingPath = PUBLIC_PATHS.includes(location.pathname) && !location.pathname.startsWith('/auth')
      if (isMarketingPath) {
        navigate(session ? '/chat' : '/auth/login', { replace: true })
      }
    }
  }, [location.pathname, session, navigate])

  const isPublicRoute = () => {
    return PUBLIC_PATHS.includes(location.pathname)
      || AUTH_PATHS.some(p => location.pathname.startsWith(p))
      || location.pathname.startsWith('/blog/')
      || location.pathname.startsWith('/docs/')
      || location.pathname.startsWith('/features/')
      || location.pathname.startsWith('/models/')
      || location.pathname === '/downloads'
  }

  return (
    <div className="min-h-screen bg-background-primary text-foreground-primary">
      {isPublicRoute() && !location.pathname.startsWith('/auth') && <Navbar />}
      <main>
        <ErrorBoundary>
        <Routes>
          {/* ── Public Marketing Routes (with Lenis smooth scroll) ── */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/features" element={<PublicLayout><FeaturesPage /></PublicLayout>} />
          <Route path="/features/:slug" element={<PublicLayout><FeatureDetailPage /></PublicLayout>} />
          <Route path="/madhav" element={<PublicLayout><MadhavPage /></PublicLayout>} />
          <Route path="/ravan" element={<PublicLayout><RavanPage /></PublicLayout>} />
          <Route path="/models" element={<PublicLayout><ModelsPage /></PublicLayout>} />
          <Route path="/models/*" element={<PublicLayout><ModelDetailPage /></PublicLayout>} />
          <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/careers" element={<PublicLayout><CareersPage /></PublicLayout>} />
          <Route path="/affiliate" element={<PublicLayout><AffiliatePage /></PublicLayout>} />
          <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
          
          {/* Placeholder marketing routes removed to prevent intercepting real pages */}
          <Route path="/blog/:slug" element={<PublicLayout><BlogPostPage /></PublicLayout>} />
          <Route path="/docs" element={<PublicLayout><DocsPage /></PublicLayout>} />
          <Route path="/docs/:slug" element={<PublicLayout><DocsArticlePage /></PublicLayout>} />
          <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
          <Route path="/terms-of-service" element={<PublicLayout><TermsPage /></PublicLayout>} />
          <Route path="/cookie-policy" element={<PublicLayout><CookiePolicyPage /></PublicLayout>} />
          <Route path="/acceptable-use" element={<PublicLayout><AcceptableUsePage /></PublicLayout>} />
          <Route path="/legal/consumer-terms" element={<PublicLayout><ConsumerTermsPage /></PublicLayout>} />
          <Route path="/legal/commercial-terms" element={<PublicLayout><CommercialTermsPage /></PublicLayout>} />
          <Route path="/legal/privacy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
          <Route path="/legal/aup" element={<PublicLayout><AcceptableUsePage /></PublicLayout>} />
          <Route path="/responsible-disclosure-policy" element={<PublicLayout><ResponsibleDisclosurePage /></PublicLayout>} />
          <Route path="/trust" element={<PublicLayout><TrustCenterPage /></PublicLayout>} />
          <Route path="/research" element={<PublicLayout><ResearchPage /></PublicLayout>} />
          <Route path="/company" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/usage-limit-best-practices" element={<PublicLayout><UsageLimitBestPracticesPage /></PublicLayout>} />
          <Route path="/gdpr" element={<PublicLayout><GDPRPage /></PublicLayout>} />
          <Route path="/changelog" element={<Navigate to="/docs/changelog" replace />} />
          <Route path="/api-reference" element={<PublicLayout><ApiReferencePage /></PublicLayout>} />
          <Route path="/developers" element={<PublicLayout><DevelopersPage /></PublicLayout>} />
          <Route path="/product" element={<PublicLayout><ClaudeCodePage /></PublicLayout>} />
          <Route path="/status" element={<PublicLayout><SystemStatusPage /></PublicLayout>} />
          <Route path="/downloads" element={<PublicLayout><DownloadsPage /></PublicLayout>} />
          <Route path="/downloads/windows" element={<PublicLayout><DownloadWindowsPage /></PublicLayout>} />
          <Route path="/downloads/mac" element={<PublicLayout><DownloadMacPage /></PublicLayout>} />
          <Route path="/downloads/linux" element={<PublicLayout><DownloadLinuxPage /></PublicLayout>} />
          <Route path="/council-mode" element={<PublicLayout><CouncilModePage /></PublicLayout>} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/help" element={<PublicLayout><HelpPage /></PublicLayout>} />
          <Route path="/providers" element={<PublicLayout><ProvidersPage /></PublicLayout>} />
          <Route path="/chrome-extension" element={<PublicLayout><ChromeExtensionPage /></PublicLayout>} />
          <Route path="/docs/vscode-extension" element={<PublicLayout><ExtensionDocsPage /></PublicLayout>} />
          <Route path="/login" element={<CliLoginPage />} />
          <Route path="/subscribe" element={<CliSubscribePage />} />

          {/* ── Auth Routes ── */}
          <Route path="/auth/signup" element={<SignupPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/magic-link" element={<MagicLinkPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          
          {/* ── Kali Routes ── */}
          <Route path="/kali-kal" element={<PublicLayout><KaliKalPage /></PublicLayout>} />
          <Route path="/kalikal" element={<Navigate to="/kali-kal" replace />} />
          <Route path="/kali" element={<Navigate to="/kali-kal" replace />} />

          {/* ── Protected App Routes (no Lenis — native scroll for chat) ── */}
          <Route path="/chat/:threadId?" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/app/org" element={<ProtectedRoute><OrgDashboardPage /></ProtectedRoute>} />
          {/* Catch-all for every settings sub-tab (account, connectors, usage,
              capabilities, billing, api-keys, personas, security, invite…) so no
              tab ever renders a blank screen. SettingsPage maps the path → tab. */}
          <Route path="/settings/*" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
          <Route path="/voice" element={<ProtectedRoute><VoicePage /></ProtectedRoute>} />
          <Route path="/voice-chat" element={<ProtectedRoute><VoiceChatPage /></ProtectedRoute>} />
          <Route path="/voice-settings" element={<ProtectedRoute><VoiceSettingsPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
          <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
          <Route path="/playground" element={<ProtectedRoute><PlaygroundPage /></ProtectedRoute>} />
        </Routes>
        </ErrorBoundary>
      </main>
      {isPublicRoute() && !window.location.pathname.startsWith('/auth') && <Footer />}
      <CookieConsent />
      <DesktopUpdateNotification />
    </div>
  )
}

export default App
