import { create } from 'zustand'
import api from '../lib/api'

export const useStyleStore = create((set, get) => ({
  styles: [],
  isLoading: false,
  error: null,

  fetchStyles: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get('/styles')
      set({ styles: data, isLoading: false })
    } catch (err) {
      set({ error: err.response?.data?.error || err.message, isLoading: false })
    }
  },

  createStyle: async (styleData) => {
    try {
      const { data } = await api.post('/styles', styleData)
      set((state) => ({ styles: [data, ...state.styles] }))
      return data
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message)
    }
  },

  updateStyle: async (id, styleData) => {
    try {
      const { data } = await api.put(`/styles/${id}`, styleData)
      set((state) => ({
        styles: state.styles.map((s) => (s._id === id ? data : s))
      }))
      return data
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message)
    }
  },

  deleteStyle: async (id) => {
    try {
      await api.delete(`/styles/${id}`)
      set((state) => ({
        styles: state.styles.filter((s) => s._id !== id)
      }))
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message)
    }
  }
}))
