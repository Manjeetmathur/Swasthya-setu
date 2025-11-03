import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Modal, Alert, Animated, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCallStore, CallData } from '@/stores/callStore'

interface IncomingCallProps {
  call: CallData
  userType: 'patient' | 'doctor'
  onAnswer: () => void
  onDecline: () => void
}

export default function IncomingCall({ call, userType, onAnswer, onDecline }: IncomingCallProps) {
  const [isAnswering, setIsAnswering] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const { answerCall, declineCall } = useCallStore()

  // Animation values for pulsing rings
  const pulseAnim1 = useRef(new Animated.Value(1)).current
  const pulseAnim2 = useRef(new Animated.Value(1)).current
  const opacityAnim1 = useRef(new Animated.Value(0.3)).current
  const opacityAnim2 = useRef(new Animated.Value(0.2)).current

  useEffect(() => {
    // First ring animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim1, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim1, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()

    // Second ring animation (delayed)
    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.2,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim2, {
              toValue: 0.4,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim2, {
              toValue: 0.2,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start()
    }, 750)
  }, [])

  const callerName = userType === 'patient' ? call.doctorName : call.patientName
  const callerRole = userType === 'patient' ? 'Doctor' : 'Patient'

  const handleAnswer = async () => {
    try {
      setIsAnswering(true)
      await answerCall(call.id)
      onAnswer()
    } catch (error) {
      Alert.alert('Error', 'Failed to answer call')
      setIsAnswering(false)
    }
  }

  const handleDecline = async () => {
    try {
      setIsDeclining(true)
      await declineCall(call.id)
      onDecline()
    } catch (error) {
      Alert.alert('Error', 'Failed to decline call')
      setIsDeclining(false)
    }
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View className="flex-1 bg-gradient-to-b from-blue-900 to-blue-700 items-center justify-center">
        {/* Caller Info */}
        <View className="items-center mb-16">
          <View className="w-40 h-40 bg-white/20 rounded-full items-center justify-center mb-6">
            <Ionicons 
              name={userType === 'patient' ? "medical" : "person"} 
              size={80} 
              color="#ffffff" 
            />
          </View>
          
          <Text className="text-white text-3xl font-bold mb-2">
            {callerName}
          </Text>
          
          <Text className="text-blue-100 text-lg mb-2">
            {callerRole}
          </Text>
          
          <Text className="text-blue-200 text-base">
            Incoming video call...
          </Text>
        </View>

        {/* Animated Rings */}
        <View className="absolute items-center justify-center">
          <Animated.View
            className="w-80 h-80 border-2 border-white rounded-full"
            style={{
              transform: [{ scale: pulseAnim1 }],
              opacity: opacityAnim1,
            }}
          />
          <Animated.View
            className="absolute w-96 h-96 border-2 border-white rounded-full"
            style={{
              transform: [{ scale: pulseAnim2 }],
              opacity: opacityAnim2,
            }}
          />
        </View>

        {/* Call Actions */}
        <View className="absolute bottom-20 left-0 right-0">
          <View className="flex-row justify-center items-center space-x-16">
            {/* Decline Button */}
            <TouchableOpacity
              onPress={handleDecline}
              disabled={isDeclining || isAnswering}
              className="w-20 h-20 bg-red-600 rounded-full items-center justify-center shadow-lg"
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="call" size={32} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
              )}
            </TouchableOpacity>

            {/* Answer Button */}
            <TouchableOpacity
              onPress={handleAnswer}
              disabled={isAnswering || isDeclining}
              className="w-20 h-20 bg-green-600 rounded-full items-center justify-center shadow-lg"
            >
              {isAnswering ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="call" size={32} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
          
          <View className="flex-row justify-center mt-6 space-x-16">
            <Text className="text-white text-sm">Decline</Text>
            <Text className="text-white text-sm">Answer</Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}