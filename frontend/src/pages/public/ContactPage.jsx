import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, MapPin, Phone, Send, MessageSquare, Clock, Globe, CheckCircle } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@cybermindcli.com',
    sub: 'We respond within 24 hours',
    href: 'mailto:hello@cybermindcli.com',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
  },
  {
    icon: Globe,
    label: 'Website',
    value: 'cybermindcli.com',
    sub: 'Visit our main site',
    href: 'https://cybermindcli.com',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
  },
  {
    icon: Clock,
    label: 'Response Time',
    value: '< 24 hours',
    sub: 'Monday – Friday',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
  },
  {
    icon: MessageSquare,
    label: 'Discord',
    value: 'Join Our Server',
    sub: 'Community support',
    href: 'https://discord.gg/cybercli',
    color: '#5865F2',
    bg: 'rgba(88,101,242,0.08)',
  },
]

function AnimatedInput({ label, type = 'text', placeholder, multiline = false, value, onChange, error }) {
  const [focused, setFocused] = useState(false)
  const Tag = multiline ? 'textarea' : 'input'

  return (
    <div className="group">
      <label className="block text-sm font-medium text-[#9CA3AF] mb-2">{label}</label>
      <div className="relative">
        <Tag
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={multiline ? 5 : undefined}
          className={`w-full px-4 py-3 bg-white/[0.03] border rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none transition-colors duration-200 ${multiline ? 'resize-none' : ''} ${error ? 'border-red-500/50' : 'border-white/[0.08] focus:border-violet-500/50'}`}
        />
        {/* Animated bottom border */}
        <motion.div
          className="absolute bottom-0 left-1/2 h-[2px] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
          initial={{ width: '0%', x: '0%' }}
          animate={focused ? { width: '100%', x: '-50%' } : { width: '0%', x: '0%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ left: '50%' }}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.message.trim()) e.message = 'Message is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div className="pt-28 pb-20 bg-[#0A0A0F]">
      {/* Hero */}
      <section className="section-padding mb-16 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-custom text-center relative z-10 max-w-3xl mx-auto">
          <ScrollReveal>
            <span className="inline-block text-xs font-semibold text-accent tracking-widest uppercase mb-5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              Get in Touch
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-extrabold tracking-tight leading-[1.1] text-white mb-5">
              We would love to{' '}
              <span
                className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                hear from you
              </span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-lg text-[#9CA3AF] leading-relaxed">
              Bug report, partnership inquiry, security disclosure, or just a hello — we read every message.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-[1fr_380px] gap-10 max-w-5xl mx-auto items-start">
            {/* Form */}
            <ScrollReveal direction="left">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D14] p-8">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Message sent!</h3>
                      <p className="text-[#9CA3AF] text-sm">
                        We'll get back to you within 24 hours. Check your inbox.
                      </p>
                      <button
                        onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
                        className="mt-6 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Send another message
                      </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      className="space-y-5"
                    >
                      <h2 className="text-xl font-bold text-white mb-6">Send us a message</h2>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <AnimatedInput
                          label="Your Name"
                          placeholder="Chandan"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          error={errors.name}
                        />
                        <AnimatedInput
                          label="Email Address"
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          error={errors.email}
                        />
                      </div>
                      <AnimatedInput
                        label="Subject"
                        placeholder="What is this about?"
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        error={errors.subject}
                      />
                      <AnimatedInput
                        label="Message"
                        placeholder="Tell us what you need..."
                        multiline
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        error={errors.message}
                      />
                      <motion.button
                        type="submit"
                        disabled={submitting}
                        className="relative w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        {/* Shimmer effect */}
                        <span className="shimmer-btn absolute inset-0 pointer-events-none" />
                        <span className="relative flex items-center justify-center gap-2">
                          {submitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send Message
                            </>
                          )}
                        </span>
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>

            {/* Contact Info Cards */}
            <div className="space-y-4">
              {CONTACT_INFO.map((info, i) => (
                <ScrollReveal key={info.label} delay={i * 0.08} direction="right">
                  <motion.div
                    className="group rounded-xl border border-white/[0.06] bg-[#0D0D14] p-5"
                    whileHover={{
                      borderColor: `${info.color}30`,
                      boxShadow: `inset 0 0 20px ${info.color}08`,
                      y: -2,
                      transition: { duration: 0.25 },
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: info.bg }}
                      >
                        <info.icon className="w-5 h-5" style={{ color: info.color }} />
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] mb-0.5">{info.label}</p>
                        {info.href ? (
                          <a
                            href={info.href}
                            target={info.href.startsWith('http') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-white hover:text-violet-300 transition-colors"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-white">{info.value}</p>
                        )}
                        <p className="text-xs text-[#4B5563] mt-0.5">{info.sub}</p>
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              ))}

              <ScrollReveal delay={0.4} direction="right">
                <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-violet-900/20 to-indigo-900/10 p-5">
                  <h3 className="text-sm font-semibold text-white mb-2">Security Disclosure</h3>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3">
                    Found a vulnerability? We take security seriously. Please use responsible disclosure — we appreciate and reward valid reports.
                  </p>
                  <a
                    href="mailto:security@cybermindcli.com"
                    className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    security@cybermindcli.com →
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
