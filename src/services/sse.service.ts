import EventSource from 'react-native-sse'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!

type ExchangeUpdatedPayload = {
  idexchange: number
  statusexchange: number
  operationcomment: string | null
}

type SSEHandler = (payload: ExchangeUpdatedPayload) => void

type CustomEvents = 'exchange-updated'

let es: EventSource<CustomEvents> | null = null
const handlers = new Set<SSEHandler>()

export function onExchangeUpdated(fn: SSEHandler): () => void {
  handlers.add(fn)
  return () => handlers.delete(fn)
}

export async function connectSSE(): Promise<void> {
  if (es) return
  const token = await SecureStore.getItemAsync('tokenuser')
  if (!token) return

  es = new EventSource<CustomEvents>(`${BASE_URL}/sse/user`, {
    headers: { 'x-access-tokenuser': token },
  })

  es.addEventListener('exchange-updated', (event) => {
    if (!event.data) return
    try {
      const payload = JSON.parse(event.data) as ExchangeUpdatedPayload
      handlers.forEach((fn) => fn(payload))
    } catch {}
  })

  es.addEventListener('error', () => {
    disconnectSSE()
    setTimeout(connectSSE, 5000)
  })
}

export function disconnectSSE(): void {
  es?.close()
  es = null
}
