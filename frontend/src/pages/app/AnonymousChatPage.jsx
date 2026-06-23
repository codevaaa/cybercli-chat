/**
 * AnonymousChatPage — WhatsApp-style anonymous chat.
 * 3-panel layout: sidebar (320px) + chat window + profile panel.
 * Mobile (<768px): sidebar / chat toggle with slide animation.
 */

import { useState, useCallback } from 'react'
import { useAuthStore } from '@stores/authStore.js'

import { useAnonChat }      from '../../components/anonChat/useAnonChat.js'
import AnonSidebar          from '../../components/anonChat/AnonSidebar.jsx'
import AnonChatWindow       from '../../components/anonChat/AnonChatWindow.jsx'
import AnonProfilePanel     from '../../components/anonChat/AnonProfilePanel.jsx'
import AnonNewChatModal     from '../../components/anonChat/AnonNewChatModal.jsx'
import AnonInviteModal      from '../../components/anonChat/AnonInviteModal.jsx'
import AnonGroupCreateModal from '../../components/anonChat/AnonGroupCreateModal.jsx'
import { UpgradeModal }     from '../../chat/components/UpgradeModal.tsx'

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#111b21', color: '#e9edef', gap: '1rem',
    }}>
      <style>{`@keyframes _anon_spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: '1.75rem', height: '1.75rem', borderRadius: '50%',
        border: '2.5px solid #cba6f7', borderTopColor: 'transparent',
        animation: '_anon_spin 0.75s linear infinite',
      }} />
      <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.55 }}>
        Generating anonymous identity…
      </p>
    </div>
  )
}

// ─── Error screen ─────────────────────────────────────────────────────────────
function ErrorScreen({ error, onRetry }) {
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#111b21', color: '#e9edef',
      padding: '2rem', textAlign: 'center', gap: '1rem',
    }}>
      <p style={{ margin: 0, color: '#f38ba8', fontWeight: 600 }}>
        Identity Initialization Failed
      </p>
      <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.6, maxWidth: '22rem' }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: '0.625rem 1.5rem', borderRadius: '0.5rem',
          background: '#cba6f7', color: '#11111b',
          fontWeight: 700, border: 'none', cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnonymousChatPage() {
  const { session } = useAuthStore()
  const plan        = session?.user?.user_metadata?.plan ?? 'free'
  const planIsMax   = plan === 'max'

  const chat = useAnonChat(plan)

  // Modal visibility
  const [showNewChat,     setShowNewChat]     = useState(false)
  const [showGroupCreate, setShowGroupCreate] = useState(false)
  const [showInvite,      setShowInvite]      = useState(false)
  const [showProfile,     setShowProfile]     = useState(false)
  const [upgradeFeature,  setUpgradeFeature]  = useState(null)

  // Mobile: 'sidebar' | 'chat'
  const [mobileView, setMobileView] = useState('sidebar')

  // ── Select conversation ───────────────────────────────────────────────────
  const handleSelectConv = useCallback((convId) => {
    chat.setActiveConvId(convId)
    setMobileView('chat')
    setShowProfile(false)
  }, [chat])

  // ── Derived active objects ────────────────────────────────────────────────
  const activeConv = chat.activeConvId
    ? (chat.conversations.find(c => c.id === chat.activeConvId) ?? null)
    : null

  const activeContact  = activeConv?.type === 'direct'
    ? chat.getContactById(activeConv.contactId)
    : null

  const activeGroup    = activeConv?.type === 'group'
    ? chat.getGroupById(activeConv.groupId)
    : null

  const activeMessages = chat.messages[chat.activeConvId] ?? []

  // ── New chat handler ──────────────────────────────────────────────────────
  const handleStartChat = useCallback((pseudonymId, nickname) => {
    chat.addContact(pseudonymId, nickname || pseudonymId.slice(0, 8))
    const convId = 'conv_' + pseudonymId.slice(0, 12)
    chat.setActiveConvId(convId)
    setMobileView('chat')
  }, [chat])

  // ── Loading / error states ────────────────────────────────────────────────
  if (chat.initState === 'loading') return <LoadingScreen />
  if (chat.initState === 'error')   return <ErrorScreen error={chat.initError} onRetry={chat.retryInit} />

  return (
    <>
      {/* Responsive styles injected once */}
      <style>{`
        .anon-layout {
          display: flex;
          height: 100dvh;
          background: #111b21;
          overflow: hidden;
          position: relative;
        }
        .anon-sidebar {
          width: 320px;
          flex-shrink: 0;
          height: 100%;
          transition: transform 0.25s ease;
          position: relative;
          z-index: 5;
        }
        .anon-main {
          flex: 1;
          min-width: 0;
          height: 100%;
          display: flex;
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .anon-sidebar {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            width: 100%;
            z-index: 10;
          }
          .anon-sidebar.hidden-mobile {
            transform: translateX(-100%);
          }
          .anon-main {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 10;
          }
          .anon-main.hidden-mobile {
            transform: translateX(100%);
          }
          .anon-main, .anon-sidebar {
            transition: transform 0.25s ease;
          }
        }
      `}</style>

      <div className="anon-layout">
        {/* ── Sidebar ── */}
        <div className={`anon-sidebar${mobileView === 'chat' ? ' hidden-mobile' : ''}`}>
          <AnonSidebar
            identity={chat.identity}
            conversations={chat.conversations}
            contacts={chat.contacts}
            groups={chat.groups}
            requests={chat.requests}
            activeConvId={chat.activeConvId}
            onSelectConv={handleSelectConv}
            onNewChat={() => setShowNewChat(true)}
            onAddContact={() => setShowNewChat(true)}
            onCreateGroup={() => setShowGroupCreate(true)}
            acceptRequest={chat.acceptRequest}
            declineRequest={chat.declineRequest}
            getContactById={chat.getContactById}
            getGroupById={chat.getGroupById}
          />
        </div>

        {/* ── Main panel ── */}
        <div className={`anon-main${mobileView === 'sidebar' ? ' hidden-mobile' : ''}`}>
          {/* Chat window */}
          <div style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <AnonChatWindow
              conversation={activeConv}
              contact={activeContact}
              group={activeGroup}
              messages={activeMessages}
              sendMessage={chat.sendMessage}
              e2eeEnabled={chat.e2eeEnabled}
              ttl={chat.ttl}
              planIsMax={planIsMax}
              onBack={() => { setMobileView('sidebar'); setShowProfile(false) }}
              onShowProfile={() => setShowProfile(v => !v)}
            />
          </div>

          {/* Profile panel — slide in from right inside main panel */}
          {showProfile && (
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 'min(22rem, 100%)',
              zIndex: 5,
            }}>
              <AnonProfilePanel
                isOpen={showProfile}
                onClose={() => setShowProfile(false)}
                type={activeConv?.type}
                contact={activeContact}
                group={activeGroup}
                contacts={chat.contacts}
                onShowInvite={() => { setShowInvite(true); setShowProfile(false) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals (outside layout to avoid clipping) ── */}
      <AnonNewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onStartChat={handleStartChat}
        onAddContact={chat.addContact}
        ownId={chat.identity?.identifier}
      />

      <AnonGroupCreateModal
        isOpen={showGroupCreate}
        onClose={() => setShowGroupCreate(false)}
        onCreateGroup={chat.createGroup}
      />

      <AnonInviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        groupName={activeGroup?.name}
      />

      <UpgradeModal
        feature={upgradeFeature ?? ''}
        isOpen={!!upgradeFeature}
        onClose={() => setUpgradeFeature(null)}
      />
    </>
  )
}
