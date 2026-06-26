import { AppState } from 'react-native'
import { exchangesApi } from '@/api/exchanges'
import { useExchangeStore } from '@/store/exchange.store'
import { scheduleLocalNotification } from './push.service'

const POLL_INTERVAL_MS = 10_000

let _intervalId: ReturnType<typeof setInterval> | null = null
let _exchangeId: number | null = null
let _appStateSub: { remove: () => void } | null = null

function pausePolling() {
  if (_intervalId !== null) {
    clearInterval(_intervalId)
    _intervalId = null
  }
}

function resumePolling() {
  if (_exchangeId === null) return
  poll()
  if (_intervalId === null) {
    _intervalId = setInterval(poll, POLL_INTERVAL_MS)
  }
}

function ensureAppStateListener() {
  if (_appStateSub) return
  _appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      // Android throttles/kills timers in background — clear proactively
      pausePolling()
    } else if (state === 'active' && _exchangeId !== null) {
      // App came back to foreground — restart polling immediately
      resumePolling()
    }
  })
}

export function startExchangePolling(exchangeId: number) {
  stopExchangePolling()
  _exchangeId = exchangeId
  ensureAppStateListener()
  resumePolling()
}

export function stopExchangePolling() {
  pausePolling()
  _exchangeId = null
}

export function isExchangePolling(): boolean {
  return _exchangeId !== null
}

async function poll() {
  if (_exchangeId === null) return
  try {
    const res = await exchangesApi.getExchange(_exchangeId)
    const { idexchange, statusexchange, operationcomment } = res.data.data

    const current = useExchangeStore.getState().lastExchange
    if (current && Number(current.idexchange) === Number(idexchange)) {
      useExchangeStore.getState().setLastExchange({
        ...current,
        statusexchange,
        operationcomment: operationcomment ?? null,
      })
    }

    const status = Number(statusexchange)
    if (status === 3 || status === 4) {
      stopExchangePolling()
      const title = status === 3 ? '✅ Operación completada' : '❌ Operación cancelada'
      const body = status === 3
        ? 'Tu cambio fue procesado. El dinero está en camino a tu cuenta.'
        : `Tu operación #${idexchange} fue cancelada.${operationcomment ? ` ${operationcomment}` : ''}`
      await scheduleLocalNotification(title, body)
    }
  } catch {
    // silently ignore — network errors, token expiry, etc.
  }
}
