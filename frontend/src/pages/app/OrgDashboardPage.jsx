import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Settings, CreditCard, Building, LogOut, Check, Mail, ShieldAlert } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { Tooltip } from '../../components/ui/Tooltip.jsx'
import api from '../../lib/api.js'
import SEOHead from '@components/seo/SEOHead'

export default function OrgDashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => {
      const { data } = await api.get('/orgs')
      return data.organizations || []
    }
  })

  const defaultOrgId = orgs[0]?._id
  const currentOrgId = activeOrg?._id || defaultOrgId

  const { data: orgDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['orgDetails', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return null
      const { data } = await api.get(`/orgs/${currentOrgId}`)
      return data
    },
    enabled: !!currentOrgId
  })

  useEffect(() => {
    if (orgDetails?.organization) {
      setActiveOrg(orgDetails.organization)
      setMembers(orgDetails.members || [])
    }
  }, [orgDetails])

  const inviteMutation = useMutation({
    mutationFn: async (payload) => await api.post(`/orgs/${currentOrgId}/members/invite`, payload),
    onSuccess: () => {
      setInviteMessage({ type: 'success', text: 'Member invited successfully.' })
      setInviteEmail('')
      queryClient.invalidateQueries({ queryKey: ['orgDetails', currentOrgId] })
    },
    onError: (err) => {
      setInviteMessage({ type: 'error', text: err.response?.data?.error || 'Failed to invite member.' })
    }
  })

  const removeMutation = useMutation({
    mutationFn: async (memberId) => await api.delete(`/orgs/${currentOrgId}/members/${memberId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orgDetails', currentOrgId] }),
    onError: (err) => alert(err.response?.data?.error || 'Failed to remove member.')
  })

  const handleInvite = (e) => {
    e.preventDefault()
    setInviteMessage(null)
    if (!currentOrgId) return
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
  }

  const handleRemove = (memberId) => {
    if (!currentOrgId || !window.confirm('Remove this member from the organization?')) return
    removeMutation.mutate(memberId)
  }

  const loading = orgsLoading || detailsLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a18] flex items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto space-y-8">
          <Skeleton variant="rectangular" className="w-48 h-8 rounded-lg" />
          <div className="flex gap-8">
            <Skeleton variant="rectangular" className="w-64 h-[400px] rounded-xl hidden md:block" />
            <div className="flex-1 space-y-6">
              <Skeleton variant="rectangular" className="w-full h-32 rounded-xl" />
              <Skeleton variant="rectangular" className="w-full h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (orgs.length === 0) {
    return (
      <div className="min-h-screen bg-[#1a1a18] pt-24 px-4 sm:px-6 flex flex-col items-center">
        <SEOHead title="Organization" path="/app/org" />
        <Building className="w-16 h-16 text-[#c96442] mb-6 opacity-80" />
        <h1 className="text-3xl font-serif text-[#f5f4ef] mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>No Organization Found</h1>
        <p className="text-gray-400 max-w-md text-center mb-8">
          You are not currently part of any Team or Enterprise organization. Upgrade to a Team plan to unlock the organization dashboard.
        </p>
        <button onClick={() => navigate('/upgrade')} className="px-6 py-2.5 rounded-lg bg-[#f5f4ef] text-[#1a1a18] hover:bg-white text-sm font-semibold transition-colors">
          Upgrade to Team
        </button>
      </div>
    )
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#1a1a18] text-[#f5f4ef]">
      <SEOHead title={`${activeOrg?.name || 'Organization'} | Admin`} path="/app/org" />

      {/* Top Nav */}
      <div className="sticky top-0 z-20 bg-[#1a1a18]/90 backdrop-blur-sm border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Tooltip content="Return to Chat" position="right">
            <button onClick={() => navigate('/chat')} className="text-gray-400 hover:text-white transition-colors">
              &larr; Back to Chat
            </button>
          </Tooltip>
          <div className="h-4 w-px bg-white/[0.1]"></div>
          <h1 className="text-lg font-serif" style={{ fontFamily: "'Instrument Serif', serif" }}>{activeOrg?.name}</h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[#c96442]/10 text-[#c96442] border border-[#c96442]/20">
            {activeOrg?.plan}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 py-10 px-6">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-[#2b2b27] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif" style={{ fontFamily: "'Instrument Serif', serif" }}>Organization Overview</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Seats</p>
                  <p className="text-3xl font-light text-white">{activeOrg?.seats_standard + activeOrg?.seats_premium}</p>
                </div>
                <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Active Members</p>
                  <p className="text-3xl font-light text-white">{members.length}</p>
                </div>
                <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-5">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Status</p>
                  <p className="text-xl font-medium text-emerald-400 capitalize">{activeOrg?.status}</p>
                </div>
              </div>

              <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-6 mt-6">
                <h3 className="text-lg font-medium text-white mb-2">Pooled Usage (Coming Soon)</h3>
                <p className="text-sm text-gray-400">Track API requests, message limits, and token usage aggregated across all members of your organization.</p>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-serif mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>Members</h2>
                <p className="text-sm text-gray-400">Manage who has access to {activeOrg?.name}.</p>
              </div>

              <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-6">
                <h3 className="text-sm font-medium text-white mb-4">Invite New Member</h3>
                <form onSubmit={handleInvite} className="flex gap-3">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="flex-1 bg-[#0e0e0c] border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#c96442]/50"
                  />
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="bg-[#0e0e0c] border border-white/[0.08] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#c96442]/50"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-[#f5f4ef] text-[#1a1a18] hover:bg-white text-sm font-semibold transition-colors flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Send Invite
                  </button>
                </form>
                {inviteMessage && (
                  <p className={`mt-3 text-sm ${inviteMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {inviteMessage.text}
                  </p>
                )}
              </div>

              <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Seat</th>
                      <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {members.map(m => (
                      <tr key={m.id} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#c96442]/20 flex items-center justify-center text-[#c96442] font-semibold text-xs">
                              {m.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{m.full_name || m.email}</p>
                              <p className="text-xs text-gray-500">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300 capitalize">{m.role}</td>
                        <td className="px-6 py-4 text-sm text-gray-300 capitalize">{m.seat_type}</td>
                        <td className="px-6 py-4 text-sm">
                           <span className="px-2 py-1 rounded text-xs bg-emerald-400/10 text-emerald-400">{m.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {m.role !== 'owner' && (
                             <Tooltip content="Remove Member" position="left">
                               <button onClick={() => handleRemove(m.id)} className="text-xs text-rose-400 hover:text-rose-300">Remove</button>
                             </Tooltip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif" style={{ fontFamily: "'Instrument Serif', serif" }}>Billing & Plan</h2>
              <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-white">Current Plan: {activeOrg?.plan.toUpperCase()}</h3>
                    <p className="text-sm text-gray-400 mt-1">Managed via Stripe checkout.</p>
                  </div>
                  <button onClick={() => navigate('/settings/billing')} className="px-4 py-2 rounded-lg bg-[#2b2b27] text-white hover:bg-[#3a3934] text-sm font-medium transition-colors">
                    Manage in Stripe
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-6 mt-6">
                   <div>
                      <p className="text-xs text-gray-500">Standard Seats Allocated</p>
                      <p className="text-lg font-medium text-white">{activeOrg?.seats_standard}</p>
                   </div>
                   <div>
                      <p className="text-xs text-gray-500">Premium Seats Allocated</p>
                      <p className="text-lg font-medium text-white">{activeOrg?.seats_premium}</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif" style={{ fontFamily: "'Instrument Serif', serif" }}>Security & Settings</h2>
              
              <div className="bg-[#211f1c] border border-white/[0.06] rounded-xl p-6 space-y-6">
                
                <div className="flex items-start gap-4 pb-6 border-b border-white/[0.06]">
                   <ShieldAlert className="w-5 h-5 text-[#c96442] mt-0.5" />
                   <div>
                      <h4 className="text-sm font-medium text-white">Enforce 2FA</h4>
                      <p className="text-xs text-gray-400 mt-1 mb-3">Require all members of this organization to have two-factor authentication enabled.</p>
                      <button className="px-3 py-1.5 rounded-md bg-[#2b2b27] text-xs font-medium text-gray-300">Enable (Coming Soon)</button>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <Building className="w-5 h-5 text-[#c96442] mt-0.5" />
                   <div>
                      <h4 className="text-sm font-medium text-white">SCIM & SSO</h4>
                      <p className="text-xs text-gray-400 mt-1 mb-3">Connect your identity provider (Okta, Azure AD) for automated provisioning.</p>
                      <button className="px-3 py-1.5 rounded-md bg-[#2b2b27] text-xs font-medium text-gray-300">Configure Identity Provider</button>
                   </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
