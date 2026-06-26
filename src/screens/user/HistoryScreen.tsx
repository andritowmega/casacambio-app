import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { exchangesApi } from '@/api/exchanges'
import { onExchangeUpdated } from '@/services/sse.service'
import type { UserStackParams } from '@/navigation/UserNavigator'

type Nav = StackNavigationProp<UserStackParams>

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Pendiente', color: '#f59e0b' },
  2: { label: 'En proceso', color: '#3b82f6' },
  3: { label: 'Completado', color: '#10b981' },
  4: { label: 'Cancelado', color: '#ef4444' },
}

export function HistoryScreen() {
  const navigation = useNavigation<Nav>()
  const [exchanges, setExchanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const res = await exchangesApi.getMyHistory()
      setExchanges(res.data.data ?? [])
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, []))

  useEffect(() => {
    return onExchangeUpdated(({ idexchange, statusexchange }) => {
      setExchanges((prev) =>
        prev.map((ex) =>
          ex.idexchange === idexchange
            ? { ...ex, statusexchange: String(statusexchange) }
            : ex
        )
      )
    })
  }, [])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a3c6e" /></View>
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis operaciones</Text>
      <FlatList
        data={exchanges}
        keyExtractor={(item) => String(item.idexchange)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Aún no tienes operaciones</Text>
        }
        renderItem={({ item }) => {
          const status = STATUS_MAP[Number(item.statusexchange)] ?? STATUS_MAP[1]
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ExchangeDetail', { id: item.idexchange })}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardType}>
                  {item.exchangetype === 1 ? '🇺🇸 USD → PEN 🇵🇪' : '🇵🇪 PEN → USD 🇺🇸'}
                </Text>
                <Text style={styles.cardDate}>
                  {new Date(item.tsdepositdate).toLocaleDateString('es-PE')}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardAmount}>
                  {Number(item.amountsent).toFixed(2)}
                </Text>
                <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a3c6e', padding: 20, paddingTop: 56 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 48 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', elevation: 1,
  },
  cardLeft: { flex: 1 },
  cardType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: '#1a3c6e' },
  badge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
})
