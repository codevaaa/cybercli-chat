/**
 * useAnonChat — Central state management hook for anonymous chat.
 * Provides identity, conversations, messages, contacts, groups, requests.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { IdentityManager } from '../../chat/identity/IdentityManager.ts'
import { usePlanGuard }    from '../../chat/hooks/usePlanGuard.ts'

// ─── Singleton manager ────────────────────────────────────────────────────────
let _manager = null
function getManager() {
  if (!_manager) _manager = new IdentityManager()
  return _manager
}

// ─── Avatar color helper ──────────────────────────────────────────────────────
export function getAvatarColor(id = '') {
  const colors = ['#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d','#16a34a']
  const idx = id.charCodeAt(0) % colors.length
  return colors[idx]
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_CONTACTS = [
  { id: 'abc123def456', nickname: 'Alice',   pseudonymId: 'abc123def456a1b2c3d4e5f60789abcd', online: true,  lastSeen: null },
  { id: 'xyz789aabbcc', nickname: 'Bob',     pseudonymId: 'xyz789aabbccd0e1f2a3b4c5d6e7f80', online: false, lastSeen: Date.now() - 3_600_000 },
  { id: 'qrs456ffee12', nickname: 'Charlie', pseudonymId: 'qrs456ffee12345678901234567890ab', online: true,  lastSeen: null },
]

const MOCK_GROUPS = [
  { id: 'grp1', name: 'Dev Team',             members: ['abc123def456', 'xyz789aabbcc'], memberCount: 5,  lastActivity: Date.now() - 3_600_000,  description: 'Engineering discussions' },
  { id: 'grp2', name: 'Anonymous Collective', members: ['qrs456ffee12'],               memberCount: 12, lastActivity: Date.now() - 86_400_000, description: 'Open collective chat' },
]

const MOCK_CONVERSATIONS = [
  { id: 'conv1', type: 'direct', contactId: 'abc123def456',  unread: 2,  lastMessage: 'Are you there?',    lastMessageTime: Date.now() - 120_000 },
  { id: 'conv2', type: 'group',  groupId:   'grp1',          unread: 0,  lastMessage: 'Meeting at 5pm',    lastMessageTime: Date.now() - 3_600_000 },
  { id: 'conv3', type: 'direct', contactId: 'qrs456ffee12',  unread: 1,  lastMessage: 'Check this out 👀', lastMessageTime: Date.now() - 7_200_000 },
]

const MOCK_MESSAGES = {
  conv1: [
    { messageId: 'm1', direction: 'received', content: 'Hey there! 👋',                      createdAt: Date.now() - 600_000,   deliveryStatus: 'read',      encryptionStatus: 'e2ee' },
    { messageId: 'm2', direction: 'sent',     content: 'Hi! How are you?',                   createdAt: Date.now() - 300_000,   deliveryStatus: 'read',      encryptionStatus: 'e2ee' },
    { messageId: 'm3', direction: 'received', content: 'Are you there?',                     createdAt: Date.now() - 120_000,   deliveryStatus: 'delivered', encryptionStatus: 'e2ee' },
  ],
  conv2: [
    { messageId: 'm4', direction: 'received', content: 'Welcome to the group! 🎉',           createdAt: Date.now() - 7_200_000, deliveryStatus: 'read',      encryptionStatus: 'e2ee' },
    { messageId: 'm5', direction: 'sent',     content: 'Thanks! Happy to be here',           createdAt: Date.now() - 3_700_000, deliveryStatus: 'read',      encryptionStatus: 'e2ee' },
    { messageId: 'm6', direction: 'received', content: 'Meeting at 5pm',                     createdAt: Date.now() - 3_600_000, deliveryStatus: 'delivered', encryptionStatus: 'e2ee' },
  ],
  conv3: [
    { messageId: 'm7', direction: 'received', content: 'Check this out 👀',                  createdAt: Date.now() - 7_200_000, deliveryStatus: 'delivered', encryptionStatus: 'e2ee' },
  ],
}

const MOCK_REQUESTS = [
  { id: 'req1', fromId: 'stranger123abc', message: 'Hey, want to connect?', time: Date.now() - 7_200_000 },
  { id: 'req2', fromId: 'unknown789xyz',  message: '',                      time: Date.now() - 86_400_000 },
]

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnonChat(plan = 'free') {
  const guard = usePlanGuard(plan)

  // Identity
  const [identity,  setIdentity]  = useState(null)
  const [initState, setInitState] = useState('loading')
  const [initError, setInitError] = useState(null)

  // Conversations & messages
  const [conversations,  setConversations]  = useState(MOCK_CONVERSATIONS)
  const [activeConvId,   setActiveConvId]   = useState(null)
  const [messages,       setMessages]       = useState(MOCK_MESSAGES)

  // Contacts / groups / requests
  const [contacts,  setContacts]  = useState(MOCK_CONTACTS)
  const [groups,    setGroups]    = useState(MOCK_GROUPS)
  const [requests,  setRequests]  = useState(MOCK_REQUESTS)

  // Settings
  const [e2eeEnabled, setE2eeEnabled] = useState(false)
  const [ttl,         setTtl]         = useState(undefined)

  // ── Identity init ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const id = await getManager().initialize()
        if (!cancelled) { setIdentity(id); setInitState('ready') }
      } catch (err) {
        if (!cancelled) {
          setInitError(err?.reason ?? err?.message ?? String(err))
          setInitState('error')
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((convId, text, opts = {}) => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > 4096) return

    const now = Date.now()
    const msg = {
      messageId:        crypto.randomUUID(),
      direction:        'sent',
      content:          trimmed,
      encryptionStatus: (opts.e2ee ?? e2eeEnabled) ? 'e2ee' : 'tls_only',
      deliveryStatus:   'sent',
      disappearsAt:     (opts.ttl ?? ttl) ? now + (opts.ttl ?? ttl) : undefined,
      createdAt:        now,
    }

    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), msg],
    }))

    // Update conversation last message
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, lastMessage: trimmed, lastMessageTime: now, unread: 0 }
        : c
    ))

    // Simulate delivery ack
    setTimeout(() => {
      setMessages(prev => ({
        ...prev,
        [convId]: (prev[convId] ?? []).map(m =>
          m.messageId === msg.messageId ? { ...m, deliveryStatus: 'delivered' } : m
        ),
      }))
    }, 900)
  }, [e2eeEnabled, ttl])

  // ── Add contact ───────────────────────────────────────────────────────────
  const addContact = useCallback((pseudonymId, nickname) => {
    const id = pseudonymId.slice(0, 12)
    if (contacts.find(c => c.pseudonymId === pseudonymId)) return
    setContacts(prev => [
      ...prev,
      { id, nickname, pseudonymId, online: false, lastSeen: Date.now() },
    ])
  }, [contacts])

  // ── Create group ──────────────────────────────────────────────────────────
  const createGroup = useCallback((name, memberIds) => {
    const id = 'grp_' + crypto.randomUUID().slice(0, 8)
    setGroups(prev => [...prev, {
      id, name, members: memberIds, memberCount: memberIds.length + 1,
      lastActivity: Date.now(), description: '',
    }])
    const convId = 'conv_' + id
    setConversations(prev => [{
      id: convId, type: 'group', groupId: id,
      unread: 0, lastMessage: 'Group created', lastMessageTime: Date.now(),
    }, ...prev])
  }, [])

  // ── Accept / decline request ──────────────────────────────────────────────
  const acceptRequest = useCallback((reqId) => {
    const req = requests.find(r => r.id === reqId)
    if (!req) return
    addContact(req.fromId, req.fromId.slice(0, 6))
    setRequests(prev => prev.filter(r => r.id !== reqId))
  }, [requests, addContact])

  const declineRequest = useCallback((reqId) => {
    setRequests(prev => prev.filter(r => r.id !== reqId))
  }, [])

  // ── E2EE toggle ───────────────────────────────────────────────────────────
  const toggleE2ee = useCallback((onUpgradeNeeded) => {
    const result = guard.enableE2EE(() => setE2eeEnabled(v => !v))
    if (result?.type === 'PLAN_UPGRADE_REQUIRED') onUpgradeNeeded?.('enableE2EE')
  }, [guard])

  // ── Retry init ────────────────────────────────────────────────────────────
  const retryInit = useCallback(() => {
    _manager = null
    setInitState('loading')
    setInitError(null)
  }, [])

  return {
    // Identity
    identity, initState, initError, retryInit,
    // Conversations
    conversations, activeConvId, setActiveConvId,
    // Messages
    messages, sendMessage,
    // Contacts
    contacts, addContact,
    // Groups
    groups, createGroup,
    // Requests
    requests, acceptRequest, declineRequest,
    // Settings
    e2eeEnabled, toggleE2ee,
    ttl, setTtl,
    // Helpers
    getContactById: (id) => contacts.find(c => c.id === id),
    getGroupById:   (id) => groups.find(g => g.id === id),
  }
}
