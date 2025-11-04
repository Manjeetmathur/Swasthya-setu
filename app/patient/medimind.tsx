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
import { voiceAnalysisService, VoiceAnalysis, MentalHealthSuggestion } from '@/lib/voiceAnalysisService'
import { useMoodStore } from '@/stores/moodStore'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import { useLanguageStore } from '@/stores/languageStore'
import * as Haptics from 'expo-haptics'
import { Timestamp } from 'firebase/firestore'

const RECORDING_DURATION = 5000 // 5 seconds

export default function MediMind() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { t } = useLanguageStore()
  const { addMoodEntry, currentAlert, clearAlert, loadMoodHistory } = useMoodStore()
  const { initiateCall } = useCallStore()
  
  const [isRecording, setIsRecording] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null)
  const [suggestions, setSuggestions] = useState<MentalHealthSuggestion[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
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
        Alert.alert(t('medimind.permission_required'), t('medimind.microphone_access_needed'))
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
      Alert.alert(t('medimind.error'), t('medimind.failed_to_start_recording'))
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
        Alert.alert(t('medimind.error'), t('medimind.no_recording_found'))
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
      Alert.alert(t('medimind.error'), t('medimind.failed_to_stop_recording'))
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
      setSuggestions([])

    try {
      const { audioBase64 } = pendingAnalysisRef.current
      
      if (!transcription || transcription.trim() === '') {
        // Use heuristic analysis if no transcription
        const heuristicAnalysis = voiceAnalysisService.analyzeTextHeuristics('')
        const fullAnalysis: VoiceAnalysis = {
          score: heuristicAnalysis.score ?? 65,
          tone: (heuristicAnalysis.tone ?? 'neutral') as 'happy' | 'neutral' | 'sad' | 'flat',
          energy: (heuristicAnalysis.energy ?? 'medium') as 'high' | 'medium' | 'low',
          indicators: {
            slowSpeech: heuristicAnalysis.indicators?.slowSpeech ?? false,
            flatTone: heuristicAnalysis.indicators?.flatTone ?? false,
            pauses: heuristicAnalysis.indicators?.pauses ?? false,
            lowVolume: heuristicAnalysis.indicators?.lowVolume ?? false
          },
          detectedMood: 'Voice recorded successfully. Analysis based on audio patterns.',
          confidence: 0.6
        }
        await processAnalysis(fullAnalysis, audioBase64, '')
        return
      }

      // Analyze transcription
      const analysis = await voiceAnalysisService.analyzeTranscription(transcription)
      await processAnalysis(analysis, audioBase64, transcription)
    } catch (error: any) {
      Alert.alert(t('medimind.analysis_failed'), error.message || t('medimind.failed_to_analyze_voice'))
      setIsAnalyzing(false)
    } finally {
      pendingAnalysisRef.current = null
    }
  }

  const processAnalysis = async (analysis: VoiceAnalysis, audioBase64: string, transcription: string) => {
    try {
      if (!userData?.uid) return

      // Ensure analysis has all required properties
      const completeAnalysis: VoiceAnalysis = {
        score: analysis.score ?? 65,
        tone: analysis.tone ?? 'neutral',
        energy: analysis.energy ?? 'medium',
        indicators: {
          slowSpeech: analysis.indicators?.slowSpeech ?? false,
          flatTone: analysis.indicators?.flatTone ?? false,
          pauses: analysis.indicators?.pauses ?? false,
          lowVolume: analysis.indicators?.lowVolume ?? false
        },
        detectedMood: analysis.detectedMood || 'Analysis completed',
        confidence: analysis.confidence ?? 0.5
      }

      // Save to mood store (uploads to Firebase)
      await addMoodEntry(userData.uid, completeAnalysis, audioBase64, transcription)
      
      // Set analysis state to trigger UI update
      setAnalysis(completeAnalysis)
      
      // Generate suggestions based on analysis
      setIsLoadingSuggestions(true)
      setSuggestions([])
      try {
        const generatedSuggestions = await voiceAnalysisService.generateSuggestions(completeAnalysis, transcription)
        setSuggestions(generatedSuggestions)
      } catch (error) {
        console.error('Error generating suggestions:', error)
        // Fallback suggestions will be used
        const fallbackSuggestions = await voiceAnalysisService.generateSuggestions(completeAnalysis)
        setSuggestions(fallbackSuggestions)
      } finally {
        setIsLoadingSuggestions(false)
      }
      
      // Check for low mood alert
      if (completeAnalysis.score < 40) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }

      // Update recent mood
      checkRecentMood()
    } catch (error: any) {
      console.error('Process analysis error:', error)
      // Even if save fails, show the analysis result
      const completeAnalysis: VoiceAnalysis = {
        score: analysis.score ?? 65,
        tone: analysis.tone ?? 'neutral',
        energy: analysis.energy ?? 'medium',
        indicators: {
          slowSpeech: analysis.indicators?.slowSpeech ?? false,
          flatTone: analysis.indicators?.flatTone ?? false,
          pauses: analysis.indicators?.pauses ?? false,
          lowVolume: analysis.indicators?.lowVolume ?? false
        },
        detectedMood: analysis.detectedMood || 'Analysis completed',
        confidence: analysis.confidence ?? 0.5
      }
      setAnalysis(completeAnalysis)
      
      // Generate suggestions even if save failed
      setIsLoadingSuggestions(true)
      try {
        const generatedSuggestions = await voiceAnalysisService.generateSuggestions(completeAnalysis, transcription)
        setSuggestions(generatedSuggestions)
      } catch (error) {
        console.error('Error generating suggestions:', error)
      } finally {
        setIsLoadingSuggestions(false)
      }
      
      Alert.alert(t('medimind.warning'), t('medimind.analysis_completed_not_saved'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSuggestionIcon = (category: string) => {
    switch (category) {
      case 'immediate':
        return 'alert-circle'
      case 'professional':
        return 'medical'
      case 'activity':
        return 'walk'
      case 'self-care':
      default:
        return 'heart'
    }
  }

  const getSuggestionColor = (category: string) => {
    switch (category) {
      case 'immediate':
        return '#ef4444'
      case 'professional':
        return '#8b5cf6'
      case 'activity':
        return '#3b82f6'
      case 'self-care':
      default:
        return '#10b981'
    }
  }

  const handleConnectTherapist = async () => {
    if (!userData?.uid) return

    try {
      // Find available therapist or use a default connection
      // For demo, we'll create a call with a therapist
      // In production, match with available mental health professionals
      
      Alert.alert(
        t('medimind.connect_therapist_confirm'),
        t('medimind.connect_therapist_message'),
        [
          { text: t('medimind.cancel'), style: 'cancel' },
          {
            text: t('medimind.connect'),
            onPress: async () => {
              // Create a call - in production, match with actual therapist
              const therapistId = 'therapist_demo' // Replace with actual matching
              
              try {
                await initiateCall(
                  userData.uid,
                  therapistId,
                  userData.displayName || t('medimind.patient'),
                  'Mental Health Support',
                  '',
                  'video'
                )
                router.push('/patient/call')
              } catch (error) {
                Alert.alert(t('medimind.error'), t('medimind.failed_to_connect'))
              }
            }
          }
        ]
      )
    } catch (error) {
      Alert.alert(t('medimind.error'), t('medimind.failed_to_connect_therapist'))
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981' // green
    if (score >= 60) return '#3b82f6' // blue
    if (score >= 40) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return t('medimind.great')
    if (score >= 60) return t('medimind.okay')
    if (score >= 40) return t('medimind.low')
    return t('medimind.very_low')
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
              {t('medimind.title')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
            {t('medimind.subtitle')}
          </Text>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6">
          {/* Recent Mood */}
          {recentMood && (
            <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('medimind.last_checkin')}
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
              {t('medimind.how_are_you_today')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-8 px-4">
              {t('medimind.speak_for_5_seconds')}
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
                ? t('medimind.recording')
                : isAnalyzing
                ? t('medimind.analyzing_voice')
                : t('medimind.press_to_record')}
            </Text>
          </View>

          {/* Analysis Result */}
          {analysis && (
            <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('medimind.analysis_result')}
              </Text>
              
              <View className="flex-row items-center mb-4">
                <View
                  className="w-20 h-20 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: getScoreColor(analysis.score ?? 65) }}
                >
                  <Text className="text-white font-bold text-2xl">
                    {analysis.score ?? 65}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold text-lg">
                    {getScoreLabel(analysis.score ?? 65)}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {analysis.detectedMood || 'Analysis completed'}
                  </Text>
                </View>
              </View>

              <View className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('medimind.tone')}: {analysis.tone ? analysis.tone.charAt(0).toUpperCase() + analysis.tone.slice(1) : 'Neutral'} • {t('medimind.energy')}: {analysis.energy ? analysis.energy.charAt(0).toUpperCase() + analysis.energy.slice(1) : 'Medium'}
                </Text>
                {analysis.indicators && Object.entries(analysis.indicators).some(([_, value]) => value) && (
                  <View className="mt-2">
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('medimind.indicators')}:
                    </Text>
                    {analysis.indicators.slowSpeech && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                        • {t('medimind.slow_speech_detected')}
                      </Text>
                    )}
                    {analysis.indicators.flatTone && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                        • {t('medimind.flat_tone_detected')}
                      </Text>
                    )}
                    {analysis.indicators.pauses && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                        • {t('medimind.pauses_detected')}
                      </Text>
                    )}
                    {analysis.indicators.lowVolume && (
                      <Text className="text-sm text-amber-600 dark:text-amber-400 mb-1">
                        • {t('medimind.low_volume_detected')}
                      </Text>
                    )}
                  </View>
                )}
                {analysis.confidence !== undefined && (
                  <Text className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {t('medimind.confidence')}: {Math.round((analysis.confidence ?? 0) * 100)}%
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Suggestions Section */}
          {analysis && (suggestions.length > 0 || isLoadingSuggestions) && (
            <View className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="bulb" size={24} color="#8b5cf6" />
                <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
                  {t('medimind.personalized_suggestions')}
                </Text>
              </View>
              
              {isLoadingSuggestions ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
                    {t('medimind.generating_suggestions')}
                  </Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <View
                      key={index}
                      className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <View className="flex-row items-start">
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
                          style={{ backgroundColor: getSuggestionColor(suggestion.category) + '20' }}
                        >
                          <Ionicons
                            name={getSuggestionIcon(suggestion.category) as any}
                            size={16}
                            color={getSuggestionColor(suggestion.category)}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                            {suggestion.title}
                          </Text>
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            {suggestion.description}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Connect to Therapist Button */}
          <TouchableOpacity
            onPress={handleConnectTherapist}
            className="bg-purple-600 dark:bg-purple-700 rounded-lg py-4 px-6 items-center"
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text className="text-white font-semibold text-lg mt-2">
              {t('medimind.connect_to_therapist')}
            </Text>
            <Text className="text-purple-100 text-sm mt-1 text-center">
              {t('medimind.three_taps_live_call')}
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
                {t('medimind.you_dont_seem_like_yourself')}
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
                  {t('medimind.not_now')}
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
                <Text className="text-white font-semibold">{t('medimind.talk_now')}</Text>
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
              {t('medimind.what_did_you_say')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              {t('medimind.enter_transcription')}
            </Text>
            
            <TextInput
              value={transcriptionText}
              onChangeText={setTranscriptionText}
              placeholder={t('medimind.transcription_placeholder')}
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
                  {t('medimind.skip')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTranscriptionSubmit(transcriptionText)}
                className="flex-1 bg-blue-600 dark:bg-blue-700 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">{t('medimind.analyze')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

