import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Alert, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Audio } from 'expo-av'
import { useCallStore, CallData } from '@/stores/callStore'

interface VideoCallProps {
  call: CallData
  userType: 'patient' | 'doctor'
  onEndCall: () => void
}

export default function VideoCall({ call, userType, onEndCall }: VideoCallProps) {
  const router = useRouter()
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null)
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front')
  const [permission, requestPermission] = useCameraPermissions()
  const { endCall } = useCallStore()
  const intervalRef = useRef<NodeJS.Timeout>()

  const { width, height } = Dimensions.get('window')

  useEffect(() => {
    // Request permissions and start call duration timer
    const requestPermissions = async () => {
      try {
        // Request camera permission if not granted
        if (!permission?.granted) {
          await requestPermission()
        }

        // Request microphone permission
        const audioStatus = await Audio.requestPermissionsAsync()
        setHasAudioPermission(audioStatus.status === 'granted')

        // Configure audio session for calls
        if (audioStatus.status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: true,
          })
        }
      } catch (error) {
        console.error('Error requesting permissions:', error)
        Alert.alert('Permission Error', 'Failed to request camera and microphone permissions')
      }
    }

    requestPermissions()

    // Start call duration timer
    intervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [permission, requestPermission])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = async () => {
    try {
      await endCall(call.id)
      
      // Navigate to session summary for doctors
      if (userType === 'doctor') {
        router.push({
          pathname: '/doctor/session-summary',
          params: {
            callId: call.id,
            patientId: call.patientId,
            patientName: call.patientName,
            appointmentId: call.appointmentId || ''
          }
        })
      }
      
      onEndCall()
    } catch (error) {
      Alert.alert('Error', 'Failed to end call')
    }
  }

  const toggleMute = async () => {
    try {
      setIsMuted(!isMuted)
      // Configure audio based on mute state
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: !isMuted,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      })
    } catch (error) {
      console.error('Error toggling mute:', error)
    }
  }

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff)
  }

  const switchCamera = () => {
    setCameraType(current => 
      current === 'back' ? 'front' : 'back'
    )
  }

  const otherPersonName = userType === 'patient' ? call.doctorName : call.patientName

  // Show permission request screen if permissions not granted
  if (permission === null || hasAudioPermission === null) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-lg mb-4">Requesting permissions...</Text>
      </View>
    )
  }

  if (!permission.granted || hasAudioPermission === false) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-6">
        <Ionicons name="warning" size={64} color="#ef4444" />
        <Text className="text-white text-xl font-semibold mt-4 text-center">
          Camera and Microphone Access Required
        </Text>
        <Text className="text-gray-300 text-center mt-2 mb-6">
          Please enable camera and microphone permissions in your device settings to join the video call.
        </Text>
        <TouchableOpacity
          onPress={handleEndCall}
          className="bg-red-600 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">End Call</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-black">
      {/* Video Container */}
      <View className="flex-1 relative">
        {/* Remote Video (Full Screen) */}
        <View className="flex-1 bg-gray-800 items-center justify-center">
          {call.callType === 'audio' || isVideoOff ? (
            <View className="items-center">
              <View className="w-32 h-32 bg-gray-600 rounded-full items-center justify-center mb-4">
                <Ionicons name="person" size={64} color="#ffffff" />
              </View>
              <Text className="text-white text-lg font-semibold">
                {otherPersonName}
              </Text>
              {call.callType === 'audio' && (
                <Text className="text-gray-400 text-sm mt-2">
                  Voice Call
                </Text>
              )}
            </View>
          ) : (
            <View className="flex-1 w-full bg-gray-700 items-center justify-center">
              <Text className="text-white text-lg">Video Stream Placeholder</Text>
              <Text className="text-gray-300 text-sm mt-2">
                {otherPersonName}
              </Text>
            </View>
          )}
        </View>

        {/* Local Video (Picture in Picture) - Only show for video calls */}
        {call.callType === 'video' && permission?.granted && (
          <View className="absolute top-12 right-4 w-32 h-40 rounded-lg overflow-hidden">
            {isVideoOff ? (
              <View className="flex-1 bg-gray-600 items-center justify-center">
                <Ionicons name="videocam-off" size={24} color="#ffffff" />
              </View>
            ) : (
              <CameraView
                style={{ flex: 1 }}
                facing={cameraType}
              />
            )}
          </View>
        )}

        {/* Call Info Overlay */}
        <View className="absolute top-12 left-4 right-4">
          <View className="bg-black/50 rounded-lg p-3">
            <Text className="text-white text-lg font-semibold text-center">
              {otherPersonName}
            </Text>
            <Text className="text-gray-300 text-sm text-center mt-1">
              {formatDuration(callDuration)}
            </Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View className="bg-black/80 p-6 pb-12">
        <View className="flex-row justify-center items-center space-x-6">
          {/* Mute Button */}
          <TouchableOpacity
            onPress={toggleMute}
            className={`w-16 h-16 rounded-full items-center justify-center ${
              isMuted ? 'bg-red-600' : 'bg-gray-600'
            }`}
          >
            <Ionicons 
              name={isMuted ? "mic-off" : "mic"} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>

          {/* Video Toggle Button - Only show for video calls */}
          {call.callType === 'video' && (
            <TouchableOpacity
              onPress={toggleVideo}
              className={`w-16 h-16 rounded-full items-center justify-center ${
                isVideoOff ? 'bg-red-600' : 'bg-gray-600'
              }`}
            >
              <Ionicons 
                name={isVideoOff ? "videocam-off" : "videocam"} 
                size={24} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          )}

          {/* End Call Button */}
          <TouchableOpacity
            onPress={handleEndCall}
            className="w-20 h-20 bg-red-600 rounded-full items-center justify-center"
          >
            <Ionicons name="call" size={32} color="#ffffff" />
          </TouchableOpacity>

          {/* Camera Switch Button - Only show for video calls when camera is on */}
          {call.callType === 'video' && !isVideoOff && permission?.granted && (
            <TouchableOpacity
              onPress={switchCamera}
              className="w-16 h-16 rounded-full items-center justify-center bg-gray-600"
            >
              <Ionicons 
                name="camera-reverse" 
                size={24} 
                color="#ffffff" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}