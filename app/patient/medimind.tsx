import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import { Ionicons } from '@expo/vector-icons'
import { voiceAnalysisService, VoiceAnalysis } from '@/lib/voiceAnalysisService'
import { useMoodStore } from '@/stores/moodStore'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import * as Haptics from 'expo-haptics'
import { Timestamp } from 'firebase/firestore'

const RECORDING_DURATION = 5000 // 5 seconds

export default function MediMind() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { addMoodEntry, currentAlert, clearAlert, loadMoodHistory } = useMoodStore()
  const { initiateCall } = useCallStore()
  
  const [isRecording, setIsRecording] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recentMood, setRecentMood] = useState<{ score: number; date: string } | null>(null)
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState('')
  
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingAnalysisRef = useRef<{ audioUri: string; audioBase64: string } | null>(null)

  useEffect(() => {
    if (userData?.uid) {
      loadMoodHistory(userData.uid)
      checkRecentMood()
    }
  }, [userData?.uid])

  useEffect(() => {
    if (currentAlert.show) {
      setShowAlert(true)
    }
  }, [currentAlert])

  const checkRecentMood = () => {
    if (!userData?.uid) return
    const moodStore = useMoodStore.getState()
    const history = moodStore.getMoodHistory(userData.uid, 7)
    if (history.length > 0) {
      const latest = history[0]
      setRecentMood({
        score: latest.score,
        date: latest.date
      })
    }
  }

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed to record your voice')
        return
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      })

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        undefined,
        1000 // Update interval
      )

      setRecording(newRecording)
      setIsRecording(true)
      setRecordingTime(0)

      // Auto-stop after 5 seconds
      recordingTimerRef.current = setTimeout(() => {
        stopRecording()
      }, RECORDING_DURATION)

      // Update timer display
      const timerInterval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 100
          if (newTime >= RECORDING_DURATION) {
            clearInterval(timerInterval)
            return RECORDING_DURATION
          }
          return newTime
        })
      }, 100)

      // Store interval ref for cleanup
      ;(recordingTimerRef as any).interval = timerInterval

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording')
      console.error('Recording error:', error)
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    try {
      // Clear timer
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      if ((recordingTimerRef as any).interval) {
        clearInterval((recordingTimerRef as any).interval)
      }

      setIsRecording(false)
      
      // Stop and get URI
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      
      if (!uri) {
        Alert.alert('Error', 'No recording found')
        return
      }

      // Read recording as base64
      const response = await fetch(uri)
      const blob = await response.blob()
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        analyzeRecording(uri, base64)
      }
      reader.readAsDataURL(blob)

      setRecording(null)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording')
      console.error('Stop recording error:', error)
    }
  }

  const analyzeRecording = async (audioUri: string, audioBase64: string) => {
    // Store for later analysis
    pendingAnalysisRef.current = { audioUri, audioBase64 }
    
    // Show transcription modal (optional - user can skip)
    setShowTranscriptionModal(true)
  }

  const handleTranscriptionSubmit = async (transcription: string | null) => {
    setShowTranscriptionModal(false)
    
    if (!pendingAnalysisRef.current || !userData?.uid) return

    setIsAnalyzing(true)
    setAnalysis(null)

    try {
      const { audioBase64 } = pendingAnalysisRef.current
      
      if (!transcription || transcription.trim() === '') {
        // Use heuristic analysis if no transcription
        const analysis = voiceAnalysisService.analyzeTextHeuristics('')
        const fullAnalysis: VoiceAnalysis = {
          ...analysis,
          score: 65, // Default neutral
          detectedMood: 'Recorded successfully',
          confidence: 0.5
        } as VoiceAnalysis
        await processAnalysis(fullAnalysis, audioBase64, '')
        return
      }

      // Analyze transcription
      const analysis = await voiceAnalysisService.analyzeTranscription(transcription)
      await processAnalysis(analysis, audioBase64, transcription)
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message || 'Failed to analyze voice')
      setIsAnalyzing(false)
    } finally {
      pendingAnalysisRef.current = null
    }
  }

  const processAnalysis = async (analysis: VoiceAnalysis, audioBase64: string, transcription: string) => {
    try {
      if (!userData?.uid) return

      // Save to mood store (uploads to Firebase)
      await addMoodEntry(userData.uid, analysis, audioBase64, transcription)
      
      setAnalysis(analysis)
      
      // Check for low mood alert
      if (analysis.score < 40) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }

      // Update recent mood
      checkRecentMood()
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save analysis')
      console.error('Process analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleConnectTherapist = async () => {
    if (!userData?.uid) return

    try {
      // Find available therapist or use a default connection
      // For demo, we'll create a call with a therapist
      // In production, match with available mental health professionals
      
      Alert.alert(
        'Connect to Therapist',
        'This will connect you to a mental health professional. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: async () => {
              // Create a call - in production, match with actual therapist
              const therapistId = 'therapist_demo' // Replace with actual matching
              
              try {
                await initiateCall(
                  userData.uid,
                  therapistId,
                  userData.displayName || 'Patient',
                  'Mental Health Support',
                  '',
                  'video'
                )
                router.push('/patient/call')
              } catch (error) {
                Alert.alert('Error', 'Failed to connect. Please try again.')
              }
            }
          }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to therapist')
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981' // green
    if (score >= 60) return '#3b82f6' // blue
    if (score >= 40) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Great'
    if (score >= 60) return 'Okay'
    if (score >= 40) return 'Low'
    return 'Very Low'
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              MediMind
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
            Mental health hides. We hear it.
          </Text>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6">
          {/* Recent Mood */}
          {recentMood && (
            <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Last Check-in
              </Text>
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: getScoreColor(recentMood.score) }}
                >
                  <Text className="text-white font-bold text-lg">
                    {recentMood.score}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    {getScoreLabel(recentMood.score)}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {new Date(recentMood.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Recording Section */}
          <View className="items-center mb-6">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              How are you today?
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-8 px-4">
              Speak for 5 seconds. We'll listen to your tone and energy.
            </Text>

            {/* Recording Button */}
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              className={`w-32 h-32 rounded-full items-center justify-center ${
                isRecording
                  ? 'bg-red-500'
                  : isAnalyzing
                  ? 'bg-gray-400'
                  : 'bg-blue-600 dark:bg-blue-700'
              }`}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : isRecording ? (
                <View className="items-center">
                  <Ionicons name="stop" size={48} color="#fff" />
                  <Text className="text-white text-xs mt-2">
                    {(RECORDING_DURATION - recordingTime) / 1000}s
                  </Text>
                </View>
              ) : (
                <Ionicons name="mic" size={48} color="#fff" />
              )}
            </TouchableOpacity>

            <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center">
              {isRecording
                ? 'Recording... Speak now'
                : isAnalyzing
                ? 'Analyzing your voice...'
                : 'Press to record'}
            </Text>
          </View>

          {/* Analysis Result */}
          {analysis && (
            <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Analysis Result
              </Text>
              
              <View className="flex-row items-center mb-4">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: getScoreColor(analysis.score) }}
                >
                  <Text className="text-white font-bold text-2xl">
                    {analysis.score}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold text-lg">
                    {getScoreLabel(analysis.score)}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {analysis.detectedMood}
                  </Text>
                </View>
              </View>

              <View className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Tone: {analysis.tone} • Energy: {analysis.energy}
                </Text>
                {Object.entries(analysis.indicators).some(([_, value]) => value) && (
                  <View>
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Indicators:
                    </Text>
                    {analysis.indicators.slowSpeech && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400">
                        • Slow speech detected
                      </Text>
                    )}
                    {analysis.indicators.flatTone && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400">
                        • Flat tone detected
                      </Text>
                    )}
                    {analysis.indicators.pauses && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400">
                        • Pauses detected
                      </Text>
                    )}
                    {analysis.indicators.lowVolume && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400">
                        • Low volume detected
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Connect to Therapist Button */}
          <TouchableOpacity
            onPress={handleConnectTherapist}
            className="bg-purple-600 dark:bg-purple-700 rounded-lg py-4 px-6 items-center"
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text className="text-white font-semibold text-lg mt-2">
              Connect to Therapist
            </Text>
            <Text className="text-purple-100 text-sm mt-1 text-center">
              3 taps → Live video call with real person
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Low Mood Alert Modal */}
      <Modal
        visible={showAlert}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAlert(false)
          clearAlert()
        }}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-3">
                <Ionicons name="warning" size={32} color="#f59e0b" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                You don't seem like yourself
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center">
                {currentAlert.message}
              </Text>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={() => {
                  setShowAlert(false)
                  clearAlert()
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-900 dark:text-white font-semibold">
                  Not Now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowAlert(false)
                  clearAlert()
                  handleConnectTherapist()
                }}
                className="flex-1 bg-purple-600 dark:bg-purple-700 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Talk Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transcription Modal */}
      <Modal
        visible={showTranscriptionModal}
        transparent
        animationType="slide"
        onRequestClose={() => handleTranscriptionSubmit(null)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              What did you say?
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Enter what you said during the recording for better analysis (optional)
            </Text>
            
            <TextInput
              value={transcriptionText}
              onChangeText={setTranscriptionText}
              placeholder="E.g., I'm just tired..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-gray-900 dark:text-white mb-4 min-h-[100px]"
              autoFocus
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => handleTranscriptionSubmit(null)}
                className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg py-3 items-center"
              >
                <Text className="text-gray-900 dark:text-white font-semibold">
                  Skip
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTranscriptionSubmit(transcriptionText)}
                className="flex-1 bg-blue-600 dark:bg-blue-700 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

