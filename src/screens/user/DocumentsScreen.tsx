import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import Constants from 'expo-constants'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { userApi } from '@/api/user'

export function DocumentsScreen() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [frontUri, setFrontUri] = useState<string | null>(null)
  const [backUri, setBackUri] = useState<string | null>(null)
  const [existingFront, setExistingFront] = useState<string | null>(null)
  const [existingBack, setExistingBack] = useState<string | null>(null)

  useEffect(() => {
    userApi.getDocuments()
      .then((res) => {
        const d = res.data.data?.documentphotos
        if (d?.front) setExistingFront(d.front)
        if (d?.back) setExistingBack(d.back)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isExpoGo = Constants.appOwnership === 'expo'

  async function launchGallery(side: 'front' | 'back') {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      if (asset.mimeType === 'image/gif') {
        Alert.alert('Formato no permitido', 'Solo se admiten imágenes JPG, PNG, WEBP o HEIC. No se aceptan GIFs.')
        return
      }
      if (side === 'front') setFrontUri(asset.uri)
      else setBackUri(asset.uri)
    }
  }

  async function launchCamera(side: 'front' | 'back') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Activa el permiso de cámara en la configuración.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
    if (!result.canceled) {
      if (side === 'front') setFrontUri(result.assets[0].uri)
      else setBackUri(result.assets[0].uri)
    }
  }

  async function pickImage(side: 'front' | 'back') {
    if (isExpoGo) {
      launchGallery(side)
      return
    }
    Alert.alert('Seleccionar imagen', '', [
      { text: 'Cámara', onPress: () => launchCamera(side) },
      { text: 'Galería', onPress: () => launchGallery(side) },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function handleUpload() {
    if (!frontUri && !backUri) {
      return Alert.alert('Selecciona al menos una imagen')
    }
    try {
      setSaving(true)
      const formData = new FormData()
      if (frontUri) {
        formData.append('photo1', { uri: frontUri, name: 'photo1.jpg', type: 'image/jpeg' } as any)
      }
      if (backUri) {
        formData.append('photo2', { uri: backUri, name: 'photo2.jpg', type: 'image/jpeg' } as any)
      }
      await userApi.uploadDocuments(formData)
      Alert.alert('¡Listo!', 'Documentos subidos correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (e: any) {
      Alert.alert('Error', e.msg ?? 'No se pudo subir los documentos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a3c6e" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documentos de identidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.hint}>
          Sube una foto clara del frente y dorso de tu documento de identidad.
        </Text>
        <Text style={styles.formatNote}>
          Solo se admiten imágenes JPG, PNG, WEBP o HEIC. No se aceptan GIFs.
        </Text>

        <DocSlot
          label="Frente del documento"
          uri={frontUri}
          existing={existingFront}
          onPick={() => pickImage('front')}
        />
        <DocSlot
          label="Dorso del documento"
          uri={backUri}
          existing={existingBack}
          onPick={() => pickImage('back')}
        />

        <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Subir documentos</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

function DocSlot({ label, uri, existing, onPick }: {
  label: string
  uri: string | null
  existing: string | null
  onPick: () => void
}) {
  return (
    <View style={slotStyles.container}>
      <Text style={slotStyles.label}>{label}</Text>
      <TouchableOpacity style={slotStyles.slot} onPress={onPick}>
        {uri ? (
          <Image source={{ uri }} style={slotStyles.image} resizeMode="cover" />
        ) : existing ? (
          <View style={slotStyles.existingBox}>
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
            <Text style={slotStyles.existingText}>Documento subido</Text>
            <Text style={slotStyles.tapText}>Toca para reemplazar</Text>
          </View>
        ) : (
          <View style={slotStyles.placeholder}>
            <Ionicons name="camera-outline" size={36} color="#d1d5db" />
            <Text style={slotStyles.placeholderText}>Toca para seleccionar</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const slotStyles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  slot: {
    height: 160, borderRadius: 10, overflow: 'hidden',
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#f9fafb' },
  placeholderText: { fontSize: 13, color: '#9ca3af' },
  existingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4' },
  existingText: { fontSize: 14, color: '#10b981', fontWeight: '600' },
  tapText: { fontSize: 12, color: '#9ca3af' },
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
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 8, lineHeight: 20 },
  formatNote: { fontSize: 12, color: '#9ca3af', marginBottom: 20, lineHeight: 18 },
  button: {
    backgroundColor: '#00b4d8', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
