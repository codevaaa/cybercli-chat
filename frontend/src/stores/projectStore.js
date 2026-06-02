import { create } from 'zustand'
import api from '../lib/api'

export const useProjectStore = create((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get('/projects')
      set({ projects: data, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.error || err.message, isLoading: false })
    }
  },

  createProject: async (projectData) => {
    try {
      const { data } = await api.post('/projects', projectData)
      set((state) => ({ projects: [data, ...state.projects] }))
      return data
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message)
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const { data } = await api.put(`/projects/${id}`, projectData)
      set((state) => ({
        projects: state.projects.map((p) => (p._id === id ? data : p))
      }))
      return data
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message)
    }
  },

  deleteProject: async (id) => {
    try {
      await api.delete(`/projects/${id}`)
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id)
      }))
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message)
    }
  }
}))
