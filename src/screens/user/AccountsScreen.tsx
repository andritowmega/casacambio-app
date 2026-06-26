import React, { useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'
import { userApi } from '@/api/user'
import type { UserStackParams } from '@/navigation/UserNavigator'

type Nav = StackNavigationProp<UserStackParams>

export function AccountsScreen() {
  const navigation = useNavigation<Nav>()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const res = await userApi.getAccounts('0')
      setAccounts(res.data.data ?? [])
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  async function toggleStatus(id: number, current: boolean) {
    try {
      await userApi.setAccountStatus(id, !current)
      setAccounts((prev) =>
        prev.map((a) => a.idbankaccountuser === id ? { ...a, visibility: !current } : a)
      )
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado')
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a3c6e" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis cuentas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddAccount')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => String(item.idbankaccountuser)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="card-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No tienes cuentas registradas</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddAccount')}>
              <Text style={styles.emptyBtnText}>Agregar cuenta</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.visibility && styles.cardInactive]}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardCurrency}>
                {item.currencytype === 1 || item.currencytype === '1' ? 'USD' : 'PEN'}
              </Text>
              <Text style={styles.cardName}>{item.accountnameuser}</Text>
              <Text style={styles.cardNumber}>{item.accountnumberuser}</Text>
              {item.bankname && <Text style={styles.cardBank}>{item.bankname}</Text>}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('EditAccount', { id: item.idbankaccountuser })}
              >
                <Ionicons name="pencil-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => toggleStatus(item.idbankaccountuser, item.visibility)}
              >
                <Ionicons
                  name={item.visibility ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={item.visibility ? '#10b981' : '#9ca3af'}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a3c6e', padding: 20, paddingTop: 56,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addBtn: {
    backgroundColor: '#ffffff30', borderRadius: 8, padding: 6,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1,
  },
  cardInactive: { opacity: 0.5 },
  cardInfo: { flex: 1 },
  cardCurrency: {
    fontSize: 11, fontWeight: '700', color: '#1a3c6e',
    backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4,
  },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardNumber: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardBank: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  emptyBtn: { backgroundColor: '#00b4d8', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },
})
