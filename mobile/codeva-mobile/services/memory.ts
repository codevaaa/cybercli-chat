import AsyncStorage from '@react-native-async-storage/async-storage'

const MEMORY_KEY = 'codeva_user_memory_v1'

/**
 * Cross-chat Memory System.
 * Stores user preferences/facts that persist across ALL conversations.
 * When user says "I'm a React developer" or "My name is X", it gets saved here
 * and injected into every future conversation's system prompt.
 */

export interface MemoryEntry {
  id: string
  content: string
  createdAt: number
  source: 'auto' | 'manual' // auto = AI detected, manual = user added
}

let memoryCache: MemoryEntry[] | null = null

export async function loadMemories(): Promise<MemoryEntry[]> {
  if (memoryCache) return memoryCache
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY)
    memoryCache = raw ? JSON.parse(raw) : []
    return memoryCache!
  } catch {
    return []
  }
}

export async function saveMemory(content: string, source: 'auto' | 'manual' = 'manual'): Promise<void> {
  const memories = await loadMemories()
  // Don't add duplicates
  if (memories.some(m => m.content.toLowerCase() === content.toLowerCase())) return
  memories.push({ id: Date.now().toString(), content, createdAt: Date.now(), source })
  // Max 30 memories
  if (memories.length > 30) memories.shift()
  memoryCache = memories
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(memories))
}

export async function deleteMemory(id: string): Promise<void> {
  const memories = await loadMemories()
  memoryCache = memories.filter(m => m.id !== id)
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(memoryCache))
}

export async function clearAllMemories(): Promise<void> {
  memoryCache = []
  await AsyncStorage.removeItem(MEMORY_KEY)
}

/**
 * Build the memory context string to inject into the system prompt.
 */
export async function getMemoryContext(): Promise<string> {
  const memories = await loadMemories()
  if (!memories.length) return ''
  return '\n\n[USER MEMORY — Facts Codeva remembers about this user]\n' +
    memories.map(m => `• ${m.content}`).join('\n') +
    '\n\nUse these facts naturally when relevant. Never list them back unless asked.'
}

/**
 * Auto-detect memory-worthy statements from user messages.
 * Returns content to remember, or null if nothing worth saving.
 */
export function detectMemoryCandidate(text: string): string | null {
  const t = text.toLowerCase()
  const patterns = [
    /(?:i am|i'm|i work as|my job is|my role is)\s+(?:a |an )?(.{3,50})/i,
    /(?:my name is|call me|i'm called)\s+(.{2,30})/i,
    /(?:i (?:use|prefer|like|work with))\s+(.{3,40})/i,
    /(?:i live in|i'm from|i'm based in)\s+(.{3,30})/i,
    /(?:i speak|my language is)\s+(.{3,20})/i,
    /(?:always|never|prefer to)\s+(.{5,50})(?:\s+(?:when|for|in))/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[0].trim()
  }
  return null
}
