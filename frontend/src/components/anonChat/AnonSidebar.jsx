/**
 * AnonSidebar — Left sidebar: profile, search, tabs (Chats/Contacts/Groups/Requests).
 */

import { useState, useMemo } from 'react'
import {
  Ghost, Settings, Search, MessageSquare, Users, UsersRound,
  UserPlus, UserCheck, UserX, Plus, ChevronRight,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import AnonContactCard from './AnonContactCard.jsx'
import AnonGroupCard   from './AnonGroupCard.jsx'
import { getAvatarColor } from './useAnonChat.js'

const C = {
  sidebar: '#111b21',
  hover:   '#2a3942',
  border:  '#222d34',
  accent:  '#00a884',
  accent2: '#cba6f7',
  text:    '#e9edef',
  muted:   '#8696a0',
}

const TABS = [
  { key: 'chats',    label: 'Chats',    Icon: MessageSquare },
  { key: 'contacts', label: 'Contacts', Icon: Users },
  { key: 'groups',   label: 'Groups',   Icon: UsersRound },
  { key: 'requests', label: 'Requests', Icon: UserPlus },
]

export default function AnonSidebar({
  identity,
  conversations, contacts, groups, requests,
  activeConvId, onSelectConv,
  onNewChat, onAddContact, onCreateGroup,
  acceptRequest, declineRequest,
  getContactById, getGroupById,
}) {
  const [tab, setTab]       = useState('chats')
  const [query, setQuery]   = useState('')

  const shortId = (hex = '') => hex.length >= 10 ? hex.slice(0, 6) + '…' + hex.slice(-4) : hex

  // ── Filtered lists ──────────────────────────────────────────────────────
  const filteredConvs = useMemo(() => {
    if (!query) return conversations
    const q = query.toLowerCase()
    return conversations.filter(c => {
      if (c.type === 'direct') {
        const contact = getContactById(c.contactId)
        return contact?.nickname?.toLowerCase().includes(q) || c.contactId?.includes(q)
      }
      const group = getGroupById(c.groupId)
      return group?.name?.toLowerCase().includes(q) || c.groupId?.includes(q)
    })
  }, [conversations, query, getContactById, getGroupById])

  const filteredContacts = useMemo(() => {
    if (!query) return contacts
    const q = query.toLowerCase()
    return contacts.filter(c => c.nickname?.toLowerCase().includes(q) || c.pseudonymId?.includes(q))
  }, [contacts, query])

  const filteredGroups = useMemo(() => {
    if (!query) return groups
    const q = query.toLowerCase()
    return groups.filter(g => g.name?.toLowerCase().includes(q))
  }, [groups, query])

  const unreadTotal = conversations.reduce((s, c) => s + (c.unread ?? 0), 0)

  // ── Find conv for a contact / group ──────────────────────────────────────
  const convForContact = (contactId) => conversations.find(c => c.contactId === contactId)
  const convForGroup   = (groupId)   => conversations.find(c => c.groupId   === groupId)

  const handleSelectContact = (contact) => {
    let conv = convForContact(contact.id)
    if (!conv) {
      conv = {
        id: 'conv_' + contact.id,
        type: 'direct',
        contactId: contact.id,
        unread: 0, lastMessage: '', lastMessageTime: null,
      }
    }
    onSelectConv(conv.id)
  }

  const handleSelectGroup = (group) => {
    let conv = convForGroup(group.id)
    if (!conv) {
      conv = {
        id: 'conv_' + group.id,
        type: 'group',
        groupId: group.id,
        unread: 0, lastMessage: '', lastMessageTime: null,
      }
    }
    onSelectConv(conv.id)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
    }}>
      {/* ── Top: profile + settings ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${C.border}`,
        gap: '0.75rem',
        background: '#182229',
        flexShrink: 0,
      }}>
        {/* Own avatar */}
        <div style={{
          width: '2.625rem', height: '2.625rem', borderRadius: '50%',
          background: getAvatarColor(identity?.identifier ?? ''),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${C.accent2}44`,
        }}>
          <Ghost size={18} color="rgba(255,255,255,0.9)" />
        </div>

        {/* Pseudonym ID */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: C.accent2, fontWeight: 600 }}>
            Anonymous
          </p>
          <p style={{ margin: 0, fontSize: '0.68rem', color: C.muted, fontFamily: 'monospace' }}>
            {shortId(identity?.identifier)}
          </p>
        </div>

        {/* Settings */}
        <button style={iconBtn} title="Settings">
          <Settings size={18} />
        </button>
      </div>

      {/* ── Search bar ── */}
      <div style={{
        padding: '0.5rem 0.75rem',
        background: '#182229',
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#2a3942',
          borderRadius: '0.5rem',
          padding: '0.375rem 0.75rem',
        }}>
          <Search size={14} color={C.muted} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or start new chat"
            style={{
              flex: 1, background: 'transparent', border: 'none',
              outline: 'none', color: C.text,
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, background: '#182229',
      }}>
        {TABS.map(({ key, label, Icon }) => {
          const badge = key === 'requests' ? requests.length : key === 'chats' ? unreadTotal : 0
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '0.2rem',
                padding: '0.6rem 0.25rem 0.5rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === key ? C.accent : C.muted,
                borderBottom: `2px solid ${tab === key ? C.accent : 'transparent'}`,
                position: 'relative',
                fontSize: '0.6rem', fontWeight: tab === key ? 600 : 400,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: '5px', right: key === 'requests' ? '8px' : '12px',
                  background: C.accent, color: '#111b21',
                  borderRadius: '999px', fontSize: '0.6rem',
                  padding: '0.05rem 0.3rem', fontWeight: 700,
                  minWidth: '0.9rem', textAlign: 'center',
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.12 }}
          >
            {/* ── CHATS ── */}
            {tab === 'chats' && (
              <>
                {filteredConvs.length === 0 ? (
                  <EmptyTabState icon={MessageSquare} message="No chats yet" />
                ) : (
                  filteredConvs
                    .sort((a, b) => (b.lastMessageTime ?? 0) - (a.lastMessageTime ?? 0))
                    .map(conv => {
                      if (conv.type === 'direct') {
                        const contact = getContactById(conv.contactId) ?? { id: conv.contactId, nickname: conv.contactId?.slice(0, 8) }
                        return (
                          <AnonContactCard
                            key={conv.id}
                            contact={contact}
                            conversation={conv}
                            isActive={activeConvId === conv.id}
                            onClick={() => onSelectConv(conv.id)}
                          />
                        )
                      }
                      const group = getGroupById(conv.groupId)
                      if (!group) return null
                      return (
                        <AnonGroupCard
                          key={conv.id}
                          group={group}
                          conversation={conv}
                          isActive={activeConvId === conv.id}
                          onClick={() => onSelectConv(conv.id)}
                        />
                      )
                    })
                )}
                {/* FAB */}
                <div style={{ position: 'sticky', bottom: '1rem', display: 'flex', justifyContent: 'flex-end', padding: '0 1rem', pointerEvents: 'none' }}>
                  <button
                    onClick={onNewChat}
                    style={{
                      pointerEvents: 'all',
                      width: '3rem', height: '3rem', borderRadius: '50%',
                      background: C.accent, color: '#111b21',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(0,168,132,0.4)',
                    }}
                    title="New Chat"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              </>
            )}

            {/* ── CONTACTS ── */}
            {tab === 'contacts' && (
              <>
                <div style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${C.border}` }}>
                  <button
                    onClick={onAddContact}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      width: '100%', padding: '0.5rem 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: C.accent, fontSize: '0.875rem', fontWeight: 500,
                    }}
                  >
                    <Plus size={16} /> Add Contact
                  </button>
                </div>
                {filteredContacts.length === 0 ? (
                  <EmptyTabState icon={Users} message="No contacts yet" />
                ) : (
                  filteredContacts.map(contact => (
                    <AnonContactCard
                      key={contact.id}
                      contact={contact}
                      conversation={convForContact(contact.id)}
                      isActive={activeConvId === convForContact(contact.id)?.id}
                      onClick={() => handleSelectContact(contact)}
                    />
                  ))
                )}
              </>
            )}

            {/* ── GROUPS ── */}
            {tab === 'groups' && (
              <>
                <div style={{ padding: '0.5rem 1rem', borderBottom: `1px solid ${C.border}` }}>
                  <button
                    onClick={onCreateGroup}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      width: '100%', padding: '0.5rem 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: C.accent, fontSize: '0.875rem', fontWeight: 500,
                    }}
                  >
                    <Plus size={16} /> Create Group
                  </button>
                </div>
                {filteredGroups.length === 0 ? (
                  <EmptyTabState icon={UsersRound} message="No groups yet" />
                ) : (
                  filteredGroups.map(group => (
                    <AnonGroupCard
                      key={group.id}
                      group={group}
                      conversation={convForGroup(group.id)}
                      isActive={activeConvId === convForGroup(group.id)?.id}
                      onClick={() => handleSelectGroup(group)}
                    />
                  ))
                )}
              </>
            )}

            {/* ── REQUESTS ── */}
            {tab === 'requests' && (
              <>
                {requests.length === 0 ? (
                  <EmptyTabState icon={UserPlus} message="No pending requests" />
                ) : (
                  requests.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onAccept={() => acceptRequest(req.id)}
                      onDecline={() => declineRequest(req.id)}
                    />
                  ))
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function EmptyTabState({ icon: Icon, message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '3rem 1rem', gap: '0.75rem',
      color: '#8696a0',
    }}>
      <Icon size={32} style={{ opacity: 0.3 }} />
      <p style={{ margin: 0, fontSize: '0.875rem' }}>{message}</p>
    </div>
  )
}

function RequestCard({ req, onAccept, onDecline }) {
  function formatTime(ts) {
    const diff = Date.now() - ts
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago'
    if (diff < 86_400_000) return 'Today'
    return 'Yesterday'
  }

  return (
    <div style={{
      padding: '0.875rem 1rem',
      borderBottom: `1px solid #222d34`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
        <div style={{
          width: '2.5rem', height: '2.5rem', borderRadius: '50%',
          background: getAvatarColor(req.fromId),
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <UserX size={14} color="rgba(255,255,255,0.9)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#e9edef', fontFamily: 'monospace' }}>
            {req.fromId.slice(0, 16)}…
          </p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#8696a0' }}>
            {formatTime(req.time)}
          </p>
        </div>
      </div>
      {req.message && (
        <p style={{ margin: '0 0 0.625rem', fontSize: '0.82rem', color: '#8696a0', fontStyle: 'italic' }}>
          "{req.message}"
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onDecline}
          style={{ flex: 1, padding: '0.4rem', borderRadius: '0.5rem', background: 'transparent', border: '1px solid #2a3942', color: '#f38ba8', cursor: 'pointer', fontSize: '0.82rem' }}
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          style={{ flex: 1, padding: '0.4rem', borderRadius: '0.5rem', background: '#00a884', border: 'none', color: '#111b21', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#8696a0', padding: '0.375rem', borderRadius: '50%',
  display: 'flex', alignItems: 'center',
}
