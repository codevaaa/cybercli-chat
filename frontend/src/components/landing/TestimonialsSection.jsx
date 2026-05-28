import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ScrollReveal, { ScrollRevealGroup } from '@components/ui/ScrollReveal'
import { Star, MessageSquare, Send, Check, Loader2 } from 'lucide-react'
import api from '../../lib/api.js'
import { useAuthStore } from '../../stores/authStore.js'

function StarRating({ count = 5 }) {
  return (
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  const { user } = useAuthStore()
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [quote, setQuote] = useState('')
  const [stars, setStars] = useState(5)
  const [role, setRole] = useState('Developer')
  const [company, setCompany] = useState('')
  const [hoveredStar, setHoveredStar] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const { data } = await api.get('/feedback')
        setTestimonials(data || [])
      } catch (err) {
        console.error('Failed to fetch testimonials:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTestimonials()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quote.trim() || quote.trim().length < 10) {
      setError('Feedback must be at least 10 characters long.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const displayName = localStorage.getItem('user_name') || user?.email?.split('@')[0] || 'Anonymous'
      const { data } = await api.post('/feedback', {
        quote: quote.trim(),
        stars,
        role: role.trim() || 'Developer',
        company: company.trim(),
        name: displayName
      })

      // Add to list and trigger success
      setTestimonials(prev => [data, ...prev])
      setSubmitSuccess(true)
      setQuote('')
      setRole('Developer')
      setCompany('')
      setStars(5)
      
      setTimeout(() => {
        setSubmitSuccess(false)
        setShowForm(false)
      }, 2500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="section-padding py-24 lg:py-32 border-y border-border-subtle relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D97757]/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Header */}
        <ScrollReveal direction="up" delay={0} className="text-center mb-16">
          <span className="inline-block text-xs font-semibold text-accent tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/10">
            Testimonials
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] mb-5 text-white">
            Loved by{' '}
            <span className="text-gradient-accent">developers & researchers</span>
          </h2>
          <p className="text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
            Real feedback from verified users, security researchers, and builders who run their workflows on CyberCli.
          </p>

          {/* Feedback Toggle Button (Authenticated Only) */}
          {user && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowForm(prev => !prev)}
              className="mt-8 px-6 py-2.5 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/15 text-accent text-sm font-semibold transition-all inline-flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {showForm ? 'Close Feedback Form' : 'Leave Your Feedback'}
            </motion.button>
          )}
        </ScrollReveal>

        {/* Feedback Submission Form Panel */}
        <AnimatePresence>
          {showForm && user && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl mx-auto mb-16 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="card-glass p-8 border border-white/[0.08] relative">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent fill-accent" />
                  Share your CyberCli experience
                </h3>

                {error && (
                  <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {error}
                  </div>
                )}

                {submitSuccess ? (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-8 flex flex-col items-center justify-center text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">Feedback Submitted!</h4>
                    <p className="text-xs text-foreground-muted">Thank you for helping us improve CyberCli.</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {/* Star selection */}
                    <div>
                      <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Rating</label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() => setStars(starNum)}
                            onMouseEnter={() => setHoveredStar(starNum)}
                            onMouseLeave={() => setHoveredStar(null)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className="w-7 h-7 transition-colors"
                              style={{
                                fill: starNum <= (hoveredStar || stars) ? '#fbbf24' : 'transparent',
                                color: starNum <= (hoveredStar || stars) ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback message */}
                    <div>
                      <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Comment</label>
                      <textarea
                        required
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        placeholder="What do you love about CyberCli? How has it improved your workflow?"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-background-tertiary border border-white/[0.08] focus:border-accent/40 focus:ring-1 focus:ring-accent/20 outline-none text-sm text-white placeholder-white/20 transition-all resize-none"
                      />
                    </div>

                    {/* Extra fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Role / Job Title</label>
                        <input
                          type="text"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          placeholder="e.g. Security Analyst"
                          className="w-full px-4 py-2.5 rounded-xl bg-background-tertiary border border-white/[0.08] focus:border-accent/40 outline-none text-sm text-white placeholder-white/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">Company (Optional)</label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="e.g. CyberMindCLI"
                          className="w-full px-4 py-2.5 rounded-xl bg-background-tertiary border border-white/[0.08] focus:border-accent/40 outline-none text-sm text-white placeholder-white/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-xl bg-accent text-black font-bold text-sm flex items-center gap-2 hover:bg-accent/95 disabled:opacity-50 transition-all"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Submit Review
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Testimonial List Grid */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-glass p-7 h-48 animate-pulse flex flex-col justify-between">
                <div className="h-4 w-24 bg-white/5 rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded" />
                  <div className="h-3 w-5/6 bg-white/5 rounded" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-16 bg-white/5 rounded" />
                    <div className="h-2 w-24 bg-white/5 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ScrollRevealGroup
            direction="up"
            stagger={0.06}
            className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto"
          >
            {testimonials.map((t) => (
              <div key={t._id || t.name} className="card-glass p-7 flex flex-col justify-between hover:border-accent/25 transition-colors duration-300">
                <div>
                  <StarRating count={t.stars} />

                  {/* Quote */}
                  <blockquote className="text-sm text-[#D1D5DB] leading-relaxed italic mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                    style={{
                      background: `${t.accentColor}20`,
                      color: t.accentColor,
                      border: `1px solid ${t.accentColor}30`,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-[#6B7280]">
                      {t.role}{t.company ? `, ${t.company}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollRevealGroup>
        )}

        {!loading && testimonials.length === 0 && (
          <div className="text-center py-16 text-foreground-muted text-sm border border-dashed border-border-subtle rounded-3xl bg-background-secondary/30 max-w-2xl mx-auto">
            No testimonials found. Be the first to share your experience!
          </div>
        )}
      </div>
    </section>
  )
}
