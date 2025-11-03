import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore } from '@/stores/appointmentsStore'
import { doc, updateDoc } from 'firebase/firestore'
import { db , auth } from '@/lib/firebase'

import { signOut } from 'firebase/auth'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'

export default function DoctorSchedule() {
  const router = useRouter()
  const { userData, logout } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading } = useAppointmentsStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribe = subscribeToAppointments(userData.uid, 'doctor')
      return () => unsubscribe()
    }
  }, [userData?.uid, subscribeToAppointments])

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      await logout()
      router.replace('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        status: status
      })
      Alert.alert('Success', `Appointment ${status}`)
    } catch (error) {
      console.error('Error updating appointment:', error)
      Alert.alert('Error', 'Failed to update appointment')
    }
  }

  const pendingAppointments = appointments.filter((apt) => apt.status === 'pending')
  const confirmedAppointments = appointments.filter((apt) => apt.status === 'confirmed')
  const todayAppointments = appointments.filter((apt) => {
    const aptDate = apt.date.toDate()
    const today = new Date()
    return (
      aptDate.getDate() === today.getDate() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getFullYear() === today.getFullYear() &&
      (apt.status === 'confirmed' || apt.status === 'pending')
    )
  })

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Dr. {userData?.displayName || 'Doctor'}
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Today's Appointments
            </Text>
            <Text className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {todayAppointments.length}
            </Text>
          </View>

          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Pending Requests
          </Text>

          {isLoading ? (
            <Text className="text-gray-500 text-center py-8">Loading appointments...</Text>
          ) : pendingAppointments.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center mb-6">
              <Ionicons name="checkmark-circle-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                No pending appointments
              </Text>
            </View>
          ) : (
            pendingAppointments.map((appointment) => (
              <View
                key={appointment.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
              >
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {appointment.patientName}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 mt-1">
                  {appointment.date.toDate().toLocaleDateString()} at {appointment.time}
                </Text>
                <Text className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  Reason: {appointment.reason}
                </Text>

                <View className="flex-row gap-2 mt-4">
                  <Button
                    title="Confirm"
                    onPress={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                    size="sm"
                    className="flex-1"
                  />
                  <Button
                    title="Decline"
                    onPress={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  />
                </View>
              </View>
            ))
          )}

          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4 mt-6">
            Confirmed Appointments
          </Text>

          {confirmedAppointments.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center mb-6">
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                No confirmed appointments
              </Text>
            </View>
          ) : (
            confirmedAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {appointment.patientName}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 mt-1">
                      {appointment.date.toDate().toLocaleDateString()} at {appointment.time}
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                      Reason: {appointment.reason}
                    </Text>
                  </View>
                  <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                    <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                      CONFIRMED
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

