import { api } from './client'

export const systemApi = {
  getExchangeRate: () =>
    api.get('/system/exchange-rate'),

  getConfig: () =>
    api.get('/system/config'),

  getCompanyAccounts: (currency: string) =>
    api.get(`/system/accounts/${currency}`),
}
