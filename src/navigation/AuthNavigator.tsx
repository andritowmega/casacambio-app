import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { LoginScreen } from '@/screens/auth/LoginScreen'
import { RegisterTypeScreen } from '@/screens/auth/RegisterTypeScreen'
import { RegisterNaturalScreen } from '@/screens/auth/RegisterNaturalScreen'
import { RegisterJuridicaScreen } from '@/screens/auth/RegisterJuridicaScreen'
import { RecoveryScreen } from '@/screens/auth/RecoveryScreen'

export type AuthStackParams = {
  Login: undefined
  RegisterType: undefined
  RegisterNatural: undefined
  RegisterJuridica: undefined
  Recovery: undefined
}

const Stack = createStackNavigator<AuthStackParams>()

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterType" component={RegisterTypeScreen} />
      <Stack.Screen name="RegisterNatural" component={RegisterNaturalScreen} />
      <Stack.Screen name="RegisterJuridica" component={RegisterJuridicaScreen} />
      <Stack.Screen name="Recovery" component={RecoveryScreen} />
    </Stack.Navigator>
  )
}
