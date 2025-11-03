import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, Linking, TextInput, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, query, where, getDocs, addDoc, Timestamp, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Ionicons } from '@expo/vector-icons'
import { useBedManagementStore } from '@/stores/bedManagementStore'
import { useAuthStore } from '@/stores/authStore'
import { Calendar } from 'react-native-calendars'
import DateTimePicker from '@react-native-community/datetimepicker'

interface Hospital {
  id: string
  hospitalData: {
    hospitalName: string
    hospitalType: string
    hospitalLicense: string
    address: string
    city: string
    state: string
    pincode: string
    phoneNumber: string
    emergencyNumber?: string
    totalBeds: number
    icuBeds?: number
    specialties: string[]
    facilities: string[]
    accreditation?: string
    establishedYear?: number
    isVerified: boolean
  }
}

export default function AllHospitals() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { beds, subscribeToBeds, bookBed, getBedStats, isLoading: bedLoading } = useBedManagementStore()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [hospitalModalVisible, setHospitalModalVisible] = useState(false)
  const [bedStats, setBedStats] = useState<{total: number, available: number, occupied: number, maintenance: number} | null>(null)
  const [showBedBooking, setShowBedBooking] = useState(false)
  const [selectedBedType, setSelectedBedType] = useState<'general' | 'icu'>('general')
  const [bookingReason, setBookingReason] = useState('')
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentReason, setAppointmentReason] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loadingAppointment, setLoadingAppointment] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  useEffect(() => {
    fetchApprovedHospitals()
  }, [])

  const fetchApprovedHospitals = async () => {
    setLoading(true)
    try {
      const usersRef = collection(db, 'users')
      const hospitalQuery = query(
        usersRef,
        where('role', '==', 'hospital'),
        where('hospitalData.isVerified', '==', true)
      )
      
      const querySnapshot = await getDocs(hospitalQuery)
      const hospitalsList: Hospital[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.hospitalData) {
          hospitalsList.push({
            id: doc.id,
            hospitalData: data.hospitalData
          })
        }
      })
      
      setHospitals(hospitalsList)
    } catch (error) {
      console.error('Error fetching hospitals:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchApprovedHospitals()
  }

  const handleHospitalPress = (hospital: Hospital) => {
    setSelectedHospital(hospital)
    setHospitalModalVisible(true)
    
    // Subscribe to beds for this hospital
    subscribeToBeds(undefined, hospital.id)
  }

  // Update bed stats when beds change
  useEffect(() => {
    if (beds.length > 0) {
      const stats = getBedStats()
      setBedStats(stats)
      setLastUpdated(new Date())
    }
  }, [beds, getBedStats])

  // Auto-refresh bed data every 30 seconds when modal is open
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (hospitalModalVisible && selectedHospital && autoRefreshEnabled) {
      interval = setInterval(() => {
        // Re-subscribe to get fresh data
        subscribeToBeds(undefined, selectedHospital.id)
      }, 30000) // 30 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [hospitalModalVisible, selectedHospital, autoRefreshEnabled, subscribeToBeds])

  const handleCallHospital = (phoneNumber: string) => {
    Alert.alert(
      'Call Hospital',
      `Do you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`)
          }
        }
      ]
    )
  }

  const handleEmergencyCall = (emergencyNumber: string) => {
    Alert.alert(
      'Emergency Call',
      `Do you want to call emergency number ${emergencyNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${emergencyNumber}`)
          }
        }
      ]
    )
  }

  const handleOpenMaps = (hospital: Hospital) => {
    const { address, city, state, pincode } = hospital.hospitalData
    const fullAddress = `${address}, ${city}, ${state} ${pincode}`
    const encodedAddress = encodeURIComponent(fullAddress)
    
    Alert.alert(
      'Open in Maps',
      `Open ${hospital.hospitalData.hospitalName} location in Google Maps?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
            Linking.openURL(mapsUrl)
          }
        }
      ]
    )
  }

  const handleBookBed = async () => {
    if (!selectedHospital || !userData) {
      Alert.alert('Error', 'Missing hospital or user data')
      return
    }

    // Enhanced validation
    if (!bookingReason.trim()) {
      Alert.alert('Validation Error', 'Please provide a detailed reason for bed booking to help hospital staff prepare for your admission.')
      return
    }

    if (bookingReason.trim().length < 10) {
      Alert.alert('Validation Error', 'Please provide a more detailed reason (at least 10 characters) to help hospital staff understand your medical needs.')
      return
    }

    try {
      const availableBeds = beds.filter(bed => 
        bed.type === selectedBedType && 
        bed.status === 'available' &&
        bed.hospitalId === selectedHospital.id
      )

      if (availableBeds.length === 0) {
        Alert.alert(
          'No Beds Available', 
          `Unfortunately, no ${selectedBedType} beds are currently available at this hospital. Would you like to:`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Call Hospital', 
              onPress: () => handleCallHospital(selectedHospital.hospitalData.phoneNumber)
            },
            { 
              text: 'Try Emergency', 
              style: 'destructive',
              onPress: () => {
                if (selectedHospital.hospitalData.emergencyNumber) {
                  handleEmergencyCall(selectedHospital.hospitalData.emergencyNumber)
                }
              }
            }
          ]
        )
        return
      }

      const selectedBed = availableBeds[0] // Take the first available bed

      // Show confirmation dialog with booking details
      Alert.alert(
        'Confirm Bed Booking',
        `Please confirm your booking details:\n\n` +
        `Hospital: ${selectedHospital.hospitalData.hospitalName}\n` +
        `Bed Type: ${selectedBedType.toUpperCase()}\n` +
        `Available Beds: ${availableBeds.length}\n` +
        `Ward: ${selectedBed.ward}\n` +
        `Reason: ${bookingReason.trim()}\n\n` +
        `Note: This is a booking request. The hospital will review and confirm your booking within 2-4 hours.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Booking',
            style: 'default',
            onPress: async () => {
              try {
                await bookBed(
                  userData.uid,
                  '', // No doctor ID for direct patient booking
                  userData.displayName || 'Patient',
                  '', // No doctor name
                  selectedBed.id,
                  selectedBed.ward,
                  selectedBedType,
                  'normal',
                  bookingReason.trim()
                )

                Alert.alert(
                  'Booking Request Submitted Successfully! ✅',
                  `Your ${selectedBedType} bed booking request has been submitted to ${selectedHospital.hospitalData.hospitalName}.\n\n` +
                  `What happens next:\n` +
                  `• Hospital staff will review your request\n` +
                  `• You'll receive confirmation within 2-4 hours\n` +
                  `• Keep your phone available for hospital calls\n` +
                  `• Prepare necessary documents and insurance details\n\n` +
                  `Emergency Contact: ${selectedHospital.hospitalData.phoneNumber}`,
                  [
                    {
                      text: 'Got it!',
                      onPress: () => {
                        setShowBedBooking(false)
                        setBookingReason('')
                      }
                    },
                    {
                      text: 'Call Hospital Now',
                      onPress: () => {
                        setShowBedBooking(false)
                        setBookingReason('')
                        handleCallHospital(selectedHospital.hospitalData.phoneNumber)
                      }
                    }
                  ]
                )
              } catch (error) {
                console.error('Error booking bed:', error)
                Alert.alert(
                  'Booking Failed',
                  'Failed to submit bed booking request. Please try again or call the hospital directly.',
                  [
                    { text: 'Try Again', style: 'default' },
                    { 
                      text: 'Call Hospital', 
                      onPress: () => handleCallHospital(selectedHospital.hospitalData.phoneNumber)
                    }
                  ]
                )
              }
            }
          }
        ]
      )
    } catch (error) {
      console.error('Error in booking process:', error)
      Alert.alert('Error', 'An unexpected error occurred. Please try again or contact the hospital directly.')
    }
  }

  // Fetch booked time slots for selected date and hospital
  useEffect(() => {
    if (appointmentDate && selectedHospital) {
      const appointmentsRef = collection(db, 'appointments')
      const selectedDate = new Date(appointmentDate)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const q = query(
        appointmentsRef,
        where('hospitalId', '==', selectedHospital.id),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const booked = snapshot.docs
          .map(doc => doc.data().time)
          .filter(time => time) as string[]
        setBookedSlots(booked)
      })

      return () => unsubscribe()
    } else {
      setBookedSlots([])
    }
  }, [appointmentDate, selectedHospital])

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ]

  const handleBookAppointment = async () => {
    if (!selectedHospital || !userData) {
      Alert.alert('Error', 'Missing hospital or user data')
      return
    }

    if (!appointmentDate || !appointmentTime || !appointmentReason.trim()) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoadingAppointment(true)
    try {
      const selectedDate = new Date(appointmentDate)
      selectedDate.setHours(parseInt(appointmentTime.split(':')[0]), parseInt(appointmentTime.split(':')[1]))

      await addDoc(collection(db, 'appointments'), {
        patientId: userData.uid,
        hospitalId: selectedHospital.id,
        patientName: userData.displayName || 'Patient',
        hospitalName: selectedHospital.hospitalData.hospitalName,
        date: Timestamp.fromDate(selectedDate),
        time: appointmentTime,
        status: 'pending',
        reason: appointmentReason.trim(),
        appointmentType: 'hospital',
        createdAt: Timestamp.now()
      })

      Alert.alert('Success', 'Appointment booked successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            setShowAppointmentBooking(false)
            setAppointmentDate('')
            setAppointmentTime('')
            setAppointmentReason('')
          }
        }
      ])
    } catch (error: any) {
      console.error('Error booking appointment:', error)
      Alert.alert('Error', error.message || 'Failed to book appointment')
    } finally {
      setLoadingAppointment(false)
    }
  }

  // Fetch booked time slots for selected date and hospital
  useEffect(() => {
    if (appointmentDate && selectedHospital) {
      const appointmentsRef = collection(db, 'appointments')
      const selectedDate = new Date(appointmentDate)
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const q = query(
        appointmentsRef,
        where('hospitalId', '==', selectedHospital.id),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const booked = snapshot.docs
          .map(doc => doc.data().time)
          .filter(time => time) as string[]
        setBookedSlots(booked)
      })

      return () => unsubscribe()
    } else {
      setBookedSlots([])
    }
  }, [appointmentDate, selectedHospital])

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            All Hospitals
          </Text>
        </View>
        <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
          <Text className="text-purple-700 dark:text-purple-300 text-sm font-semibold">
            {hospitals.length} Verified
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          {loading ? (
            <Text className="text-gray-500 text-center py-8">Loading hospitals...</Text>
          ) : hospitals.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 items-center">
              <Ionicons name="business-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center text-lg">
                No verified hospitals available
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 mt-2 text-center">
                Check back later for new hospitals
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {hospitals.map((hospital) => (
                <TouchableOpacity
                  key={hospital.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                  onPress={() => handleHospitalPress(hospital)}
                >
                  <View className="flex-row items-center mb-3">
                    <View className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                      <Ionicons name="business" size={28} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                        {hospital.hospitalData.hospitalName}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {hospital.hospitalData.hospitalType}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-500 dark:text-gray-500 ml-1" numberOfLines={1}>
                          {hospital.hospitalData.city}, {hospital.hospitalData.state}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                        VERIFIED
                      </Text>
                    </View>
                  </View>
                  
                  {/* Hospital Info Row */}
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="bed" size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      {hospital.hospitalData.totalBeds} beds
                    </Text>
                    {hospital.hospitalData.icuBeds && (
                      <>
                        <Text className="text-gray-400 mx-2">•</Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {hospital.hospitalData.icuBeds} ICU
                        </Text>
                      </>
                    )}
                  </View>
                  
                  {/* Specialties Preview */}
                  {hospital.hospitalData.specialties.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        Specialties:
                      </Text>
                      <View className="flex-row flex-wrap gap-1">
                        {hospital.hospitalData.specialties.slice(0, 3).map((specialty, index) => (
                          <View key={index} className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <Text className="text-xs text-blue-700 dark:text-blue-300">
                              {specialty}
                            </Text>
                          </View>
                        ))}
                        {hospital.hospitalData.specialties.length > 3 && (
                          <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            <Text className="text-xs text-gray-600 dark:text-gray-400">
                              +{hospital.hospitalData.specialties.length - 3} more
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="call" size={14} color="#6b7280" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        {hospital.hospitalData.phoneNumber}
                      </Text>
                    </View>
                    <Text className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      Tap for details →
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Hospital Details Modal */}
      <Modal
        visible={hospitalModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHospitalModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Hospital Details
            </Text>
            <TouchableOpacity
              onPress={() => setHospitalModalVisible(false)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedHospital && (
            <ScrollView className="flex-1 p-4">
              {/* Hospital Header */}
              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <View className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                    <Ionicons name="business" size={32} color="#8b5cf6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedHospital.hospitalData.hospitalName}
                    </Text>
                    <Text className="text-lg text-purple-600 dark:text-purple-400">
                      {selectedHospital.hospitalData.hospitalType}
                    </Text>
                  </View>
                </View>
                
                <View className="bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full self-start">
                  <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
                    ✓ VERIFIED HOSPITAL
                  </Text>
                </View>
              </View>

              {/* Contact Information */}
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Contact Information
                </Text>
                
                <TouchableOpacity
                  className="flex-row items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3"
                  onPress={() => handleCallHospital(selectedHospital.hospitalData.phoneNumber)}
                >
                  <Ionicons name="call" size={20} color="#3b82f6" />
                  <Text className="ml-3 text-blue-600 dark:text-blue-400 font-medium">
                    {selectedHospital.hospitalData.phoneNumber}
                  </Text>
                </TouchableOpacity>

                {selectedHospital.hospitalData.emergencyNumber && (
                  <TouchableOpacity
                    className="flex-row items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3"
                    onPress={() => handleEmergencyCall(selectedHospital.hospitalData.emergencyNumber!)}
                  >
                    <Ionicons name="medical" size={20} color="#ef4444" />
                    <Text className="ml-3 text-red-600 dark:text-red-400 font-medium">
                      Emergency: {selectedHospital.hospitalData.emergencyNumber}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  className="flex-row items-start p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  onPress={() => handleOpenMaps(selectedHospital)}
                >
                  <Ionicons name="location" size={20} color="#10b981" />
                  <View className="ml-3 flex-1">
                    <Text className="text-green-700 dark:text-green-300 font-medium">
                      {selectedHospital.hospitalData.address}, {selectedHospital.hospitalData.city}, {selectedHospital.hospitalData.state} - {selectedHospital.hospitalData.pincode}
                    </Text>
                    <Text className="text-green-600 dark:text-green-400 text-xs mt-1">
                      Tap to open in Google Maps
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#10b981" />
                </TouchableOpacity>
              </View>

              {/* Hospital Information */}
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Hospital Information
                </Text>
                
                <View className="space-y-3">
                  <View className="flex-row">
                    <Text className="text-gray-600 dark:text-gray-400 w-24">License:</Text>
                    <Text className="text-gray-900 dark:text-white flex-1">
                      {selectedHospital.hospitalData.hospitalLicense}
                    </Text>
                  </View>
                  
                  <View className="flex-row">
                    <Text className="text-gray-600 dark:text-gray-400 w-24">Total Beds:</Text>
                    <Text className="text-gray-900 dark:text-white flex-1">
                      {selectedHospital.hospitalData.totalBeds}
                    </Text>
                  </View>
                  
                  {selectedHospital.hospitalData.icuBeds && (
                    <View className="flex-row">
                      <Text className="text-gray-600 dark:text-gray-400 w-24">ICU Beds:</Text>
                      <Text className="text-gray-900 dark:text-white flex-1">
                        {selectedHospital.hospitalData.icuBeds}
                      </Text>
                    </View>
                  )}
                  
                  {selectedHospital.hospitalData.establishedYear && (
                    <View className="flex-row">
                      <Text className="text-gray-600 dark:text-gray-400 w-24">Established:</Text>
                      <Text className="text-gray-900 dark:text-white flex-1">
                        {selectedHospital.hospitalData.establishedYear}
                      </Text>
                    </View>
                  )}
                  
                  {selectedHospital.hospitalData.accreditation && (
                    <View className="flex-row">
                      <Text className="text-gray-600 dark:text-gray-400 w-24">Accreditation:</Text>
                      <Text className="text-gray-900 dark:text-white flex-1">
                        {selectedHospital.hospitalData.accreditation}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Real-time Bed Availability */}
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                    Real-time Bed Availability
                  </Text>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-green-500 rounded-full mr-1"></View>
                    <Text className="text-xs text-gray-500">Live</Text>
                  </View>
                </View>
                
                {bedLoading ? (
                  <View className="items-center py-6">
                    <View className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></View>
                    <Text className="text-gray-500 text-center">Loading bed information...</Text>
                  </View>
                ) : bedStats ? (
                  <View>
                    {/* Quick Stats Cards */}
                    <View className="flex-row mb-4 gap-2">
                      <View className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <View className="flex-row items-center">
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          <Text className="ml-1 text-green-700 dark:text-green-300 font-bold text-lg">{bedStats.available}</Text>
                        </View>
                        <Text className="text-green-600 dark:text-green-400 text-xs">Available Now</Text>
                      </View>
                      <View className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        <View className="flex-row items-center">
                          <Ionicons name="person" size={16} color="#ef4444" />
                          <Text className="ml-1 text-red-700 dark:text-red-300 font-bold text-lg">{bedStats.occupied}</Text>
                        </View>
                        <Text className="text-red-600 dark:text-red-400 text-xs">Occupied</Text>
                      </View>
                      <View className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                        <View className="flex-row items-center">
                          <Ionicons name="construct" size={16} color="#f59e0b" />
                          <Text className="ml-1 text-yellow-700 dark:text-yellow-300 font-bold text-lg">{bedStats.maintenance}</Text>
                        </View>
                        <Text className="text-yellow-600 dark:text-yellow-400 text-xs">Maintenance</Text>
                      </View>
                    </View>

                    {/* General Beds */}
                    <View className="mb-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3">
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                          <Ionicons name="bed" size={20} color="#3b82f6" />
                          <Text className="ml-2 text-gray-700 dark:text-gray-300 font-semibold">General Beds</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedBedType('general')
                            setShowBedBooking(true)
                          }}
                          className="bg-blue-600 px-3 py-1.5 rounded-full flex-row items-center"
                        >
                          <Ionicons name="add" size={14} color="#ffffff" />
                          <Text className="text-white text-xs font-medium ml-1">Book Bed</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View className="flex-row items-center mb-2">
                        <View className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 mr-3">
                          <View 
                            className="bg-blue-500 h-3 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${beds.filter(b => b.type === 'general').length > 0 ? (beds.filter(b => b.type === 'general' && b.status === 'available').length / beds.filter(b => b.type === 'general').length) * 100 : 0}%` 
                            }} 
                          />
                        </View>
                        <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {beds.filter(b => b.type === 'general' && b.status === 'available').length}/{beds.filter(b => b.type === 'general').length}
                        </Text>
                      </View>
                      
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-gray-500">
                          {beds.filter(b => b.type === 'general' && b.status === 'available').length > 0 
                            ? `${beds.filter(b => b.type === 'general' && b.status === 'available').length} beds ready for immediate booking`
                            : 'No general beds available'
                          }
                        </Text>
                        <Text className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {Math.round((beds.filter(b => b.type === 'general' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'general').length, 1)) * 100)}% available
                        </Text>
                      </View>
                    </View>

                    {/* ICU Beds */}
                    <View className="mb-4 bg-red-50 dark:bg-red-900/10 rounded-lg p-3">
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                          <Ionicons name="medical" size={20} color="#ef4444" />
                          <Text className="ml-2 text-gray-700 dark:text-gray-300 font-semibold">ICU Beds</Text>
                          <View className="ml-2 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                            <Text className="text-red-800 dark:text-red-200 text-xs font-medium">Critical Care</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedBedType('icu')
                            setShowBedBooking(true)
                          }}
                          className="bg-red-600 px-3 py-1.5 rounded-full flex-row items-center"
                        >
                          <Ionicons name="add" size={14} color="#ffffff" />
                          <Text className="text-white text-xs font-medium ml-1">Book ICU</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View className="flex-row items-center mb-2">
                        <View className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 mr-3">
                          <View 
                            className="bg-red-500 h-3 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${beds.filter(b => b.type === 'icu').length > 0 ? (beds.filter(b => b.type === 'icu' && b.status === 'available').length / beds.filter(b => b.type === 'icu').length) * 100 : 0}%` 
                            }} 
                          />
                        </View>
                        <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {beds.filter(b => b.type === 'icu' && b.status === 'available').length}/{beds.filter(b => b.type === 'icu').length}
                        </Text>
                      </View>
                      
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-gray-500">
                          {beds.filter(b => b.type === 'icu' && b.status === 'available').length > 0 
                            ? `${beds.filter(b => b.type === 'icu' && b.status === 'available').length} ICU beds with advanced monitoring`
                            : 'No ICU beds available - check emergency options'
                          }
                        </Text>
                        <Text className="text-xs text-red-600 dark:text-red-400 font-medium">
                          {Math.round((beds.filter(b => b.type === 'icu' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'icu').length, 1)) * 100)}% available
                        </Text>
                      </View>
                    </View>

                    {/* Occupancy Overview */}
                    <View className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hospital Occupancy Overview</Text>
                      <View className="flex-row items-center mb-2">
                        <View className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <View 
                            className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${bedStats.total > 0 ? ((bedStats.occupied + bedStats.maintenance) / bedStats.total) * 100 : 0}%` 
                            }} 
                          />
                        </View>
                        <Text className="ml-3 text-xs text-gray-600 dark:text-gray-400 font-medium">
                          {Math.round(((bedStats.occupied + bedStats.maintenance) / Math.max(bedStats.total, 1)) * 100)}% occupied
                        </Text>
                      </View>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-gray-500">
                          Last updated: {lastUpdated.toLocaleTimeString()}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                          className="flex-row items-center"
                        >
                          <View className={`w-2 h-2 rounded-full mr-1 ${autoRefreshEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></View>
                          <Text className="text-xs text-gray-500">
                            {autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="items-center py-6">
                    <Ionicons name="bed-outline" size={48} color="#9ca3af" />
                    <Text className="text-gray-500 text-center mt-2">Bed information not available</Text>
                    <Text className="text-gray-400 text-center text-xs mt-1">Please contact hospital directly</Text>
                  </View>
                )}
              </View>

              {/* Specialties */}
              {selectedHospital.hospitalData.specialties.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Medical Specialties
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {selectedHospital.hospitalData.specialties.map((specialty, index) => (
                      <View key={index} className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                        <Text className="text-blue-700 dark:text-blue-300 text-sm">
                          {specialty}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Facilities */}
              {selectedHospital.hospitalData.facilities.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Available Facilities
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {selectedHospital.hospitalData.facilities.map((facility, index) => (
                      <View key={index} className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                        <Text className="text-green-700 dark:text-green-300 text-sm">
                          {facility}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View className="gap-3 mt-4 mb-8">
                <TouchableOpacity
                  className="bg-purple-600 rounded-lg p-4 items-center"
                  onPress={() => setShowAppointmentBooking(true)}
                >
                  <Ionicons name="calendar" size={20} color="#ffffff" />
                  <Text className="text-white font-semibold mt-1">Book Appointment</Text>
                </TouchableOpacity>
                
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 bg-blue-600 rounded-lg p-4 items-center"
                    onPress={() => handleCallHospital(selectedHospital.hospitalData.phoneNumber)}
                  >
                    <Ionicons name="call" size={20} color="#ffffff" />
                    <Text className="text-white font-semibold mt-1">Call Hospital</Text>
                  </TouchableOpacity>
                  
                  {selectedHospital.hospitalData.emergencyNumber && (
                    <TouchableOpacity
                      className="flex-1 bg-red-600 rounded-lg p-4 items-center"
                      onPress={() => handleEmergencyCall(selectedHospital.hospitalData.emergencyNumber!)}
                    >
                      <Ionicons name="medical" size={20} color="#ffffff" />
                      <Text className="text-white font-semibold mt-1">Emergency</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Bed Booking Modal */}
      <Modal
        visible={showBedBooking}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBedBooking(false)}
      >
        <View className="flex-1 justify-center bg-black/50 px-6">
          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Book {selectedBedType === 'icu' ? 'ICU' : 'General'} Bed
              </Text>
              <TouchableOpacity onPress={() => setShowBedBooking(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View className="p-6">
              {selectedHospital && (
                <View className="mb-4">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">Hospital</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {selectedHospital.hospitalData.hospitalName}
                  </Text>
                </View>
              )}

              <View className="mb-4">
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">Bed Type</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setSelectedBedType('general')}
                    className={`flex-1 p-3 rounded-lg border-2 ${
                      selectedBedType === 'general'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      selectedBedType === 'general'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      General Bed
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedBedType('icu')}
                    className={`flex-1 p-3 rounded-lg border-2 ${
                      selectedBedType === 'icu'
                        ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      selectedBedType === 'icu'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      ICU Bed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Available Beds</Text>
                <Text className="text-gray-900 dark:text-white font-medium">
                  {beds.filter(b => b.type === selectedBedType && b.status === 'available' && b.hospitalId === selectedHospital?.id).length} beds available
                </Text>
              </View>

              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Reason for Admission *</Text>
                  <Text className={`text-xs ${bookingReason.length >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                    {bookingReason.length}/10 min
                  </Text>
                </View>
                <TextInput
                  className={`border rounded-lg p-3 text-gray-900 dark:text-white min-h-[80px] ${
                    bookingReason.length >= 10 
                      ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10' 
                      : bookingReason.length > 0 
                      ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Please provide detailed information about your medical condition, symptoms, or reason for admission. This helps hospital staff prepare for your care. (Minimum 10 characters required)"
                  placeholderTextColor="#9ca3af"
                  value={bookingReason}
                  onChangeText={setBookingReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                {bookingReason.length > 0 && bookingReason.length < 10 && (
                  <Text className="text-red-500 text-xs mt-1">
                    Please provide more details ({10 - bookingReason.length} more characters needed)
                  </Text>
                )}
                {bookingReason.length >= 10 && (
                  <Text className="text-green-600 text-xs mt-1">
                    ✓ Good! This information will help hospital staff prepare for your admission.
                  </Text>
                )}
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowBedBooking(false)}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 items-center"
                >
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBookBed}
                  disabled={!bookingReason.trim() || bedLoading}
                  className={`flex-1 rounded-lg p-4 items-center ${
                    !bookingReason.trim() || bedLoading
                      ? 'bg-gray-300 dark:bg-gray-600'
                      : selectedBedType === 'icu'
                      ? 'bg-red-600'
                      : 'bg-blue-600'
                  }`}
                >
                  <Text className="text-white font-semibold">
                    {bedLoading ? 'Booking...' : 'Submit Request'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appointment Booking Modal */}
      <Modal
        visible={showAppointmentBooking}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAppointmentBooking(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl max-h-[90%]">
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Book Appointment
              </Text>
              <TouchableOpacity onPress={() => setShowAppointmentBooking(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-6">
              {selectedHospital && (
                <View className="mb-4">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">Hospital</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {selectedHospital.hospitalData.hospitalName}
                  </Text>
                </View>
              )}

              {/* Date Selection */}
              <View className="mb-4">
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Select Date *</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(true)}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800"
                >
                  <Text className={`${appointmentDate ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {appointmentDate || 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showCalendar && (
                <View className="mb-4">
                  <Calendar
                    onDayPress={(day) => {
                      setAppointmentDate(day.dateString)
                      setShowCalendar(false)
                    }}
                    markedDates={{
                      [appointmentDate]: { selected: true, selectedColor: '#8b5cf6' }
                    }}
                    minDate={new Date().toISOString().split('T')[0]}
                    theme={{
                      backgroundColor: '#ffffff',
                      calendarBackground: '#ffffff',
                      textSectionTitleColor: '#6b7280',
                      selectedDayBackgroundColor: '#8b5cf6',
                      selectedDayTextColor: '#ffffff',
                      todayTextColor: '#8b5cf6',
                      dayTextColor: '#1f2937',
                      textDisabledColor: '#d1d5db',
                      arrowColor: '#8b5cf6',
                    }}
                  />
                </View>
              )}

              {/* Time Selection */}
              {appointmentDate && (
                <View className="mb-4">
                  <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Select Time *</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {timeSlots.map((slot) => {
                      const isBooked = bookedSlots.includes(slot)
                      const isSelected = appointmentTime === slot
                      
                      return (
                        <TouchableOpacity
                          key={slot}
                          onPress={() => !isBooked && setAppointmentTime(slot)}
                          disabled={isBooked}
                          className={`px-4 py-2 rounded-lg border ${
                            isBooked
                              ? 'border-red-300 bg-red-100 dark:bg-red-900/30'
                              : isSelected
                              ? 'border-purple-600 bg-purple-600'
                              : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                          }`}
                        >
                          <Text
                            className={`font-medium ${
                              isBooked
                                ? 'text-red-600 dark:text-red-400'
                                : isSelected
                                ? 'text-white'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {slot}
                          </Text>
                          {isBooked && (
                            <Text className="text-red-500 text-xs text-center mt-1">
                              Booked
                            </Text>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )}

              {/* Reason */}
              <View className="mb-6">
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Reason for Visit *</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white min-h-[100px]"
                  placeholder="Describe the reason for your appointment..."
                  placeholderTextColor="#9ca3af"
                  value={appointmentReason}
                  onChangeText={setAppointmentReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowAppointmentBooking(false)
                    setAppointmentDate('')
                    setAppointmentTime('')
                    setAppointmentReason('')
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 items-center"
                >
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBookAppointment}
                  disabled={!appointmentDate || !appointmentTime || !appointmentReason.trim() || loadingAppointment}
                  className={`flex-1 rounded-lg p-4 items-center ${
                    !appointmentDate || !appointmentTime || !appointmentReason.trim() || loadingAppointment
                      ? 'bg-gray-300 dark:bg-gray-600'
                      : 'bg-purple-600'
                  }`}
                >
                  <Text className="text-white font-semibold">
                    {loadingAppointment ? 'Booking...' : 'Book Appointment'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}