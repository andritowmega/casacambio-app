import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { userApi } from '@/api/user'
import { catalogApi } from '@/api/catalog'

type TransferType = 'D' | 'I'
const CURRENCIES = [{ value: 2, label: 'PEN' }, { value: 1, label: 'USD' }]

function parseCurrency(ct: any): number {
  if (ct === 1 || ct === '1') return 1
  if (ct === 2 || ct === '2') return 2
  if (ct === 'USD') return 1
  return 2
}

export function EditAccountScreen({ route }: any) {
  const navigation = useNavigation()
  const { id } = route.params as { id: number }
  const [banks, setBanks] = useState<any[]>([])
  const [interbanks, setInterbanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [transferType, setTransferType] = useState<TransferType | null>(null)
  const [accountnameuser, setAccountnameuser] = useState('')
  const [accountnumberuser, setAccountnumberuser] = useState('')
  const [currencytype, setCurrencytype] = useState(2)
  const [selectedBank, setSelectedBank] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [bankRes, ibRes, accRes] = await Promise.all([
          catalogApi.getBanks(),
          catalogApi.getInterbanks(),
          userApi.getAccount(id),
        ])
        setBanks(bankRes.data.data ?? [])
        setInterbanks(ibRes.data.data ?? [])
        const acc = accRes.data.data
        if (acc) {
          setAccountnameuser(acc.accountnameuser ?? '')
          setAccountnumberuser(acc.accountnumberuser ?? '')
          // setCurrencytype handled below with parseCurrency
          setSelectedBank(acc.idassociatedbankuser ?? null)
          setCurrencytype(parseCurrency(acc.currencytype))
          const t = acc.bankaccounttype === 'D' ? 'D' : acc.bankaccounttype === 'I' ? 'I' : null
          setTransferType(t)
        }
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [id])

  function selectType(type: TransferType) {
    setTransferType(type)
    setSelectedBank(null)
  }

  async function handleSave() {
    if (!accountnameuser.trim() || !accountnumberuser.trim() || !selectedBank) {
      return Alert.alert('Completa todos los campos')
    }
    try {
      setSaving(true)
      await userApi.updateAccount(id, {
        accountnameuser: accountnameuser.trim(),
        accountnumberuser: accountnumberuser.trim(),
        currencytype,
        idassociatedbankuser: selectedBank,
        bankaccounttype: transferType,
      })
      Alert.alert('¡Listo!', 'Cuenta actualizada', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? 'No se pudo actualizar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a3c6e" /></View>
  }

  const bankList = transferType === 'D' ? banks : interbanks

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (transferType === null ? navigation.goBack() : setTransferType(null))}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {!transferType ? 'Editar cuenta' : transferType === 'D' ? 'Transferencia directa' : 'Transferencia interbancaria'}
        </Text>
      </View>

      {!transferType ? (
        <View style={styles.body}>
          <Text style={styles.hint}>Selecciona el tipo de transferencia de tu banco</Text>

          <TouchableOpacity style={styles.typeCard} onPress={() => selectType('D')}>
            <Text style={styles.typeTitle}>Transferencia directa</Text>
            <Text style={styles.typeSub}>
              Tu banco está entre los bancos de la casa de cambio. Se acredita de forma inmediata.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.typeCard} onPress={() => selectType('I')}>
            <Text style={styles.typeTitle}>Transferencia interbancaria</Text>
            <Text style={styles.typeSub}>
              Tu banco es distinto al de la casa de cambio. Se usa código de cuenta interbancario (CCI).
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Label text="Moneda" />
          <Row>
            {CURRENCIES.map((c) => (
              <Chip key={c.value} label={c.label} active={currencytype === c.value} onPress={() => setCurrencytype(c.value)} />
            ))}
          </Row>

          <Label text="Nombre del titular" />
          <TextInput style={styles.input} value={accountnameuser} onChangeText={setAccountnameuser} />

          <Label text="Banco" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {bankList.map((b) => (
              <Chip
                key={b.idcatalog}
                label={b.value}
                active={selectedBank === b.idcatalog}
                onPress={() => setSelectedBank(b.idcatalog)}
              />
            ))}
          </ScrollView>

          <Label text={transferType === 'I' ? 'Número de cuenta (CCI)' : 'Número de cuenta'} />
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={transferType === 'I' ? 'CCI (20 dígitos)' : 'Número de cuenta'}
            value={accountnumberuser}
            onChangeText={setAccountnumberuser}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

function Label({ text }: { text: string }) {
  return <Text style={labelStyle}>{text}</Text>
}
const labelStyle: object = { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 }

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>{children}</View>
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1.5,
        borderColor: active ? '#1a3c6e' : '#d1d5db',
        backgroundColor: active ? '#eff6ff' : '#fff',
      }}
    >
      <Text style={{ fontSize: 13, color: active ? '#1a3c6e' : '#6b7280', fontWeight: active ? '600' : '400' }}>
        {label}
      </Text>
    </TouchableOpacity>
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
  body: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  typeCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  typeTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  typeSub: { fontSize: 13, color: '#6b7280', lineHeight: 19 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15, backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
