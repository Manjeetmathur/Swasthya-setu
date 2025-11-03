import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth , db } from '@/lib/firebase'
import { useAuthStore , UserRole } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { ThemeProvider } from '@/components/ThemeProvider'
import CallManager from '@/components/CallManager'
import { doc, getDoc } from 'firebase/firestore'
import { Audio } from 'expo-av'
import { Camera } from 'expo-camera'
import { Alert, Platform } from 'react-native'
import '../global.css'



export default function RootLayout() {
  const { setUser, setUserData, setLoading } = useAuthStore()
  const { initializeTheme, isDark } = useThemeStore()

  // Request camera and microphone permissions
  const requestPermissions = async () => {
    try {
      console.log('Requesting camera and microphone permissions...')
      
      // Request camera permissions
      const cameraPermission = await Camera.requestCameraPermissionsAsync()
      
      // Request microphone permissions  
      const microphonePermission = await Camera.requestMicrophonePermissionsAsync()
      
      // Request audio recording permissions for calls
      const audioPermission = await Audio.requestPermissionsAsync()
      
      console.log('Permission results:', {
        camera: cameraPermission.granted,
        microphone: microphonePermission.granted,
        audio: audioPermission.granted
      })

      if (!cameraPermission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access for video calls with doctors. Please enable camera permission in your device settings.',
          [
            { text: 'OK', style: 'default' }
          ]
        )
      }

      if (!microphonePermission.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'This app needs microphone access for video calls with doctors. Please enable microphone permission in your device settings.',
          [
            { text: 'OK', style: 'default' }
          ]
        )
      }

      // Set up audio session for calls
      if (audioPermission.granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
        })
        console.log('Audio session configured for calls')
      }

    } catch (error) {
      console.error('Error requesting permissions:', error)
      Alert.alert(
        'Permission Error',
        'There was an error requesting camera and microphone permissions. Video calls may not work properly.'
      )
    }
  }

  useEffect(() => {
    initializeTheme()
    requestPermissions()
  }, [initializeTheme])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const role = (userData.role as UserRole) || 'patient'
            const doctorData = userData.doctorData || null
            const hospitalData = userData.hospitalData || null

            // Check verification status for doctors and hospitals
            if (role === 'doctor' && doctorData && !doctorData.isVerified) {
              // Don't set user data for unverified doctors
              setUser(null)
              setUserData(null)
              setLoading(false)
              return
            }

            if (role === 'hospital' && hospitalData && !hospitalData.isVerified) {
              // Don't set user data for unverified hospitals
              setUser(null)
              setUserData(null)
              setLoading(false)
              return
            }

            // Only set user data if verification checks pass
            setUser(user)
            setUserData({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName || null,
              role: role,
              photoURL: user.photoURL || userData.photoURL || null,
              doctorData: doctorData,
              hospitalData: hospitalData
            })
          } else {
            // Default to patient if no role found
            setUser(user)
            setUserData({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || null,
              role: 'patient',
              photoURL: user.photoURL || null
            })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          setUser(user)
          setUserData({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null,
            role: 'patient',
            photoURL: user.photoURL || null
          })
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, setUserData, setLoading])

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDark ? '#111827' : '#ffffff' }
          }}
        />
        <CallManager />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

