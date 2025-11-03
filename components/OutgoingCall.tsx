import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Modal, Alert, Animated, ActivityIndicator, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { useCallStore, CallData } from '@/stores/callStore'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface OutgoingCallProps {
  call: CallData
  userType: 'patient' | 'doctor'
  onCancel: () => void
  onCallConnected?: () => void
}

export default function OutgoingCall({ call, userType, onCancel, onCallConnected }: OutgoingCallProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const { endCall, setCurrentCall } = useCallStore()
  const soundRef = useRef<Audio.Sound | null>(null)
  const soundInterval = useRef<NodeJS.Timeout | null>(null)

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

  // Play dial tone sound
  useEffect(() => {
    let mounted = true

    const playDialTone = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        })

        // Play a dial tone beep pattern
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
          { shouldPlay: false, volume: 0.5 }
        )

        // Play beep every 3 seconds for dial tone effect
        const playInterval = setInterval(async () => {
          if (mounted && sound) {
            try {
              await sound.setPositionAsync(0)
              await sound.playAsync()
            } catch {
              // Ignore errors
            }
          }
        }, 3000)

        if (mounted) {
          soundRef.current = sound
          soundInterval.current = playInterval
        }

        return () => {
          if (playInterval) {
            clearInterval(playInterval)
          }
        }
      } catch (error) {
        console.log('Could not play dial tone:', error)
      }
    }

    playDialTone()

    return () => {
      mounted = false
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {})
        soundRef.current = null
      }
      if (soundInterval.current) {
        clearInterval(soundInterval.current)
      }
    }
  }, [])

  // Subscribe to call status changes
  useEffect(() => {
    const callRef = doc(db, 'calls', call.id)
    const unsubscribe = onSnapshot(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const callData = snapshot.data() as CallData
        const updatedCall = {
          ...call,
          ...callData,
          id: snapshot.id
        } as CallData

        if (callData.status === 'connected') {
          stopSound()
          setCurrentCall(updatedCall)
          onCallConnected?.()
        } else if (callData.status === 'declined' || callData.status === 'ended' || callData.status === 'missed') {
          stopSound()
          onCancel()
        }
      }
    })

    return unsubscribe
  }, [call.id])

  const recipientName = userType === 'patient' ? call.doctorName : call.patientName
  const callTypeText = call.callType === 'video' ? 'Video Call' : 'Voice Call'

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
      } catch {
        // Ignore errors
      }
      soundRef.current = null
    }
    if (soundInterval.current) {
      clearInterval(soundInterval.current)
      soundInterval.current = null
    }
  }

  const handleCancel = async () => {
    try {
      await stopSound()
      setIsCancelling(true)
      await endCall(call.id)
      onCancel()
    } catch {
      Alert.alert('Error', 'Failed to cancel call')
      setIsCancelling(false)
    }
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View className="flex-1 bg-blue-900 items-center justify-center" style={{ backgroundColor: '#1e3a8a' }}>
        {/* Recipient Info */}
        <View className="items-center mb-16">
          <View className="w-40 h-40 bg-white/20 rounded-full items-center justify-center mb-6">
            <Ionicons 
              name={userType === 'patient' ? "medical" : "person"} 
              size={80} 
              color="#ffffff" 
            />
          </View>
          
          <Text className="text-white text-3xl font-bold mb-2">
            {recipientName}
          </Text>
          
          <Text className="text-blue-100 text-lg mb-2">
            {callTypeText}
          </Text>
          
          <Text className="text-blue-200 text-base">
            Calling...
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

        {/* Cancel Button */}
        <View className="absolute bottom-20 left-0 right-0">
          <View className="items-center">
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isCancelling}
              className="w-20 h-20 bg-red-600 rounded-full items-center justify-center shadow-lg"
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="call" size={32} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
              )}
            </TouchableOpacity>
            <Text className="text-white text-sm mt-4">Cancel</Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

