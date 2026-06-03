import { create } from 'zustand'

interface User {
  id: string
  email: string
  name?: string
  plan: 'free' | 'pro' | 'max'
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),
  signOut: () => set({ user: null, token: null }),
}))
