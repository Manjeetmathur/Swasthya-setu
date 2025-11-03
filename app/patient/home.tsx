import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, Linking, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore, Appointment } from '@/stores/appointmentsStore'
import { useCallStore, CallData } from '@/stores/callStore'
import { useEmergencyStore } from '@/stores/emergencyStore'
import { useBedManagementStore } from '@/stores/bedManagementStore'
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

export default function PatientHome() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading } = useAppointmentsStore()
  const { initiateCall, currentCall, setCurrentCall, subscribeToIncomingCalls } = useCallStore()
  const { activeAlert, cancelEmergency } = useEmergencyStore()
  const { beds, subscribeToBeds, getBedStats, isLoading: bedLoading } = useBedManagementStore()
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
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loadingAppointment, setLoadingAppointment] = useState(false)
  const [bedStats, setBedStats] = useState<{total: number, available: number, occupied: number, maintenance: number} | null>(null)

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
            } catch {
              Alert.alert('Error', 'Failed to cancel emergency alert')
            }
          }
        }
      ]
    )
  }

  const handleHospitalPress = (hospital: Hospital) => {
    setSelectedHospital(hospital)
    setHospitalModalVisible(true)
    // Subscribe to beds for this hospital
    subscribeToBeds(undefined, hospital.id)
  }

  // Update bed stats when beds change
  useEffect(() => {
    if (beds.length > 0 && selectedHospital) {
      const stats = getBedStats()
      setBedStats(stats)
    }
  }, [beds, selectedHospital, getBedStats])

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


  const handleDoctorClick = async (appointment: Appointment) => {
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

  const handleVideoCall = async () => {
    if (!selectedDoctor || !selectedAppointment || !userData?.uid || !userData?.displayName) {
      Alert.alert('Error', 'Unable to initiate video call. Please try again.')
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
      Alert.alert('Error', 'Failed to start video call. Please try again.')
      setIsInitiatingVideoCall(false)
    }
  }

  const handleVoiceCall = async () => {
    if (!selectedDoctor || !selectedAppointment || !userData?.uid || !userData?.displayName) {
      Alert.alert('Error', 'Unable to initiate voice call. Please try again.')
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
      Alert.alert('Error', 'Failed to start voice call. Please try again.')
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
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          <HomeHeader userName={userData?.displayName || undefined} />

          <QuickActionsSection onHospitalSelect={handleHospitalPress} />

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
            onAppointmentPress={handleDoctorClick}
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
                Doctor Details
              </Text>
              <TouchableOpacity onPress={() => setShowDoctorDialog(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
              {loadingDoctor ? (
                <Text className="text-gray-500 text-center py-8">Loading doctor details...</Text>
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
                          Specialization
                        </Text>
                        <Text className="text-base text-blue-600 dark:text-blue-400 font-semibold">
                          {selectedDoctor.doctorData.specialization}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.experience && (
                      <View className="w-[48%] mb-4">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Experience
                        </Text>
                        <Text className="text-base text-gray-900 dark:text-white">
                          {selectedDoctor.doctorData.experience} years
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.qualifications && (
                      <View className="w-[48%] mb-4 mr-[4%]">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Qualifications
                        </Text>
                        <Text className="text-sm text-gray-900 dark:text-white">
                          {selectedDoctor.doctorData.qualifications}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.consultationFee && (
                      <View className="w-[48%] mb-4">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Consultation Fee
                        </Text>
                        <Text className="text-base text-green-600 dark:text-green-400 font-semibold">
                          ₹{selectedDoctor.doctorData.consultationFee}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.doctorData?.hospitalAffiliation && (
                      <View className="w-[48%] mb-4 mr-[4%]">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Hospital
                        </Text>
                        <Text className="text-sm text-gray-900 dark:text-white">
                          {selectedDoctor.doctorData.hospitalAffiliation}
                        </Text>
                      </View>
                    )}

                    {selectedDoctor.email && (
                      <View className="w-[48%] mb-4">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Email
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
                        Certifications
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
                      Contact Doctor
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
                
                {bedStats ? (
                  <View>
                    {/* Overall Stats Cards */}
                    <View className="flex-row gap-3 mb-4">
                      <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <View className="flex-row items-center mb-2">
                          <View className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded mr-2">
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          </View>
                          <Text className="text-xs text-gray-600 dark:text-gray-400 font-medium">Available</Text>
                        </View>
                        <Text className="text-2xl font-bold text-green-600 dark:text-green-400" style={{ lineHeight: 32 }}>
                          {bedStats.available}
                        </Text>
                      </View>
                      
                      <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                        <View className="flex-row items-center mb-2">
                          <View className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded mr-2">
                            <Ionicons name="person" size={16} color="#f59e0b" />
                          </View>
                          <Text className="text-xs text-gray-600 dark:text-gray-400 font-medium">Occupied</Text>
                        </View>
                        <Text className="text-2xl font-bold text-orange-600 dark:text-orange-400" style={{ lineHeight: 32 }}>
                          {bedStats.occupied}
                        </Text>
                      </View>
                    </View>

                    {/* Bed Type Breakdown */}
                    <View className="space-y-3">
                      {/* General Beds */}
                      <View className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center flex-1">
                            <Ionicons name="bed-outline" size={18} color="#3b82f6" />
                            <Text className="text-gray-700 dark:text-gray-300 font-semibold ml-2">
                              General Beds
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Text className="text-xs text-gray-600 dark:text-gray-400 mr-2" numberOfLines={1}>
                              {beds.filter(b => b.type === 'general' && b.status === 'available').length}/{beds.filter(b => b.type === 'general').length}
                            </Text>
                            <View className={`px-2 py-0.5 rounded-full ${
                              (beds.filter(b => b.type === 'general' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'general').length, 1)) > 0.3
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                              <Text className={`text-xs font-semibold ${
                                (beds.filter(b => b.type === 'general' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'general').length, 1)) > 0.3
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}>
                                {Math.round((beds.filter(b => b.type === 'general' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'general').length, 1)) * 100)}%
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View className="flex-row items-center">
                          <View className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <View 
                              className="bg-blue-500 h-2.5 rounded-full" 
                              style={{ 
                                width: `${beds.filter(b => b.type === 'general').length > 0 ? (beds.filter(b => b.type === 'general' && b.status === 'available').length / beds.filter(b => b.type === 'general').length) * 100 : 0}%` 
                              }} 
                            />
                          </View>
                        </View>
                      </View>

                      {/* ICU Beds */}
                      {selectedHospital.hospitalData.icuBeds && (
                        <View className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center flex-1">
                              <Ionicons name="medical" size={18} color="#ef4444" />
                              <Text className="text-gray-700 dark:text-gray-300 font-semibold ml-2">
                                ICU Beds
                              </Text>
                            </View>
                            <View className="flex-row items-center">
                              <Text className="text-xs text-gray-600 dark:text-gray-400 mr-2" numberOfLines={1}>
                                {beds.filter(b => b.type === 'icu' && b.status === 'available').length}/{beds.filter(b => b.type === 'icu').length}
                              </Text>
                              <View className={`px-2 py-0.5 rounded-full ${
                                (beds.filter(b => b.type === 'icu' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'icu').length, 1)) > 0.2
                                  ? 'bg-green-100 dark:bg-green-900/30'
                                  : 'bg-red-100 dark:bg-red-900/30'
                              }`}>
                                <Text className={`text-xs font-semibold ${
                                  (beds.filter(b => b.type === 'icu' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'icu').length, 1)) > 0.2
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-red-700 dark:text-red-300'
                                }`}>
                                  {Math.round((beds.filter(b => b.type === 'icu' && b.status === 'available').length / Math.max(beds.filter(b => b.type === 'icu').length, 1)) * 100)}%
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View className="flex-row items-center">
                            <View className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                              <View 
                                className="bg-red-500 h-2.5 rounded-full" 
                                style={{ 
                                  width: `${beds.filter(b => b.type === 'icu').length > 0 ? (beds.filter(b => b.type === 'icu' && b.status === 'available').length / beds.filter(b => b.type === 'icu').length) * 100 : 0}%` 
                                }} 
                              />
                            </View>
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
                  </View>
                ) : (
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

