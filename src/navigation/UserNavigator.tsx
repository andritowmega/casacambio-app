import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'

import { HomeScreen } from '@/screens/user/HomeScreen'
import { NewExchangeScreen } from '@/screens/user/NewExchangeScreen'
import { HistoryScreen } from '@/screens/user/HistoryScreen'
import { ExchangeDetailScreen } from '@/screens/user/ExchangeDetailScreen'
import { AccountsScreen } from '@/screens/user/AccountsScreen'
import { AddAccountScreen } from '@/screens/user/AddAccountScreen'
import { EditAccountScreen } from '@/screens/user/EditAccountScreen'
import { ProfileScreen } from '@/screens/user/ProfileScreen'
import { EditProfileScreen } from '@/screens/user/EditProfileScreen'
import { ChangePasswordScreen } from '@/screens/user/ChangePasswordScreen'
import { DocumentsScreen } from '@/screens/user/DocumentsScreen'

export type UserStackParams = {
  Home: undefined
  NewExchange: undefined
  History: undefined
  ExchangeDetail: { id: number }
  Accounts: undefined
  AddAccount: undefined
  EditAccount: { id: number }
  Profile: undefined
  EditProfile: undefined
  ChangePassword: undefined
  Documents: undefined
}

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator<UserStackParams>()

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1a3c6e',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Inicio: 'home-outline',
            Operaciones: 'swap-horizontal-outline',
            Cuentas: 'card-outline',
            Perfil: 'person-outline',
          }
          return <Ionicons name={icons[route.name]} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Operaciones" component={HistoryScreen} />
      <Tab.Screen name="Cuentas" component={AccountsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export function UserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeTabs} />
      <Stack.Screen name="NewExchange" component={NewExchangeScreen} />
      <Stack.Screen name="ExchangeDetail" component={ExchangeDetailScreen} />
      <Stack.Screen name="AddAccount" component={AddAccountScreen} />
      <Stack.Screen name="EditAccount" component={EditAccountScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
    </Stack.Navigator>
  )
}
