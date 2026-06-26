import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { exchangesApi } from '@/api/exchanges'
import { onExchangeUpdated } from '@/services/sse.service'

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: 'Pendiente', color: '#f59e0b' },
  2: { label: 'En proceso', color: '#3b82f6' },
  3: { label: 'Completado', color: '#10b981' },
  4: { label: 'Cancelado', color: '#ef4444' },
}

export function ExchangeDetailScreen({ route }: any) {
  const navigation = useNavigation()
  const { id } = route.params as { id: number }
  const [exchange, setExchange] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await exchangesApi.getMyHistory()
      const found = (res.data.data as any[]).find((e) => e.idexchange === id)
      setExchange(found ?? null)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    return onExchangeUpdated(({ idexchange, statusexchange, operationcomment }) => {
      if (idexchange === id) {
        setExchange((prev: any) => prev
          ? { ...prev, statusexchange: String(statusexchange), operationcomment }
          : prev
        )
      }
    })
  }, [id])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a3c6e" /></View>
  }

  if (!exchange) {
    return (
      <View style={styles.container}>
        <Header onBack={() => navigation.goBack()} id={id} />
        <View style={styles.center}><Text style={styles.empty}>No se encontró la operación</Text></View>
      </View>
    )
  }

  const status = STATUS_MAP[Number(exchange.statusexchange)] ?? STATUS_MAP[1]
  const isUsdToPen = exchange.exchangetype === 1

  return (
    <View style={styles.container}>
      <Header onBack={() => navigation.goBack()} id={id} />
      <ScrollView contentContainerStyle={styles.body}>

        <View style={[styles.statusBanner, { backgroundColor: status.color + '15' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Tipo de operación" value={isUsdToPen ? 'USD → PEN' : 'PEN → USD'} />
          <Row label="Monto enviado" value={`${isUsdToPen ? 'USD' : 'PEN'} ${Number(exchange.amountsent).toFixed(2)}`} />
          <Row label="Monto a recibir" value={`${isUsdToPen ? 'PEN' : 'USD'} ${Number(exchange.amountreceived).toFixed(2)}`} />
          <Row label="Tipo de cambio" value={isUsdToPen
            ? `1 USD = S/ ${Number(exchange.buying).toFixed(3)}`
            : `S/ ${Number(exchange.selling).toFixed(3)} = 1 USD`}
          />
          <Row label="Fecha" value={new Date(exchange.tsdepositdate).toLocaleString('es-PE')} />
          <Row label="N° de operación" value={exchange.operationid ?? '—'} />
        </View>

        {exchange.accountnameuser && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta de destino</Text>
            <Row label="Titular" value={exchange.accountnameuser} />
            <Row label="Número" value={exchange.accountnumberuser} />
            <Row label="Moneda" value={exchange.usercurrencytype} />
          </View>
        )}

        {exchange.accountnamecompany && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta BostonDolar</Text>
            <Row label="Cuenta" value={exchange.accountnamecompany} />
            <Row label="Número" value={exchange.accountnumbercompany} />
          </View>
        )}

        {exchange.operationcomment ? (
          <View style={styles.commentCard}>
            <Text style={styles.commentTitle}>Comentario del operador</Text>
            <Text style={styles.commentText}>{exchange.operationcomment}</Text>
          </View>
        ) : null}

        {exchange.couponidentifier ? (
          <View style={styles.card}>
            <Row label="Cupón aplicado" value={exchange.couponidentifier} />
            <Row label="Descuento" value={`+${exchange.couponpoints} pts`} />
          </View>
        ) : null}

      </ScrollView>
    </View>
  )
}

function Header({ onBack, id }: { onBack: () => void; id: number }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Operación #{id}</Text>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a3c6e', padding: 20, paddingTop: 52,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  body: { padding: 16, paddingBottom: 40 },
  statusBanner: {
    borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12,
  },
  statusText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  commentCard: {
    backgroundColor: '#fef9c3', borderRadius: 10, padding: 14, marginBottom: 12,
  },
  commentTitle: { fontSize: 13, fontWeight: '600', color: '#92400e', marginBottom: 4 },
  commentText: { fontSize: 14, color: '#78350f' },
  empty: { color: '#9ca3af' },
})
