import React, { useCallback, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { systemApi } from '@/api/system'
import { exchangesApi } from '@/api/exchanges'
import { useAuthStore } from '@/store/auth.store'
import { useExchangeStore } from '@/store/exchange.store'
import type { UserStackParams } from '@/navigation/UserNavigator'

type Nav = StackNavigationProp<UserStackParams>

export function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuthStore()
  const { lastExchange, setLastExchange } = useExchangeStore()

  const [rate, setRate] = useState<{ buying: number; selling: number } | null>(null)
  const [config, setConfig] = useState<{ minimun: number; maximun: number; closed: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const [rateRes, configRes, historyRes] = await Promise.all([
        systemApi.getExchangeRate(),
        systemApi.getConfig(),
        exchangesApi.getMyHistory(),
      ])
      setRate(rateRes.data.data)
      setConfig(configRes.data.data)
      const history = historyRes.data.data as any[]
      const latest = history?.[0] ?? null

      // Only overwrite store if API has a newer/different exchange,
      // or if there's no store value yet.
      const stored = useExchangeStore.getState().lastExchange
      if (!stored || (latest && Number(latest.idexchange) >= Number(stored.idexchange))) {
        setLastExchange(latest)
      }
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Reload every time screen comes into focus
  useFocusEffect(useCallback(() => {
    setLoading(true)
    load()
  }, []))

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a3c6e" /></View>
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.name} 👋</Text>
      </View>

      <View style={styles.rateCard}>
        <Text style={styles.rateTitle}>Tipo de cambio</Text>
        <View style={styles.rateRow}>
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Compra</Text>
            <Text style={styles.rateValue}>S/ {rate?.buying?.toFixed(3)}</Text>
          </View>
          <View style={styles.rateDivider} />
          <View style={styles.rateItem}>
            <Text style={styles.rateLabel}>Venta</Text>
            <Text style={styles.rateValue}>S/ {rate?.selling?.toFixed(3)}</Text>
          </View>
        </View>
      </View>

      {config?.closed ? (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>⚠️ {config.message || 'Servicio fuera de horario'}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('NewExchange')}
        >
          <Text style={styles.ctaText}>Hacer un cambio</Text>
        </TouchableOpacity>
      )}

      {lastExchange && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Última operación</Text>
          <TouchableOpacity
            style={styles.exchangeCard}
            onPress={() => navigation.navigate('ExchangeDetail', { id: lastExchange.idexchange })}
          >
            <View>
              <Text style={styles.exchangeAmount}>
                {lastExchange.exchangetype === 1 ? '🇺🇸' : '🇵🇪'}{' '}
                {lastExchange.exchangetype === 1 ? 'USD' : 'PEN'} {Number(lastExchange.amountsent).toFixed(2)}
              </Text>
              <Text style={styles.exchangeId}>#{lastExchange.idexchange}</Text>
            </View>
            <StatusBadge status={Number(lastExchange.statusexchange)} />
          </TouchableOpacity>
        </View>
      )}

      {config && (
        <View style={styles.limitsCard}>
          <Text style={styles.limitsText}>
            Mínimo: S/ {config.minimun} · Máximo: S/ {config.maximun}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

function StatusBadge({ status }: { status: number }) {
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Pendiente', color: '#f59e0b' },
    2: { label: 'En proceso', color: '#3b82f6' },
    3: { label: 'Completado', color: '#10b981' },
    4: { label: 'Cancelado', color: '#ef4444' },
  }
  const s = map[status] ?? map[1]
  return (
    <View style={[styles.badge, { backgroundColor: s.color + '20' }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 56, backgroundColor: '#1a3c6e' },
  greeting: { fontSize: 20, fontWeight: '600', color: '#fff' },
  rateCard: {
    margin: 16, backgroundColor: '#fff', borderRadius: 12,
    padding: 20, elevation: 2,
  },
  rateTitle: { fontSize: 13, color: '#6b7280', marginBottom: 12, fontWeight: '500' },
  rateRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  rateItem: { alignItems: 'center' },
  rateLabel: { fontSize: 13, color: '#6b7280' },
  rateValue: { fontSize: 26, fontWeight: 'bold', color: '#1a3c6e', marginTop: 2 },
  rateDivider: { width: 1, height: 40, backgroundColor: '#e5e7eb' },
  closedBanner: {
    margin: 16, backgroundColor: '#fef3c7', borderRadius: 8, padding: 14,
  },
  closedText: { color: '#92400e', fontSize: 14, textAlign: 'center' },
  ctaButton: {
    margin: 16, backgroundColor: '#00b4d8', borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500', marginBottom: 8 },
  exchangeCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1,
  },
  exchangeAmount: { fontSize: 15, fontWeight: '600', color: '#111827' },
  exchangeId: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  limitsCard: {
    margin: 16, backgroundColor: '#eff6ff', borderRadius: 8, padding: 10,
  },
  limitsText: { color: '#1e40af', fontSize: 13, textAlign: 'center' },
})
