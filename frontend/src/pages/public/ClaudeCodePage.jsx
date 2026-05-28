import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Terminal, ArrowRight, Check, Copy, Code2, Zap, Shield, 
  Cpu, Globe, Sparkles, ChevronRight, Play, Star, 
  MessageSquare, GitBranch, FileCode, Search, Settings,
  ExternalLink, CheckCircle2, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const fadeIn = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  initial: {},
  whileInView: {},
  viewport: { once: true },
  transition: { staggerChildren: 0.15 }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
};

export default function ClaudeCodePage() {
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const copyInstallCommand = () => {
    navigator.clipboard.writeText('npm install -g @cybermind/cli && cybercoder login');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0A0A0F] overflow-x-hidden pt-16">
      {/* Hero Section - No internal nav since PublicLayout provides it */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <motion.div 
          className="absolute inset-0 opacity-30"
          style={{ y: backgroundY }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[150px]" />
        </motion.div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-300">Now with Multi-Model Consensus</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight"
          >
            Code at the speed of
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              thought
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12"
          >
            CyberCoder CLI brings the power of 8+ AI providers directly to your terminal.
            Write, refactor, debug, and understand code without leaving your workflow.
          </motion.p>

          {/* Install Command */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <div className="flex items-center gap-3 px-6 py-4 bg-[#1A1A2E] rounded-xl border border-white/10 font-mono text-sm">
              <span className="text-violet-400">$</span>
              <span className="text-gray-300">npm install -g @cybermind/cybercoder</span>
              <button
                onClick={copyInstallCommand}
                className="ml-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <Link
              to="/signup"
              className="flex items-center gap-2 px-6 py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <Download className="w-5 h-5" />
              Get API Key
            </Link>
          </motion.div>

          {/* Terminal Demo */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            <div className="rounded-2xl overflow-hidden bg-[#0D0D14] border border-white/10 shadow-2xl shadow-violet-500/10">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#151520] border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 text-center text-xs text-gray-500 font-mono">
                  cybercoder --help
                </div>
              </div>
              
              {/* Terminal Content */}
              <div className="p-6 font-mono text-sm text-left">
                <div className="text-gray-400 mb-2">$ cybercoder refactor ./src/components</div>
                <div className="text-gray-500 mb-4">Analyzing codebase structure...</div>
                
                <div className="bg-violet-500/10 border-l-2 border-violet-500 p-4 rounded-r-lg mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-violet-400" />
                    <span className="text-violet-300 font-medium">CyberCoder Suggestion</span>
                  </div>
                  <p className="text-gray-300 mb-3">
                    Found 3 components that can be optimized. I recommend converting them to use React.memo 
                    and implementing proper useCallback hooks for event handlers.
                  </p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded text-xs hover:bg-violet-500/30 transition-colors">
                      Apply Changes
                    </button>
                    <button className="px-3 py-1 bg-white/5 text-gray-400 rounded text-xs hover:bg-white/10 transition-colors">
                      View Diff
                    </button>
                  </div>
                </div>

                <div className="text-gray-400">
                  <span className="text-green-400">✓</span> Refactored 3 components in 1.2s
                  <br />
                  <span className="text-violet-400">$</span> <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything you need to
              <br />
              <span className="text-violet-400">ship faster</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From intelligent code generation to multi-model consensus, CyberCoder CLI
              gives you superpowers in your terminal.
            </p>
          </motion.div>

          <motion.div 
            {...staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Code2,
                title: "Natural Language Coding",
                description: "Describe what you want in plain English. CyberCoder writes the code, tests it, and fixes bugs automatically."
              },
              {
                icon: Cpu,
                title: "8+ AI Providers",
                description: "Access GPT-4, Claude, Gemini, Groq, and more. Smart routing picks the best model for each task."
              },
              {
                icon: Shield,
                title: "Multi-Model Consensus",
                description: "For critical code, CyberCoder consults multiple AI models and only applies changes they all agree on."
              },
              {
                icon: Zap,
                title: "Instant Refactoring",
                description: "Rename variables, extract functions, convert classes to hooks, and more with a single command."
              },
              {
                icon: Globe,
                title: "Knowledge Graph",
                description: "CyberCoder learns your coding style, preferred libraries, and project patterns over time."
              },
              {
                icon: Terminal,
                title: "Terminal Native",
                description: "Works in any shell: bash, zsh, fish, PowerShell. No IDE required, though IDE extensions coming soon."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Installation Steps */}
      <section id="installation" className="py-32 bg-[#08080C]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Get started in <span className="text-violet-400">3 minutes</span>
            </h2>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Install the CLI",
                command: "npm install -g @cybermind/cybercoder",
                description: "Installs the cybercoder command globally on your system"
              },
              {
                step: 2,
                title: "Get your API key",
                command: "cybercoder login",
                description: "Opens browser to authenticate and get your API key, or create one at cybercoder.ai"
              },
              {
                step: 3,
                title: "Start coding",
                command: "cybercoder ask \"Create a React component for a data table with sorting\"",
                description: "You're ready! Ask CyberCoder anything, or use it to refactor existing code."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <div className="bg-[#0D0D14] rounded-lg p-4 font-mono text-sm mb-2 overflow-x-auto">
                    <span className="text-violet-400">$</span> <span className="text-gray-300">{item.command}</span>
                  </div>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-400">
              Start free. Upgrade when you need more power.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                description: "Perfect for trying out CyberCoder",
                features: [
                  "100 requests/month",
                  "Access to free models (Ollama)",
                  "Basic code generation",
                  "Community support"
                ],
                cta: "Get Started",
                popular: false
              },
              {
                name: "Pro",
                price: "$25",
                description: "For professional developers",
                features: [
                  "5,000 requests/month",
                  "All AI providers included",
                  "Multi-model consensus",
                  "Knowledge graph learning",
                  "Priority support",
                  "CLI + Web access"
                ],
                cta: "Start Pro Trial",
                popular: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                description: "For teams and organizations",
                features: [
                  "Unlimited requests",
                  "Custom model hosting",
                  "SSO & advanced security",
                  "Audit logging",
                  "Dedicated infrastructure",
                  "SLA guarantees"
                ],
                cta: "Contact Sales",
                popular: false
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                className={`rounded-2xl p-8 border ${
                  plan.popular 
                    ? 'border-violet-500/50 bg-violet-500/5' 
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.popular && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-gray-400">/month</span>}
                </div>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3 text-sm text-gray-300">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.name === "Enterprise" ? "/contact" : "/signup"}
                  className={`block text-center py-3 rounded-xl font-medium transition-colors ${
                    plan.popular
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-[#08080C]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2 {...fadeInUp} className="text-4xl font-bold text-white text-center mb-16">
            Frequently asked questions
          </motion.h2>

          <div className="space-y-6">
            {[
              {
                q: "How is this different from Claude Code or GitHub Copilot?",
                a: "CyberCoder gives you access to 8+ AI providers, not just one. It learns your coding patterns over time, supports multi-model consensus for critical decisions, and works entirely in your terminal without requiring an IDE."
              },
              {
                q: "Can I use my own API keys?",
                a: "Yes! Pro and Enterprise users can add their own API keys for any provider. We'll use your keys first, then fall back to our infrastructure when needed."
              },
              {
                q: "Is my code sent to your servers?",
                a: "Only when you explicitly ask for AI assistance. All code analysis for the knowledge graph happens locally. Enterprise plans can enable full on-premise deployment."
              },
              {
                q: "What languages are supported?",
                a: "CyberCoder works with all popular programming languages including TypeScript, Python, Rust, Go, Java, C++, and more. The knowledge graph tracks your expertise across languages."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                className="p-6 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <h3 className="text-lg font-medium text-white mb-3">{faq.q}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            {...fadeInUp}
            className="p-12 rounded-3xl bg-gradient-to-b from-violet-500/10 to-transparent border border-violet-500/20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to code at the speed of thought?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who are shipping faster with CyberCoder CLI.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                <Download className="w-5 h-5" />
                Install CyberCoder
              </Link>
              <a
                href="https://docs.cybercoder.ai"
                className="flex items-center gap-2 px-8 py-4 bg-white/5 text-white rounded-xl font-medium hover:bg-white/10 transition-colors border border-white/10"
              >
                Read Documentation
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
