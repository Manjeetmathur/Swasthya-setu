import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Signup() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor'>('patient')
  const [loading, setLoading] = useState(false)
  
  // Doctor-specific fields
  const [medicalLicense, setMedicalLicense] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [experience, setExperience] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [certifications, setCertifications] = useState('')
  const [hospitalAffiliation, setHospitalAffiliation] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  
  const { setUser } = useAuthStore()

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    // Additional validation for doctor fields
    if (role === 'doctor') {
      if (!medicalLicense || !specialization || !experience || !qualifications) {
        Alert.alert('Error', 'Please fill in all required doctor fields')
        return
      }
      
      if (isNaN(Number(experience)) || Number(experience) < 0) {
        Alert.alert('Error', 'Please enter a valid experience in years')
        return
      }
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Prepare user data
      const userData: any = {
        displayName: name,
        email: email,
        role: role,
        createdAt: new Date(),
        photoURL: null
      }

      // Add doctor-specific data if role is doctor
      if (role === 'doctor') {
        userData.doctorData = {
          medicalLicense,
          specialization,
          experience: Number(experience),
          qualifications,
          certifications: certifications.split(',').map(cert => cert.trim()).filter(cert => cert),
          hospitalAffiliation: hospitalAffiliation || null,
          consultationFee: consultationFee ? Number(consultationFee) : null,
          isVerified: false // Will be verified by admin
        }
      }

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), userData)

      setUser(user)
      // Navigation will be handled by index.tsx based on user role
    } catch (error: any) {
      Alert.alert('Signup Error', error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
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
          <View className="flex-1 justify-center">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create Account
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-8">
              Join TeleHealth Connect today
            </Text>

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                I am a
              </Text>
              <View className="flex-row gap-4">
                <Button
                  title="Patient"
                  onPress={() => setRole('patient')}
                  variant={role === 'patient' ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1"
                />
                <Button
                  title="Doctor"
                  onPress={() => setRole('doctor')}
                  variant={role === 'doctor' ? 'primary' : 'outline'}
                  size="sm"
                  className="flex-1"
                />
              </View>
            </View>

            {/* Doctor-specific fields */}
            {role === 'doctor' && (
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Professional Information
                </Text>
                
                <Input
                  label="Medical License Number *"
                  placeholder="Enter your medical license number"
                  value={medicalLicense}
                  onChangeText={setMedicalLicense}
                />

                <Input
                  label="Specialization *"
                  placeholder="e.g., Cardiology, Dermatology, General Medicine"
                  value={specialization}
                  onChangeText={setSpecialization}
                />

                <Input
                  label="Years of Experience *"
                  placeholder="Enter years of experience"
                  value={experience}
                  onChangeText={setExperience}
                  keyboardType="numeric"
                />

                <Input
                  label="Qualifications *"
                  placeholder="e.g., MBBS, MD, MS"
                  value={qualifications}
                  onChangeText={setQualifications}
                />

                <Input
                  label="Certifications"
                  placeholder="Enter certifications (comma separated)"
                  value={certifications}
                  onChangeText={setCertifications}
                  multiline
                />

                <Input
                  label="Hospital Affiliation"
                  placeholder="Current hospital or clinic name"
                  value={hospitalAffiliation}
                  onChangeText={setHospitalAffiliation}
                />

                <Input
                  label="Consultation Fee (₹)"
                  placeholder="Enter consultation fee"
                  value={consultationFee}
                  onChangeText={setConsultationFee}
                  keyboardType="numeric"
                />

                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  * Required fields. Your account will be verified by our admin team before activation.
                </Text>
              </View>
            )}

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              className="mb-4"
            />

            <View className="flex-row justify-center mt-4">
              <Text className="text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
              </Text>
              <Text
                className="text-blue-600 font-semibold"
                onPress={() => router.push('/login')}
              >
                Sign In
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

