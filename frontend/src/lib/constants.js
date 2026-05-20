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
      { label: 'Changelog', href: '/blog' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
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
    title: '8+ AI Providers',
    description: 'OpenRouter, Groq, Gemini, Cerebras, Cloudflare, HuggingFace, Bytez, NVIDIA — all in one platform.',
    icon: 'cpu',
  },
  {
    title: 'Council Mode',
    description: 'Three models debate your question and synthesize the best answer. No other platform does this.',
    icon: 'users',
  },
  {
    title: 'Uncensored & Ethical',
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
    title: 'In-Browser Local AI',
    description: 'Run models entirely in your browser with WebGPU. Zero latency, total privacy.',
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
      'Gemini Flash TTS',
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
      'Council Mode (3-model debate)',
      'ElevenLabs voices via Puter',
      'Conversation branching',
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
      'API access',
      'Custom model integration',
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
  { id: 'openrouter', name: 'OpenRouter', models: '200+', status: 'active', latency: '< 2s' },
  { id: 'gemini', name: 'Google Gemini', models: '15+', status: 'active', latency: '< 1.5s' },
  { id: 'groq', name: 'Groq Cloud', models: '10+', status: 'active', latency: '< 0.5s' },
  { id: 'cerebras', name: 'Cerebras', models: '5+', status: 'active', latency: '< 1s' },
  { id: 'cloudflare', name: 'Cloudflare AI', models: '50+', status: 'active', latency: '< 1s' },
  { id: 'huggingface', name: 'HuggingFace', models: '100K+', status: 'active', latency: '< 3s' },
  { id: 'bytez', name: 'Bytez', models: '220K+', status: 'active', latency: '< 2s' },
  { id: 'nvidia', name: 'NVIDIA NIM', models: '42+', status: 'active', latency: '< 2s' },
]
