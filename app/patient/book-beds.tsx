import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useBedManagementStore, BedBooking } from '@/stores/bedManagementStore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Ionicons } from '@expo/vector-icons'

export default function BookBeds() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { bookings, subscribeToBookings, isLoading } = useBedManagementStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BedBooking | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [hospitalNames, setHospitalNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribe = subscribeToBookings(userData.uid, 'patient')
      return () => unsubscribe()
    }
  }, [userData?.uid, subscribeToBookings])

  useEffect(() => {
    // Fetch hospital names for all bookings
    const fetchHospitalNames = async () => {
      const hospitalIds = [...new Set(bookings
        .map(b => b.hospitalId)
        .filter((id): id is string => !!id))]

      const names: Record<string, string> = {}
      for (const hospitalId of hospitalIds) {
        try {
          const hospitalDoc = await getDoc(doc(db, 'users', hospitalId))
          if (hospitalDoc.exists()) {
            names[hospitalId] = hospitalDoc.data().hospitalData?.hospitalName || 'Unknown Hospital'
          }
        } catch (error) {
          console.error(`Error fetching hospital ${hospitalId}:`, error)
        }
      }
      setHospitalNames(names)
    }

    if (bookings.length > 0) {
      fetchHospitalNames()
    }
  }, [bookings])

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleViewBooking = (booking: BedBooking) => {
    setSelectedBooking(booking)
    setShowBookingModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: 'checkmark-circle' }
      case 'rejected':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: 'close-circle' }
      case 'pending':
        return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: 'time' }
      case 'completed':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: 'checkmark-done' }
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: 'help-circle' }
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' }
      case 'urgent':
        return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' }
      default:
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' }
    }
  }

  // Sort bookings by date (most recent first)
  const sortedBookings = [...bookings].sort((a, b) => {
    return b.requestedAt.toMillis() - a.requestedAt.toMillis()
  })

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Book Beds
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Track your bed booking requests
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading && bookings.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="refresh" size={48} color="#6b7280" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4">
              Loading bookings...
            </Text>
          </View>
        ) : sortedBookings.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="bed-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center px-6">
              No bed bookings yet
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 mt-2 text-center px-6 text-sm">
              Book a bed from hospital details to see your requests here
            </Text>
          </View>
        ) : (
          <View className="px-6 py-4">
            {sortedBookings.map((booking) => {
              const statusStyle = getStatusColor(booking.status)
              const urgencyStyle = getUrgencyColor(booking.urgency)
              
              return (
                <TouchableOpacity
                  key={booking.id}
                  onPress={() => handleViewBooking(booking)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        Bed {booking.bedNumber}
                      </Text>
                      {booking.hospitalId && hospitalNames[booking.hospitalId] && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="business" size={14} color="#8b5cf6" />
                          <Text className="text-purple-600 dark:text-purple-400 text-sm font-medium ml-1">
                            {hospitalNames[booking.hospitalId]}
                          </Text>
                        </View>
                      )}
                      <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {booking.ward} • {booking.department}
                      </Text>
                    </View>
                    <View className={`${statusStyle.bg} px-3 py-1 rounded-full flex-row items-center`}>
                      <Ionicons name={statusStyle.icon as any} size={14} color={statusStyle.text.includes('green') ? '#10b981' : statusStyle.text.includes('red') ? '#ef4444' : statusStyle.text.includes('orange') ? '#f59e0b' : '#3b82f6'} />
                      <Text className={`${statusStyle.text} text-xs font-semibold ml-1`}>
                        {booking.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2 mb-3">
                    <View className={`${urgencyStyle.bg} px-3 py-1 rounded-full`}>
                      <Text className={`${urgencyStyle.text} text-xs font-semibold`}>
                        {booking.urgency.toUpperCase()}
                      </Text>
                    </View>
                    <View className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      <Text className="text-gray-700 dark:text-gray-300 text-xs font-semibold">
                        {booking.requestedAt.toDate().toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  {booking.reason && (
                    <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2" numberOfLines={2}>
                      {booking.reason}
                    </Text>
                  )}

                  <View className="flex-row items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                    <Text className="text-blue-600 dark:text-blue-400 text-sm font-semibold ml-1">
                      View Details
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>

      {/* Booking Detail Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-end">
          <View className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Booking Details
              </Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView>
                {/* Status Badge */}
                <View className="mb-6">
                  <View className={`${getStatusColor(selectedBooking.status).bg} rounded-xl p-4 items-center`}>
                    <Ionicons 
                      name={getStatusColor(selectedBooking.status).icon as any} 
                      size={48} 
                      color={getStatusColor(selectedBooking.status).text.includes('green') ? '#10b981' : getStatusColor(selectedBooking.status).text.includes('red') ? '#ef4444' : getStatusColor(selectedBooking.status).text.includes('orange') ? '#f59e0b' : '#3b82f6'} 
                    />
                    <Text className={`${getStatusColor(selectedBooking.status).text} text-xl font-bold mt-2`}>
                      {selectedBooking.status.toUpperCase()}
                    </Text>
                    {selectedBooking.status === 'pending' && (
                      <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1 text-center">
                        Waiting for hospital confirmation
                      </Text>
                    )}
                    {selectedBooking.status === 'approved' && (
                      <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1 text-center">
                        Your bed booking has been confirmed
                      </Text>
                    )}
                    {selectedBooking.status === 'rejected' && (
                      <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1 text-center">
                        Bed booking request was declined
                      </Text>
                    )}
                  </View>
                </View>

                {/* Booking Information */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Booking Information
                  </Text>
                  
                  <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                    {selectedBooking.hospitalId && hospitalNames[selectedBooking.hospitalId] && (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600 dark:text-gray-400">Hospital:</Text>
                        <View className="flex-row items-center">
                          <Ionicons name="business" size={16} color="#8b5cf6" />
                          <Text className="text-gray-900 dark:text-white font-semibold ml-1">
                            {hospitalNames[selectedBooking.hospitalId]}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-400">Bed Number:</Text>
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {selectedBooking.bedNumber}
                      </Text>
                    </View>
                    
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-400">Ward:</Text>
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {selectedBooking.ward}
                      </Text>
                    </View>
                    
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-400">Department:</Text>
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {selectedBooking.department}
                      </Text>
                    </View>
                    
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-400">Urgency:</Text>
                      <View className={`${getUrgencyColor(selectedBooking.urgency).bg} px-3 py-1 rounded-full`}>
                        <Text className={`${getUrgencyColor(selectedBooking.urgency).text} text-xs font-semibold`}>
                          {selectedBooking.urgency.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 dark:text-gray-400">Requested At:</Text>
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {selectedBooking.requestedAt.toDate().toLocaleString()}
                      </Text>
                    </View>
                    
                    {selectedBooking.approvedAt && (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600 dark:text-gray-400">Approved At:</Text>
                        <Text className="text-gray-900 dark:text-white font-semibold">
                          {selectedBooking.approvedAt.toDate().toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Reason */}
                {selectedBooking.reason && (
                  <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Reason for Admission
                    </Text>
                    <View className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <Text className="text-gray-900 dark:text-white">
                        {selectedBooking.reason}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Doctor Information */}
                {selectedBooking.doctorName && (
                  <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Doctor Information
                    </Text>
                    <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <Text className="text-gray-900 dark:text-white font-medium">
                        Dr. {selectedBooking.doctorName}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

