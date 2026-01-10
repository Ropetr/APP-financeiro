import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
  familyId: string
  plan: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.login(email, password)
          api.setToken(data.accessToken)
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isLoading: false,
          })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.register(email, password, name)
          api.setToken(data.accessToken)
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isLoading: false,
          })
        } catch (error: any) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      logout: async () => {
        const { refreshToken } = get()
        if (refreshToken) {
          try {
            await api.logout(refreshToken)
          } catch (error) {
            console.error('Logout error:', error)
          }
        }
        api.setToken(null)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        })
      },

      checkAuth: async () => {
        const { accessToken } = get()
        if (!accessToken) {
          set({ user: null })
          return
        }

        try {
          api.setToken(accessToken)
          const user = await api.me()
          set({ user })
        } catch (error) {
          // Token inválido, fazer logout
          get().logout()
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
