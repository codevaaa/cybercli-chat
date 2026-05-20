export default function PrivacyPolicyPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Legal</span>
          <h1 className="text-h1 mb-8">Privacy Policy</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
            <p>Last updated: May 20, 2026</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">1. Introduction</h2>
            <p>CyberCli ("we", "our", "us") respects your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website and services.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Email address, display name, and profile information when you create an account.</li>
              <li><strong>Usage Data:</strong> Messages sent, models used, token counts, and feature usage patterns.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and access logs.</li>
              <li><strong>Payment Information:</strong> Processed securely by Stripe. We do not store card numbers.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Authenticate users and secure accounts</li>
              <li>Process payments and manage subscriptions</li>
              <li>Monitor usage for rate limiting and abuse prevention</li>
              <li>Improve our products and user experience</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">4. Data Storage and Security</h2>
            <p>Your data is stored securely using:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Supabase PostgreSQL for structured data with Row Level Security</li>
              <li>MongoDB Atlas with field-level encryption for chat data</li>
              <li>TLS 1.3 for all data in transit</li>
              <li>AES-256 encryption for data at rest</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">5. We Do Not Train on Your Data</h2>
            <p>Your conversations are never used to train AI models. We send messages to third-party LLM providers for inference only. We do not retain conversation content for model training purposes.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">6. Your Rights</h2>
            <p>Under GDPR and applicable privacy laws, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and all associated data</li>
              <li>Export your data in a portable format</li>
              <li>Object to data processing</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">7. Contact</h2>
            <p>For privacy-related inquiries, contact us at <a href="mailto:privacy@cybercli.chat" className="text-accent hover:underline">privacy@cybercli.chat</a>.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
