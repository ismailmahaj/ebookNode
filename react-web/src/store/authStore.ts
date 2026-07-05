import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'

export interface User {
  id: number
  name: string
  email: string
  is_admin?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<unknown>
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) => Promise<unknown>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await authApi.login(email, password)
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          })
          localStorage.setItem('token', res.token)
          return res
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },
      register: async (data) => {
        set({ isLoading: true })
        try {
          const res = await authApi.register(data)
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          })
          localStorage.setItem('token', res.token)
          return res
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },
      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // ignore
        }
        set({ user: null, token: null, isAuthenticated: false })
      },
      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null })
          return
        }
        try {
          const user = await authApi.me()
          set({ user: user.user ?? user, token, isAuthenticated: true })
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
          localStorage.removeItem('token')
        }
      },
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
)
