import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { Colors } from '@/constants/colors'
import { Icon, IconName } from '@/components/ui/Icon'
import { useChatStore, Thread } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface Agent { id: string; name: string; icon: IconName; desc: string; category: string; prompt: string }

const AGENTS: Agent[] = [
  { id: '1', name: 'Code Review', icon: 'code', desc: 'Analyze code for bugs, security & improvements', category: 'Dev', prompt: 'You are an expert code reviewer. I will paste code and you will review it for bugs, security issues, performance, and style.' },
  { id: '2', name: 'Writing Assistant', icon: 'edit', desc: 'Emails, articles, and creative writing', category: 'Write', prompt: 'You are a professional writing assistant. Help me write clearly and persuasively.' },
  { id: '3', name: 'Data Analyst', icon: 'database', desc: 'Analyze data, build tables, find insights', category: 'Analysis', prompt: 'You are a data analyst. Help me analyze data and present findings in clear tables.' },
  { id: '4', name: 'Translator', icon: 'globe', desc: 'Translate between 50+ languages', category: 'Language', prompt: 'You are an expert translator. Translate accurately while preserving tone and meaning.' },
  { id: '5', name: 'Research Agent', icon: 'search', desc: 'Deep research with web search + citations', category: 'Research', prompt: 'You are a research assistant. Research topics thoroughly and cite sources.' },
  { id: '6', name: 'Council', icon: 'brain', desc: '3+ models debate for the best answer', category: 'Advanced', prompt: 'Convene the Council.' },
  { id: '7', name: 'Summarizer', icon: 'book', desc: 'Summarize long documents & articles', category: 'Productivity', prompt: 'You are a summarization expert. Provide clear, concise summaries with key points.' },
  { id: '8', name: 'Brainstormer', icon: 'sparkles', desc: 'Generate creative ideas & solutions', category: 'Creative', prompt: 'You are a creative brainstorming partner. Generate diverse, original ideas.' },
]

const CATEGORIES = ['All', 'Dev', 'Write', 'Analysis', 'Research', 'Advanced', 'Creative']

export default function DiscoverScreen() {
  const c = Colors.dark
  const [cat, setCat] = useState('All')
  const { addThread } = useChatStore()
  const { model } = useSettingsStore()

  const startWithAgent = (agent: Agent) => {
    const t: Thread = {
      id: Date.now().toString(),
      title: agent.name,
      messages: [{ id: 'sys', role: 'system', content: agent.prompt, timestamp: Date.now() }],
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    addThread(t)
    router.push('/(tabs)')
  }

  const filtered = cat === 'All' ? AGENTS : AGENTS.filter((a) => a.category === cat)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: c.text }}>Discover</Text>
        <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 4, marginBottom: 18 }}>Specialized agents & assistants</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          {CATEGORIES.map((ct) => (
            <TouchableOpacity key={ct} onPress={() => setCat(ct)} style={{ paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, backgroundColor: cat === ct ? c.accent : c.elevated, borderWidth: 1, borderColor: cat === ct ? c.accent : c.border, marginRight: 8 }}>
              <Text style={{ fontSize: 13, color: cat === ct ? '#fff' : c.text, fontWeight: '500' }}>{ct}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ gap: 12 }}>
          {filtered.map((agent) => (
            <TouchableOpacity key={agent.id} onPress={() => startWithAgent(agent)} style={{ backgroundColor: c.elevated, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }} activeOpacity={0.7}>
              <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={agent.icon} size={22} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{agent.name}</Text>
                <Text style={{ fontSize: 12.5, color: c.textMuted, marginTop: 2 }}>{agent.desc}</Text>
              </View>
              <Icon name="chevronRight" size={18} color={c.textDim} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
