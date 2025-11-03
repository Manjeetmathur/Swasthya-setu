import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { auth , db } from '@/lib/firebase'
import { signOut, updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'

import Button from '@/components/Button'
import Input from '@/components/Input'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'

export default function DoctorProfile() {
  const router = useRouter()
  const { userData, logout, setUserData } = useAuthStore()
  const { theme, isDark, setTheme, initializeTheme } = useThemeStore()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(userData?.displayName || '')
  const [profileImage, setProfileImage] = useState(userData?.profileImage || null)
  const [hospitalAffiliation, setHospitalAffiliation] = useState(userData?.doctorData?.hospitalAffiliation || '')
  const [consultationFee, setConsultationFee] = useState(userData?.doctorData?.consultationFee?.toString() || '')
  const [certifications, setCertifications] = useState(userData?.doctorData?.certifications?.join(', ') || '')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showAboutSection, setShowAboutSection] = useState(false)
  const [showContactSection, setShowContactSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initializeTheme()
  }, [])

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const handleSaveProfile = async () => {
    if (!userData || !userData.doctorData) return

    setLoading(true)
    try {
      const updatedDoctorData = {
        ...userData.doctorData,
        hospitalAffiliation: hospitalAffiliation || null,
        consultationFee: consultationFee ? Number(consultationFee) : null,
        certifications: certifications.split(',').map(cert => cert.trim()).filter(cert => cert)
      }

      // Update in Firestore
      const updateData: any = {
        displayName: displayName,
        doctorData: updatedDoctorData
      }
      
      if (profileImage !== userData.profileImage) {
        updateData.profileImage = profileImage
      }

      await updateDoc(doc(db, 'users', userData.uid), updateData)

      // Update local state
      setUserData({
        ...userData,
        displayName: displayName,
        profileImage: profileImage,
        doctorData: updatedDoctorData
      })

      setIsEditing(false)
      Alert.alert('Success', 'Profile updated successfully!')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        Alert.alert('Success', 'Password updated successfully!')
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth)
              await logout()
              router.replace('/login')
            } catch (error) {
              console.error('Logout error:', error)
            }
          }
        }
      ]
    )
  }

  const doctorData = userData?.doctorData

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          My Profile
        </Text>

        {/* Profile Info Card */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <View className="items-center mb-6">
            <View className="relative mb-4">
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <View className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center">
                  <Ionicons name="medical" size={40} color="#2563eb" />
                </View>
              )}
              {isEditing && (
                <TouchableOpacity
                  onPress={handlePickImage}
                  className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2"
                >
                  <Ionicons name="camera" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">
              Dr. {userData?.displayName || 'Doctor'}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              {userData?.email}
            </Text>
            <View className="flex-row gap-2 mt-2">
              <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                <Text className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                  Doctor
                </Text>
              </View>
              {doctorData?.isVerified && (
                <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <Text className="text-green-700 dark:text-green-300 text-sm font-medium">
                    ✓ Verified
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Professional Information */}
          {doctorData && (
            <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Professional Information
              </Text>
              
              <View className="space-y-3">
                <View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Specialization</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {doctorData.specialization}
                  </Text>
                </View>
                
                <View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Experience</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {doctorData.experience} years
                  </Text>
                </View>
                
                <View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Qualifications</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {doctorData.qualifications}
                  </Text>
                </View>
                
                <View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400">Medical License</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {doctorData.medicalLicense}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isEditing ? (
            <View className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Edit Profile
              </Text>
              
              <Input
                label="Full Name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your full name"
              />
              
              <Input
                label="Hospital Affiliation"
                value={hospitalAffiliation}
                onChangeText={setHospitalAffiliation}
                placeholder="Current hospital or clinic name"
              />
              
              <Input
                label="Consultation Fee (₹)"
                value={consultationFee}
                onChangeText={setConsultationFee}
                placeholder="Enter consultation fee"
                keyboardType="numeric"
              />
              
              <Input
                label="Certifications"
                value={certifications}
                onChangeText={setCertifications}
                placeholder="Enter certifications (comma separated)"
                multiline
              />
              
              <View className="flex-row gap-3 mt-4">
                <Button
                  title="Save"
                  onPress={handleSaveProfile}
                  loading={loading}
                  className="flex-1"
                />
                <Button
                  title="Cancel"
                  onPress={() => {
                    setIsEditing(false)
                    setDisplayName(userData?.displayName || '')
                    setProfileImage(userData?.profileImage || null)
                    setHospitalAffiliation(userData?.doctorData?.hospitalAffiliation || '')
                    setConsultationFee(userData?.doctorData?.consultationFee?.toString() || '')
                    setCertifications(userData?.doctorData?.certifications?.join(', ') || '')
                  }}
                  variant="outline"
                  className="flex-1"
                />
              </View>
            </View>
          ) : (
            <Button
              title="Edit Profile"
              onPress={() => setIsEditing(true)}
              variant="outline"
              className="mt-6"
            />
          )}
        </View>

        {/* Account Settings */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Settings
          </Text>

          {/* Theme Toggle */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
          >
            <View className="flex-row items-center">
              <Ionicons 
                name={isDark ? "moon" : "sunny"} 
                size={20} 
                color="#6b7280" 
              />
              <Text className="text-gray-900 dark:text-white ml-3">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => {
              setShowPasswordForm(!showPasswordForm)
              if (!showPasswordForm) {
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
              }
            }}
          >
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Change Password</Text>
            </View>
            <Ionicons 
              name={showPasswordForm ? "chevron-down" : "chevron-forward"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => Alert.alert('Notifications', 'Notification settings coming soon!')}
          >
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => Alert.alert('Verification', 'Verification status and documents')}
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Verification Status</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Password Change Form - Only show when toggled */}
          {showPasswordForm && (
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
              />

              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
              />

              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />

              <Button
                title="Update Password"
                onPress={handleChangePassword}
                loading={loading}
                className="mt-4"
              />
            </View>
          )}
        </View>

        {/* About Section */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            About & Information
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setShowAboutSection(!showAboutSection)}
          >
            <View className="flex-row items-center">
              <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">About SwasthyaSetu</Text>
            </View>
            <Ionicons 
              name={showAboutSection ? "chevron-down" : "chevron-forward"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {/* About Content - Only show when toggled */}
          {showAboutSection && (
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Text className="text-gray-700 dark:text-gray-300 leading-6 mb-4">
                SwasthyaSetu empowers healthcare professionals to provide quality care through our advanced telehealth platform. Connect with patients, manage appointments, and deliver healthcare services efficiently.
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="videocam" size={20} color="#3b82f6" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    High-quality video consultations
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Smart appointment scheduling
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="document-text" size={20} color="#3b82f6" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Digital prescription management
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="analytics" size={20} color="#3b82f6" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Patient health analytics
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Contact Us Section */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Support & Contact
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setShowContactSection(!showContactSection)}
          >
            <View className="flex-row items-center">
              <Ionicons name="headset-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Contact Support</Text>
            </View>
            <Ionicons 
              name={showContactSection ? "chevron-down" : "chevron-forward"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {/* Contact Content - Only show when toggled */}
          {showContactSection && (
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Email', 'Opening email client...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => console.log('Email: doctors@swasthyasetu.com') }
                ])}
              >
                <Ionicons name="mail" size={20} color="#3b82f6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Doctor Support</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">doctors@swasthyasetu.com</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Phone', 'Calling doctor support...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => console.log('Calling: +91-1800-DOCTOR') }
                ])}
              >
                <Ionicons name="call" size={20} color="#10b981" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Doctor Helpline</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">+91-1800-DOCTOR</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Technical Support', 'For technical issues, please contact our support team at tech@swasthyasetu.com or call +91-1800-TECH-HELP')}
              >
                <Ionicons name="construct" size={20} color="#f59e0b" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Technical Support</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Platform & app issues</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Help Center', 'Opening help center...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => console.log('Help: help.swasthyasetu.com/doctors') }
                ])}
              >
                <Ionicons name="help-circle" size={20} color="#8b5cf6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Help Center</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">FAQs & documentation</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          className="mb-8"
          style={{ borderColor: '#dc2626', backgroundColor: 'transparent' }}
          textStyle={{ color: '#dc2626' }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}