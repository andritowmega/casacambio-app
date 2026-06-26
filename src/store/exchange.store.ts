import { create } from 'zustand'

interface ExchangeState {
  lastExchange: any | null
  setLastExchange: (ex: any | null) => void
  exchangeStartTime: number | null
  setExchangeStartTime: (t: number | null) => void
}

export const useExchangeStore = create<ExchangeState>((set) => ({
  lastExchange: null,
  setLastExchange: (lastExchange) => set({ lastExchange }),
  exchangeStartTime: null,
  setExchangeStartTime: (exchangeStartTime) => set({ exchangeStartTime }),
}))
