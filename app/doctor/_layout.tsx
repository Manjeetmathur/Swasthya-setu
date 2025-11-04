import { useEffect } from 'react'
import { Tabs, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Alert } from 'react-native'

export default function DoctorLayout() {
  const router = useRouter()
  const { userData, isAuthenticated, logout } = useAuthStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    if (!isAuthenticated || !userData) {
      router.replace('/login')
      return
    }

    if (userData.role !== 'doctor') {
      router.replace('/login')
      return
    }

    // Check if doctor is verified
    if (!userData.doctorData || !userData.doctorData.isVerified) {
      logout()
      Alert.alert(
        'Access Denied',
        'Your doctor account is not verified. Please wait for admin approval.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      )
      return
    }
  }, [isAuthenticated, userData, router, logout])

  // Don't render anything if not properly authenticated and verified
  if (!isAuthenticated || !userData || userData.role !== 'doctor' || !userData.doctorData?.isVerified) {
    return null
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#6b7280',
        tabBarStyle: {
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#374151' : '#e5e7eb'
        }
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  )
}

