import * as SecureStore from 'expo-secure-store'
import { api } from './client'

export const userApi = {
  getMe: () =>
    api.get('/users/me'),

  updateMe: (data: Record<string, unknown>) =>
    api.put('/users/me', data),

  getProfiles: () =>
    api.get('/users/me/profiles'),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { oldpassword: oldPassword, newpassword: newPassword }),

  getDocuments: () =>
    api.get('/users/me/documents'),

  uploadDocuments: async (formData: FormData) => {
    const token = await SecureStore.getItemAsync('tokenuser')
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me/documents`, {
      method: 'POST',
      headers: { 'x-access-tokenuser': token ?? '' },
      body: formData,
    })
    const json = await res.json()
    if (!res.ok) throw { status: res.status, msg: json.msg ?? 'Error de conexión' }
    return { data: json }
  },

  savePushToken: (token: string) =>
    api.post('/users/me/push-token', { token }),

  clearPushToken: () =>
    api.delete('/users/me/push-token'),

  getAccounts: (currency = '0') =>
    api.get(`/users/me/accounts?currency=${currency}`),

  getAccount: (id: number) =>
    api.get(`/users/me/accounts/${id}`),

  createAccount: (data: Record<string, unknown>) =>
    api.post('/users/me/accounts', data),

  updateAccount: (id: number, data: Record<string, unknown>) =>
    api.patch(`/users/me/accounts/${id}`, data),

  setAccountStatus: (id: number, active: boolean) =>
    api.patch(`/users/me/accounts/${id}`, { active }),
}
