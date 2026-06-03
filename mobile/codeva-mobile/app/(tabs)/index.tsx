import { useRef, useState, useCallback, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, Modal, Pressable, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { useChatStore, Message, Thread, Attachment } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { streamChat, resolveProvider, ChatMessage, streamResearch } from '@/services/ai/engine'
import { runCouncil } from '@/services/ai/council'
import { webSearch, formatSearchContext } from '@/services/ai/webSearch'
import { getMemoryContext, detectMemoryCandidate, saveMemory } from '@/services/memory'
import { supabase } from '@/services/supabase'
import { CodevaMark } from '@/components/ui/CodevaLogo'
import { Icon, IconName } from '@/components/ui/Icon'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Composer } from '@/components/chat/Composer'
import { FollowupSuggestions } from '@/components/chat/FollowupSuggestions'
import { ResearchProgress } from '@/components/chat/ResearchProgress'
import { MODELS, CODEVA_SYSTEM_PROMPT } from '@/constants/config'

export default function ChatHomeScreen() {
  const c = Colors.dark
  const flatListRef = useRef<FlatList>(null)
  const [input, setInput] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [councilMode, setCouncilMode] = useState(false)
  const [webMode, setWebMode] = useState(false)
  const [researchMode, setResearchMode] = useState(false)
  const [councilStatus, setCouncilStatus] = useState<string>('')
  const [lastFollowups, setLastFollowups] = useState<string[]>([])
  const [routingTier, setRoutingTier] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  const {
    threads, activeThreadId, streaming, streamingText,
    addThread, setActiveThread, addMessage, deleteThread,
    setStreaming, setStreamingText, appendStreamingText, renameThread,
  } = useChatStore()
  const { model, setModel, providerKeys } = useSettingsStore()
  const { user } = useAuthStore()
  const [authToken, setAuthToken] = useState<string>('')

  // Keep a fresh auth token for backend API calls
  useEffect(() => {
    const getToken = async () => {
      const { data } = await supabase.auth.getSession()
      setAuthToken(data.session?.access_token || '')
    }
    void getToken()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthToken(session?.access_token || '')
    })
    return () => subscription.unsubscribe()
  }, [])

  // Merged keys: if user is logged in, tell resolveProvider to use the backend.
  // If user also has BYOK keys, those take priority inside resolveProvider.
  const mergedKeys: Record<string, string> = {
    ...(providerKeys as Record<string, string>),
    ...(user ? { __useBackend: 'true', __token: authToken } : {}),
  }

  let thread = threads.find((t) => t.id === activeThreadId)
  if (!thread && threads.length > 0) thread = threads[0]
  const messages = (thread?.messages || []).filter((m) => m.role !== 'system')

  const ensureThread = useCallback((): string => {
    if (thread) return thread.id
    const t: Thread = { id: Date.now().toString(), title: 'New Chat', messages: [], model, createdAt: Date.now(), updatedAt: Date.now() }
    addThread(t)
    return t.id
  }, [thread, model])

  const startNewChat = () => {
    const t: Thread = { id: Date.now().toString(), title: 'New Chat', messages: [], model, createdAt: Date.now(), updatedAt: Date.now() }
    addThread(t)
    setHistoryOpen(false)
  }

  const confirmDelete = (id: string, title: string) => {
    if (Platform.OS === 'web') {
      const yes = window.confirm(`Delete "${title}"? This cannot be undone.`)
      if (yes) deleteThread(id)
    } else {
      Alert.alert('Delete chat?', `"${title}" will be permanently removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteThread(id) },
      ])
    }
  }

  const buildChatMessages = (threadId: string): ChatMessage[] => {
    const msgs = useChatStore.getState().threads.find((t) => t.id === threadId)?.messages || []
    return msgs.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments?.filter((a) => a.type === 'image' && a.base64).map((a) => ({ type: 'image' as const, base64: a.base64, mimeType: a.mimeType })),
    }))
  }

  const getAgentSystem = (threadId: string): string => {
    const msgs = useChatStore.getState().threads.find((t) => t.id === threadId)?.messages || []
    const sys = msgs.find((m) => m.role === 'system')
    return sys?.content || ''
  }

  const noProviderMessage = (threadId: string) => {
    addMessage(threadId, {
      id: (Date.now() + 1).toString(), role: 'assistant',
      content: 'Could not connect to Codeva servers. Please check your internet connection and try again.',
      timestamp: Date.now(),
    })
  }

  const sendMessage = useCallback(async (attachments: Attachment[]) => {
    if ((!input.trim() && attachments.length === 0) || streaming) return
    const text = input.trim()
    setInput('')

    const threadId = ensureThread()
    addMessage(threadId, { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now(), attachments: attachments.length ? attachments : undefined })

    const ct = useChatStore.getState().threads.find((t) => t.id === threadId)
    if (ct && ct.messages.length <= 1) renameThread(threadId, (text || 'Image chat').slice(0, 40))

    // Council Mode path
    if (councilMode) {
      setStreaming(true)
      setCouncilStatus('Council convening…')
      try {
        const chatMessages = buildChatMessages(threadId)
        const result = await runCouncil(chatMessages, mergedKeys, (m, s) => {
          setCouncilStatus(s === 'running' ? `${m} thinking…` : `${m} done`)
        }, CODEVA_SYSTEM_PROMPT)
        addMessage(threadId, {
          id: (Date.now() + 2).toString(), role: 'assistant', content: result.synthesis,
          timestamp: Date.now(), model: 'Council', council: result.individual,
        })
      } catch (e: any) {
        addMessage(threadId, { id: (Date.now() + 2).toString(), role: 'assistant', content: `Something went wrong: ${e.message}`, timestamp: Date.now() })
      }
      setStreaming(false)
      setCouncilStatus('')
      return
    }

    // Research Mode path — multi-agent deep research
    if (researchMode) {
      setStreaming(true)
      setStreamingText('')
      setCouncilStatus('Deploying research agents...')
      abortRef.current = new AbortController()
      const chatMessages = buildChatMessages(threadId)
      try {
        // If Council is also active, run Research+Council combined
        const useCouncilValidation = councilMode
        const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (authToken) headers.Authorization = `Bearer ${authToken}`

        const res = await fetch(`${API_BASE}/completions/research`, {
          method: 'POST',
          signal: abortRef.current.signal,
          headers,
          body: JSON.stringify({
            messages: chatMessages.map(m => ({ role: m.role, content: m.content })),
            withCouncil: useCouncilValidation,
          }),
        })
        if (!res.ok) throw new Error(`Research: ${res.status}`)
        if (!res.body) throw new Error('No response body')

        let full = ''
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') break
            try {
              const j = JSON.parse(data)
              if (j.type === 'token') { full += j.content; appendStreamingText(j.content) }
              else if (j.type === 'revision') { full = j.content; setStreamingText(j.content) }
              else if (j.type === 'agent_done') setCouncilStatus(`${j.name} done`)
              else if (j.type === 'synthesizing') setCouncilStatus('Codic synthesizing...')
              else if (j.type === 'council_validation') {
                if (j.status === 'starting') setCouncilStatus('Council validating...')
                else if (j.status === 'revising') setCouncilStatus('Refining answer...')
              }
            } catch {}
          }
        }
        addMessage(threadId, { id: (Date.now() + 2).toString(), role: 'assistant', content: full || '(no response)', timestamp: Date.now(), model: 'research/multi-agent' })
        setStreaming(false); setStreamingText(''); setCouncilStatus('')
      } catch (e: any) {
        if (!abortRef.current?.signal.aborted) {
          addMessage(threadId, { id: (Date.now() + 2).toString(), role: 'assistant', content: `Research error: ${e.message}`, timestamp: Date.now() })
        }
        setStreaming(false); setStreamingText(''); setCouncilStatus('')
      }
      return
    }

    // Normal path
    const config = resolveProvider(model, mergedKeys)
    if (!config) { noProviderMessage(threadId); return }

    setStreaming(true)
    setStreamingText('')
    abortRef.current = new AbortController()
    const chatMessages = buildChatMessages(threadId)

    let system = CODEVA_SYSTEM_PROMPT

    // Inject cross-chat memory
    const memoryCtx = await getMemoryContext()
    if (memoryCtx) system += memoryCtx

    // Agent-specific system prompt (from Discover)
    const agentSystem = getAgentSystem(threadId)
    if (agentSystem) system = agentSystem + '\n\n' + system

    // Web search: fetch results and inject into context
    if (webMode && text) {
      setCouncilStatus('Searching the web…')
      try {
        const results = await webSearch(text, abortRef.current.signal)
        if (results.length) {
          system += formatSearchContext(results)
        }
      } catch { /* continue without search */ }
      setCouncilStatus('')
    }

    await streamChat(chatMessages, config, {
      onToken: (token) => appendStreamingText(token),
      onDone: (full) => {
        const msgId = (Date.now() + 2).toString()
        addMessage(threadId, { id: msgId, role: 'assistant', content: full || '(no response)', timestamp: Date.now(), model: `${config.provider}/${config.model}`, tier: routingTier as any })
        setStreaming(false); setStreamingText('')
        // Auto-detect user memory candidates
        const memCandidate = detectMemoryCandidate(text)
        if (memCandidate) void saveMemory(memCandidate, 'auto')
      },
      onError: (err) => {
        addMessage(threadId, { id: (Date.now() + 2).toString(), role: 'assistant', content: `Something went wrong: ${err}`, timestamp: Date.now() })
        setStreaming(false); setStreamingText('')
      },
      onRouting: (tier) => { setRoutingTier(tier) },
      onFollowups: (suggestions) => { setLastFollowups(suggestions) },
    }, abortRef.current.signal, system)
  }, [input, streaming, model, mergedKeys, thread, councilMode, webMode, researchMode, authToken, routingTier])

  const regenerate = useCallback(async () => {
    if (!thread || streaming) return
    const msgs = thread.messages
    // Remove last assistant message
    let lastAssistantIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) { if (msgs[i].role === 'assistant') { lastAssistantIdx = i; break } }
    if (lastAssistantIdx === -1) return
    useChatStore.getState().deleteMessage(thread.id, msgs[lastAssistantIdx].id)

    const config = resolveProvider(model, mergedKeys)
    if (!config) return
    setStreaming(true); setStreamingText('')
    abortRef.current = new AbortController()
    const chatMessages = buildChatMessages(thread.id)
    await streamChat(chatMessages, config, {
      onToken: (t) => appendStreamingText(t),
      onDone: (full) => { addMessage(thread!.id, { id: Date.now().toString(), role: 'assistant', content: full, timestamp: Date.now(), model: `${config.provider}/${config.model}` }); setStreaming(false); setStreamingText('') },
      onError: (err) => { addMessage(thread!.id, { id: Date.now().toString(), role: 'assistant', content: `Sorry, something went wrong: ${err}`, timestamp: Date.now() }); setStreaming(false); setStreamingText('') },
    }, abortRef.current.signal, CODEVA_SYSTEM_PROMPT)
  }, [thread, streaming, model, mergedKeys])

  const stopGeneration = () => {
    abortRef.current?.abort()
    if (streamingText && thread) addMessage(thread.id, { id: Date.now().toString(), role: 'assistant', content: streamingText + '\n\n_(stopped)_', timestamp: Date.now() })
    setStreaming(false); setStreamingText('')
  }

  const quickPrompts = [
    { icon: 'idea' as const, text: 'Explain something complex' },
    { icon: 'edit' as const, text: 'Help me write something' },
    { icon: 'code' as const, text: 'Write code for me' },
  ]

  const displayMessages = [...messages]
  if (streaming && streamingText) displayMessages.push({ id: 'streaming', role: 'assistant', content: streamingText, timestamp: Date.now() })

  const currentModel = MODELS.find((m) => m.id === model)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <TouchableOpacity onPress={() => setHistoryOpen(true)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="menu" size={24} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModelOpen(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.text }} numberOfLines={1}>{currentModel?.name || 'Codeva'}</Text>
          <Icon name="chevronDown" size={16} color={c.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/voice')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mic" size={21} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={startNewChat} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="newChat" size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {displayMessages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <CodevaMark size={76} color={c.accent} />
            <Text style={{ fontSize: 24, fontWeight: '700', color: c.text, marginTop: 22 }}>How can I help?</Text>
            <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 8, textAlign: 'center', maxWidth: 290, lineHeight: 20 }}>
              Ask anything, send an image, search the web, or convene the Council of models.
            </Text>
            <View style={{ width: '100%', maxWidth: 380, marginTop: 30, gap: 10 }}>
              {quickPrompts.map((p) => (
                <TouchableOpacity key={p.text} onPress={() => setInput(p.text)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 15 }}>
                  <Icon name={p.icon} size={18} color={c.accent} />
                  <Text style={{ fontSize: 14.5, color: c.text }}>{p.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                onRegenerate={!streaming && item.role === 'assistant' && index === displayMessages.length - 1 ? regenerate : undefined}
              />
            )}
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Thinking / Council status */}
        {streaming && !streamingText && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: councilMode ? c.purple : researchMode ? '#06B6D4' : c.accent }} />
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: councilMode ? c.purple : researchMode ? '#06B6D4' : c.accent, opacity: 0.6 }} />
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: councilMode ? c.purple : researchMode ? '#06B6D4' : c.accent, opacity: 0.3 }} />
            {councilStatus ? <Text style={{ fontSize: 12, color: c.purple, marginLeft: 8 }}>{councilStatus}</Text> : null}
          </View>
        )}

        {/* Follow-up Suggestions */}
        {!streaming && lastFollowups.length > 0 && displayMessages.length > 0 && (
          <FollowupSuggestions suggestions={lastFollowups} onSelect={(text) => { setInput(text); setLastFollowups([]) }} />
        )}

        <Composer
          value={input}
          onChangeText={setInput}
          onSend={sendMessage}
          onStop={stopGeneration}
          streaming={streaming}
          councilMode={councilMode}
          onToggleCouncil={() => { setCouncilMode(!councilMode); if (!councilMode && !researchMode) { setWebMode(false) } }}
          webSearch={webMode}
          onToggleWebSearch={() => { setWebMode(!webMode); if (!webMode) { setCouncilMode(false); setResearchMode(false) } }}
          researchMode={researchMode}
          onToggleResearch={() => { setResearchMode(!researchMode); if (!researchMode) { setWebMode(false) } }}
        />
      </KeyboardAvoidingView>

      {/* History Drawer */}
      <Modal visible={historyOpen} animationType="slide" transparent onRequestClose={() => setHistoryOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setHistoryOpen(false)}>
          <Pressable style={{ width: '82%', height: '100%', backgroundColor: c.surface, borderRightWidth: 1, borderRightColor: c.border }} onPress={(e) => e.stopPropagation()}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CodevaMark size={22} color={c.accent} spin={false} />
                  <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>Chats</Text>
                </View>
                <TouchableOpacity onPress={startNewChat} style={{ backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ New</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={threads}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 12 }}
                ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center', padding: 20 }}>No conversations yet</Text>}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: item.id === activeThreadId ? c.elevated : 'transparent', marginBottom: 4 }}>
                    <TouchableOpacity
                      onPress={() => { setActiveThread(item.id); setHistoryOpen(false) }}
                      style={{ flex: 1, padding: 14 }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: c.text }} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ fontSize: 11, color: c.textDim, marginTop: 3 }}>{item.messages.filter((m) => m.role !== 'system').length} messages</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item.id, item.title)}
                      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Icon name="trash" size={16} color={c.textDim} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              <TouchableOpacity onPress={() => { setHistoryOpen(false); router.push('/(tabs)/settings') }} style={{ padding: 16, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Icon name="settings" size={20} color={c.textMuted} />
                <Text style={{ fontSize: 15, color: c.text }}>Settings</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Model Picker */}
      <Modal visible={modelOpen} animationType="slide" transparent onRequestClose={() => setModelOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setModelOpen(false)}>
          <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '70%' }} onPress={(e) => e.stopPropagation()}>
            <View style={{ alignItems: 'center', paddingTop: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, padding: 16 }}>Select Model</Text>
            <FlatList
              data={MODELS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setModel(item.id); setModelOpen(false) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={item.icon as IconName} size={20} color={c.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11.5, color: c.textDim, marginTop: 2 }}>{item.provider}</Text>
                  </View>
                  {item.badge && <Text style={{ fontSize: 10, color: c.success, backgroundColor: 'rgba(74,222,128,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{item.badge}</Text>}
                  {model === item.id && <Icon name="check" size={18} color={c.accent} strokeWidth={2.5} />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
