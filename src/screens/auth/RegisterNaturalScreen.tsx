import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { authApi } from '@/api/auth'
import { catalogApi } from '@/api/catalog'
import { useAuthStore } from '@/store/auth.store'
import { connectSSE } from '@/services/sse.service'
import { registerPushToken } from '@/services/push.service'
import { DatePickerField } from '@/components/DatePickerField'

export function RegisterNaturalScreen() {
  const navigation = useNavigation()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [docTypes, setDocTypes] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])

  const [form, setForm] = useState({
    emailuser: '',
    password: '',
    namesuser: '',
    surnamesuser: '',
    documenttype: 0,
    documentnumber: '',
    dateofbirth: '',
    cityid: 0,
    contactnumber: '',
    occupation: '',
    referralCodeUsed: '',
    pep: false,
    occupationpep: '',
  })

  useEffect(() => {
    Promise.all([catalogApi.getDocumentTypes(), catalogApi.getCities(1)])
      .then(([dtRes, cityRes]) => {
        setDocTypes(dtRes.data.data ?? [])
        setCities(cityRes.data.data ?? [])
        const first = dtRes.data.data?.[0]
        if (first) setForm((p) => ({ ...p, documenttype: first.idcatalog }))
      })
      .catch(() => {})
  }, [])

  function set(field: keyof typeof form) {
    return (value: any) => setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleRegister() {
    const { emailuser, password, namesuser, surnamesuser, documentnumber, dateofbirth, cityid, contactnumber, documenttype } = form
    if (!emailuser || !password || !namesuser || !surnamesuser || !documentnumber || !dateofbirth || !cityid || !contactnumber) {
      return Alert.alert('Completa todos los campos obligatorios')
    }
    if (!documenttype) {
      return Alert.alert('Selecciona el tipo de documento')
    }
    const normalizedEmail = emailuser.trim().toLowerCase()
    try {
      setLoading(true)
      await authApi.registerUser({ ...form, emailuser: normalizedEmail, usertype: 'natural', countryid: 1 })
      const loginRes = await authApi.loginUser(normalizedEmail, form.password)
      const user = loginRes.data.data
      await setUser(user)
      connectSSE()
      registerPushToken().catch(console.error)
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? 'No se pudo registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro — Persona Natural</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section title="Acceso">
          <Field label="Correo electrónico *" value={form.emailuser} onChange={set('emailuser')} keyboard="email-address" cap="none" />
          <Field label="Contraseña *" value={form.password} onChange={set('password')} secure />
        </Section>

        <Section title="Datos personales">
          <Field label="Nombres *" value={form.namesuser} onChange={set('namesuser')} />
          <Field label="Apellidos *" value={form.surnamesuser} onChange={set('surnamesuser')} />

          <Text style={styles.label}>Tipo de documento *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {docTypes.map((d) => (
                <Chip key={d.idcatalog} label={d.value} active={form.documenttype === d.idcatalog} onPress={() => set('documenttype')(d.idcatalog)} />
              ))}
            </View>
          </ScrollView>

          <Field label="Número de documento *" value={form.documentnumber} onChange={set('documentnumber')} keyboard="numeric" />
          <DatePickerField label="Fecha de nacimiento *" value={form.dateofbirth} onChange={set('dateofbirth')} />
          <Field label="Teléfono de contacto *" value={form.contactnumber} onChange={set('contactnumber')} keyboard="phone-pad" />
          <Field label="Ocupación" value={form.occupation} onChange={set('occupation')} />
        </Section>

        <Section title="Ciudad">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cities.map((c) => (
                <Chip key={c.idcatalog} label={c.value} active={form.cityid === c.idcatalog} onPress={() => set('cityid')(c.idcatalog)} />
              ))}
            </View>
          </ScrollView>
        </Section>

        <Section title="Opcionales">
          <Field label="Código de referido" value={form.referralCodeUsed} onChange={set('referralCodeUsed')} cap="characters" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>¿Eres Persona Expuesta Políticamente (PEP)?</Text>
            <Switch
              value={form.pep}
              onValueChange={set('pep')}
              trackColor={{ true: '#1a3c6e' }}
            />
          </View>
          {form.pep && (
            <Field label="Cargo o función PEP" value={form.occupationpep} onChange={set('occupationpep')} />
          )}
        </Section>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  )
}
const sectionStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  title: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
})

function Field({ label, value, onChange, keyboard, cap, secure, placeholder }: any) {
  const [show, setShow] = useState(false)
  return (
    <>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={secure ? fieldStyles.pwWrap : undefined}>
        <TextInput
          style={[fieldStyles.input, secure && fieldStyles.pwInput]}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize={cap ?? 'words'}
          secureTextEntry={secure && !show}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
        />
        {secure && (
          <TouchableOpacity style={fieldStyles.eyeBtn} onPress={() => setShow(s => !s)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </>
  )
}
const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15, backgroundColor: '#fff', color: '#111827',
  },
  pwWrap: { position: 'relative', marginBottom: 12 },
  pwInput: { marginBottom: 0, paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
})

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1.5, borderColor: active ? '#1a3c6e' : '#d1d5db',
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a3c6e', padding: 20, paddingTop: 52,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  switchLabel: { fontSize: 13, color: '#374151', flex: 1, marginRight: 8 },
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
