import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Share
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { skinRashService, SkinRashResult } from '@/lib/skinRashService'
import { useLanguageStore } from '@/stores/languageStore'
import * as Haptics from 'expo-haptics'

export default function SkinRashDetection() {
  const router = useRouter()
  const { t } = useLanguageStore()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<SkinRashResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [originalResult, setOriginalResult] = useState<SkinRashResult | null>(null)

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(t('skin_rash.permission_required'), t('skin_rash.camera_access_needed'))
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        const imageBase64 = result.assets[0].base64 || ''
        setCapturedImage(imageUri)
        await analyzeImage(imageBase64)
      }
    } catch (error: any) {
      Alert.alert(t('skin_rash.error'), t('skin_rash.failed_to_take_photo'))
      console.error('Camera error:', error)
    }
  }

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(t('skin_rash.permission_required'), t('skin_rash.gallery_access_needed'))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true
      })

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri
        const imageBase64 = result.assets[0].base64 || ''
        setCapturedImage(imageUri)
        await analyzeImage(imageBase64)
      }
    } catch (error: any) {
      Alert.alert(t('skin_rash.error'), t('skin_rash.failed_to_pick_image'))
      console.error('Gallery error:', error)
    }
  }

  const analyzeImage = async (imageBase64: string) => {
    if (!imageBase64) {
      Alert.alert(t('skin_rash.error'), t('skin_rash.image_data_not_available'))
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null)

    try {
      const result = await skinRashService.analyzeRashImage(imageBase64)
      setAnalysisResult(result)
      setOriginalResult(result)

      // Haptic feedback based on urgency
      if (result.analysis.urgency === 'high') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else if (result.analysis.urgency === 'medium') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    } catch (error: any) {
      Alert.alert(t('skin_rash.analysis_failed'), error.message || t('skin_rash.failed_to_analyze'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTranslate = async () => {
    if (!analysisResult || !originalResult) return

    setIsTranslating(true)

    try {
      const { language } = useLanguageStore.getState()
      if (language === 'English') {
        const translatedResult = await skinRashService.translateToHindi(originalResult)
        setAnalysisResult(translatedResult)
      } else {
        setAnalysisResult(originalResult)
      }
    } catch (error: any) {
      Alert.alert(t('skin_rash.translation_failed'), error.message || t('skin_rash.failed_to_translate'))
    } finally {
      setIsTranslating(false)
    }
  }

  const handleReset = () => {
    setCapturedImage(null)
    setAnalysisResult(null)
    setOriginalResult(null)
  }

  const handleShare = async () => {
    if (!analysisResult) {
      Alert.alert(t('skin_rash.error'), t('skin_rash.nothing_to_share'))
      return
    }

    try {
      let message = `Skin Rash Analysis Result\n\n`
      message += `Condition: ${analysisResult.analysis.condition}\n`
      message += `Severity: ${analysisResult.analysis.severity}\n`
      message += `Urgency: ${analysisResult.analysis.urgency}\n\n`
      message += `Description: ${analysisResult.analysis.description}\n\n`
      
      if (analysisResult.analysis.symptoms.length > 0) {
        message += `Symptoms:\n${analysisResult.analysis.symptoms.map(s => `• ${s}`).join('\n')}\n\n`
      }
      
      if (analysisResult.analysis.possibleCauses.length > 0) {
        message += `Possible Causes:\n${analysisResult.analysis.possibleCauses.map(c => `• ${c}`).join('\n')}\n\n`
      }
      
      if (analysisResult.analysis.recommendations.length > 0) {
        message += `Recommendations:\n${analysisResult.analysis.recommendations.map(r => `• ${r}`).join('\n')}\n\n`
      }
      
      if (analysisResult.analysis.whenToSeeDoctor.length > 0) {
        message += `When to See a Doctor:\n${analysisResult.analysis.whenToSeeDoctor.map(w => `• ${w}`).join('\n')}\n`
      }

      message += `\nAnalyzed with Skin Rash Detection - AI-powered dermatology analysis.`

      await Share.share({
        message
      })
    } catch (error) {
      Alert.alert(t('skin_rash.error'), t('skin_rash.failed_to_share'))
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '#ef4444' // red
      case 'medium':
        return '#f59e0b' // yellow
      case 'low':
        return '#10b981' // green
      default:
        return '#6b7280'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return '#ef4444' // red
      case 'moderate':
        return '#f59e0b' // yellow
      case 'mild':
        return '#3b82f6' // blue
      default:
        return '#6b7280'
    }
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
              {t('skin_rash.title')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
            {t('skin_rash.subtitle')}
          </Text>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6">
          {!capturedImage && !analysisResult ? (
            // Initial Screen
            <View className="items-center mt-12">
              <View className="w-32 h-32 rounded-full bg-purple-100 dark:bg-purple-900 items-center justify-center mb-6">
                <Ionicons name="medical" size={64} color="#a855f7" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('skin_rash.scan_skin_rash')}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mb-8 px-4">
                {t('skin_rash.scan_description')}
              </Text>

              <TouchableOpacity
                onPress={handleTakePhoto}
                className="w-full bg-purple-600 dark:bg-purple-700 rounded-lg py-4 items-center mb-4"
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text className="text-white font-semibold text-lg mt-2">
                  {t('skin_rash.take_photo')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickFromGallery}
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-lg py-4 items-center"
              >
                <Ionicons name="images" size={24} color="#1f2937" />
                <Text className="text-gray-900 dark:text-white font-semibold text-lg mt-2">
                  {t('skin_rash.choose_from_gallery')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isAnalyzing ? (
            // Analyzing
            <View className="items-center mt-12">
              <ActivityIndicator size="large" color="#a855f7" />
              <Text className="text-gray-900 dark:text-white text-lg font-semibold mt-4">
                {t('skin_rash.analyzing_condition')}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mt-2">
                {t('skin_rash.analyzing_description')}
              </Text>
            </View>
          ) : analysisResult ? (
            // Results
            <View>
              {capturedImage && (
                <Image
                  source={{ uri: capturedImage }}
                  className="w-full h-64 rounded-lg mb-4"
                  resizeMode="cover"
                />
              )}

              {/* Translate Button */}
              <View className="flex-row justify-end mb-4">
                <TouchableOpacity
                  onPress={handleTranslate}
                  disabled={isTranslating}
                  className={`bg-green-600 dark:bg-green-700 rounded-lg px-4 py-3 flex-row items-center ${
                    isTranslating ? 'opacity-50' : ''
                  }`}
                >
                  {isTranslating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons 
                        name="language" 
                        size={20} 
                        color="#fff" 
                      />
                      <Text className="text-white font-semibold ml-2">
                        {useLanguageStore.getState().language === 'English' ? t('skin_rash.hindi') : t('skin_rash.english')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Condition & Urgency */}
              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-300 dark:border-purple-700 p-4 mb-4">
                <Text className="text-2xl font-bold text-purple-900 dark:text-purple-100 mb-2">
                  {analysisResult.analysis.condition}
                </Text>
                <View className="flex-row items-center gap-3 mt-2">
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: getUrgencyColor(analysisResult.analysis.urgency) + '20' }}
                  >
                    <Text 
                      className="text-xs font-semibold"
                      style={{ color: getUrgencyColor(analysisResult.analysis.urgency) }}
                    >
                      {analysisResult.analysis.urgency.toUpperCase()} {t('skin_rash.urgency')}
                    </Text>
                  </View>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: getSeverityColor(analysisResult.analysis.severity) + '20' }}
                  >
                    <Text 
                      className="text-xs font-semibold"
                      style={{ color: getSeverityColor(analysisResult.analysis.severity) }}
                    >
                      {analysisResult.analysis.severity === 'severe' ? t('skin_rash.severe') : 
                       analysisResult.analysis.severity === 'moderate' ? t('skin_rash.moderate') : 
                       t('skin_rash.mild')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Description */}
              <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="document-text" size={20} color="#3b82f6" />
                  <Text className="text-gray-900 dark:text-white font-semibold text-lg ml-2">
                    {t('skin_rash.description')}
                  </Text>
                </View>
                <Text className="text-gray-700 dark:text-gray-300 text-sm">
                  {analysisResult.analysis.description}
                </Text>
              </View>

              {/* Symptoms */}
              {analysisResult.analysis.symptoms.length > 0 && (
                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700 p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="warning" size={20} color="#3b82f6" />
                    <Text className="text-blue-800 dark:text-blue-300 font-semibold text-lg ml-2">
                      {t('skin_rash.observed_symptoms')}
                    </Text>
                  </View>
                  {analysisResult.analysis.symptoms.map((symptom, idx) => (
                    <Text key={idx} className="text-blue-700 dark:text-blue-400 text-sm mb-1">
                      • {symptom}
                    </Text>
                  ))}
                </View>
              )}

              {/* Possible Causes */}
              {analysisResult.analysis.possibleCauses.length > 0 && (
                <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700 p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="help-circle" size={20} color="#f59e0b" />
                    <Text className="text-yellow-800 dark:text-yellow-300 font-semibold text-lg ml-2">
                      {t('skin_rash.possible_causes')}
                    </Text>
                  </View>
                  {analysisResult.analysis.possibleCauses.map((cause, idx) => (
                    <Text key={idx} className="text-yellow-700 dark:text-yellow-400 text-sm mb-1">
                      • {cause}
                    </Text>
                  ))}
                </View>
              )}

              {/* Recommendations */}
              {analysisResult.analysis.recommendations.length > 0 && (
                <View className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-300 dark:border-green-700 p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text className="text-green-800 dark:text-green-300 font-semibold text-lg ml-2">
                      {t('skin_rash.recommendations')}
                    </Text>
                  </View>
                  {analysisResult.analysis.recommendations.map((rec, idx) => (
                    <Text key={idx} className="text-green-700 dark:text-green-400 text-sm mb-1">
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}

              {/* When to See Doctor */}
              {analysisResult.analysis.whenToSeeDoctor.length > 0 && (
                <View className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700 p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="medical" size={20} color="#ef4444" />
                    <Text className="text-red-800 dark:text-red-300 font-semibold text-lg ml-2">
                      {t('skin_rash.when_to_see_doctor')}
                    </Text>
                  </View>
                  {analysisResult.analysis.whenToSeeDoctor.map((warning, idx) => (
                    <Text key={idx} className="text-red-700 dark:text-red-400 text-sm mb-1">
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}

              {/* Disclaimer */}
              <View className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 mb-4">
                <Text className="text-gray-600 dark:text-gray-400 text-xs text-center">
                  {t('skin_rash.disclaimer')}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={handleReset}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg py-3 items-center"
                >
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    {t('skin_rash.scan_another')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-1 bg-purple-600 dark:bg-purple-700 rounded-lg py-3 items-center"
                >
                  <Ionicons name="share" size={20} color="#fff" />
                  <Text className="text-white font-semibold mt-1">{t('skin_rash.share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

