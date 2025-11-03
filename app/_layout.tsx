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
import '../global.css'



export default function RootLayout() {
  const { setUser, setUserData, setLoading } = useAuthStore()
  const { initializeTheme, isDark } = useThemeStore()

  useEffect(() => {
    initializeTheme()
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

