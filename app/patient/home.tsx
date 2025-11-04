import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, Linking, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore, Appointment } from '@/stores/appointmentsStore'
import { useCallStore, CallData } from '@/stores/callStore'
import { useEmergencyStore } from '@/stores/emergencyStore'
import { useBedManagementStore } from '@/stores/bedManagementStore'
import { useStaffStore } from '@/stores/staffStore'
import { db} from '@/lib/firebase'
import { doc, getDoc, Timestamp, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore'
import { Calendar } from 'react-native-calendars'
import EmergencyDialog from '@/components/EmergencyDialog'
import { Ionicons } from '@expo/vector-icons'
import VideoCall from '@/components/VideoCall'
import OutgoingCall from '@/components/OutgoingCall'
import HomeHeader from '@/components/patient/HomeHeader'
import QuickActionsSection from '@/components/patient/QuickActionsSection'
import ServicesSection from '@/components/patient/ServicesSection'
import AppointmentsSection from '@/components/patient/AppointmentsSection'
import { Doctor, Hospital } from '@/types'
import { useLanguageStore } from '@/stores/languageStore'

export default function PatientHome() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading } = useAppointmentsStore()
  const { initiateCall, currentCall, setCurrentCall, subscribeToIncomingCalls } = useCallStore()
  const { activeAlert, cancelEmergency } = useEmergencyStore()
  const { beds, subscribeToBeds, isLoading: bedLoading } = useBedManagementStore()
  const { staff, subscribeToStaff } = useStaffStore()
  const { t } = useLanguageStore()
  const [refreshing, setRefreshing] = useState(false)
  const [showDoctorDialog, setShowDoctorDialog] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [loadingDoctor, setLoadingDoctor] = useState(false)
  const [isInitiatingVideoCall, setIsInitiatingVideoCall] = useState(false)
  const [isInitiatingVoiceCall, setIsInitiatingVoiceCall] = useState(false)
  const [outgoingCall, setOutgoingCall] = useState<CallData | null>(null)
  const [emergencyDialogVisible, setEmergencyDialogVisible] = useState(false)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loadingHospitals, setLoadingHospitals] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [hospitalModalVisible, setHospitalModalVisible] = useState(false)
  const [showAppointmentBooking, setShowAppointmentBooking] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [appointmentReason, setAppointmentReason] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [bedNumber, setBedNumber] = useState('')
  const [bedCategory, setBedCategory] = useState<'general' | 'icu'>('general')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loadingAppointment, setLoadingAppointment] = useState(false)
  const [bedStats, setBedStats] = useState<{total: number, available: number, occupied: number, maintenance: number} | null>(null)
  const [bedUnsubscribe, setBedUnsubscribe] = useState<(() => void) | null>(null)
  const [staffUnsubscribe, setStaffUnsubscribe] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribeAppointments = subscribeToAppointments(userData.uid, 'patient')
      const unsubscribeCalls = subscribeToIncomingCalls(userData.uid, 'patient')
      return () => {
        unsubscribeAppointments()
        unsubscribeCalls()
      }
    }
  }, [userData?.uid, subscribeToAppointments, subscribeToIncomingCalls])

  useEffect(() => {
    fetchApprovedHospitals()
  }, [])

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

    if (!bedNumber.trim()) {
      Alert.alert('Error', 'Please enter bed number')
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
        bedNumber: bedNumber.trim(),
        bedCategory: bedCategory,
        createdAt: Timestamp.now()
      })

      Alert.alert('Success', 'Appointment request submitted! Hospital will confirm your booking.', [
        { 
          text: 'OK', 
          onPress: () => {
            setShowAppointmentBooking(false)
            setAppointmentDate('')
            setAppointmentTime('')
            setAppointmentReason('')
            setBedNumber('')
            setBedCategory('general')
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

  const fetchApprovedHospitals = async () => {
    setLoadingHospitals(true)
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
      setLoadingHospitals(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchApprovedHospitals()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleEmergencyTriggered = (emergencyId: string) => {
    setEmergencyDialogVisible(false)
  }

  const handleCancelEmergency = async () => {
    if (!activeAlert) return

    Alert.alert(
      t('home.cancel_emergency'),
      t('home.cancel_emergency_confirm'),
      [
        { text: t('home.no'), style: 'cancel' },
        {
          text: t('home.yes_cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelEmergency(activeAlert.id)
              Alert.alert(t('home.success'), t('home.emergency_cancelled'))
            } catch {
              Alert.alert(t('home.error'), t('home.failed_cancel_emergency'))
            }
          }
        }
      ]
    )
  }

  const handleHospitalPress = (hospital: Hospital) => {
    // Clean up previous subscriptions
    if (bedUnsubscribe) {
      bedUnsubscribe()
    }
    if (staffUnsubscribe) {
      staffUnsubscribe()
    }
    
    setSelectedHospital(hospital)
    setHospitalModalVisible(true)
    
    // Subscribe to beds for this hospital
    const unsubscribeBeds = subscribeToBeds(undefined, hospital.id)
    setBedUnsubscribe(() => unsubscribeBeds)
    
    // Subscribe to staff for this hospital
    const unsubscribeStaff = subscribeToStaff(hospital.id)
    setStaffUnsubscribe(() => unsubscribeStaff)
  }

  // Clean up subscriptions when modal closes or hospital changes
  useEffect(() => {
    return () => {
      if (bedUnsubscribe) {
        bedUnsubscribe()
      }
      if (staffUnsubscribe) {
        staffUnsubscribe()
      }
    }
  }, [bedUnsubscribe, staffUnsubscribe])

  // Update bed stats when beds change - filter by selected hospital
  useEffect(() => {
    if (selectedHospital && beds.length > 0) {
      // Filter beds for the selected hospital only
      const hospitalBeds = beds.filter(bed => bed.hospitalId === selectedHospital.id)
      const stats = {
        total: hospitalBeds.length,
        available: hospitalBeds.filter(bed => bed.status === 'available').length,
        occupied: hospitalBeds.filter(bed => bed.status === 'occupied').length,
        maintenance: hospitalBeds.filter(bed => bed.status === 'maintenance').length
      }
      setBedStats(stats)
    } else if (selectedHospital && beds.length === 0) {
      // No beds available for this hospital
      setBedStats({
        total: 0,
        available: 0,
        occupied: 0,
        maintenance: 0
      })
    }
  }, [beds, selectedHospital])

  const handleCallHospital = (phoneNumber: string) => {
    Alert.alert(
      t('home.call_hospital'),
      `${t('home.call_hospital_confirm')} ${phoneNumber}?`,
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.call'),
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`)
          }
        }
      ]
    )
  }

  const handleEmergencyCall = (emergencyNumber: string) => {
    Alert.alert(
      t('home.emergency_call'),
      `${t('home.emergency_call_confirm')} ${emergencyNumber}?`,
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.call_now'),
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
      t('home.open_in_maps'),
      `${hospital.hospitalData.hospitalName} ${t('home.open_maps_confirm')}`,
      [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.open_maps'),
          onPress: () => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
            Linking.openURL(mapsUrl)
          }
        }
      ]
    )
  }


  const handleAppointmentClick = async (appointment: Appointment) => {
    // Check if it's a hospital appointment
    if (appointment.appointmentType === 'hospital' || appointment.hospitalId) {
      // Handle hospital appointment
      if (appointment.hospitalId) {
        try {
          const hospitalRef = doc(db, 'users', appointment.hospitalId)
          const hospitalSnap = await getDoc(hospitalRef)
          
          if (hospitalSnap.exists()) {
            const hospitalData = hospitalSnap.data()
            if (hospitalData.hospitalData) {
              const hospital: Hospital = {
                id: hospitalSnap.id,
                hospitalData: hospitalData.hospitalData
              }
              handleHospitalPress(hospital)
            }
          }
        } catch (error) {
          console.error('Error fetching hospital details:', error)
          Alert.alert(t('home.error'), 'Failed to load hospital details')
        }
      }
    } else {
      // Handle doctor appointment
      setLoadingDoctor(true)
      setShowDoctorDialog(true)
      setSelectedAppointment(appointment)
      
      try {
        if (!appointment.doctorId) return
        const doctorRef = doc(db, 'users', appointment.doctorId)
        const doctorSnap = await getDoc(doctorRef)
        
        if (doctorSnap.exists()) {
          setSelectedDoctor({
            id: doctorSnap.id,
            ...doctorSnap.data()
          } as Doctor)
        } else {
          console.error('Doctor not found')
        }
      } catch (error) {
        console.error('Error fetching doctor details:', error)
      } finally {
        setLoadingDoctor(false)
      }
    }
  }

  const handleVideoCall = async () => {
    if (!selectedDoctor || !selectedAppointment || !userData?.uid || !userData?.displayName) {
      Alert.alert(t('home.error'), t('home.unable_initiate_video_call'))
      return
    }

    if (isInitiatingVoiceCall) {
      return // Don't allow if voice call is being initiated
    }

    try {
      setIsInitiatingVideoCall(true)
      const callId = await initiateCall(
        userData.uid,
        selectedDoctor.id,
        userData.displayName,
        selectedDoctor.displayName,
        selectedAppointment.id,
        'video'
      )
      
      // Set outgoing call to show calling screen
      setOutgoingCall({
        id: callId,
        patientId: userData.uid,
        doctorId: selectedDoctor.id,
        patientName: userData.displayName,
        doctorName: selectedDoctor.displayName,
        appointmentId: selectedAppointment.id,
        status: 'ringing',
        startTime: Timestamp.now(),
        callType: 'video'
      })
      
      setShowDoctorDialog(false)
    } catch {
      Alert.alert(t('home.error'), t('home.failed_start_video_call'))
      setIsInitiatingVideoCall(false)
    }
  }

  const handleVoiceCall = async () => {
    if (!selectedDoctor || !selectedAppointment || !userData?.uid || !userData?.displayName) {
      Alert.alert(t('home.error'), t('home.unable_initiate_voice_call'))
      return
    }

    if (isInitiatingVideoCall) {
      return // Don't allow if video call is being initiated
    }

    try {
      setIsInitiatingVoiceCall(true)
      const callId = await initiateCall(
        userData.uid,
        selectedDoctor.id,
        userData.displayName,
        selectedDoctor.displayName,
        selectedAppointment.id,
        'audio'
      )
      
      // Set outgoing call to show calling screen
      setOutgoingCall({
        id: callId,
        patientId: userData.uid,
        doctorId: selectedDoctor.id,
        patientName: userData.displayName,
        doctorName: selectedDoctor.displayName,
        appointmentId: selectedAppointment.id,
        status: 'ringing',
        startTime: Timestamp.now(),
        callType: 'audio'
      })
      
      setShowDoctorDialog(false)
    } catch {
      Alert.alert(t('home.error'), t('home.failed_start_voice_call'))
      setIsInitiatingVoiceCall(false)
    }
  }

  const handleChat = () => {
    setShowDoctorDialog(false)
    router.push('/patient/chat')
  }

  const handleEndCall = () => {
    setCurrentCall(null)
    setOutgoingCall(null)
  }

  const handleCancelOutgoingCall = () => {
    setOutgoingCall(null)
    setIsInitiatingVideoCall(false)
    setIsInitiatingVoiceCall(false)
  }

  const handleCallConnected = () => {
    setOutgoingCall(null)
    setIsInitiatingVideoCall(false)
    setIsInitiatingVoiceCall(false)
  }


  // Show video call interface if there's an active connected call
  if (currentCall && currentCall.status === 'connected') {
    return (
      <VideoCall 
        call={currentCall} 
        userType="patient" 
        onEndCall={handleEndCall}
      />
    )
  }

  // Show outgoing call screen while waiting for doctor to answer
  if (outgoingCall) {
    return (
      <OutgoingCall
        call={outgoingCall}
        userType="patient"
        onCancel={handleCancelOutgoingCall}
        onCallConnected={handleCallConnected}
      />
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-6">
          <HomeHeader userName={userData?.displayName || undefined} />

          <QuickActionsSection onHospitalSelect={handleHospitalPress} />

          {/* AI-Powered Features Section */}
          <View className="mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              AI-Powered Features
            </Text>
            <View className="gap-3">
              <TouchableOpacity
                className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 border border-blue-200 dark:border-blue-800 shadow-md"
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4
                }}
                onPress={() => router.push('/patient/ai-doctor')}
              >
                <View className="flex-row items-center">
                  <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-2.5 mr-3">
                    <Ionicons name="medical" size={24} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-base mb-0.5">
                      AI Doctor
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs">
                      Chat with AI doctor for health guidance
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                      Ask questions • Get medical advice
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 border border-orange-200 dark:border-orange-800 shadow-md"
                style={{
                  shadowColor: '#f97316',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4
                }}
                onPress={() => router.push('/patient/nutri-scan')}
              >
                <View className="flex-row items-center">
                  <View className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-2.5 mr-3">
                    <Ionicons name="scan" size={24} color="#f97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-base mb-0.5">
                      AI-Care
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs">
                      Scan food labels & medicine packets
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                      Detect allergens • Side effects
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 border border-purple-200 dark:border-purple-800 shadow-md"
                style={{
                  shadowColor: '#a855f7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4
                }}
                onPress={() => router.push('/patient/skin-rash')}
              >
                <View className="flex-row items-center">
                  <View className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-2.5 mr-3">
                    <Ionicons name="medical" size={24} color="#a855f7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-base mb-0.5">
                      Skin Rash Detection
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs">
                      AI dermatology analysis
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                      Identify conditions • Get recommendations
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-white dark:bg-gray-800 rounded-2xl p-3.5 border border-indigo-200 dark:border-indigo-800 shadow-md"
                style={{
                  shadowColor: '#6366f1',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4
                }}
                onPress={() => router.push('/patient/medimind')}
              >
                <View className="flex-row items-center">
                  <View className="bg-indigo-100 dark:bg-indigo-900/30 rounded-xl p-2.5 mr-3">
                    <Ionicons name="mic" size={24} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-base mb-0.5">
                      MediMind
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-xs">
                      Voice therapy & mental health
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
                      Detect depression • Connect to therapist
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ServicesSection
            activeAlert={activeAlert}
            onCancelEmergency={handleCancelEmergency}
            onEmergencyPress={() => setEmergencyDialogVisible(true)}
            hospitals={hospitals}
            loadingHospitals={loadingHospitals}
            onHospitalPress={handleHospitalPress}
          />

          <AppointmentsSection
            appointments={appointments}
            isLoading={isLoading}
            onAppointmentPress={handleAppointmentClick}
          />
        </View>
      </ScrollView>

      {/* Doctor Details Bottom Dialog */}
      <Modal
        visible={showDoctorDialog}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDoctorDialog(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          activeOpacity={1}
          onPress={() => setShowDoctorDialog(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            className="bg-white dark:bg-gray-900"
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              minHeight: '85%'
            }}
          >
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {t('home.doctor_details')}
              </Text>
              <TouchableOpacity onPress={() => setShowDoctorDialog(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
              {loadingDoctor ? (
                <Text className="text-gray-500 text-center py-8">{t('home.loading_doctor_details')}</Text>
              ) : selectedDoctor ? (
                <View>
                  {/* Doctor Header */}
                  <View className="mb-6">
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Dr. {selectedDoctor.displayName}
                    </Text>
                    {selectedDoctor.doctorData?.isVerified && (
                      <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full self-start">
                        <Text className="text-green-700 dark:text-green-300 text-xs font-medium">
                          ✓ Verified Doctor
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Two Column Layout for Doctor Info */}
                  <View className="flex-row flex-wrap mb-4">
                    {selectedDoctor.doctorData?.specialization && (
                      <View className="w-[48%] mb-4 mr-[4%]">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('home.specialization')}
                        </Text>
                        <Text className="text-base text-blue-600 dark:text-blue-400 font-semibold">
                          {selectedDoctor.doctorData.specialization}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.experience && (
                      <View className="w-[48%] mb-4">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('home.experience')}
                        </Text>
                        <Text className="text-base text-gray-900 dark:text-white">
                          {selectedDoctor.doctorData.experience} {t('home.years')}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.qualifications && (
                      <View className="w-[48%] mb-4 mr-[4%]">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('home.qualifications')}
                        </Text>
                        <Text className="text-sm text-gray-900 dark:text-white">
                          {selectedDoctor.doctorData.qualifications}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.consultationFee && (
                      <View className="w-[48%] mb-4">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('home.consultation_fee')}
                        </Text>
                        <Text className="text-base text-green-600 dark:text-green-400 font-semibold">
                          ₹{selectedDoctor.doctorData.consultationFee}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.hospitalAffiliation && (
                      <View className="w-[48%] mb-4 mr-[4%]">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('home.hospital')}
                        </Text>
                        <Text className="text-sm text-gray-900 dark:text-white">
                          {selectedDoctor.doctorData.hospitalAffiliation}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.email && (
                      <View className="w-[48%] mb-4">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          {t('home.email')}
                        </Text>
                        <Text className="text-sm text-gray-900 dark:text-white">
                          {selectedDoctor.email}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Certifications - Full Width */}
                  {selectedDoctor.doctorData?.certifications && selectedDoctor.doctorData.certifications.length > 0 && (
                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {t('home.certifications')}
                      </Text>
                      {selectedDoctor.doctorData.certifications.map((cert, index) => (
                        <View
                          key={index}
                          className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 mb-2"
                        >
                          <Text className="text-sm text-gray-900 dark:text-white">
                            • {cert}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View className="mt-6 mb-4 border-t border-gray-200 dark:border-gray-700 pt-6 grid grid-cols-3 gap-2">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t('home.contact_doctor')}
                    </Text>
                    
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={handleVideoCall}
                        disabled={isInitiatingVideoCall || isInitiatingVoiceCall}
                        className="flex-1 items-center justify-center bg-blue-600 rounded-lg p-3"
                      >
                        <Ionicons name="videocam" size={20} color="#ffffff" />
                        <Text className="text-white font-semibold text-xs mt-1 text-center">
                          {isInitiatingVideoCall ? 'Calling...' : 'Video'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleVoiceCall}
                        disabled={isInitiatingVoiceCall || isInitiatingVideoCall}
                        className="flex-1 items-center justify-center bg-green-600 rounded-lg p-3"
                      >
                        <Ionicons name="call" size={20} color="#ffffff" />
                        <Text className="text-white font-semibold text-xs mt-1 text-center">
                          {isInitiatingVoiceCall ? 'Calling...' : 'Voice'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleChat}
                        className="flex-1 items-center justify-center bg-purple-600 rounded-lg p-3"
                      >
                        <Ionicons name="chatbubbles" size={20} color="#ffffff" />
                        <Text className="text-white font-semibold text-xs mt-1 text-center">
                          Chat
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <Text className="text-gray-500 text-center py-8">
                  Doctor details not available
                </Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Emergency Dialog */}
      <EmergencyDialog
        visible={emergencyDialogVisible}
        onClose={() => setEmergencyDialogVisible(false)}
        onEmergencyTriggered={handleEmergencyTriggered}
      />

      {/* Hospital Details Modal */}
      <Modal
        visible={hospitalModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          // Clean up subscriptions when modal closes
          if (bedUnsubscribe) {
            bedUnsubscribe()
            setBedUnsubscribe(null)
          }
          if (staffUnsubscribe) {
            staffUnsubscribe()
            setStaffUnsubscribe(null)
          }
          setHospitalModalVisible(false)
        }}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Hospital Details
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Clean up subscriptions when modal closes
                if (bedUnsubscribe) {
                  bedUnsubscribe()
                  setBedUnsubscribe(null)
                }
                if (staffUnsubscribe) {
                  staffUnsubscribe()
                  setStaffUnsubscribe(null)
                }
                setHospitalModalVisible(false)
              }}
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

              {/* Real-time Bed Availability - Visual Section */}
              <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-800">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                      <Ionicons name="bed" size={24} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-gray-900 dark:text-white">
                        Bed Availability
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        Real-time updates
                      </Text>
                    </View>
                  </View>
                  {bedLoading && (
                    <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                      <Text className="text-xs text-blue-700 dark:text-blue-300">Loading...</Text>
                    </View>
                  )}
                </View>
                
                {bedStats ? (() => {
                  // Filter beds for the selected hospital only
                  const hospitalBeds = beds.filter(b => b.hospitalId === selectedHospital?.id)
                  return (
                  <View>
                    {/* Overall Stats Cards */}
                    <View className="flex-row gap-3 mb-4">
                      <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                            <Text className="ml-2 text-gray-700 dark:text-gray-300 font-medium">Available</Text>
                          </View>
                          <Text className="text-green-600 dark:text-green-400 font-bold text-lg">{bedStats.available}</Text>
                        </View>
                      </View>
                      
                      <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Ionicons name="person" size={18} color="#ef4444" />
                            <Text className="ml-2 text-gray-700 dark:text-gray-300 font-medium">Occupied</Text>
                          </View>
                          <Text className="text-red-600 dark:text-red-400 font-bold text-lg">{bedStats.occupied}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Bed Type Breakdown */}
                    <View className="space-y-3">
                      {/* General Beds */}
                      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center">
                            <Ionicons name="bed" size={20} color="#3b82f6" />
                            <Text className="ml-2 text-gray-900 dark:text-white font-semibold text-base">General Beds</Text>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            Available
                          </Text>
                          <Text className="text-gray-900 dark:text-white font-semibold">
                            {hospitalBeds.filter(b => b.type === 'general' && b.status === 'available').length} / {hospitalBeds.filter(b => b.type === 'general').length}
                          </Text>
                        </View>
                      </View>

                      {/* ICU Beds */}
                      {hospitalBeds.filter(b => b.type === 'icu').length > 0 && (
                        <View className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center">
                              <Ionicons name="medical" size={20} color="#ef4444" />
                              <Text className="ml-2 text-gray-900 dark:text-white font-semibold text-base">ICU Beds</Text>
                            </View>
                          </View>
                          
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm text-gray-600 dark:text-gray-400">
                              Available
                            </Text>
                            <Text className="text-gray-900 dark:text-white font-semibold">
                              {hospitalBeds.filter(b => b.type === 'icu' && b.status === 'available').length} / {hospitalBeds.filter(b => b.type === 'icu').length}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Total Summary */}
                    <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Total Capacity
                        </Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          {bedStats.total} Beds
                        </Text>
                      </View>
                    </View>

                    {/* Available Beds List */}
                    {hospitalBeds.length > 0 && (
                      <View className="mt-4">
                        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Available Beds Details
                        </Text>
                        <View className="space-y-2">
                          {hospitalBeds.filter(b => b.status === 'available').slice(0, 10).map((bed) => (
                            <View
                              key={bed.id}
                              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                            >
                              <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                  <View className="flex-row items-center mb-1">
                                    <Ionicons 
                                      name={bed.type === 'icu' ? 'medical' : 'bed'} 
                                      size={16} 
                                      color={bed.type === 'icu' ? '#ef4444' : '#3b82f6'} 
                                    />
                                    <Text className="ml-2 text-gray-900 dark:text-white font-semibold">
                                      Bed {bed.bedNumber}
                                    </Text>
                                    {bed.type === 'icu' && (
                                      <View className="ml-2 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                                        <Text className="text-red-800 dark:text-red-200 text-xs font-medium">
                                          ICU
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View className="flex-row items-center mt-1">
                                    <Ionicons name="location" size={14} color="#6b7280" />
                                    <Text className="ml-1 text-gray-600 dark:text-gray-400 text-sm">
                                      Ward: {bed.ward}
                                    </Text>
                                  </View>
                                </View>
                                <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                                  <Text className="text-green-700 dark:text-green-300 text-xs font-semibold">
                                    Available
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))}
                          {hospitalBeds.filter(b => b.status === 'available').length > 10 && (
                            <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                              +{hospitalBeds.filter(b => b.status === 'available').length - 10} more beds available
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                  )
                })() : (
                  <View className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <View className="flex-row items-center">
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mr-3">
                        <Ionicons name="bed-outline" size={24} color="#9ca3af" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 dark:text-white font-medium">
                          {selectedHospital.hospitalData.totalBeds} Total Beds
                        </Text>
                        {selectedHospital.hospitalData.icuBeds && (
                          <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            {selectedHospital.hospitalData.icuBeds} ICU Beds
                          </Text>
                        )}
                        <Text className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                          Real-time data unavailable - showing static information
                        </Text>
                      </View>
                    </View>
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

              {/* Staff Information */}
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                    Hospital Staff
                  </Text>
                  <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                    <Text className="text-blue-700 dark:text-blue-300 text-sm font-semibold">
                      {staff.length} Total
                    </Text>
                  </View>
                </View>
                
                {staff.length === 0 ? (
                  <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Staff information not available
                  </Text>
                ) : (
                  <View className="mt-3">
                    {staff.slice(0, 10).map((staffMember) => (
                      <View
                        key={staffMember.id}
                        className="flex-row items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                      >
                        <View className="flex-1">
                          <Text className="text-gray-900 dark:text-white font-medium">
                            {staffMember.name}
                          </Text>
                          <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)} • {staffMember.department.charAt(0).toUpperCase() + staffMember.department.slice(1)}
                          </Text>
                        </View>
                        <View className={`px-2 py-1 rounded-full ${
                          staffMember.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : staffMember.status === 'on_leave'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <Text className={`text-xs font-semibold ${
                            staffMember.status === 'active'
                              ? 'text-green-700 dark:text-green-300'
                              : staffMember.status === 'on_leave'
                              ? 'text-yellow-700 dark:text-yellow-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {staffMember.status === 'active' ? 'Active' : staffMember.status === 'on_leave' ? 'On Leave' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {staff.length > 10 && (
                      <Text className="text-gray-500 dark:text-gray-400 text-center mt-2 text-sm">
                        +{staff.length - 10} more staff members
                      </Text>
                    )}
                  </View>
                )}
              </View>

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
              <View className="mb-4">
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

              {/* Bed Number */}
              <View className="mb-4">
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Bed Number *</Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white"
                  placeholder="Enter bed number (e.g., B-101, ICU-05)"
                  placeholderTextColor="#9ca3af"
                  value={bedNumber}
                  onChangeText={setBedNumber}
                />
              </View>

              {/* Bed Category */}
              <View className="mb-6">
                <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">Bed Category *</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setBedCategory('general')}
                    className={`flex-1 p-3 rounded-lg border-2 ${
                      bedCategory === 'general'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      bedCategory === 'general'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      General Bed
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBedCategory('icu')}
                    className={`flex-1 p-3 rounded-lg border-2 ${
                      bedCategory === 'icu'
                        ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Text className={`text-center font-medium ${
                      bedCategory === 'icu'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      ICU Bed
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowAppointmentBooking(false)
                    setAppointmentDate('')
                    setAppointmentTime('')
                    setAppointmentReason('')
                    setBedNumber('')
                    setBedCategory('general')
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-4 items-center"
                >
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBookAppointment}
                  disabled={!appointmentDate || !appointmentTime || !appointmentReason.trim() || !bedNumber.trim() || loadingAppointment}
                  className={`flex-1 rounded-lg p-4 items-center ${
                    !appointmentDate || !appointmentTime || !appointmentReason.trim() || !bedNumber.trim() || loadingAppointment
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

