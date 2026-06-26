import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/user'
import { disconnectSSE } from '@/services/sse.service'
import type { UserStackParams } from '@/navigation/UserNavigator'

type Nav = StackNavigationProp<UserStackParams>

export function ProfileScreen() {
  const navigation = useNavigation<Nav>()
  const { user, clearUser } = useAuthStore()

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await userApi.clearPushToken().catch(() => {})
          await authApi.logout().catch(() => {})
          disconnectSSE()
          await clearUser()
        },
      },
    ])
  }

  const items = [
    { label: 'Editar datos', icon: 'person-outline', screen: 'EditProfile' },
    { label: 'Cambiar contraseña', icon: 'lock-closed-outline', screen: 'ChangePassword' },
    { label: 'Documentos de identidad', icon: 'document-outline', screen: 'Documents' },
  ] as const

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.[0]}{user?.surname?.[0]}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name} {user?.surname}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.menu}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen as any)}
          >
            <Ionicons name={item.icon} size={20} color="#1a3c6e" />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#1a3c6e', alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  avatar: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#ffffff30', justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 18, fontWeight: '600', color: '#fff' },
  email: { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  menu: { margin: 16, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12,
  },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: '500' },
})
