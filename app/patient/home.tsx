import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore, Appointment } from '@/stores/appointmentsStore'
import { useCallStore, CallData } from '@/stores/callStore'
import { useEmergencyStore } from '@/stores/emergencyStore'
import { db} from '@/lib/firebase'
import { doc, getDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore'
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
    setSelectedHospital(hospital)
    setHospitalModalVisible(true)
  }

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


  const handleDoctorClick = async (appointment: Appointment) => {
    setLoadingDoctor(true)
    setShowDoctorDialog(true)
    setSelectedAppointment(appointment)
    
    try {
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
              <View className="flex-row gap-3 mt-4 mb-8">
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
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

