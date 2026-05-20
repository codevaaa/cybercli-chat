export default function TermsPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Legal</span>
          <h1 className="text-h1 mb-8">Terms of Service</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
            <p>Last updated: May 20, 2026</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">1. Acceptance of Terms</h2>
            <p>By accessing or using CyberCli ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">2. Account Registration</h2>
            <p>To use certain features, you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">3. Acceptable Use</h2>
            <p>You may not use the Service to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Generate content that violates applicable laws</li>
              <li>Impersonate others or misrepresent your identity</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Attempt to bypass rate limits or security measures</li>
              <li>Scrape, crawl, or systematically collect data</li>
              <li>Use the Service to create competing products</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">4. Subscriptions and Payments</h2>
            <p>Some features require a paid subscription. By subscribing:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You agree to pay all fees associated with your plan</li>
              <li>Subscriptions auto-renew unless canceled</li>
              <li>Refunds are provided at our sole discretion</li>
              <li>We may modify pricing with 30 days notice</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">5. Intellectual Property</h2>
            <p>You retain ownership of content you generate using the Service. We retain ownership of the Service, our trademarks, and proprietary technology. You may not reverse engineer or copy our software.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, CyberCli shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">7. Termination</h2>
            <p>We may suspend or terminate your account for violations of these terms. You may delete your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">8. Governing Law</h2>
            <p>These Terms shall be governed by the laws of the jurisdiction in which CyberCli operates, without regard to conflict of law principles.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
