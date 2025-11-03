import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { EmergencyAlert as EmergencyAlertType } from '@/stores/emergencyStore'

interface EmergencyAlertProps {
  alert: EmergencyAlertType | null
  onCancel?: () => void
}

export default function EmergencyAlert({
  alert,
  onCancel
}: EmergencyAlertProps) {
  if (!alert) return null

  const getStatusColor = () => {
    switch (alert.status) {
      case 'active':
        return '#dc2626'
      case 'responded':
        return '#2563eb'
      case 'resolved':
        return '#16a34a'
      case 'cancelled':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getStatusText = () => {
    switch (alert.status) {
      case 'active':
        return 'Emergency Alert Active'
      case 'responded':
        return 'Emergency Responded'
      case 'resolved':
        return 'Emergency Resolved'
      case 'cancelled':
        return 'Emergency Cancelled'
      default:
        return 'Unknown Status'
    }
  }

  const getSeverityColor = () => {
    switch (alert.severity.level) {
      case 'critical':
        return '#dc2626'
      case 'high':
        return '#ea580c'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#10b981'
      default:
        return '#6b7280'
    }
  }

  return (
    <View className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border-l-4" style={{ borderLeftColor: getStatusColor() }}>
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 bg-red-50 dark:bg-red-900/20">
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: getStatusColor() + '20' }}
          >
            <Ionicons name="alert" size={20} color={getStatusColor()} />
          </View>
          <View className="flex-1">
            <Text className="text-red-900 dark:text-red-200 font-bold text-sm">
              {getStatusText()}
            </Text>
            <Text className="text-red-800 dark:text-red-300 text-xs">
              {alert.type.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: getSeverityColor() + '20' }}
        >
          <Text
            className="text-xs font-bold uppercase"
            style={{ color: getSeverityColor() }}
          >
            {alert.severity.level}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="p-4">
        <View className="mb-4">
          <View className="flex-row items-start mb-3">
            <Ionicons name="location" size={16} color="#6b7280" className="mt-1 mr-2" />
            <Text className="text-gray-700 dark:text-gray-300 text-sm flex-1">
              {alert.address}
            </Text>
          </View>

          <View className="flex-row items-start mb-3">
            <Ionicons name="document-text" size={16} color="#6b7280" className="mt-1 mr-2" />
            <Text className="text-gray-700 dark:text-gray-300 text-sm flex-1">
              {alert.description}
            </Text>
          </View>

          {alert.severity.estimatedCasualties && alert.severity.estimatedCasualties > 1 && (
            <View className="flex-row items-start mb-3">
              <Ionicons name="people" size={16} color="#6b7280" className="mt-1 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">
                Estimated casualties: {alert.severity.estimatedCasualties}
              </Text>
            </View>
          )}

          {alert.respondingHospitals.length > 0 && (
            <View className="flex-row items-start">
              <Ionicons name="medical" size={16} color="#6b7280" className="mt-1 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">
                {alert.respondingHospitals.length} hospital{alert.respondingHospitals.length !== 1 ? 's' : ''} responding
              </Text>
            </View>
          )}
        </View>

        {/* Video Stream Status */}
        {alert.videoStreamUrl && (
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 mb-4 flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-red-600 mr-2 animate-pulse" />
            <Text className="text-blue-900 dark:text-blue-200 text-sm font-semibold">
              Video stream active for triage
            </Text>
          </View>
        )}

        {/* Ambulance Status */}
        {alert.ambulanceDispatched && (
          <View className="bg-green-50 dark:bg-green-900/20 rounded p-3 mb-4 flex-row items-center">
            <Ionicons name="car" size={16} color="#16a34a" className="mr-2" />
            <Text className="text-green-900 dark:text-green-200 text-sm font-semibold">
              {alert.estimatedArrivalTime ? `Ambulance arriving in ~${alert.estimatedArrivalTime} mins` : 'Ambulance dispatched'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {alert.status === 'active' && (
          <TouchableOpacity
            onPress={onCancel}
            className="bg-gray-300 dark:bg-gray-600 rounded-lg py-3 items-center justify-center"
          >
            <Text className="text-gray-900 dark:text-white font-semibold">Cancel Emergency</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}