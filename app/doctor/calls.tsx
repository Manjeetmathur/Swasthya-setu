import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore } from '@/stores/appointmentsStore'
import { useCallStore } from '@/stores/callStore'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'
import IncomingCall from '@/components/IncomingCall'
import VideoCall from '@/components/VideoCall'

export default function DoctorCalls() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading } = useAppointmentsStore()
  const { 
    initiateCall, 
    incomingCall, 
    currentCall, 
    subscribeToIncomingCalls,
    clearIncomingCall,
    setCurrentCall
  } = useCallStore()
  const [isInitiatingCall, setIsInitiatingCall] = useState(false)

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribeAppointments = subscribeToAppointments(userData.uid, 'doctor')
      const unsubscribeCalls = subscribeToIncomingCalls(userData.uid, 'doctor')
      
      return () => {
        unsubscribeAppointments()
        unsubscribeCalls()
      }
    }
  }, [userData?.uid, subscribeToAppointments, subscribeToIncomingCalls])

  const handleStartCall = async (appointmentId: string, patientId: string, patientName: string) => {
    if (!userData) return
    
    try {
      setIsInitiatingCall(true)
      const callId = await initiateCall(
        patientId,
        userData.uid,
        patientName,
        userData.displayName || 'Doctor',
        appointmentId
      )
      
      // Set current call to show calling interface
      setCurrentCall({
        id: callId,
        patientId,
        doctorId: userData.uid,
        patientName,
        doctorName: userData.displayName || 'Doctor',
        appointmentId,
        status: 'ringing',
        startTime: new Date() as any,
        callType: 'video'
      })
      
    } catch (error) {
      Alert.alert('Error', 'Failed to start call. Please try again.')
    } finally {
      setIsInitiatingCall(false)
    }
  }

  const handleAnswerCall = () => {
    // Call will be handled by the IncomingCall component
  }

  const handleDeclineCall = () => {
    clearIncomingCall()
  }

  const handleEndCall = () => {
    setCurrentCall(null)
  }

  const confirmedAppointments = appointments.filter(
    (apt) => apt.status === 'confirmed'
  )

  const todayAppointments = confirmedAppointments.filter((apt) => {
    const aptDate = apt.date.toDate()
    const today = new Date()
    return (
      aptDate.getDate() === today.getDate() &&
      aptDate.getMonth() === today.getMonth() &&
      aptDate.getFullYear() === today.getFullYear()
    )
  })

  // Show video call interface if there's an active call
  if (currentCall) {
    return (
      <VideoCall 
        call={currentCall} 
        userType="doctor" 
        onEndCall={handleEndCall}
      />
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCall
          call={incomingCall}
          userType="doctor"
          onAnswer={handleAnswerCall}
          onDecline={handleDeclineCall}
        />
      )}

      <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Video Calls
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Today's Calls
          </Text>
          <Text className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {todayAppointments.length}
          </Text>
        </View>

        {isLoading ? (
          <Text className="text-gray-500 text-center py-8">Loading appointments...</Text>
        ) : confirmedAppointments.length === 0 ? (
          <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center mt-8">
            <Ionicons name="videocam-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
              No confirmed appointments for video calls
            </Text>
          </View>
        ) : (
          confirmedAppointments.map((appointment) => (
            <View
              key={appointment.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center justify-between mb-3">
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
                <Ionicons name="videocam" size={24} color="#2563eb" />
              </View>

              <Button
                title={isInitiatingCall ? "Calling..." : "Start Video Call"}
                onPress={() => handleStartCall(appointment.id, appointment.patientId, appointment.patientName)}
                size="sm"
                loading={isInitiatingCall}
                disabled={isInitiatingCall}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

