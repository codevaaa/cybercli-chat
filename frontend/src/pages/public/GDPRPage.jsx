export default function GDPRPage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Legal</span>
          <h1 className="text-h1 mb-8">GDPR Compliance</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
            <p>Last updated: May 20, 2026</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Our Commitment</h2>
            <p>CyberCli is fully committed to compliance with the General Data Protection Regulation (GDPR). We process personal data lawfully, fairly, and transparently.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Data Controller</h2>
            <p>CyberCli is the data controller for personal information collected through our services. For inquiries, contact our Data Protection Officer at <a href="mailto:dpo@cybercli.chat" className="text-accent hover:underline">dpo@cybercli.chat</a>.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Your Rights Under GDPR</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Export your data in a structured format</li>
              <li><strong>Right to Object:</strong> Object to data processing in certain circumstances</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Legal Basis for Processing</h2>
            <p>We process personal data based on:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Contract:</strong> To provide our services under our Terms of Service</li>
              <li><strong>Legitimate Interests:</strong> For security, fraud prevention, and service improvement</li>
              <li><strong>Consent:</strong> For analytics and optional features (which you can withdraw)</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Data Retention</h2>
            <p>We retain your data only as long as necessary:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Account data: Until account deletion</li>
              <li>Chat messages: Until you delete them or your account</li>
              <li>Usage logs: Up to 90 days for security and debugging</li>
              <li>Payment records: As required by tax law (typically 7 years)</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">International Transfers</h2>
            <p>We use EU-based infrastructure where possible. Data transfers outside the EEA are protected by Standard Contractual Clauses (SCCs).</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Complaints</h2>
            <p>If you believe your data protection rights have been violated, you have the right to lodge a complaint with your local supervisory authority.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
