import React, { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppNavigator } from '@/navigation'
import { useAuthStore } from '@/store/auth.store'
import { connectSSE } from '@/services/sse.service'
import { addResponseListener, initLocalNotifications } from '@/services/push.service'

export default function App() {
  const { loadFromStorage, user } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
    initLocalNotifications()
  }, [])

  useEffect(() => {
    if (user) connectSSE()
  }, [user])

  useEffect(() => {
    const sub = addResponseListener((response) => {
      const data = response.notification.request.content.data as any
      if (data?.exchangeId) {
        // navegación manejada desde el navigator cuando la app está abierta
      }
    })
    return () => sub.remove()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  )
}
