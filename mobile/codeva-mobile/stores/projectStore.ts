import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface Project {
  id: string
  name: string
  instructions: string
  createdAt: number
  updatedAt: number
}

const PROJECTS_KEY = 'codeva_projects_v1'

interface ProjectState {
  projects: Project[]
  hydrated: boolean
  hydrate: () => Promise<void>
  addProject: (name: string, instructions: string) => void
  updateProject: (id: string, name: string, instructions: string) => void
  deleteProject: (id: string) => void
}

function persist(projects: Project[]) {
  void AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)).catch(() => {})
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(PROJECTS_KEY)
      set({ projects: raw ? JSON.parse(raw) : [], hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },

  addProject: (name, instructions) => {
    const p: Project = { id: Date.now().toString(), name, instructions, createdAt: Date.now(), updatedAt: Date.now() }
    set((s) => {
      const next = [p, ...s.projects]
      persist(next)
      return { projects: next }
    })
  },

  updateProject: (id, name, instructions) => {
    set((s) => {
      const next = s.projects.map((p) => (p.id === id ? { ...p, name, instructions, updatedAt: Date.now() } : p))
      persist(next)
      return { projects: next }
    })
  },

  deleteProject: (id) => {
    set((s) => {
      const next = s.projects.filter((p) => p.id !== id)
      persist(next)
      return { projects: next }
    })
  },
}))
