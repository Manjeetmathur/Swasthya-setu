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
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Emergency Services
      </Text>

      {/* Main Emergency Button - Prominent */}
      <TouchableOpacity
        onPress={onEmergency}
        className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 mb-4 items-center shadow-lg"
        style={{
          backgroundColor: '#dc2626',
          shadowColor: '#dc2626',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12
        }}
        activeOpacity={0.9}
      >
        <View className="bg-white/20 rounded-full p-4 mb-3">
          <Ionicons name="alert-circle" size={40} color="#ffffff" />
        </View>
        <Text className="text-white font-bold text-xl mb-1">SOS Emergency</Text>
        <Text className="text-red-100 text-sm">Tap to select emergency type</Text>
      </TouchableOpacity>

      {/* Info Banner */}
      <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex-row items-start border border-amber-200 dark:border-amber-800">
        <View className="bg-amber-100 dark:bg-amber-900/40 rounded-full p-2 mr-3">
          <Ionicons name="information-circle" size={18} color="#d97706" />
        </View>
        <View className="flex-1">
          <Text className="text-amber-900 dark:text-amber-200 text-xs font-medium leading-5">
            One-tap emergency alert. Select type → Confirm → Hospitals notified instantly with your location. Always call 112 for life-threatening situations.
          </Text>
        </View>
      </View>
    </View>
  )
}