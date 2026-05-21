export const APP_NAME = 'CyberCli Chat'
export const APP_TAGLINE = 'The most powerful AI chat platform'
export const APP_DESCRIPTION = 'Multi-model, uncensored, voice-enabled, and entirely yours.'

export const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Models', href: '/models' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
]

export const FOOTER_SECTIONS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Models', href: '/models' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/api-reference' },
      { label: 'Blog', href: '/blog' },
      { label: 'Affiliate Program', href: '/affiliate' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'Acceptable Use', href: '/acceptable-use' },
    ],
  },
]

export const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/cybercli', icon: 'twitter' },
  { label: 'GitHub', href: 'https://github.com/cybercli', icon: 'github' },
  { label: 'Discord', href: 'https://discord.gg/cybercli', icon: 'discord' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/cybercli', icon: 'linkedin' },
]

export const HERO_FEATURES = [
  {
    title: 'Multi-Cluster Network',
    description: 'High-speed edge nodes, reasoning engines, and quantum simulation clusters in a single platform.',
    icon: 'cpu',
  },
  {
    title: 'Cyber-Council Mode',
    description: 'Three models debate your question in parallel and synthesize the best comprehensive answer.',
    icon: 'users',
  },
  {
    title: 'Secure & Ethical',
    description: 'Access truth-seeking open-source models with ethical guardrails and transparency.',
    icon: 'shield',
  },
  {
    title: 'Free Voice Chat',
    description: 'Walkie-talkie style voice conversations with 5 unique AI voices. Hold spacebar, talk, get answers.',
    icon: 'mic',
  },
  {
    title: 'Conversation Branching',
    description: 'Fork any message into a new thread. Explore multiple paths without losing context.',
    icon: 'git-branch',
  },
  {
    title: 'Secure Local Integration',
    description: 'Run the CyberCli daemon locally to read/write project files and execute commands securely.',
    icon: 'globe',
  },
]

export const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Get started with powerful AI.',
    features: [
      'Access to all free-tier models',
      '50 messages per hour',
      'Basic text chat',
      'Standard voice output',
      '3 custom personas',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    description: 'For serious AI users.',
    features: [
      'Everything in Free',
      '500 messages per hour',
      'Cyber-Council Debate Mode',
      'Premium voice synthesis engine',
      'Conversation branching',
      'API Keys management',
      'Secure local CLI Daemon bridge',
      'Unlimited personas',
      'Image generation',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and organizations.',
    features: [
      'Everything in Pro',
      'Unlimited messages',
      'Team workspaces',
      'SSO & SAML',
      'API key integrations',
      'Custom model clusters',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export const TESTIMONIALS = [
  {
    quote: 'CyberCli replaced ChatGPT, Claude, and Perplexity for me. One platform, every model, zero switching.',
    author: 'Alex Chen',
    role: 'AI Researcher',
    company: 'Independent',
  },
  {
    quote: 'The Council Mode is genuinely next-level. Getting three models to debate and synthesize an answer is something I never knew I needed.',
    author: 'Priya Sharma',
    role: 'Software Engineer',
    company: 'Tech Startup',
  },
  {
    quote: 'Finally, uncensored models that still feel responsible. The ethics watermarking is a brilliant compromise.',
    author: 'Marcus Johnson',
    role: 'Data Scientist',
    company: 'Analytics Firm',
  },
]

export const MODELS = [
  { id: 'distributed-core', name: 'Cyber Distributed Core', models: '50+', status: 'active', latency: '< 1.5s' },
  { id: 'intelligence-hub', name: 'Cyber Intelligence Hub', models: '25+', status: 'active', latency: '< 2.0s' },
  { id: 'speed-cluster', name: 'Cyber Speed Cluster', models: '10+', status: 'active', latency: '< 0.5s' },
  { id: 'reasoning-engine', name: 'Cyber Reasoning Engine', models: '12+', status: 'active', latency: '< 1.2s' },
  { id: 'quantum-lab', name: 'Cyber Quantum Lab', models: '8+', status: 'active', latency: '< 2.0s' },
  { id: 'edge-network', name: 'Cyber Geo-Network', models: '30+', status: 'active', latency: '< 1.0s' },
]
