import { useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function AdminSetup() {
  const router = useRouter()
  const [adminEmail, setAdminEmail] = useState('admin@telehealth.com')
  const [adminPassword, setAdminPassword] = useState('Admin@123456')
  const [loading, setLoading] = useState(false)

  const checkAdminExists = async () => {
    try {
      // Check if admin already exists by looking for any user with admin role
      // This is a simple check - in production you'd want more robust checking
      const adminDoc = await getDoc(doc(db, 'admin', 'setup'))
      return adminDoc.exists()
    } catch (error) {
      return false
    }
  }

  const setupAdmin = async () => {
    if (!adminEmail || !adminPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (adminPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      // Check if admin already exists
      const adminExists = await checkAdminExists()
      if (adminExists) {
        Alert.alert('Info', 'Admin account already exists')
        setLoading(false)
        return
      }

      // Create admin user
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
      const user = userCredential.user

      // Create admin document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: 'System Administrator',
        email: adminEmail,
        role: 'admin',
        createdAt: new Date(),
        photoURL: null
      })

      // Mark admin as setup
      await setDoc(doc(db, 'admin', 'setup'), {
        setupAt: new Date(),
        setupBy: user.uid
      })

      Alert.alert(
        'Success', 
        `Admin account created successfully!\n\nEmail: ${adminEmail}\nPassword: ${adminPassword}\n\nPlease change the password after first login.`,
        [
          {
            text: 'Go to Login',
            onPress: () => router.replace('/login')
          }
        ]
      )
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Info', 'Admin email already in use')
      } else {
        Alert.alert('Error', error.message || 'Failed to create admin account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Admin Setup
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 mb-8 text-center">
          Create the system administrator account
        </Text>

        <Input
          label="Admin Email"
          placeholder="Enter admin email"
          value={adminEmail}
          onChangeText={setAdminEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Admin Password"
          placeholder="Enter admin password"
          value={adminPassword}
          onChangeText={setAdminPassword}
          secureTextEntry
        />

        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Default credentials:{'\n'}
          Email: admin@telehealth.com{'\n'}
          Password: Admin@123456
        </Text>

        <Button
          title="Create Admin Account"
          onPress={setupAdmin}
          loading={loading}
          className="mb-4"
        />

        <Button
          title="Back to Login"
          onPress={() => router.replace('/login')}
          variant="outline"
        />
      </View>
    </SafeAreaView>
  )
}