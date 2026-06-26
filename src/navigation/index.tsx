import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuthStore } from '@/store/auth.store'
import { AuthNavigator } from './AuthNavigator'
import { UserNavigator } from './UserNavigator'

const Root = createStackNavigator()

export function AppNavigator() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return null

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Root.Screen name="User" component={UserNavigator} />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  )
}
