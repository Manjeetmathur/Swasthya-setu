import { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'

export default function PatientLayout() {
  const router = useRouter()
  const { userData, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !userData) {
      router.replace('/login')
      return
    }

    if (userData.role !== 'patient') {
      router.replace('/login')
      return
    }
  }, [isAuthenticated, userData, router])

  // Don't render anything if not properly authenticated
  if (!isAuthenticated || !userData || userData.role !== 'patient') {
    return null
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb'
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="call"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          )
        }}
      />

      <Tabs.Screen
        name="medical-assistant"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="hospitals"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="medicine-info"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="symptoms-check"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="health-tips"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="emergency-services"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

