import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface EmergencyServicesSectionProps {
  onEmergency: () => void
}

export default function EmergencyServicesSection({
  onEmergency
}: EmergencyServicesSectionProps) {
  return (
    <View className="mb-6">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        🚨 Emergency Services
      </Text>

      {/* Main Emergency Button - Prominent */}
      <TouchableOpacity
        onPress={onEmergency}
        className="bg-red-600 rounded-lg p-4 mb-4 items-center active:bg-red-700"
        activeOpacity={0.8}
      >
        <Ionicons name="alert-circle" size={32} color="#ffffff" />
        <Text className="text-white font-semibold mt-2 text-lg">SOS - Emergency</Text>
        <Text className="text-red-100 text-xs mt-1">Tap to select emergency type</Text>
      </TouchableOpacity>

      {/* Info Banner */}
      <View className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mt-3 flex-row items-start border border-amber-200 dark:border-amber-900">
        <Ionicons name="information-circle" size={16} color="#d97706" className="mt-0.5 mr-2" />
        <Text className="text-amber-900 dark:text-amber-200 text-xs flex-1">
          One-tap emergency. Select type → Confirm → Hospitals notified instantly with your location. Always call 112 for life-threatening situations.
        </Text>
      </View>
    </View>
  )
}