import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { auth, db } from '@/lib/firebase'
import { signOut, updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'

import Button from '@/components/Button'
import Input from '@/components/Input'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'

export default function HospitalProfile() {
  const router = useRouter()
  const { userData, logout, setUserData } = useAuthStore()
  const { theme, isDark, setTheme, initializeTheme } = useThemeStore()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(userData?.displayName || '')
  const [profileImage, setProfileImage] = useState(userData?.profileImage || null)
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
    if (!userData) return

    setLoading(true)
    try {
      // Update display name and profile image in Firestore
      const updateData: any = {
        displayName: displayName
      }
      
      if (profileImage !== userData.profileImage) {
        updateData.profileImage = profileImage
      }

      await updateDoc(doc(db, 'users', userData.uid), updateData)

      // Update local state
      setUserData({
        ...userData,
        displayName: displayName,
        profileImage: profileImage
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Hospital Profile
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
                <View className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center">
                  <Ionicons name="business" size={40} color="#9333ea" />
                </View>
              )}
              {isEditing && (
                <TouchableOpacity
                  onPress={handlePickImage}
                  className="absolute -bottom-2 -right-2 bg-purple-600 rounded-full p-2"
                >
                  <Ionicons name="camera" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">
              {userData?.hospitalData?.hospitalName || userData?.displayName || 'Hospital'}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              {userData?.email}
            </Text>
            <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full mt-2">
              <Text className="text-purple-700 dark:text-purple-300 text-sm font-medium">
                Hospital
              </Text>
            </View>
            {userData?.hospitalData && (
              <View className="mt-2 items-center">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {userData.hospitalData.hospitalType} • {userData.hospitalData.city}, {userData.hospitalData.state}
                </Text>
                <View className={`px-2 py-1 rounded-full mt-1 ${
                  userData.hospitalData.isVerified 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                }`}>
                  <Text className={`text-xs font-medium ${
                    userData.hospitalData.isVerified 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {userData.hospitalData.isVerified ? 'Verified' : 'Pending Verification'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {isEditing ? (
            <View>
              <Input
                label="Hospital Name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter hospital name"
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
            />
          )}
        </View>

        {/* Hospital Information */}
        {userData?.hospitalData && (
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hospital Information
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row items-center">
                <Ionicons name="location" size={20} color="#6b7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-900 dark:text-white font-medium">Address</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {userData.hospitalData.address}, {userData.hospitalData.city}, {userData.hospitalData.state} - {userData.hospitalData.pincode}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center">
                <Ionicons name="call" size={20} color="#6b7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-900 dark:text-white font-medium">Contact</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {userData.hospitalData.phoneNumber}
                  </Text>
                </View>
              </View>
              
              {userData.hospitalData.emergencyNumber && (
                <View className="flex-row items-center">
                  <Ionicons name="medical" size={20} color="#ef4444" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium">Emergency</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">
                      {userData.hospitalData.emergencyNumber}
                    </Text>
                  </View>
                </View>
              )}
              
              <View className="flex-row items-center">
                <Ionicons name="bed" size={20} color="#6b7280" />
                <View className="ml-3 flex-1">
                  <Text className="text-gray-900 dark:text-white font-medium">Bed Capacity</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {userData.hospitalData.totalBeds} Total • {userData.hospitalData.icuBeds} ICU
                  </Text>
                </View>
              </View>
              
              {userData.hospitalData.specialties && (
                <View className="flex-row items-start">
                  <Ionicons name="medical-outline" size={20} color="#6b7280" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium">Specialties</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">
                      {userData.hospitalData.specialties}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

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
                SwasthyaSetu connects hospitals with patients and healthcare providers. Manage your hospital operations, bed availability, and provide quality healthcare services through our integrated platform.
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="bed" size={20} color="#9333ea" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Real-time bed management
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="people" size={20} color="#9333ea" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Staff and patient management
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="analytics" size={20} color="#9333ea" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Hospital analytics dashboard
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={20} color="#9333ea" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Secure patient data management
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
                  { text: 'Open', onPress: () => console.log('Email: hospitals@swasthyasetu.com') }
                ])}
              >
                <Ionicons name="mail" size={20} color="#9333ea" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Hospital Support</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">hospitals@swasthyasetu.com</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Phone', 'Calling hospital support...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => console.log('Calling: +91-1800-HOSPITAL') }
                ])}
              >
                <Ionicons name="call" size={20} color="#10b981" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Hospital Helpline</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">+91-1800-HOSPITAL</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Emergency', 'For medical emergencies, please call 108 or contact emergency services immediately.')}
              >
                <Ionicons name="warning" size={20} color="#ef4444" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Emergency</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Call 108 for emergencies</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Help Center', 'Opening hospital help center...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => console.log('Help: help.swasthyasetu.com/hospitals') }
                ])}
              >
                <Ionicons name="help-circle" size={20} color="#8b5cf6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Help Center</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">FAQs & guides</Text>
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