import React, { useState } from 'react'
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
import { useEmergencyStore } from '@/stores/emergencyStore'
import EmergencyService, { EmergencyDetails } from '@/lib/emergencyService'
import { EmergencyType } from '@/stores/emergencyStore'
import Button from './Button'

interface EmergencyDialogProps {
  visible: boolean
  onClose: () => void
  onEmergencyTriggered?: (emergencyId: string) => void
}

const EMERGENCY_TYPES = [
  {
    id: 'cardiac' as EmergencyType,
    label: 'Cardiac Emergency',
    icon: 'heart',
    color: '#dc2626',
    description: 'Heart attack or chest pain'
  },
  {
    id: 'accident' as EmergencyType,
    label: 'Accident/Injury',
    icon: 'warning',
    color: '#ea580c',
    description: 'Road accident, fall, or severe injury'
  },
  {
    id: 'eye_injury' as EmergencyType,
    label: 'Eye Injury/Loss of Vision',
    icon: 'eye-off',
    color: '#06b6d4',
    description: 'Eye trauma or sudden vision loss'
  },
  {
    id: 'pregnancy' as EmergencyType,
    label: 'Pregnancy/Childbirth',
    icon: 'heart-half',
    color: '#ec4899',
    description: 'Complications during pregnancy or labor'
  },
  {
    id: 'trauma' as EmergencyType,
    label: 'Trauma/Bleeding',
    icon: 'alert-circle',
    color: '#991b1b',
    description: 'Severe bleeding or traumatic injury'
  },
  {
    id: 'respiratory' as EmergencyType,
    label: 'Respiratory Distress',
    icon: 'wind',
    color: '#0891b2',
    description: 'Difficulty breathing or shortness of breath'
  },
  {
    id: 'stroke' as EmergencyType,
    label: 'Stroke/Neurological',
    icon: 'flash',
    color: '#9333ea',
    description: 'Facial drooping, slurred speech, or weakness'
  },
  {
    id: 'allergic' as EmergencyType,
    label: 'Allergic Reaction',
    icon: 'water',
    color: '#d97706',
    description: 'Severe allergic reaction or anaphylaxis'
  },
  {
    id: 'poisoning' as EmergencyType,
    label: 'Poisoning/Overdose',
    icon: 'warning',
    color: '#7c2d12',
    description: 'Drug overdose or substance poisoning'
  },
  {
    id: 'seizure' as EmergencyType,
    label: 'Seizure',
    icon: 'swap-vertical',
    color: '#4f46e5',
    description: 'Convulsions or seizure activity'
  },
  {
    id: 'unconscious' as EmergencyType,
    label: 'Unconscious/Collapse',
    icon: 'person',
    color: '#1f2937',
    description: 'Loss of consciousness or fainting'
  },
  {
    id: 'burn' as EmergencyType,
    label: 'Burn/Chemical Injury',
    icon: 'flame',
    color: '#f97316',
    description: 'Thermal, chemical, or electrical burns'
  },
  {
    id: 'choking' as EmergencyType,
    label: 'Choking/Airway',
    icon: 'close-circle',
    color: '#b91c1c',
    description: 'Object stuck in throat or airway blockage'
  },
  {
    id: 'chest_pain' as EmergencyType,
    label: 'Chest Pain',
    icon: 'pulse',
    color: '#be123c',
    description: 'Severe chest discomfort or pressure'
  },
  {
    id: 'abdominal' as EmergencyType,
    label: 'Severe Abdominal Pain',
    icon: 'body',
    color: '#92400e',
    description: 'Severe stomach or abdominal pain'
  },
  {
    id: 'fracture' as EmergencyType,
    label: 'Fracture/Bone Break',
    icon: 'close',
    color: '#7c3aed',
    description: 'Suspected broken bone or severe sprain'
  },
  {
    id: 'spinal' as EmergencyType,
    label: 'Spinal Injury',
    icon: 'swap-horizontal',
    color: '#1e40af',
    description: 'Back or neck injury with suspected spinal damage'
  },
  {
    id: 'drowning' as EmergencyType,
    label: 'Drowning/Water Emergency',
    icon: 'water',
    color: '#0369a1',
    description: 'Water-related emergency or near drowning'
  },
  {
    id: 'electrocution' as EmergencyType,
    label: 'Electrocution/Shock',
    icon: 'flash-off',
    color: '#fbbf24',
    description: 'Electric shock or lightning strike injury'
  },
  {
    id: 'severe_headache' as EmergencyType,
    label: 'Severe Headache',
    icon: 'alert-circle-outline',
    color: '#ec4899',
    description: 'Sudden severe headache or migraine'
  },
  {
    id: 'mental_crisis' as EmergencyType,
    label: 'Mental Health Crisis',
    icon: 'md-heart-outline',
    color: '#8b5cf6',
    description: 'Suicidal thoughts, severe anxiety, or mental emergency'
  },
  {
    id: 'infection' as EmergencyType,
    label: 'Severe Infection/Sepsis',
    icon: 'bug',
    color: '#ca8a04',
    description: 'High fever, severe infection, or sepsis'
  },
  {
    id: 'gunshot' as EmergencyType,
    label: 'Gunshot/Stab Wound',
    icon: 'warning',
    color: '#7f1d1d',
    description: 'Gunshot or stab wound injury'
  },
  {
    id: 'general' as EmergencyType,
    label: 'Other Emergency',
    icon: 'help-circle',
    color: '#6366f1',
    description: 'Other medical or non-medical emergency'
  }
]

export default function EmergencyDialog({
  visible,
  onClose,
  onEmergencyTriggered
}: EmergencyDialogProps) {
  const { userData } = useAuthStore()
  const { createEmergencyAlert, findNearbyHospitals } = useEmergencyStore()
  const [step, setStep] = useState<'type' | 'confirm'>('type')
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null)
  const [loading, setLoading] = useState(false)

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
        description: 'Emergency medical assistance required',
        estimatedCasualties: 1,
        affectedArea: 'Current location'
      }

      const alert = await EmergencyService.triggerEmergencyAlert(
        userData.uid,
        userData.displayName || 'Patient',
        userData.email || 'Unknown',
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
          userData.displayName || 'Patient',
          userData.email || 'Unknown',
          { address, ...location },
          selectedType
        )

        Alert.alert(
          'Emergency Alert Sent! 🚨',
          'Nearby hospitals have been notified. Emergency services are on their way.',
          [{ text: 'OK', onPress: handleClose }]
        )

        onEmergencyTriggered?.(alert.id)
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send emergency alert')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('type')
    setSelectedType(null)
    onClose()
  }

  const selectedTypeData = EMERGENCY_TYPES.find(t => t.id === selectedType)

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
              Emergency Services
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
                  Select Emergency Type
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose the type of emergency you're experiencing
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
                      Confirming this will immediately notify nearby hospitals of your emergency and share your location
                    </Text>
                  </View>
                </View>

                {/* What Happens Next */}
                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
                  <Text className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
                    What happens next:
                  </Text>
                  <View className="space-y-2">
                    <View className="flex-row items-start">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold mr-2">1.</Text>
                      <Text className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        Location shared with nearby hospitals
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold mr-2">2.</Text>
                      <Text className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        Emergency responders dispatch immediately
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-blue-600 dark:text-blue-400 font-bold mr-2">3.</Text>
                      <Text className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                        Video link established for assessment
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Confirmation Buttons */}
                <Button
                  title={loading ? 'Sending Alert...' : 'Yes, Send Emergency Alert'}
                  onPress={handleTriggerEmergency}
                  disabled={loading}
                  className="bg-red-600 active:bg-red-700 mb-3"
                />

                <Button
                  title="Cancel"
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