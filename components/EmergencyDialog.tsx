import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import EmergencyService, { EmergencyDetails } from '@/lib/emergencyService'
import { EmergencyType } from '@/stores/emergencyStore'
import Button from './Button'

interface EmergencyDialogProps {
  visible: boolean
  onClose: () => void
  onEmergencyTriggered?: (emergencyId: string) => void
}

// Emergency type configurations (icons and colors are static, labels/descriptions come from translations)
const EMERGENCY_TYPE_CONFIGS = [
  { id: 'cardiac' as EmergencyType, icon: 'heart', color: '#dc2626' },
  { id: 'accident' as EmergencyType, icon: 'warning', color: '#ea580c' },
  { id: 'eye_injury' as EmergencyType, icon: 'eye-off', color: '#06b6d4' },
  { id: 'pregnancy' as EmergencyType, icon: 'heart-half', color: '#ec4899' },
  { id: 'trauma' as EmergencyType, icon: 'alert-circle', color: '#991b1b' },
  { id: 'respiratory' as EmergencyType, icon: 'wind', color: '#0891b2' },
  { id: 'stroke' as EmergencyType, icon: 'flash', color: '#9333ea' },
  { id: 'allergic' as EmergencyType, icon: 'water', color: '#d97706' },
  { id: 'poisoning' as EmergencyType, icon: 'warning', color: '#7c2d12' },
  { id: 'seizure' as EmergencyType, icon: 'swap-vertical', color: '#4f46e5' },
  { id: 'unconscious' as EmergencyType, icon: 'person', color: '#1f2937' },
  { id: 'burn' as EmergencyType, icon: 'flame', color: '#f97316' },
  { id: 'choking' as EmergencyType, icon: 'close-circle', color: '#b91c1c' },
  { id: 'chest_pain' as EmergencyType, icon: 'pulse', color: '#be123c' },
  { id: 'abdominal' as EmergencyType, icon: 'body', color: '#92400e' },
  { id: 'fracture' as EmergencyType, icon: 'close', color: '#7c3aed' },
  { id: 'spinal' as EmergencyType, icon: 'swap-horizontal', color: '#1e40af' },
  { id: 'drowning' as EmergencyType, icon: 'water', color: '#0369a1' },
  { id: 'electrocution' as EmergencyType, icon: 'flash-off', color: '#fbbf24' },
  { id: 'severe_headache' as EmergencyType, icon: 'alert-circle-outline', color: '#ec4899' },
  { id: 'mental_crisis' as EmergencyType, icon: 'md-heart-outline', color: '#8b5cf6' },
  { id: 'infection' as EmergencyType, icon: 'bug', color: '#ca8a04' },
  { id: 'gunshot' as EmergencyType, icon: 'warning', color: '#7f1d1d' },
  { id: 'general' as EmergencyType, icon: 'help-circle', color: '#6366f1' }
]

export default function EmergencyDialog({
  visible,
  onClose,
  onEmergencyTriggered
}: EmergencyDialogProps) {
  const { userData } = useAuthStore()
  const { t } = useLanguageStore()
  const [step, setStep] = useState<'type' | 'confirm'>('type')
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null)
  const [loading, setLoading] = useState(false)

  // Build emergency types with translations
  const EMERGENCY_TYPES = useMemo(() => {
    return EMERGENCY_TYPE_CONFIGS.map(config => ({
      ...config,
      label: t(`emergency.dialog.types.${config.id}.label`),
      description: t(`emergency.dialog.types.${config.id}.description`)
    }))
  }, [t])

  const handleTypeSelect = (type: EmergencyType) => {
    setSelectedType(type)
    setStep('confirm')
  }

  const handleTriggerEmergency = async () => {
    if (!selectedType || !userData) return

    setLoading(true)
    try {
      const details: EmergencyDetails = {
        type: selectedType,
        description: t('emergency.dialog.emergency_medical_assistance'),
        estimatedCasualties: 1,
        affectedArea: t('emergency.dialog.current_location')
      }

      const alert = await EmergencyService.triggerEmergencyAlert(
        userData.uid,
        userData.displayName || t('emergency.dialog.patient'),
        userData.email || t('emergency.dialog.unknown'),
        selectedType,
        details
      )

      if (alert) {
        // Send SOS notification
        const location = await EmergencyService.getCurrentLocation()
        const address = await EmergencyService.getAddressFromCoordinates(
          location.latitude,
          location.longitude
        )

        await EmergencyService.sendSOSNotification(
          userData.displayName || t('emergency.dialog.patient'),
          userData.email || t('emergency.dialog.unknown'),
          { address, ...location },
          selectedType
        )

        Alert.alert(
          t('emergency.dialog.alert_sent_title'),
          t('emergency.dialog.alert_sent_message'),
          [{ text: t('home.ok'), onPress: handleClose }]
        )

        onEmergencyTriggered?.(alert.id)
      }
    } catch (error: any) {
      Alert.alert(
        t('emergency.dialog.error_title'),
        error.message || t('emergency.dialog.error_message')
      )
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('type')
    setSelectedType(null)
    onClose()
  }

  const selectedTypeData = EMERGENCY_TYPES.find(type => type.id === selectedType)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-white dark:bg-gray-900 rounded-t-3xl mt-12">
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('emergency.dialog.title')}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-6">
            {/* STEP 1: Select Emergency Type */}
            {step === 'type' && (
              <View>
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('emergency.dialog.select_type')}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('emergency.dialog.select_type_description')}
                </Text>

                {EMERGENCY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    onPress={() => handleTypeSelect(type.id)}
                    disabled={loading}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border-2 border-gray-200 dark:border-gray-700"
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center mr-4"
                        style={{ backgroundColor: type.color + '20' }}
                      >
                        <Ionicons name={type.icon as any} size={24} color={type.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {type.label}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {type.description}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* STEP 2: Confirmation */}
            {step === 'confirm' && selectedTypeData && (
              <View>
                {/* Back Button & Type Header */}
                <View className="flex-row items-center mb-6">
                  <TouchableOpacity 
                    onPress={() => setStep('type')}
                    disabled={loading}
                    className="mr-3"
                  >
                    <Ionicons name="arrow-back" size={24} color="#2563eb" />
                  </TouchableOpacity>
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: selectedTypeData.color + '20' }}
                  >
                    <Ionicons
                      name={selectedTypeData.icon as any}
                      size={24}
                      color={selectedTypeData.color}
                    />
                  </View>
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedTypeData.label}
                  </Text>
                </View>

                {/* Alert Banner */}
                <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6 border border-red-200 dark:border-red-800">
                  <View className="flex-row items-start">
                    <Ionicons name="alert-circle" size={20} color="#dc2626" className="mt-1 mr-3" />
                    <Text className="flex-1 text-sm font-semibold text-red-800 dark:text-red-200">
                      {t('emergency.dialog.alert_banner_text')}
                    </Text>
                  </View>
                </View>

                {/* What Happens Next */}
                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
                  <Text className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
                    {t('emergency.dialog.what_happens_next')}
                  </Text>
                  <View className="space-y-2">
                    <View className="flex-row items-start">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold mr-2">1.</Text>
                      <Text className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        {t('emergency.dialog.what_happens_1')}
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold mr-2">2.</Text>
                      <Text className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        {t('emergency.dialog.what_happens_2')}
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold mr-2">3.</Text>
                      <Text className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        {t('emergency.dialog.what_happens_3')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Confirmation Buttons */}
                <Button
                  title={loading ? t('emergency.dialog.sending_alert') : t('emergency.dialog.send_alert')}
                  onPress={handleTriggerEmergency}
                  disabled={loading}
                  className="bg-red-600 active:bg-red-700 mb-3"
                />

                <Button
                  title={t('emergency.dialog.cancel')}
                  onPress={() => setStep('type')}
                  variant="outline"
                  disabled={loading}
                />
              </View>
            )}
          </ScrollView>

          {loading && (
            <View className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-3xl">
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}