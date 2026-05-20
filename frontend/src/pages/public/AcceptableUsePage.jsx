export default function AcceptableUsePage() {
  return (
    <div className="pt-28 pb-20">
      <div className="section-padding">
        <div className="container-custom max-w-3xl">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Legal</span>
          <h1 className="text-h1 mb-8">Acceptable Use Policy</h1>
          <div className="prose prose-invert max-w-none space-y-6 text-foreground-secondary">
            <p>Last updated: May 20, 2026</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Prohibited Activities</h2>
            <p>While CyberCli supports uncensored access to information, the following activities are strictly prohibited:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Generating or distributing illegal content</li>
              <li>Creating malware, exploits, or hacking tools</li>
              <li>Impersonating individuals or organizations for fraud</li>
              <li>Harassment, doxxing, or targeted abuse</li>
              <li>Violating intellectual property rights</li>
              <li>Automated scraping or abuse of API rate limits</li>
              <li>Creating accounts through automated means</li>
            </ul>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Enforcement</h2>
            <p>Violations may result in account suspension, termination, and reporting to relevant authorities where required by law. We reserve the right to remove content that violates this policy.</p>

            <h2 className="text-xl font-semibold text-foreground-primary mt-8">Reporting Abuse</h2>
            <p>If you encounter content that violates this policy, please report it to <a href="mailto:abuse@cybercli.chat" className="text-accent hover:underline">abuse@cybercli.chat</a>.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
