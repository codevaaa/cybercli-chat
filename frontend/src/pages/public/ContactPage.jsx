import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, MessageSquare, MapPin, Send, Check, ArrowUpRight, Globe, Twitter, Github } from 'lucide-react'
import ScrollReveal from '@components/ui/ScrollReveal'
import api from '../../lib/api.js'

const CONTACT_CHANNELS = [
  {
    icon: Mail,
    title: 'Email',
    desc: 'For general inquiries, support, and partnerships',
    value: 'hello@cybercli.chat',
    link: 'mailto:hello@cybercli.chat',
    color: '#D97757',
  },
  {
    icon: MessageSquare,
    title: 'Community Discord',
    desc: 'Real-time help, feature requests, and discussions',
    value: 'Join our Discord',
    link: 'https://discord.gg/cybercli',
    external: true,
    color: '#D97757',
  },
  {
    icon: Globe,
    title: 'CyberMindCLI',
    desc: 'Learn more about the team and ecosystem',
    value: 'cybermindcli.com',
    link: 'https://cybermindcli.com',
    external: true,
    color: '#06B6D4',
  },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [focused, setFocused] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/contact', form)
      setSending(false)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 4000)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      console.error('Contact submission error:', err)
      setSending(false)
      alert(err.response?.data?.error || err.message || 'Something went wrong. Please try again.')
    }
  }

  const InputField = ({ label, id, type = 'text', value, onChange, placeholder, required, as: As = 'input', rows }) => (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-foreground-primary mb-2">{label}</label>
      <div className="relative">
        <As
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(id)}
          onBlur={() => setFocused(null)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={`w-full px-4 py-3 rounded-xl bg-background-secondary border text-foreground-primary text-sm placeholder:text-foreground-muted/40 focus:outline-none resize-none transition-all duration-300 ${
            focused === id
              ? 'border-accent bg-background-elevated shadow-[0_0_0_3px_rgba(217,119,87,0.1)]'
              : 'border-border-subtle hover:border-border-medium'
          }`}
        />
        {/* Focus indicator bar */}
        <motion.div
          className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-accent origin-left"
          animate={{ scaleX: focused === id ? 1 : 0, opacity: focused === id ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )

  return (
    <div className="pt-28 pb-20">
      {/* Header */}
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <ScrollReveal>
            <span className="text-sm font-medium text-accent tracking-widest uppercase mb-4 block">Contact</span>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <h1 className="text-5xl sm:text-6xl font-serif font-light text-foreground-primary mb-5">
              Get in{' '}
              <span className="text-gradient-accent italic">touch</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <p className="text-lg text-foreground-muted max-w-xl mx-auto">
              Questions, feedback, partnership inquiries, or security reports — we're here.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-5 gap-16">
            {/* Form */}
            <ScrollReveal direction="right" className="lg:col-span-3">
              <div className="card-glass p-8">
                <h2 className="text-2xl font-semibold text-foreground-primary mb-7">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <InputField
                      label="Name" id="name" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name" required
                    />
                    <InputField
                      label="Email" id="email" type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com" required
                    />
                  </div>
                  <InputField
                    label="Subject" id="subject" value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="What's this about?" required
                  />
                  <InputField
                    label="Message" id="message" as="textarea" rows={5} value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us more..." required
                  />

                  <motion.button
                    type="submit"
                    className="btn-primary w-full relative overflow-hidden"
                    whileTap={{ scale: 0.98 }}
                    disabled={sending || submitted}
                  >
                    <AnimatePresence mode="wait">
                      {submitted ? (
                        <motion.span key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                          <Check className="w-4 h-4" /> Message Sent!
                        </motion.span>
                      ) : sending ? (
                        <motion.span key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Sending...
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                          <Send className="w-4 h-4" /> Send Message
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </form>
              </div>
            </ScrollReveal>

            {/* Contact channels */}
            <div className="lg:col-span-2 space-y-5">
              {CONTACT_CHANNELS.map((channel, i) => (
                <ScrollReveal key={channel.title} delay={i * 0.1}>
                  <motion.a
                    href={channel.link}
                    target={channel.external ? '_blank' : undefined}
                    rel={channel.external ? 'noopener noreferrer' : undefined}
                    className="card-glass p-6 flex items-start gap-4 group block"
                    whileHover={{ y: -3 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${channel.color}18`, border: `1px solid ${channel.color}30` }}>
                      <channel.icon className="w-5 h-5" style={{ color: channel.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground-primary">{channel.title}</h3>
                        {channel.external && <ArrowUpRight className="w-3.5 h-3.5 text-foreground-muted group-hover:text-accent transition-colors" />}
                      </div>
                      <p className="text-xs text-foreground-muted mb-2">{channel.desc}</p>
                      <span className="text-sm text-accent">{channel.value}</span>
                    </div>
                  </motion.a>
                </ScrollReveal>
              ))}

              <ScrollReveal delay={0.3}>
                <div className="card-glass p-6">
                  <h3 className="text-sm font-semibold text-foreground-primary mb-3">Response Time</h3>
                  <div className="space-y-2 text-sm text-foreground-muted">
                    <div className="flex justify-between">
                      <span>General inquiries</span>
                      <span className="text-foreground-secondary">24–48 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Security reports</span>
                      <span className="text-accent font-medium">&lt; 4 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Partnership inquiries</span>
                      <span className="text-foreground-secondary">2–3 business days</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
