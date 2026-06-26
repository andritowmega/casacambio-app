import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { AuthStackParams } from '@/navigation/AuthNavigator'

type Nav = StackNavigationProp<AuthStackParams, 'RegisterType'>

export function RegisterTypeScreen() {
  const navigation = useNavigation<Nav>()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Cómo quieres registrarte?</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RegisterNatural')}
      >
        <Text style={styles.cardTitle}>Persona Natural</Text>
        <Text style={styles.cardSub}>DNI, carnet de extranjería u otro documento personal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RegisterJuridica')}
      >
        <Text style={styles.cardTitle}>Persona Jurídica</Text>
        <Text style={styles.cardSub}>Empresa o negocio con RUC</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Volver al login</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a3c6e', textAlign: 'center', marginBottom: 32 },
  card: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    padding: 20, marginBottom: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#1a3c6e', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6b7280' },
  link: { color: '#1a3c6e', textAlign: 'center', marginTop: 16, fontSize: 14 },
})
