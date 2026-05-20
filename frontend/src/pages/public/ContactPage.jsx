import { useState } from 'react'
import { Mail, MessageSquare, MapPin, Send, ArrowUpRight } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="pt-28 pb-20">
      <div className="section-padding mb-16">
        <div className="container-custom text-center">
          <span className="text-sm font-medium text-accent tracking-wide uppercase mb-4 block">Contact</span>
          <h1 className="text-h1 mb-5">Get in <span className="text-gradient-accent">touch</span></h1>
          <p className="text-body-lg text-foreground-muted max-w-2xl mx-auto">
            Have questions, feedback, or partnership inquiries? We&apos;d love to hear from you.
          </p>
        </div>
      </div>

      <div className="section-padding">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="text-h3 mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground-primary mb-2">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-primary mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-primary mb-2">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors"
                    placeholder="What's this about?"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-primary mb-2">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg bg-background-secondary border border-border-subtle text-foreground-primary text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                    placeholder="Tell us more..."
                    required
                  />
                </div>
                <button type="submit" className="btn-primary">
                  <Send className="w-4 h-4" />
                  {submitted ? 'Message Sent!' : 'Send Message'}
                </button>
              </form>
            </div>

            <div className="space-y-8">
              <div className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground-primary mb-1">Email</h3>
                <p className="text-sm text-foreground-muted mb-3">For general inquiries and support</p>
                <a href="mailto:hello@cybercli.chat" className="text-accent text-sm hover:underline">hello@cybercli.chat</a>
              </div>

              <div className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground-primary mb-1">Community</h3>
                <p className="text-sm text-foreground-muted mb-3">Join our Discord for real-time help</p>
                <a href="https://discord.gg/cybercli" target="_blank" rel="noopener noreferrer" className="text-accent text-sm hover:underline flex items-center gap-1">
                  Join Discord <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>

              <div className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground-primary mb-1">Location</h3>
                <p className="text-sm text-foreground-muted">
                  Built remotely by a distributed team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
