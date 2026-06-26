import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { userApi } from '@/api/user'

const isExpoGo = Constants.appOwnership === 'expo'

// Handler needed for notifications to show while app is in foreground.
// Set unconditionally — local notifications work in Expo Go too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function initLocalNotifications(): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing !== 'granted') {
    await Notifications.requestPermissionsAsync()
  }
}

export async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // show immediately
    })
  } catch {}
}

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice || isExpoGo) return

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return

  const { data: token } = await Notifications.getExpoPushTokenAsync()
  await userApi.savePushToken(token)
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler)
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler)
}
