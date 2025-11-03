import { useState, useEffect } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useAuthStore, UserRole } from '@/stores/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LocationService } from '@/lib/locationService'

export default function Login() {
  const router = useRouter()
  const { role } = useLocalSearchParams<{ role: string }>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLocationPermission, setShowLocationPermission] = useState(false)
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
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
      } else if (userData.role === 'hospital') {
        router.replace('/hospital')
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
      
      // Fetch user data from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
        let role: UserRole = 'patient'
        let doctorData = null
        let hospitalData = null
        
        if (userDoc.exists()) {
          const userDataFromFirestore = userDoc.data()
          role = (userDataFromFirestore.role as UserRole) || 'patient'
          doctorData = userDataFromFirestore.doctorData || null
          hospitalData = userDataFromFirestore.hospitalData || null
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
            // Sign out the user since they can't access the system
            await signOut(auth)
            Alert.alert(
              'Account Pending Verification',
              'Your doctor account is pending admin verification. Please wait for approval before you can access the system.',
              [{ text: 'OK' }]
            )
            setLoading(false)
            return
          }
        }

        // Check if hospital is verified before allowing login
        if (role === 'hospital') {
          if (!hospitalData) {
            Alert.alert(
              'Incomplete Registration',
              'Your hospital profile is incomplete. Please contact support.',
              [{ text: 'OK' }]
            )
            setLoading(false)
            return
          }
          
          if (!hospitalData.isVerified) {
            // Sign out the user since they can't access the system
            await signOut(auth)
            Alert.alert(
              'Account Pending Verification',
              'Your hospital account is pending admin verification. Please wait for approval before you can access the system.',
              [{ text: 'OK' }]
            )
            setLoading(false)
            return
          }
        }

        // Only set user and userData after verification checks pass
        setUser(userCredential.user)
        
        const userDataToSet = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || userDoc.data()?.displayName || null,
          role,
          photoURL: userCredential.user.photoURL || null,
          doctorData,
          hospitalData
        }

        setUserData(userDataToSet)

        // Navigate based on role
        if (role === 'patient') {
          // Show location permission screen for patients
          setShowLocationPermission(true)
        } else if (role === 'doctor') {
          router.replace('/doctor/schedule')
        } else if (role === 'hospital') {
          router.replace('/hospital')
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
        // Show location permission screen
        setShowLocationPermission(true)
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

  const requestLocationPermission = async () => {
    setIsRequestingLocation(true)
    try {
      const result = await LocationService.requestLocationPermission()
      
      if (result.granted) {
        // Permission granted, proceed to app
        router.replace('/patient/home')
      } else {
        // Permission denied
        Alert.alert(
          'Location Permission Required',
          result.error || 'Location permission is required to use this app.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setIsRequestingLocation(false)
                requestLocationPermission()
              }
            },
            {
              text: 'Exit',
              onPress: () => {
                setIsRequestingLocation(false)
                setShowLocationPermission(false)
                // Logout user
                logout()
              }
            }
          ]
        )
      }
    } catch (error) {
      console.error('Error requesting location:', error)
      Alert.alert('Error', 'Failed to request location permission')
      setIsRequestingLocation(false)
    }
  }

  // Show location permission screen for patients
  if (showLocationPermission) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900 items-center justify-center px-6">
        <View className="items-center">
          <View className="bg-blue-100 dark:bg-blue-900 p-6 rounded-full mb-6">
            <Ionicons name="location-sharp" size={48} color="#2563eb" />
          </View>
          
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            Location Permission Required
          </Text>
          
          <Text className="text-gray-600 dark:text-gray-400 text-center mb-8 leading-6">
            SwasthyaSetu needs your location to:{'\n\n'}
            • Enable emergency services{'\n'}
            • Find nearby hospitals and healthcare facilities{'\n'}
            • Provide better medical assistance{'\n'}
            • Send your location during emergencies
          </Text>

          {isRequestingLocation && (
            <View className="items-center mb-6">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-600 dark:text-gray-400 mt-2">
                Requesting permission...
              </Text>
            </View>
          )}

          {!isRequestingLocation && (
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={requestLocationPermission}
                className="bg-blue-600 rounded-lg py-3 items-center"
              >
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text className="text-white font-semibold mt-1">Allow Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowLocationPermission(false)
                  logout()
                }}
                className="bg-gray-200 dark:bg-gray-700 rounded-lg py-3 items-center"
              >
                <Ionicons name="close-circle" size={20} color="#6b7280" />
                <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-1">
                  Not Now
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
            You can change this permission anytime in your device settings.
          </Text>
        </View>
      </SafeAreaView>
    )
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
            onPress={() => router.push('/role-selection')}
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

