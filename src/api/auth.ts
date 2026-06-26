import { api } from './client'

export const authApi = {
  loginUser: (email: string, password: string) =>
    api.post('/auth/user/login', { email, password }),

  registerUser: (data: Record<string, unknown>) =>
    api.post('/auth/user/register', data),

  recovery: (email: string) =>
    api.post('/auth/user/recovery', { email }),

  recoveryVerify: (token: string) =>
    api.post('/auth/user/recovery/verify', { token }),

  recoveryReset: (token: string, newPassword: string) =>
    api.post('/auth/user/recovery/reset', { token, newPassword }),

  logout: () =>
    api.post('/auth/user/logout'),
}
