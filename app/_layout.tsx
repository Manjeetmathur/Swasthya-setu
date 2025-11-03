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
        setUser(user)
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserData({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData.displayName || null,
              role: (userData.role as UserRole) || 'patient',
              photoURL: user.photoURL || userData.photoURL || null,
              doctorData: userData.doctorData || null
            })
          } else {
            // Default to patient if no role found
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

