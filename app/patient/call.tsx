import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore } from '@/stores/appointmentsStore'
import { useCallStore } from '@/stores/callStore'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'
import IncomingCall from '@/components/IncomingCall'
import VideoCall from '@/components/VideoCall'

interface Doctor {
  id: string
  displayName: string
  email: string
  doctorData: {
    specialization: string
    experience: string
    isVerified: boolean
    hospitalAffiliation?: string
    consultationFee?: string
  }
}

export default function PatientCalls() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { appointments, subscribeToAppointments, isLoading } = useAppointmentsStore()
  const { 
    initiateCall, 
    answerCall, 
    declineCall, 
    endCall, 
    incomingCall, 
    currentCall, 
    subscribeToIncomingCalls,
    isLoading: isInitiatingCall 
  } = useCallStore()

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

  const handleStartCall = async (appointmentId: string, doctorId: string, doctorName: string) => {
    if (!userData?.uid || !userData?.displayName) return
    
    try {
      await initiateCall(
        userData.uid,
        doctorId,
        userData.displayName,
        doctorName,
        appointmentId
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to start call. Please try again.')
    }
  }

  const handleAnswerCall = async () => {
    if (incomingCall) {
      try {
        await answerCall(incomingCall.id)
      } catch (error) {
        Alert.alert('Error', 'Failed to answer call.')
      }
    }
  }

  const handleDeclineCall = async () => {
    if (incomingCall) {
      try {
        await declineCall(incomingCall.id)
      } catch (error) {
        Alert.alert('Error', 'Failed to decline call.')
      }
    }
  }

  const handleEndCall = async () => {
    if (currentCall) {
      try {
        await endCall(currentCall.id)
      } catch (error) {
        Alert.alert('Error', 'Failed to end call.')
      }
    }
  }

  const confirmedAppointments = appointments.filter(
    (apt) => apt.status === 'confirmed'
  )

  // Show video call interface if there's an active call
  if (currentCall) {
    return (
      <VideoCall 
        call={currentCall} 
        userType="patient" 
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
          userType="patient"
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
                    Dr. {appointment.doctorName}
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
                onPress={() => handleStartCall(appointment.id, appointment.doctorId, appointment.doctorName)}
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

