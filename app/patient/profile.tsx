import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { auth , db } from '@/lib/firebase'
import { signOut, updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'

import Button from '@/components/Button'
import Input from '@/components/Input'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'

export default function PatientProfile() {
  const router = useRouter()
  const { userData, logout, setUserData } = useAuthStore()
  const { theme, isDark, setTheme, initializeTheme } = useThemeStore()
  const { language, setLanguage, t } = useLanguageStore()
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(userData?.displayName || '')
  const [profileImage, setProfileImage] = useState(userData?.profileImage || null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showPrivacySection, setShowPrivacySection] = useState(false)
  const [showAboutSection, setShowAboutSection] = useState(false)
  const [showContactSection, setShowContactSection] = useState(false)
  const [showLanguageSection, setShowLanguageSection] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initializeTheme()
  }, [])

  useEffect(() => {
    setSelectedLanguage(language)
  }, [language])

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
          {t('profile.title')}
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
                  <Ionicons name="person" size={40} color="#2563eb" />
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
              {userData?.displayName || 'Patient'}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              {userData?.email}
            </Text>
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full mt-2">
              <Text className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                Patient
              </Text>
            </View>
          </View>

          {isEditing ? (
            <View>
              <Input
                label={t('profile.personal_info')}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your full name"
              />
              <View className="flex-row gap-3 mt-4">
                <Button
                  title={t('profile.save_changes')}
                  onPress={handleSaveProfile}
                  loading={loading}
                  className="flex-1"
                />
                <Button
                  title={t('profile.cancel')}
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
              title={t('profile.edit_profile')}
              onPress={() => setIsEditing(true)}
              variant="outline"
            />
          )}
        </View>

        {/* Account Settings */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.account_settings')}
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
                {t('profile.theme')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Language Switch */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setShowLanguageSection(!showLanguageSection)}
          >
            <View className="flex-row items-center">
              <Ionicons name="language" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">{t('profile.language')}</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 dark:text-gray-400 mr-2">
                {selectedLanguage === 'English' ? t('profile.english') : t('profile.hindi')}
              </Text>
              <Ionicons 
                name={showLanguageSection ? "chevron-down" : "chevron-forward"} 
                size={20} 
                color="#6b7280" 
              />
            </View>
          </TouchableOpacity>

          {/* Language Options - Only show when toggled */}
          {showLanguageSection && (
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <TouchableOpacity
                className={`flex-row items-center justify-between py-3 px-4 rounded-lg mb-2 ${
                  selectedLanguage === 'English' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
                onPress={() => {
                  setSelectedLanguage('English')
                  setLanguage('English')
                  setShowLanguageSection(false)
                }}
              >
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">🇺🇸</Text>
                  <Text className={`font-medium ${
                    selectedLanguage === 'English' 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {t('profile.english')}
                  </Text>
                </View>
                {selectedLanguage === 'English' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-row items-center justify-between py-3 px-4 rounded-lg ${
                  selectedLanguage === 'Hindi' 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
                onPress={() => {
                  setSelectedLanguage('Hindi')
                  setLanguage('Hindi')
                  setShowLanguageSection(false)
                }}
              >
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">🇮🇳</Text>
                  <Text className={`font-medium ${
                    selectedLanguage === 'Hindi' 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {t('profile.hindi')}
                  </Text>
                </View>
                {selectedLanguage === 'Hindi' && (
                  <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
                )}
              </TouchableOpacity>
            </View>
          )}

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
              <Text className="text-gray-900 dark:text-white ml-3">{t('profile.change_password')}</Text>
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
              <Text className="text-gray-900 dark:text-white ml-3">{t('profile.notifications')}</Text>
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
                label={t('profile.current_password')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Enter current password"
              />

              <Input
                label={t('profile.new_password')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Enter new password"
              />

              <Input
                label={t('profile.confirm_password')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Confirm new password"
              />

              <Button
                title={t('profile.update_password')}
                onPress={handleChangePassword}
                loading={loading}
                className="mt-4"
              />
            </View>
          )}
        </View>

        {/* Privacy & Security Section */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.privacy_security')}
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setShowPrivacySection(!showPrivacySection)}
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">{t('profile.privacy_security')}</Text>
            </View>
            <Ionicons 
              name={showPrivacySection ? "chevron-down" : "chevron-forward"} 
              size={20} 
              color="#6b7280" 
            />
          </TouchableOpacity>

          {/* Privacy & Security Content - Only show when toggled */}
          {showPrivacySection && (
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <View className="space-y-4">
                <View className="flex-row items-start">
                  <Ionicons name="lock-closed" size={20} color="#3b82f6" className="mt-1" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium mb-1">
                      {t('profile.data_protection')}
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-300 text-sm leading-5">
                      {t('profile.data_protection_info')}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-start">
                  <Ionicons name="medical" size={20} color="#10b981" className="mt-1" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium mb-1">
                      {t('profile.medical_privacy')}
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-300 text-sm leading-5">
                      {t('profile.medical_privacy_info')}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-start">
                  <Ionicons name="card" size={20} color="#8b5cf6" className="mt-1" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium mb-1">
                      {t('profile.secure_payments')}
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-300 text-sm leading-5">
                      {t('profile.secure_payments_info')}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-start">
                  <Ionicons name="person-circle" size={20} color="#f59e0b" className="mt-1" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium mb-1">
                      {t('profile.account_security')}
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-300 text-sm leading-5">
                      {t('profile.account_security_info')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* About Section */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.about')}
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setShowAboutSection(!showAboutSection)}
          >
            <View className="flex-row items-center">
              <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">{t('profile.about_swasthyasetu')}</Text>
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
                {t('profile.about_description')}
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="medical" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    {t('profile.verified_doctors')}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="time" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    {t('profile.book_anytime')}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    {t('profile.secure_records')}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="chatbubbles" size={20} color="#10b981" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-3">
                    {t('profile.ai_support')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Contact Us Section */}
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.contact_support')}
          </Text>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
            onPress={() => setShowContactSection(!showContactSection)}
          >
            <View className="flex-row items-center">
              <Ionicons name="headset-outline" size={20} color="#6b7280" />
              <Text className="text-gray-900 dark:text-white ml-3">{t('profile.contact_support')}</Text>
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
                  { text: 'Open', onPress: () => console.log('Email: patients@swasthyasetu.com') }
                ])}
              >
                <Ionicons name="mail" size={20} color="#3b82f6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">{t('profile.patient_support')}</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">patients@swasthyasetu.com</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Phone', 'Calling patient support...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => console.log('Calling: +91-1800-PATIENT') }
                ])}
              >
                <Ionicons name="call" size={20} color="#10b981" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">{t('profile.patient_helpline')}</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">+91-1800-PATIENT</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Emergency', 'For medical emergencies, please call 108 or visit your nearest hospital immediately.')}
              >
                <Ionicons name="warning" size={20} color="#ef4444" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">{t('profile.emergency')}</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">{t('profile.emergency_info')}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center py-3"
                onPress={() => Alert.alert('Help Center', 'Opening patient help center...', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open', onPress: () => console.log('Help: help.swasthyasetu.com/patients') }
                ])}
              >
                <Ionicons name="help-circle" size={20} color="#8b5cf6" />
                <View className="ml-3">
                  <Text className="text-gray-900 dark:text-white font-medium">{t('profile.help_center')}</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">{t('profile.help_center_info')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout */}
        <Button
          title={t('profile.logout')}
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