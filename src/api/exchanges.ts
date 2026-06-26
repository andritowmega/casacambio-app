import { api } from './client'

export const exchangesApi = {
  create: (data: Record<string, unknown>) =>
    api.post('/exchanges', data),

  getMyHistory: () =>
    api.get('/exchanges/me'),

  verifyCoupon: (couponCode: string) =>
    api.get(`/system/coupons/code/${couponCode}`),

  markCouponUsed: (userId: number, couponId: number) =>
    api.post('/exchanges/coupons/used', { userId, couponId }),

  getExchange: (id: number) =>
    api.get(`/exchanges/me/${id}`),
}
