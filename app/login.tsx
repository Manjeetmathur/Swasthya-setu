import { useState, useEffect } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore, UserRole } from '@/stores/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Login() {
  const router = useRouter()
  const { role } = useLocalSearchParams<{ role: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setUserData, userData, isAuthenticated, logout } = useAuthStore()

  const getRoleInfo = () => {
    switch (role) {
      case 'patient':
        return {
          title: 'Patient Login',
          subtitle: 'Access your health records and book appointments',
          icon: 'person' as const,
          color: '#2563eb'
        }
      case 'doctor':
        return {
          title: 'Doctor Login',
          subtitle: 'Manage your practice and consult patients',
          icon: 'medical' as const,
          color: '#16a34a'
        }
      case 'hospital':
        return {
          title: 'Hospital Login',
          subtitle: 'Manage hospital operations and staff',
          icon: 'business' as const,
          color: '#9333ea'
        }
      default:
        return {
          title: 'Welcome Back',
          subtitle: 'Sign in to continue to Swasthya Setu',
          icon: 'log-in' as const,
          color: '#2563eb'
        }
    }
  }

  const roleInfo = getRoleInfo()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && userData) {
      if (userData.role === 'patient') {
        router.replace('/patient/home')
      } else if (userData.role === 'doctor') {
        // Check if doctor is verified before redirecting
        if (userData.doctorData && userData.doctorData.isVerified) {
          router.replace('/doctor/schedule')
        } else {
          // If doctor is not verified, logout and show message
          logout()
          Alert.alert(
            'Account Pending Verification',
            'Your doctor account is pending admin verification. Please wait for approval.',
            [{ text: 'OK' }]
          )
          // Don't redirect, stay on login page
        }
      } else if (userData.role === 'admin') {
        router.replace('/admin')
      }
    }
  }, [isAuthenticated, userData, router])

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)
      
      // Fetch user data from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
        let role: UserRole = 'patient'
        let doctorData = null
        
        if (userDoc.exists()) {
          const userDataFromFirestore = userDoc.data()
          role = (userDataFromFirestore.role as UserRole) || 'patient'
          doctorData = userDataFromFirestore.doctorData || null
        }

        const userDataToSet = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || userDoc.data()?.displayName || null,
          role,
          photoURL: userCredential.user.photoURL || null,
          doctorData
        }

        // Check if doctor is verified before allowing login
        if (role === 'doctor') {
          if (!doctorData) {
            Alert.alert(
              'Incomplete Registration',
              'Your doctor profile is incomplete. Please contact support.',
              [{ text: 'OK' }]
            )
            setLoading(false)
            return
          }
          
          if (!doctorData.isVerified) {
            Alert.alert(
              'Account Pending Verification',
              'Your doctor account is pending admin verification. Please wait for approval before you can access the system.',
              [{ text: 'OK' }]
            )
            setLoading(false)
            return
          }
        }

        setUserData(userDataToSet)

        // Navigate based on role
        if (role === 'patient') {
          router.replace('/patient/home')
        } else if (role === 'doctor') {
          router.replace('/doctor/schedule')
        } else if (role === 'admin') {
          router.replace('/admin')
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error)
        // Default to patient role if fetch fails
        setUserData({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || null,
          role: 'patient',
          photoURL: userCredential.user.photoURL || null
        })
        router.replace('/patient/home')
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    Alert.alert('Google Login', 'Google login will be implemented with expo-auth-session')
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 self-start"
          >
            <Ionicons name="arrow-back" size={24} color={roleInfo.color} />
          </TouchableOpacity>

          <View className="flex-1 justify-center">
            {/* Role-specific header */}
            <View className="items-center mb-8">
              <View className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                <Ionicons name={roleInfo.icon} size={32} color={roleInfo.color} />
              </View>
              <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {roleInfo.title}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center">
                {roleInfo.subtitle}
              </Text>
            </View>

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Sign In"
              onPress={handleEmailLogin}
              loading={loading}
              className="mb-4"
            />

            <Button
              title="Sign in with Google"
              onPress={handleGoogleLogin}
              variant="outline"
              className="mb-4"
            />

            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{' '}
              </Text>
              <Text
                className="text-blue-600 font-semibold"
                onPress={() => router.push(`/signup${role ? `?role=${role}` : ''}`)}
              >
                Sign Up
              </Text>
            </View>

            <View className="flex-row justify-center mt-6">
              <Text
                className="text-gray-400 text-xs"
                onPress={() => router.push('/admin-setup')}
              >
                Admin Setup
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

