import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore } from '@/stores/appointmentsStore'
import { useEmergencyStore } from '@/stores/emergencyStore'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import Button from '@/components/Button'
import EmergencyDialog from '@/components/EmergencyDialog'
import EmergencyAlert from '@/components/EmergencyAlert'
import EmergencyServicesSection from '@/components/EmergencyServicesSection'
import { Ionicons } from '@expo/vector-icons'

export default function PatientHome() {
  const router = useRouter()
  const { userData, logout } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading } = useAppointmentsStore()
  const { activeAlert, endEmergency, cancelEmergency } = useEmergencyStore()
  const [refreshing, setRefreshing] = useState(false)
  const [emergencyDialogVisible, setEmergencyDialogVisible] = useState(false)

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribe = subscribeToAppointments(userData.uid, 'patient')
      return () => unsubscribe()
    }
  }, [userData?.uid, subscribeToAppointments])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Refresh logic handled by store subscription
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleEmergencyTriggered = (emergencyId: string) => {
    setEmergencyDialogVisible(false)
  }

  const handleCancelEmergency = async () => {
    if (!activeAlert) return

    Alert.alert(
      'Cancel Emergency',
      'Are you sure you want to cancel this emergency alert?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelEmergency(activeAlert.id)
              Alert.alert('Success', 'Emergency alert cancelled')
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel emergency alert')
            }
          }
        }
      ]
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      await signOut(auth)
      // Use replace to clear navigation history
      router.replace('/role-selection')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const upcomingAppointments = appointments.filter(
    (apt) => apt.status === 'confirmed' || apt.status === 'pending'
  ).slice(0, 3)

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back,
              </Text>
              <Text className="text-xl text-gray-600 dark:text-gray-400">
                {userData?.displayName || 'Patient'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Quick Actions
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-blue-600 rounded-lg p-4 items-center"
                onPress={() => router.push('/patient/book')}
              >
                <Ionicons name="calendar-outline" size={24} color="#ffffff" />
                <Text className="text-white font-semibold mt-2">Book Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-600 rounded-lg p-4 items-center"
                onPress={() => router.push('/patient/chat')}
              >
                <Ionicons name="chatbubbles-outline" size={24} color="#ffffff" />
                <Text className="text-white font-semibold mt-2">Chat</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Emergency Alert */}
          {activeAlert && (
            <EmergencyAlert
              alert={activeAlert}
              onCancel={handleCancelEmergency}
            />
          )}

          {/* Emergency Services Section */}
          <EmergencyServicesSection
            onEmergency={() => setEmergencyDialogVisible(true)}
          />

          {/* Medical AI Assistant Cards */}
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              AI Health Assistant
            </Text>
            
            <TouchableOpacity
              className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-4"
              onPress={() => router.push('/patient/medicine-info')}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="medical" size={24} color="#f00505ff" />
                    <Text className="text-white font-bold text-lg ml-2">Medical Assistant</Text>
                  </View>
                  <Text className=" text-sm mb-3">
                    Get instant answers about medicines, symptoms, and health conditions
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={16} color="#e9d712ff" />
                    <Text className=" text-xs ml-1 font-medium">AI-Powered</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800"
                onPress={() => router.push('/patient/medicine-info')}
              >
                <Ionicons name="medical" size={24} color="#8b5cf6" />
                <Text className="text-gray-900 dark:text-white font-semibold mt-2 text-sm">
                  Medicine Info
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  Uses & side effects
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
                onPress={() => router.push('/patient/symptoms-check')}
              >
                <Ionicons name="medical" size={24} color="#3b82f6" />
                <Text className="text-gray-900 dark:text-white font-semibold mt-2 text-sm">
                  Symptoms Check
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  Health guidance
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800"
                onPress={() => router.push('/patient/health-tips')}
              >
                <Ionicons name="heart" size={24} color="#10b981" />
                <Text className="text-gray-900 dark:text-white font-semibold mt-2 text-sm">
                  Health Tips
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                  Wellness advice
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Upcoming Appointments
          </Text>

          {isLoading ? (
            <Text className="text-gray-500 text-center py-8">Loading appointments...</Text>
          ) : upcomingAppointments.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center">
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                No upcoming appointments
              </Text>
              <Button
                title="Book Your First Appointment"
                onPress={() => router.push('/patient/book')}
                className="mt-4"
                size="sm"
              />
            </View>
          ) : (
            upcomingAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      Dr. {appointment.doctorName}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 mt-1">
                      {appointment.date.toDate().toLocaleDateString()} at {appointment.time}
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                      Reason: {appointment.reason}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      appointment.status === 'confirmed'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        appointment.status === 'confirmed'
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-yellow-700 dark:text-yellow-300'
                      }`}
                    >
                      {appointment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Emergency Dialog */}
      <EmergencyDialog
        visible={emergencyDialogVisible}
        onClose={() => setEmergencyDialogVisible(false)}
        onEmergencyTriggered={handleEmergencyTriggered}
      />
    </SafeAreaView>
  )
}

