import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { authApi } from '@/api/auth'

type Step = 'email' | 'token' | 'password'

export function RecoveryScreen() {
  const navigation = useNavigation()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmail() {
    if (!email) return
    try {
      setLoading(true)
      await authApi.recovery(email.trim().toLowerCase())
      Alert.alert('Revisa tu correo', 'Te enviamos un código de recuperación')
      setStep('token')
    } catch (e: any) {
      Alert.alert('Error', e.msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleToken() {
    if (!token) return
    try {
      setLoading(true)
      await authApi.recoveryVerify(token.trim())
      setStep('password')
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? 'Token inválido o expirado')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!newPassword) return
    try {
      setLoading(true)
      await authApi.recoveryReset(token.trim(), newPassword)
      Alert.alert('¡Listo!', 'Tu contraseña fue actualizada')
      navigation.goBack()
    } catch (e: any) {
      Alert.alert('Error', e.msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Recuperar contraseña</Text>

      {step === 'email' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TouchableOpacity style={styles.button} onPress={handleEmail} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar código</Text>}
          </TouchableOpacity>
        </>
      )}

      {step === 'token' && (
        <>
          <Text style={styles.hint}>Ingresa el código que recibiste en tu correo</Text>
          <TextInput
            style={styles.input}
            placeholder="Token de recuperación"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={handleToken} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar</Text>}
          </TouchableOpacity>
        </>
      )}

      {step === 'password' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Actualizar contraseña</Text>}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Volver</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a3c6e', textAlign: 'center', marginBottom: 24 },
  hint: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15,
  },
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: '#1a3c6e', textAlign: 'center', marginTop: 16, fontSize: 14 },
})
