import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '@/store/auth.store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('tokenuser')
  if (token) config.headers['x-access-tokenuser'] = token
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg ?? 'Error de conexión'
    if (status === 403 || status === 401) {
      useAuthStore.getState().clearUser()
    }
    return Promise.reject({ status, msg })
  }
)
