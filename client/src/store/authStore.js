import { create } from 'zustand'
import api from '../lib/api'

const useAuthStore = create((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    const token = localStorage.getItem('laptrack_token')
    const userStr = localStorage.getItem('laptrack_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true, isLoading: false })
      } catch {
        localStorage.removeItem('laptrack_token')
        localStorage.removeItem('laptrack_user')
        set({ token: null, user: null, isAuthenticated: false, isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, user } = response.data
    localStorage.setItem('laptrack_token', token)
    localStorage.setItem('laptrack_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
    return user
  },

  logout: () => {
    localStorage.removeItem('laptrack_token')
    localStorage.removeItem('laptrack_user')
    set({ token: null, user: null, isAuthenticated: false })
  },
}))

export default useAuthStore
