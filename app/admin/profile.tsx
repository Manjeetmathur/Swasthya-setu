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

export default function AdminProfile() {
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
      <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Admin Profile
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
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
                <View className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center">
                  <Ionicons name="shield-checkmark" size={40} color="#dc2626" />
                </View>
              )}
              {isEditing && (
                <TouchableOpacity
                  onPress={handlePickImage}
                  className="absolute -bottom-2 -right-2 bg-red-600 rounded-full p-2"
                >
                  <Ionicons name="camera" size={16} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">
              {userData?.displayName || 'Administrator'}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              {userData?.email}
            </Text>
            <View className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full mt-2">
              <Text className="text-red-700 dark:text-red-300 text-sm font-medium">
                Administrator
              </Text>
            </View>
          </View>

          {/* Admin Privileges */}
          <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Admin Privileges
            </Text>
            
            <View className="space-y-2">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-gray-700 dark:text-gray-300 ml-2">
                  Manage doctor verifications
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-gray-700 dark:text-gray-300 ml-2">
                  View all users and appointments
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-gray-700 dark:text-gray-300 ml-2">
                  System administration access
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text className="text-gray-700 dark:text-gray-300 ml-2">
                  Platform oversight and management
                </Text>
              </View>
            </View>
          </View>

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

        {/* System Information */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Information
          </Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Platform</Text>
              <Text className="text-gray-900 dark:text-white font-medium">
                TeleHealth Connect
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Role</Text>
              <Text className="text-gray-900 dark:text-white font-medium">
                System Administrator
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Access Level</Text>
              <Text className="text-red-600 dark:text-red-400 font-medium">
                Full Access
              </Text>
            </View>
          </View>
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
            onPress={() => Alert.alert('Notifications', 'Admin notification settings coming soon!')}
          >
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => Alert.alert('System Logs', 'System logs and audit trail')}
          >
            <View className="flex-row items-center">
              <Ionicons name="document-text-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">System Logs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => Alert.alert('Security', 'Advanced security settings')}
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">Security Settings</Text>
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

        {/* Quick Actions */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </Text>
          
          <View className="space-y-3">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
              onPress={() => router.push('/admin')}
            >
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={20} color="#6b7280" />
                <Text className="text-gray-900 dark:text-white ml-3">Dashboard</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center justify-between py-3"
              onPress={() => router.push('/admin-setup')}
            >
              <View className="flex-row items-center">
                <Ionicons name="settings-outline" size={20} color="#6b7280" />
                <Text className="text-gray-900 dark:text-white ml-3">System Setup</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
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
                SwasthyaSetu is a comprehensive telehealth platform designed to bridge the gap between patients and healthcare providers. Our mission is to make quality healthcare accessible to everyone, anywhere, anytime.
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="medical" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Verified healthcare professionals
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Secure and private consultations
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    24/7 healthcare support
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="globe" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    Accessible healthcare for all
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
                  { text: 'Open', onPress: () => console.log('Email: admin@swasthyasetu.com') }
                ])}
              >
                <Ionicons name="mail" size={20} color="#3b82f6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Email Support</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">admin@swasthyasetu.com</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Phone', 'Calling support...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => console.log('Calling: +91-1800-HEALTH') }
                ])}
              >
                <Ionicons name="call" size={20} color="#10b981" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Phone Support</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">+91-1800-HEALTH</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Address', 'SwasthyaSetu Headquarters\nTech Park, Bangalore, Karnataka\nIndia - 560001')}
              >
                <Ionicons name="location" size={20} color="#f59e0b" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Office Address</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Tech Park, Bangalore</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Website', 'Opening website...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => console.log('Website: www.swasthyasetu.com') }
                ])}
              >
                <Ionicons name="globe" size={20} color="#8b5cf6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">Website</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">www.swasthyasetu.com</Text>
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