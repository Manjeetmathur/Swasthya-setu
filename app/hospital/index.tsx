import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { useBedManagementStore } from '@/stores/bedManagementStore'
import { useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function HospitalDashboard() {
  const router = useRouter()
  const { userData, logout } = useAuthStore()
  const { beds, subscribeToBeds, getBedStats, isLoading } = useBedManagementStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (userData?.hospitalData) {
      const unsubscribe = subscribeToBeds(undefined, userData.uid)
      return unsubscribe
    }
  }, [userData])

  const onRefresh = async () => {
    setRefreshing(true)
    // The real-time subscription will automatically update the data
    setTimeout(() => setRefreshing(false), 1000)
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
              router.replace('/')
            } catch (error) {
              console.error('Logout error:', error)
            }
          }
        }
      ]
    )
  }

  if (!userData?.hospitalData) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="business-outline" size={64} color="#9333ea" />
          <Text className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
            Hospital Data Not Found
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-center">
            Your hospital profile is incomplete. Please contact support.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const hospitalData = userData.hospitalData
  const bedStats = getBedStats()
  const icuBeds = beds.filter(bed => bed.type === 'icu')
  const availableICUBeds = icuBeds.filter(bed => bed.status === 'available').length

  const dashboardCards = [
    {
      title: 'Total Beds',
      value: bedStats.total.toString(),
      icon: 'bed-outline',
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Available Beds',
      value: bedStats.available.toString(),
      icon: 'checkmark-circle-outline',
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Occupied Beds',
      value: bedStats.occupied.toString(),
      icon: 'person-outline',
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      title: 'ICU Beds',
      value: `${availableICUBeds}/${icuBeds.length}`,
      icon: 'medical-outline',
      color: '#ef4444',
      bgColor: '#fee2e2'
    }
  ]

  const quickActions = [
    {
      title: 'Manage Beds',
      subtitle: 'Update bed availability',
      icon: 'bed-outline',
      color: '#9333ea',
      onPress: () => router.push('/hospital/bed-management')
    },
    {
      title: 'Staff Management',
      subtitle: 'Manage hospital staff',
      icon: 'people-outline',
      color: '#059669',
      onPress: () => router.push('/hospital/staff')
    },
    {
      title: 'Patient Records',
      subtitle: 'View patient information',
      icon: 'document-text-outline',
      color: '#dc2626',
      onPress: () => router.push('/hospital/patients')
    },
    {
      title: 'Hospital Profile',
      subtitle: 'Update hospital details',
      icon: 'business-outline',
      color: '#7c3aed',
      onPress: () => router.push('/hospital/profile')
    }
  ]

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {hospitalData.hospitalName}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400">
                {hospitalData.hospitalType} • {hospitalData.city}, {hospitalData.state}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Status */}
        <View className="mx-6 mt-4">
          {hospitalData.isVerified ? (
            <View className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
                <Text className="ml-2 text-green-800 dark:text-green-200 font-medium">
                  Verified Hospital
                </Text>
              </View>
              <Text className="text-green-700 dark:text-green-300 text-sm mt-1">
                Your hospital has been verified by admin. All features are available.
              </Text>
            </View>
          ) : (
            <View className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <View className="flex-row items-center">
                <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                <Text className="ml-2 text-yellow-800 dark:text-yellow-200 font-medium">
                  Pending Verification
                </Text>
              </View>
              <Text className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                Your hospital is pending admin verification. Some features may be limited.
              </Text>
            </View>
          )}
        </View>

        {/* Dashboard Cards */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Bed Overview
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {dashboardCards.map((card, index) => (
              <View
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                style={{ width: '48%' }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: card.bgColor }}
                  >
                    <Ionicons name={card.icon as any} size={20} color={card.color} />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </Text>
                </View>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {card.title}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </Text>
          <View className="space-y-3">
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 active:scale-95"
                activeOpacity={0.9}
              >
                <View className="flex-row items-center">
                  <View
                    className="p-3 rounded-xl mr-4"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {action.title}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">
                      {action.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hospital Info */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Hospital Information
          </Text>
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <View className="space-y-3">
              <View className="flex-row">
                <Text className="text-gray-600 dark:text-gray-400 w-24">Phone:</Text>
                <Text className="text-gray-900 dark:text-white flex-1">
                  {hospitalData.phoneNumber}
                </Text>
              </View>
              {hospitalData.emergencyNumber && (
                <View className="flex-row">
                  <Text className="text-gray-600 dark:text-gray-400 w-24">Emergency:</Text>
                  <Text className="text-gray-900 dark:text-white flex-1">
                    {hospitalData.emergencyNumber}
                  </Text>
                </View>
              )}
              <View className="flex-row">
                <Text className="text-gray-600 dark:text-gray-400 w-24">Address:</Text>
                <Text className="text-gray-900 dark:text-white flex-1">
                  {hospitalData.address}, {hospitalData.city}, {hospitalData.state} - {hospitalData.pincode}
                </Text>
              </View>
              {hospitalData.specialties.length > 0 && (
                <View className="flex-row">
                  <Text className="text-gray-600 dark:text-gray-400 w-24">Specialties:</Text>
                  <Text className="text-gray-900 dark:text-white flex-1">
                    {hospitalData.specialties.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}