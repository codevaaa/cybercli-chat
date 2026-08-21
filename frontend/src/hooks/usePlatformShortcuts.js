/**
 * usePlatformShortcuts — Global keyboard shortcuts for the Agent Platform.
 *
 * Shortcuts:
 *   Ctrl+K        → Open conversation picker
 *   Ctrl+I        → Focus input
 *   Ctrl+Shift+O  → New session
 *   Ctrl+B        → Toggle sidebar
 *   Ctrl+/        → Toggle model selector
 *   Ctrl+,        → Open settings
 *   Ctrl+U        → Scheduled tasks
 *   Alt+↑         → Previous conversation
 *   Alt+↓         → Next conversation
 *   Escape        → Close any open modal/picker
 */
import { useEffect, useCallback } from 'react'

export function usePlatformShortcuts({
  onNewSession,
  onFocusInput,
  onToggleSidebar,
  onToggleModelSelector,
  onOpenSettings,
  onOpenConversationPicker,
  onPrevConversation,
  onNextConversation,
  onEscape,
} = {}) {

  const handleKeyDown = useCallback((e) => {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey
    const alt = e.altKey
    const key = e.key.toLowerCase()

    // Don't capture shortcuts when typing in inputs (unless it's our registered ones)
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)

    // Ctrl+K — Conversation picker
    if (ctrl && key === 'k') {
      e.preventDefault()
      onOpenConversationPicker?.()
      return
    }

    // Ctrl+I — Focus input
    if (ctrl && key === 'i' && !shift) {
      e.preventDefault()
      onFocusInput?.()
      return
    }

    // Ctrl+Shift+O — New session
    if (ctrl && shift && key === 'o') {
      e.preventDefault()
      onNewSession?.()
      return
    }

    // Ctrl+B — Toggle sidebar
    if (ctrl && key === 'b' && !shift) {
      e.preventDefault()
      onToggleSidebar?.()
      return
    }

    // Ctrl+/ — Toggle model selector
    if (ctrl && key === '/') {
      e.preventDefault()
      onToggleModelSelector?.()
      return
    }

    // Ctrl+, — Open settings
    if (ctrl && key === ',') {
      e.preventDefault()
      onOpenSettings?.()
      return
    }

    // Alt+↑ — Previous conversation
    if (alt && e.key === 'ArrowUp') {
      e.preventDefault()
      onPrevConversation?.()
      return
    }

    // Alt+↓ — Next conversation
    if (alt && e.key === 'ArrowDown') {
      e.preventDefault()
      onNextConversation?.()
      return
    }

    // Escape — Close modals
    if (key === 'escape') {
      onEscape?.()
      return
    }
  }, [onNewSession, onFocusInput, onToggleSidebar, onToggleModelSelector, onOpenSettings, onOpenConversationPicker, onPrevConversation, onNextConversation, onEscape])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
