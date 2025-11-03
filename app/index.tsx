import { useEffect } from 'react'
import { View, Text, ActivityIndicator, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const router = useRouter()
  const { isAuthenticated, userData, isLoading } = useAuthStore()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && userData) {
        // Redirect based on role
        if (userData.role === 'patient') {
          router.replace('/patient/home')
        } else if (userData.role === 'doctor') {
          // Check if doctor is verified before redirecting
          if (userData.doctorData && userData.doctorData.isVerified) {
            router.replace('/doctor/schedule')
          } else {
            // If doctor is not verified, redirect to login
            router.replace('/login')
          }
        } else if (userData.role === 'admin') {
          router.replace('/admin')
        } else {
          router.replace('/login')
        }
      } else {
        router.replace('/login')
      }
    }
  }, [isLoading, isAuthenticated, userData, router])

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
      <Image 
        source={require('@/logo.png')} 
        style={{ width: 120, height: 120, marginBottom: 24 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-gray-600 dark:text-gray-400">Loading...</Text>
    </View>
  )
}

