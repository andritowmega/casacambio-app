import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { userApi } from '@/api/user'
import { catalogApi } from '@/api/catalog'

export function EditProfileScreen() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cities, setCities] = useState<any[]>([])

  const [form, setForm] = useState({
    emailuser: '',
    namesuser: '',
    surnamesuser: '',
    documentnumber: '',
    contactnumber: '',
    occupation: '',
    cityid: 0,
  })
  const [referralcode, setReferralcode] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [userRes, citiesRes] = await Promise.all([
          userApi.getMe(),
          catalogApi.getCities(1),
        ])
        const u = userRes.data.data
        setForm({
          emailuser: u.emailuser ?? '',
          namesuser: u.namesuser ?? '',
          surnamesuser: u.surnamesuser ?? '',
          documentnumber: u.documentnumber ?? '',
          contactnumber: u.contactnumber ?? '',
          occupation: u.occupation ?? '',
          cityid: u.cityid ?? 0,
        })
        setReferralcode(u.referralcode ?? '')
        setCities(citiesRes.data.data ?? [])
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  function set(field: keyof typeof form) {
    return (value: string) => setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    try {
      setSaving(true)
      await userApi.updateMe({ ...form, cityid: Number(form.cityid) })
      Alert.alert('¡Listo!', 'Datos actualizados', [
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

  const selectedCity = cities.find((c) => c.idcatalog === form.cityid)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar datos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Field label="Correo electrónico" value={form.emailuser} onChangeText={set('emailuser')} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Nombres" value={form.namesuser} onChangeText={set('namesuser')} />
        <Field label="Apellidos" value={form.surnamesuser} onChangeText={set('surnamesuser')} />
        <Field label="N° de documento" value={form.documentnumber} onChangeText={set('documentnumber')} keyboardType="numeric" />
        <Field label="Teléfono de contacto" value={form.contactnumber} onChangeText={set('contactnumber')} keyboardType="phone-pad" />
        <Field label="Ocupación" value={form.occupation} onChangeText={set('occupation')} />

        <Text style={styles.label}>Ciudad</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {cities.map((c) => (
              <TouchableOpacity
                key={c.idcatalog}
                onPress={() => setForm((prev) => ({ ...prev, cityid: c.idcatalog }))}
                style={[
                  styles.chip,
                  form.cityid === c.idcatalog && styles.chipActive,
                ]}
              >
                <Text style={[styles.chipText, form.cityid === c.idcatalog && styles.chipTextActive]}>
                  {c.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.referralBox}>
          <Text style={styles.referralLabel}>Tu código de referido</Text>
          <Text style={styles.referralCode}>{referralcode}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, value, onChangeText, keyboardType, autoCapitalize }: any) {
  return (
    <>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </>
  )
}

const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15, backgroundColor: '#fff',
  },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a3c6e', padding: 20, paddingTop: 52,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#1a3c6e', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#1a3c6e', fontWeight: '600' },
  referralBox: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 14,
    alignItems: 'center', marginBottom: 16,
  },
  referralLabel: { fontSize: 12, color: '#6b7280' },
  referralCode: { fontSize: 20, fontWeight: 'bold', color: '#1a3c6e', letterSpacing: 2, marginTop: 4 },
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
