import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Copy, Check, Users, Gift, Mail, ArrowUpRight } from 'lucide-react'
import api from '../../lib/api.js'

export default function InviteFriendsModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [inviterName, setInviterName] = useState(() => localStorage.getItem('user_name') || 'Your Friend')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [copied, setCopied] = useState(false)
  const [invites, setInvites] = useState([])
  const [stats, setStats] = useState({ totalSent: 0, totalAccepted: 0 })

  const fetchInviteData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/invite/list'),
        api.get('/invite/stats')
      ])
      setInvites(listRes.data || [])
      setStats(statsRes.data || { totalSent: 0, totalAccepted: 0 })
    } catch (err) {
      console.error('Failed to fetch invite history/stats:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchInviteData()
      setSuccessMsg(null)
      setErrorMsg(null)
      setEmail('')
    }
  }, [isOpen])

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await api.post('/invite/send', {
        email: email.trim(),
        inviter_name: inviterName.trim()
      })
      
      setSuccessMsg(res.data.message || 'Invitation sent successfully!')
      setEmail('')
      fetchInviteData()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to send invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get code from last invite to make a referral link
  const inviteCode = invites.length > 0 ? invites[0].invite_code : ''
  const referralLink = inviteCode 
    ? `${window.location.origin}/auth/signup?invite=${inviteCode}`
    : `${window.location.origin}/auth/signup`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          {/* Overlay Close Handler */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-lg bg-[#14141A] border border-white/[0.06] rounded-2xl overflow-hidden z-10 shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-accent animate-pulse-soft" />
                <h3 className="text-lg font-bold text-white">Invite Friends</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Promo banner */}
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 flex gap-3 text-xs leading-relaxed">
                <Users className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-1">Share the Intelligence</span>
                  <span className="text-gray-400">Invite your friends to CyberMindCLI. When they sign up, they get immediate access to all 50+ free models, and you get priority token processing speeds!</span>
                </div>
              </div>

              {/* Invite Form */}
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={inviterName}
                    onChange={(e) => setInviterName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0F] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Friend's Email Address</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="friend@example.com"
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0A0A0F] border border-white/[0.06] text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all hover:scale-102 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Status messages */}
              {successMsg && (
                <div className="p-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 text-xs text-rose-450 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Share link */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Your Referral Link</label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#0A0A0F] border border-white/[0.06]">
                  <span className="flex-1 text-xs text-gray-400 px-2 truncate select-all">{referralLink}</span>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-450 hover:text-white transition-all flex items-center justify-center"
                    title="Copy referral link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {inviteCode && (
                  <p className="text-[10px] text-gray-650 italic">Your active invite code is <strong>{inviteCode}</strong>.</p>
                )}
              </div>

              {/* Invite Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-[#0A0A0F] border border-white/[0.04] text-center">
                  <div className="text-xl font-bold text-white">{stats.totalSent}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">Invites Sent</div>
                </div>
                <div className="p-4 rounded-xl bg-[#0A0A0F] border border-white/[0.04] text-center">
                  <div className="text-xl font-bold text-accent">{stats.totalAccepted}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">Accepted</div>
                </div>
              </div>

              {/* Invites history list */}
              {invites.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Invited Friends</label>
                  <div className="border border-white/[0.04] bg-[#0A0A0F]/50 rounded-xl overflow-hidden divide-y divide-white/[0.03]">
                    {invites.map((inv) => (
                      <div key={inv._id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-gray-300 font-medium">{inv.invitee_email}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'accepted' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
