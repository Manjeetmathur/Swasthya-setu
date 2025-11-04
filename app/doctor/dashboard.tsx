import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore } from '@/stores/appointmentsStore'
import { Ionicons } from '@expo/vector-icons'

export default function DoctorDashboard() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading: appointmentsLoading } = useAppointmentsStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribeAppointments = subscribeToAppointments(userData.uid, 'doctor')
      
      return () => {
        unsubscribeAppointments()
      }
    }
  }, [userData?.uid, subscribeToAppointments])

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  // Calculate statistics
  const todayAppointments = appointments.filter((apt) => {
    const aptDate = apt.date.toDate()
    const today = new Date()
    return (
      aptDate.getDate() === today.getDate() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getFullYear() === today.getFullYear()
    )
  })

  const pendingAppointments = appointments.filter((apt) => apt.status === 'pending')
  const confirmedAppointments = appointments.filter((apt) => apt.status === 'confirmed')
  const completedAppointments = appointments.filter((apt) => apt.status === 'completed')
  
  const thisMonthAppointments = appointments.filter((apt) => {
    const aptDate = apt.date.toDate()
    const now = new Date()
    return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear()
  })

  // Calculate revenue (if consultation fee exists)
  const consultationFee = userData?.doctorData?.consultationFee || 0
  const monthlyRevenue = completedAppointments.length * consultationFee

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mt-1">
            Dr. {userData?.displayName || 'Doctor'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/doctor/profile')}
          className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full"
        >
          <Ionicons name="person-circle" size={28} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          {/* Stats Cards Grid */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Overview
            </Text>
            <View className="flex-row flex-wrap gap-4">
              {/* Today's Appointments */}
              <View className="bg-blue-600 rounded-xl p-4 w-[48%] shadow-lg">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="calendar" size={24} color="#ffffff" />
                  <View className="bg-white/20 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">TODAY</Text>
                  </View>
                </View>
                <Text className="text-3xl font-bold text-white mb-1">
                  {todayAppointments.length}
                </Text>
                <Text className="text-blue-100 text-sm">Appointments</Text>
              </View>

              {/* Pending Requests */}
              <View className="bg-orange-600 rounded-xl p-4 w-[48%] shadow-lg">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="time" size={24} color="#ffffff" />
                  <View className="bg-white/20 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">PENDING</Text>
                  </View>
                </View>
                <Text className="text-3xl font-bold text-white mb-1">
                  {pendingAppointments.length}
                </Text>
                <Text className="text-orange-100 text-sm">Awaiting Approval</Text>
              </View>

              {/* Monthly Revenue */}
              {consultationFee > 0 && (
                <View className="bg-green-600 rounded-xl p-4 w-[48%] shadow-lg">
                  <View className="flex-row items-center justify-between mb-2">
                    <Ionicons name="cash" size={24} color="#ffffff" />
                    <View className="bg-white/20 px-2 py-1 rounded-full">
                      <Text className="text-white text-xs font-semibold">MONTH</Text>
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-white mb-1">
                    ₹{monthlyRevenue.toLocaleString()}
                  </Text>
                  <Text className="text-green-100 text-sm">Revenue</Text>
                </View>
              )}

              {/* Completed Appointments */}
              <View className="bg-purple-600 rounded-xl p-4 w-[48%] shadow-lg">
                <View className="flex-row items-center justify-between mb-2">
                  <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                  <View className="bg-white/20 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-semibold">TOTAL</Text>
                  </View>
                </View>
                <Text className="text-3xl font-bold text-white mb-1">
                  {completedAppointments.length}
                </Text>
                <Text className="text-purple-100 text-sm">Completed</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </Text>
            <View className="flex-row flex-wrap gap-3">
              <TouchableOpacity
                onPress={() => router.push('/doctor/patients')}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-row items-center w-[48%] border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <View className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-3">
                  <Ionicons name="people" size={24} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    My Patients
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">
                    View all patients
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/doctor/schedule')}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-row items-center w-[48%] border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <View className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-3">
                  <Ionicons name="calendar-outline" size={24} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    Schedule
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">
                    View appointments
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/doctor/calls')}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-row items-center w-[48%] border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <View className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mr-3">
                  <Ionicons name="videocam" size={24} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    Video Calls
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs">
                    Manage calls
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pending Appointments */}
          {pendingAppointments.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Requests
                </Text>
                <TouchableOpacity onPress={() => router.push('/doctor/schedule')}>
                  <Text className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>
              {pendingAppointments.slice(0, 3).map((appointment) => (
                <View
                  key={appointment.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700"
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
                        {appointment.reason}
                      </Text>
                    </View>
                    <View className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full">
                      <Text className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                        PENDING
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Monthly Statistics */}
          <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 mb-6">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              This Month's Performance
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {thisMonthAppointments.length}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Total Appointments
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completedAppointments.length}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Completed
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {confirmedAppointments.length}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Confirmed
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

