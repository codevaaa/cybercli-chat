export default function CookiePolicyPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Legal</span>
          <h1 className="text-h1 mb-8">Cookie Policy</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
            <p>Last updated: May 20, 2026</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">What Are Cookies</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help us provide and improve our services.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">How We Use Cookies</h2>
            <p>We use the following types of cookies:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the website to function. These cannot be disabled.</li>
              <li><strong>Authentication Cookies:</strong> Maintain your login session securely.</li>
              <li><strong>Preference Cookies:</strong> Remember your theme, language, and display settings.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our site.</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Managing Cookies</h2>
            <p>You can manage or delete cookies through your browser settings. Note that disabling essential cookies may prevent the Service from functioning properly.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Third-Party Cookies</h2>
            <p>We do not use third-party advertising cookies. Analytics cookies, if enabled, are processed by privacy-respecting analytics providers.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
