import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface AuthUser {
  iduser: number
  email: string
  idprofile: number
  profileAlias: string
  name: string
  surname: string
  token: string
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser) => Promise<void>
  clearUser: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setUser: async (user) => {
    await SecureStore.setItemAsync('tokenuser', user.token)
    await SecureStore.setItemAsync('authuser', JSON.stringify(user))
    set({ user })
  },

  clearUser: async () => {
    await SecureStore.deleteItemAsync('tokenuser')
    await SecureStore.deleteItemAsync('authuser')
    set({ user: null })
  },

  loadFromStorage: async () => {
    try {
      const raw = await SecureStore.getItemAsync('authuser')
      const user = raw ? (JSON.parse(raw) as AuthUser) : null
      set({ user, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },
}))
