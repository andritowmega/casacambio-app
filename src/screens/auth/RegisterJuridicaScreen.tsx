import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { authApi } from '@/api/auth'
import { catalogApi } from '@/api/catalog'
import { useAuthStore } from '@/store/auth.store'
import { connectSSE } from '@/services/sse.service'
import { registerPushToken } from '@/services/push.service'
import { DatePickerField } from '@/components/DatePickerField'

export function RegisterJuridicaScreen() {
  const navigation = useNavigation()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<any[]>([])

  const [form, setForm] = useState({
    emailuser: '',
    password: '',
    namesuser: '',
    surnamesuser: '',
    documentnumber: '',
    dateofbirth: '',
    cityid: 0,
    contactnumber: '',
    occupation: '',
    referralCodeUsed: '',
    businessname: '',
    ruc: '',
  })

  useEffect(() => {
    catalogApi.getCities(1)
      .then((res) => setCities(res.data.data ?? []))
      .catch(() => {})
  }, [])

  function setField(field: keyof typeof form, value: any) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleRegister() {
    const { emailuser, password, namesuser, surnamesuser, documentnumber, dateofbirth, cityid, contactnumber, businessname, ruc } = form
    if (!emailuser || !password || !namesuser || !surnamesuser || !documentnumber || !dateofbirth || !cityid || !contactnumber || !businessname || !ruc) {
      return Alert.alert('Completa todos los campos obligatorios')
    }
    const normalizedEmail = emailuser.trim().toLowerCase()
    try {
      setLoading(true)
      await authApi.registerUser({
        ...form,
        emailuser: normalizedEmail,
        usertype: 'juridica',
        countryid: 1,
        documenttype: 4,
      })
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
        <Text style={styles.headerTitle}>Registro — Persona Jurídica</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section title="Acceso">
          <Field label="Correo electrónico *" value={form.emailuser} onChange={(v: string) => setField('emailuser', v)} keyboard="email-address" cap="none" />
          <Field label="Contraseña *" value={form.password} onChange={(v: string) => setField('password', v)} secure />
        </Section>

        <Section title="Datos del representante">
          <Field label="Nombres *" value={form.namesuser} onChange={(v: string) => setField('namesuser', v)} />
          <Field label="Apellidos *" value={form.surnamesuser} onChange={(v: string) => setField('surnamesuser', v)} />
          <Field label="N° de documento (DNI) *" value={form.documentnumber} onChange={(v: string) => setField('documentnumber', v)} keyboard="numeric" />
          <DatePickerField label="Fecha de nacimiento *" value={form.dateofbirth} onChange={(v) => setField('dateofbirth', v)} />
          <Field label="Teléfono de contacto *" value={form.contactnumber} onChange={(v: string) => setField('contactnumber', v)} keyboard="phone-pad" />
          <Field label="Cargo / Ocupación" value={form.occupation} onChange={(v: string) => setField('occupation', v)} />
        </Section>

        <Section title="Datos de la empresa">
          <Field label="Razón social *" value={form.businessname} onChange={(v: string) => setField('businessname', v)} />
          <Field label="RUC *" value={form.ruc} onChange={(v: string) => setField('ruc', v)} keyboard="numeric" />
        </Section>

        <Section title="Ciudad">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cities.map((c) => (
                <Chip
                  key={c.idcatalog}
                  label={c.value}
                  active={form.cityid === c.idcatalog}
                  onPress={() => setField('cityid', c.idcatalog)}
                />
              ))}
            </View>
          </ScrollView>
        </Section>

        <Section title="Opcional">
          <Field label="Código de referido" value={form.referralCodeUsed} onChange={(v: string) => setField('referralCodeUsed', v)} cap="characters" />
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
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function Field({ label, value, onChange, keyboard, cap, secure, placeholder }: any) {
  const [show, setShow] = useState(false)
  return (
    <>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
      <View style={secure ? { position: 'relative', marginBottom: 12 } : undefined}>
        <TextInput
          style={{
            borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
            padding: 12, marginBottom: secure ? 0 : 12, fontSize: 15,
            backgroundColor: '#fff', paddingRight: secure ? 44 : 12,
            color: '#111827',
          }}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize={cap ?? 'words'}
          secureTextEntry={secure && !show}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
        />
        {secure && (
          <TouchableOpacity
            style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}
            onPress={() => setShow(s => !s)}
          >
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1.5, borderColor: active ? '#1a3c6e' : '#d1d5db',
        backgroundColor: active ? '#eff6ff' : '#fff', marginBottom: 8,
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
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
