import { api } from './client'

export const catalogApi = {
  getDocumentTypes: () =>
    api.get('/catalog/document-types'),

  getBanks: () =>
    api.get('/catalog/banks'),

  getInterbanks: () =>
    api.get('/catalog/interbanks'),

  getCities: (countryId = 1) =>
    api.get(`/catalog/cities/${countryId}`),
}
