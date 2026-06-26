import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { userApi } from '@/api/user'

export function ChangePasswordScreen() {
  const navigation = useNavigation()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Completa todos los campos')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Las contraseñas no coinciden')
      return
    }
    try {
      setLoading(true)
      await userApi.changePassword(oldPassword, newPassword)
      Alert.alert('¡Listo!', 'Contraseña actualizada', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? e.message ?? 'No se pudo actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cambiar contraseña</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Contraseña actual</Text>
        <View style={styles.pwWrap}>
          <TextInput
            style={[styles.input, styles.pwInput]}
            placeholder="••••••••"
            secureTextEntry={!showOld}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowOld(s => !s)}>
            <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nueva contraseña</Text>
        <View style={styles.pwWrap}>
          <TextInput
            style={[styles.input, styles.pwInput]}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry={!showNew}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(s => !s)}>
            <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmar nueva contraseña</Text>
        <View style={styles.pwWrap}>
          <TextInput
            style={[styles.input, styles.pwInput]}
            placeholder="••••••••"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(s => !s)}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1a3c6e', padding: 20, paddingTop: 52,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 15, backgroundColor: '#fff',
  },
  pwWrap: { position: 'relative', marginBottom: 12 },
  pwInput: { marginBottom: 0, paddingRight: 44 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
