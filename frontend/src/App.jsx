import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import Navbar from '@components/layout/Navbar'
import Footer from '@components/layout/Footer'
import PublicLayout from '@components/layout/PublicLayout'
import CookieConsent from '@components/legal/CookieConsent'
import ProtectedRoute from '@components/auth/ProtectedRoute.jsx'
import DesktopUpdateNotification from '@components/desktop/DesktopUpdateNotification.jsx'
import { ErrorBoundary } from '@components/layout/ErrorBoundary.jsx'
import { useAuthStore } from '@stores/authStore.js'
import useSettingsStore from '@stores/settingsStore.js'
import { applyAppearanceTheme } from '@lib/theme.js'

const HomePage = lazy(() => import('@pages/public/HomePage'))
const FeaturesPage = lazy(() => import('@pages/public/FeaturesPage'))
const FeatureDetailPage = lazy(() => import('@pages/public/FeatureDetailPage'))
const ModelsPage = lazy(() => import('@pages/public/ModelsPage'))
const ModelDetailPage = lazy(() => import('@pages/public/ModelDetailPage'))
const PricingPage = lazy(() => import('@pages/public/PricingPage'))
const ContactPage = lazy(() => import('@pages/public/ContactPage'))
const AboutPage = lazy(() => import('@pages/public/AboutPage'))
const CareersPage = lazy(() => import('@pages/public/CareersPage'))
const AffiliatePage = lazy(() => import('@pages/public/AffiliatePage'))
const BlogPage = lazy(() => import('@pages/public/BlogPage'))
const BlogPostPage = lazy(() => import('@pages/public/BlogPostPage'))
const DocsPage = lazy(() => import('@pages/public/DocsPage'))
const DocsArticlePage = lazy(() => import('@pages/public/DocsArticlePage'))
const PrivacyPolicyPage = lazy(() => import('@pages/public/PrivacyPolicyPage'))
const TermsPage = lazy(() => import('@pages/public/TermsPage'))
const CookiePolicyPage = lazy(() => import('@pages/public/CookiePolicyPage'))
const AcceptableUsePage = lazy(() => import('@pages/public/AcceptableUsePage'))
const ConsumerTermsPage = lazy(() => import('@pages/public/ConsumerTermsPage'))
const CommercialTermsPage = lazy(() => import('@pages/public/CommercialTermsPage'))
const ResponsibleDisclosurePage = lazy(() => import('@pages/public/ResponsibleDisclosurePage'))
const TrustCenterPage = lazy(() => import('@pages/public/TrustCenterPage'))
const ResearchPage = lazy(() => import('@pages/public/ResearchPage'))
const UsageLimitBestPracticesPage = lazy(() => import('@pages/public/UsageLimitBestPracticesPage'))
const GDPRPage = lazy(() => import('@pages/public/GDPRPage'))
const ChangelogPage = lazy(() => import('@pages/public/ChangelogPage'))
const ApiReferencePage = lazy(() => import('@pages/public/ApiReferencePage'))
const DevelopersPage = lazy(() => import('@pages/public/DevelopersPage'))
const ClaudeCodePage = lazy(() => import('@pages/public/ClaudeCodePage'))
const SystemStatusPage = lazy(() => import('@pages/public/SystemStatusPage'))
const DownloadsPage = lazy(() => import('@pages/public/DownloadsPage'))
const DownloadWindowsPage = lazy(() => import('@pages/public/DownloadWindowsPage'))
const DownloadCodicPage = lazy(() => import('@pages/public/DownloadCodicPage'))
const DownloadMacPage = lazy(() => import('@pages/public/DownloadMacPage'))
const DownloadLinuxPage = lazy(() => import('@pages/public/DownloadLinuxPage'))
const CouncilModePage = lazy(() => import('@pages/public/CouncilModePage'))
const UpgradePage = lazy(() => import('@pages/public/UpgradePage'))
const ApiKeysPage = lazy(() => import('@pages/public/ApiKeysPage'))
const HelpPage = lazy(() => import('@pages/public/HelpPage'))
const ProvidersPage = lazy(() => import('@pages/public/ProvidersPage'))
const ChromeExtensionPage = lazy(() => import('@pages/public/ChromeExtensionPage'))
const ExtensionDocsPage = lazy(() => import('@pages/public/ExtensionDocsPage'))
const CliLoginPage = lazy(() => import('@pages/public/CliLoginPage'))
const CliSubscribePage = lazy(() => import('@pages/public/CliSubscribePage'))
const KaliKalPage = lazy(() => import('@pages/public/KaliKalPage'))
const MadhavPage = lazy(() => import('@pages/public/MadhavPage'))
const RavanPage = lazy(() => import('@pages/public/RavanPage'))

const SignupPage = lazy(() => import('@pages/auth/SignupPage'))
const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'))
const MagicLinkPage = lazy(() => import('@pages/auth/MagicLinkPage'))
const VerifyEmailPage = lazy(() => import('@pages/auth/VerifyEmailPage'))
const AuthCallbackPage = lazy(() => import('@pages/auth/AuthCallbackPage'))
const ExtensionConnectPage = lazy(() => import('@pages/auth/ExtensionConnectPage'))

const ChatPage = lazy(() => import('@pages/app/ChatPage'))
const AnonymousChatPage = lazy(() => import('@pages/app/AnonymousChatPage'))
const SettingsPage = lazy(() => import('@pages/app/SettingsPage'))
const OrgDashboardPage = lazy(() => import('@pages/app/OrgDashboardPage'))
const ProfilePage = lazy(() => import('@pages/app/ProfilePage'))
const LibraryPage = lazy(() => import('@pages/app/LibraryPage'))
const AgentsPage = lazy(() => import('@pages/app/AgentsPage'))
const VoicePage = lazy(() => import('@pages/app/VoicePage'))
const VoiceChatPage = lazy(() => import('@pages/app/VoiceChatPage'))
const VoiceSettingsPage = lazy(() => import('@pages/app/VoiceSettingsPage'))
const ProjectsPage = lazy(() => import('@pages/app/ProjectsPage'))
const DossierStudio = lazy(() => import('@pages/app/DossierStudio'))
const UsagePage = lazy(() => import('@pages/app/UsagePage'))
const WorkflowsPage = lazy(() => import('@pages/app/WorkflowsPage'))
const DiscoverPage = lazy(() => import('@pages/app/DiscoverPage'))
const PlaygroundPage = lazy(() => import('@pages/app/PlaygroundPage'))

const PUBLIC_PATHS = [
  '/', '/features', '/models', '/pricing', '/contact', '/about',
  '/careers', '/affiliate', '/blog', '/docs', '/privacy-policy', '/codic', '/downloads/codic',
  '/terms-of-service', '/cookie-policy', '/acceptable-use', '/gdpr',
  '/changelog', '/api-reference', '/developers', '/status', '/downloads',
  '/product', '/login', '/subscribe', '/council-mode',
  '/legal/consumer-terms', '/legal/commercial-terms', '/legal/privacy', '/legal/aup',
  '/responsible-disclosure-policy', '/trust', '/research', '/company', '/usage-limit-best-practices',
  '/kali-kal', '/kalikal', '/kali', '/madhav', '/ravan'
]
const AUTH_PATHS = [
  '/auth/signup', '/auth/login', '/auth/forgot-password',
  '/auth/reset-password', '/auth/magic-link', '/auth/verify-email', '/auth/callback', '/auth/extension'
]

function App() {
  const location = useLocation()

  useEffect(() => {
    // Retire cached settings and dismissal state belonging to the removed product.
    try { localStorage.removeItem('codeva_platform_settings_cache') } catch { /* Storage may be disabled. */ }
    try { sessionStorage.removeItem('agent_banner_dismissed') } catch { /* Storage may be disabled. */ }
  }, [])

  useEffect(() => {
    // Public/marketing pages stay Codevaa dark forever.
    // In-app light mode uses `.light` — never by stripping `.dark` from :root defaults.
    const isPublic =
      PUBLIC_PATHS.includes(location.pathname) ||
      AUTH_PATHS.some((p) => location.pathname.startsWith(p)) ||
      location.pathname.startsWith('/blog/') ||
      location.pathname.startsWith('/docs/') ||
      location.pathname.startsWith('/features/') ||
      location.pathname.startsWith('/models/')

    if (isPublic) {
      applyAppearanceTheme('dark', { forceDark: true })
      return
    }

    const savedTheme = localStorage.getItem('setting_theme') || 'dark'
    applyAppearanceTheme(savedTheme)
    if (savedTheme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyAppearanceTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [location.pathname])

  const { session } = useAuthStore()

  // Hydrate settings store from backend once user is logged in
  useEffect(() => {
    if (session) {
      useSettingsStore.getState().hydrate()
    }
  }, [session])

  // Desktop App auto-login: If the web app is loaded inside the desktop wrapper and a session exists,
  // tell the desktop app to show the main window (skipping the landing screen).
  useEffect(() => {
    if (!window.electronAPI) return
    if (session) {
      // Save session state so next launch skips landing
      window.electronAPI.setSessionState?.(true)
      // Show main window if it was hidden (landing → main transition)
      window.electronAPI.openMainWindow?.()
    } else if (session === null) {
      // Explicitly logged out — clear session state
      window.electronAPI.setSessionState?.(false)
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
        <Suspense fallback={<div className="min-h-[45vh] flex items-center justify-center gap-3 p-6 text-foreground-muted" role="status" aria-live="polite"><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden="true" /><span>Loading page…</span></div>}>
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
          <Route path="/codic" element={<PublicLayout><DownloadCodicPage /></PublicLayout>} />
          <Route path="/downloads/codic" element={<Navigate to="/codic" replace />} />
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
          <Route path="/auth/extension" element={<ExtensionConnectPage />} />
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
          <Route path="/anonymous-chat" element={<ProtectedRoute><AnonymousChatPage /></ProtectedRoute>} />
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
          <Route path="/projects/studio/:projectId" element={<ProtectedRoute><DossierStudio /></ProtectedRoute>} />
          <Route path="/usage" element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
          <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
          <Route path="/playground" element={<ProtectedRoute><PlaygroundPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={session ? '/chat' : '/'} replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      {isPublicRoute() && !window.location.pathname.startsWith('/auth') && <Footer />}
      <CookieConsent />
      <DesktopUpdateNotification />
    </div>
  )
}

export default App
