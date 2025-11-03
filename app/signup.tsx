import { useState, useEffect } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Signup() {
  const router = useRouter()
  const { role: urlRole } = useLocalSearchParams<{ role: string }>()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor' | 'hospital'>('patient')
  const [loading, setLoading] = useState(false)
  
  // Doctor-specific fields
  const [medicalLicense, setMedicalLicense] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [experience, setExperience] = useState('')
  const [qualifications, setQualifications] = useState('')
  const [certifications, setCertifications] = useState('')
  const [hospitalAffiliation, setHospitalAffiliation] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  
  // Hospital-specific fields
  const [hospitalName, setHospitalName] = useState('')
  const [hospitalLicense, setHospitalLicense] = useState('')
  const [hospitalType, setHospitalType] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emergencyNumber, setEmergencyNumber] = useState('')
  const [totalBeds, setTotalBeds] = useState('')
  const [icuBeds, setIcuBeds] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [facilities, setFacilities] = useState('')
  const [accreditation, setAccreditation] = useState('')
  const [establishedYear, setEstablishedYear] = useState('')
  
  const { setUser } = useAuthStore()

  // Set role from URL parameter
  useEffect(() => {
    if (urlRole && ['patient', 'doctor', 'hospital'].includes(urlRole)) {
      setRole(urlRole as 'patient' | 'doctor' | 'hospital')
    }
  }, [urlRole])

  const getRoleInfo = () => {
    switch (role) {
      case 'patient':
        return {
          title: 'Patient Registration',
          subtitle: 'Create your account to access healthcare services',
          icon: 'person' as const,
          color: '#2563eb'
        }
      case 'doctor':
        return {
          title: 'Doctor Registration',
          subtitle: 'Join our network of healthcare professionals',
          icon: 'medical' as const,
          color: '#16a34a'
        }
      case 'hospital':
        return {
          title: 'Hospital Registration',
          subtitle: 'Register your healthcare facility',
          icon: 'business' as const,
          color: '#9333ea'
        }
      default:
        return {
          title: 'Create Account',
          subtitle: 'Join Swasthya Setu today',
          icon: 'person-add' as const,
          color: '#2563eb'
        }
    }
  }

  const roleInfo = getRoleInfo()

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

    // Additional validation for hospital fields
    if (role === 'hospital') {
      if (!hospitalName || !hospitalLicense || !hospitalType || !address || !city || !state || !pincode || !phoneNumber || !totalBeds) {
        Alert.alert('Error', 'Please fill in all required hospital fields')
        return
      }
      
      if (isNaN(Number(totalBeds)) || Number(totalBeds) < 1) {
        Alert.alert('Error', 'Please enter a valid number of total beds')
        return
      }
      
      if (icuBeds && (isNaN(Number(icuBeds)) || Number(icuBeds) < 0)) {
        Alert.alert('Error', 'Please enter a valid number of ICU beds')
        return
      }
      
      if (establishedYear && (isNaN(Number(establishedYear)) || Number(establishedYear) < 1800 || Number(establishedYear) > new Date().getFullYear())) {
        Alert.alert('Error', 'Please enter a valid establishment year')
        return
      }
      
      if (pincode.length !== 6 || isNaN(Number(pincode))) {
        Alert.alert('Error', 'Please enter a valid 6-digit pincode')
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

      // Add hospital-specific data if role is hospital
      if (role === 'hospital') {
        userData.hospitalData = {
          hospitalName,
          hospitalLicense,
          hospitalType,
          address,
          city,
          state,
          pincode,
          phoneNumber,
          emergencyNumber: emergencyNumber || null,
          totalBeds: Number(totalBeds),
          icuBeds: icuBeds ? Number(icuBeds) : null,
          specialties: specialties.split(',').map(spec => spec.trim()).filter(spec => spec),
          facilities: facilities.split(',').map(fac => fac.trim()).filter(fac => fac),
          accreditation: accreditation || null,
          establishedYear: establishedYear ? Number(establishedYear) : null,
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
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back()
              } else {
                router.replace('/role-selection')
              }
            }}
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

            {/* Hospital-specific fields */}
            {role === 'hospital' && (
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Hospital Information
                </Text>
                
                <Input
                  label="Hospital Name *"
                  placeholder="Enter hospital/clinic name"
                  value={hospitalName}
                  onChangeText={setHospitalName}
                />

                <Input
                  label="Hospital License Number *"
                  placeholder="Enter hospital license number"
                  value={hospitalLicense}
                  onChangeText={setHospitalLicense}
                />

                <Input
                  label="Hospital Type *"
                  placeholder="e.g., Multi-specialty, General, Specialty"
                  value={hospitalType}
                  onChangeText={setHospitalType}
                />

                <Input
                  label="Address *"
                  placeholder="Enter complete address"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />

                <View className="flex-row gap-2">
                  <Input
                    label="City *"
                    placeholder="City"
                    value={city}
                    onChangeText={setCity}
                    className="flex-1"
                  />
                  <Input
                    label="State *"
                    placeholder="State"
                    value={state}
                    onChangeText={setState}
                    className="flex-1"
                  />
                </View>

                <Input
                  label="Pincode *"
                  placeholder="6-digit pincode"
                  value={pincode}
                  onChangeText={setPincode}
                  keyboardType="numeric"
                  maxLength={6}
                />

                <Input
                  label="Phone Number *"
                  placeholder="Hospital contact number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />

                <Input
                  label="Emergency Number"
                  placeholder="24x7 emergency contact"
                  value={emergencyNumber}
                  onChangeText={setEmergencyNumber}
                  keyboardType="phone-pad"
                />

                <View className="flex-row gap-2">
                  <Input
                    label="Total Beds *"
                    placeholder="Total beds"
                    value={totalBeds}
                    onChangeText={setTotalBeds}
                    keyboardType="numeric"
                    className="flex-1"
                  />
                  <Input
                    label="ICU Beds"
                    placeholder="ICU beds"
                    value={icuBeds}
                    onChangeText={setIcuBeds}
                    keyboardType="numeric"
                    className="flex-1"
                  />
                </View>

                <Input
                  label="Specialties"
                  placeholder="e.g., Cardiology, Neurology, Orthopedics (comma separated)"
                  value={specialties}
                  onChangeText={setSpecialties}
                  multiline
                />

                <Input
                  label="Facilities"
                  placeholder="e.g., CT Scan, MRI, Lab, Pharmacy (comma separated)"
                  value={facilities}
                  onChangeText={setFacilities}
                  multiline
                />

                <Input
                  label="Accreditation"
                  placeholder="e.g., NABH, JCI, ISO"
                  value={accreditation}
                  onChangeText={setAccreditation}
                />

                <Input
                  label="Established Year"
                  placeholder="Year of establishment"
                  value={establishedYear}
                  onChangeText={setEstablishedYear}
                  keyboardType="numeric"
                />

                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  * Required fields. Your hospital will be verified by our admin team before activation.
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
                onPress={() => router.push(`/login?role=${role}`)}
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

