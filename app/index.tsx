import { useEffect, useRef } from 'react'
import { View, Text, ActivityIndicator, Image } from 'react-native'
import { useRouter, useRootNavigationState } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()
  const { isAuthenticated, userData, isLoading } = useAuthStore()
  const navigationAttemptedRef = useRef(false)

  useEffect(() => {
    // Ensure we only attempt navigation once
    if (navigationAttemptedRef.current) return

    // Check if root navigation is ready
    if (!rootNavigationState?.key) {
      return
    }

    // Check if auth is still loading
    if (isLoading) {
      return
    }

    // Mark navigation as attempted to prevent duplicate calls
    navigationAttemptedRef.current = true

    // Perform navigation based on auth state with a small delay to ensure Stack is mounted
    const timer = requestAnimationFrame(() => {
      try {
        if (isAuthenticated && userData) {
          // Redirect based on role
          if (userData.role === 'patient') {
            router.replace('/patient/home')
          } else if (userData.role === 'doctor') {
            // Check if doctor is verified before redirecting
            if (userData.doctorData && userData.doctorData.isVerified) {
              router.replace('/doctor/schedule')
            } else {
              router.replace('/login')
            }
          } else if (userData.role === 'admin') {
            router.replace('/admin')
          } else {
            router.replace('/login')
          }
        } else {
          router.replace('/role-selection')
        }
      } catch (error) {
        console.error('Navigation error:', error)
        navigationAttemptedRef.current = false
      }
    })

    return () => cancelAnimationFrame(timer)
  }, [isLoading, rootNavigationState?.key])

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

