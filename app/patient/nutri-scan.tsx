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
import { nutriScanService, ScanResult, UserProfile } from '@/lib/nutriScanService'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import * as Haptics from 'expo-haptics'

export default function AIScan() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { t } = useLanguageStore()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [originalResult, setOriginalResult] = useState<ScanResult | null>(null)


  // Play alert vibration/haptic if danger detected
  useEffect(() => {
    if (scanResult && !scanResult.isSafe) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    }
  }, [scanResult])

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(t('aiscan.permission_required'), t('aiscan.camera_access_needed'))
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      })

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri, result.assets[0].base64 || '')
      }
    } catch (error) {
      Alert.alert(t('aiscan.error'), t('aiscan.failed_to_take_photo'))
    }
  }

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(t('aiscan.permission_required'), t('aiscan.gallery_access_needed'))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true
      })

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri, result.assets[0].base64 || '')
      }
    } catch (error) {
      Alert.alert(t('aiscan.error'), t('aiscan.failed_to_pick_image'))
    }
  }


  const processImage = async (imageUri: string, imageBase64: string) => {
    if (!imageBase64) {
      Alert.alert(t('aiscan.error'), t('aiscan.failed_to_process'))
      return
    }

    setIsAnalyzing(true)
    setCapturedImage(imageUri)
    setScanResult(null)

    try {
      // Get user profile from auth store
      // Note: allergies, dietaryRestrictions, healthConditions should be added to user profile
      // For now, using empty defaults - user can add these in profile settings
      const userProfile: UserProfile = {
        allergies: [],
        dietaryRestrictions: 'none',
        healthConditions: []
      }

      // Analyze image with AI
      const result = await nutriScanService.analyzeLabelImage(
        imageBase64,
        userProfile
      )

      setScanResult(result)
      setOriginalResult(result) // Store original for toggling
    } catch (error: any) {
      Alert.alert(t('aiscan.analysis_failed'), error.message || t('aiscan.failed_to_analyze'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTranslate = async () => {
    if (!scanResult || !originalResult) return

    setIsTranslating(true)

    try {
      // Translate to Hindi if current language is English
      const { language } = useLanguageStore.getState()
      if (language === 'English') {
        const translatedResult = await nutriScanService.translateToHindi(originalResult)
        setScanResult(translatedResult)
      } else {
        // Switch back to English
        setScanResult(originalResult)
      }
    } catch (error: any) {
      Alert.alert(t('aiscan.translation_failed'), error.message || t('aiscan.failed_to_translate'))
    } finally {
      setIsTranslating(false)
    }
  }

  const handleReset = () => {
    setCapturedImage(null)
    setScanResult(null)
    setOriginalResult(null)
  }

  const handleShare = async () => {
    if (!scanResult) {
      Alert.alert(t('aiscan.error'), t('aiscan.nothing_to_share'))
      return
    }

    try {
      const allergensList = scanResult.allergens
        .filter(a => a.found)
        .map(a => `${a.allergen} (${a.severity} risk)`)
        .join(', ')

      let message = `AIScan Result\n\n`

      if (scanResult.scanType === 'medicine' && scanResult.medicineInfo) {
        message += `💊 ${scanResult.medicineInfo.name}\n`
        if (scanResult.medicineInfo.genericName) {
          message += `Generic: ${scanResult.medicineInfo.genericName}\n`
        }
        message += `\nUses:\n${scanResult.medicineInfo.uses.map(u => `• ${u}`).join('\n')}\n`
        if (scanResult.medicineInfo.dosage) {
          message += `\nDosage: ${scanResult.medicineInfo.dosage}\n`
        }
        if (scanResult.medicineInfo.sideEffects.length > 0) {
          message += `\nSide Effects:\n${scanResult.medicineInfo.sideEffects.map(s => `• ${s}`).join('\n')}\n`
        }
        if (scanResult.medicineInfo.results) {
          message += `\nExpected Results: ${scanResult.medicineInfo.results}\n`
        }
      } else {
        message += `${scanResult.isSafe ? '✅ SAFE TO EAT' : '⚠️ DANGER - DO NOT EAT'}\n\n`
        message += `Nutrition Grade: ${scanResult.nutritionScore.grade} (${scanResult.nutritionScore.score}/100)\n\n`
        if (allergensList) {
          message += `⚠️ Allergens Found: ${allergensList}\n`
        }
        if (scanResult.ingredients.length > 0) {
          message += `Ingredients: ${scanResult.ingredients.slice(0, 10).join(', ')}${scanResult.ingredients.length > 10 ? '...' : ''}\n`
        }
        if (scanResult.safeAlternatives.length > 0) {
          message += `Safe Alternatives: ${scanResult.safeAlternatives.join(', ')}\n`
        }
      }
      
      if (scanResult.warnings.length > 0) {
        message += `\nWarnings: ${scanResult.warnings.join(', ')}\n`
      }

      message += `\nScanned with AIScan - One scan. Zero risk.`

      await Share.share({
        message
      })
    } catch (error) {
      Alert.alert(t('aiscan.error'), t('aiscan.failed_to_share'))
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return '#10b981' // green
      case 'B':
        return '#3b82f6' // blue
      case 'C':
        return '#f59e0b' // yellow
      case 'D':
        return '#f97316' // orange
      case 'F':
        return '#ef4444' // red
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
              {t('aiscan.title')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
            {t('aiscan.subtitle')}
          </Text>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6">
          {!capturedImage && !scanResult ? (
            // Initial Screen
            <View className="items-center mt-12">
              <View className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center mb-6">
                <Ionicons name="scan" size={64} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('aiscan.scan_food_label')}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mb-8 px-4">
                {t('aiscan.scan_description')}
              </Text>

              <TouchableOpacity
                onPress={handleTakePhoto}
                className="w-full bg-blue-600 dark:bg-blue-700 rounded-lg py-4 items-center mb-4"
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text className="text-white font-semibold text-lg mt-2">
                  {t('aiscan.take_photo')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickFromGallery}
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-lg py-4 items-center"
              >
                <Ionicons name="images" size={24} color="#1f2937" />
                <Text className="text-gray-900 dark:text-white font-semibold text-lg mt-2">
                  {t('aiscan.choose_from_gallery')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isAnalyzing ? (
            // Analyzing
            <View className="items-center mt-12">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-900 dark:text-white text-lg font-semibold mt-4">
                {t('aiscan.analyzing_label')}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mt-2">
                {t('aiscan.analyzing_description')}
              </Text>
            </View>
          ) : scanResult ? (
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
                        {useLanguageStore.getState().language === 'English' ? t('aiscan.hindi') : t('aiscan.english')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Medicine Information */}
              {scanResult.scanType === 'medicine' && scanResult.medicineInfo && (
                <View className="mb-4">
                  {/* Medicine Name */}
                  <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700 p-4 mb-4">
                    <Text className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                      {scanResult.medicineInfo.name}
                    </Text>
                    {scanResult.medicineInfo.genericName && (
                      <Text className="text-blue-700 dark:text-blue-300 text-sm">
                        {t('aiscan.generic')}: {scanResult.medicineInfo.genericName}
                      </Text>
                    )}
                  </View>

                  {/* Uses/Indications */}
                  {scanResult.medicineInfo.uses.length > 0 && (
                    <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="medical" size={20} color="#3b82f6" />
                        <Text className="text-gray-900 dark:text-white font-semibold text-lg ml-2">
                          {t('aiscan.uses_indications')}
                        </Text>
                      </View>
                      {scanResult.medicineInfo.uses.map((use, idx) => (
                        <Text key={idx} className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                          • {use}
                        </Text>
                      ))}
                      {scanResult.medicineInfo.indications.length > 0 && (
                        <>
                          <Text className="text-gray-600 dark:text-gray-400 text-xs mt-2 mb-1 font-semibold">
                            {t('aiscan.indications')}:
                          </Text>
                          {scanResult.medicineInfo.indications.map((ind, idx) => (
                            <Text key={idx} className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                              • {ind}
                            </Text>
                          ))}
                        </>
                      )}
                    </View>
                  )}

                  {/* Dosage */}
                  {scanResult.medicineInfo.dosage && (
                    <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="flask" size={20} color="#10b981" />
                        <Text className="text-gray-900 dark:text-white font-semibold text-lg ml-2">
                          {t('aiscan.dosage')}
                        </Text>
                      </View>
                      <Text className="text-gray-700 dark:text-gray-300 text-sm">
                        {scanResult.medicineInfo.dosage}
                      </Text>
                    </View>
                  )}

                  {/* Side Effects */}
                  {scanResult.medicineInfo.sideEffects.length > 0 && (
                    <View className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-300 dark:border-red-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="warning" size={20} color="#ef4444" />
                        <Text className="text-red-800 dark:text-red-300 font-semibold text-lg ml-2">
                          {t('aiscan.side_effects')}
                        </Text>
                      </View>
                      {scanResult.medicineInfo.sideEffects.map((effect, idx) => (
                        <Text key={idx} className="text-red-700 dark:text-red-400 text-sm mb-1">
                          • {effect}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Contraindications */}
                  {scanResult.medicineInfo.contraindications.length > 0 && (
                    <View className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-300 dark:border-amber-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="close-circle" size={20} color="#f59e0b" />
                        <Text className="text-amber-800 dark:text-amber-300 font-semibold text-lg ml-2">
                          {t('aiscan.contraindications')}
                        </Text>
                      </View>
                      {scanResult.medicineInfo.contraindications.map((contra, idx) => (
                        <Text key={idx} className="text-amber-700 dark:text-amber-400 text-sm mb-1">
                          • {contra}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Expected Results */}
                  {scanResult.medicineInfo.results && (
                    <View className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-300 dark:border-green-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        <Text className="text-green-800 dark:text-green-300 font-semibold text-lg ml-2">
                          {t('aiscan.expected_results')}
                        </Text>
                      </View>
                      <Text className="text-green-700 dark:text-green-400 text-sm">
                        {scanResult.medicineInfo.results}
                      </Text>
                    </View>
                  )}

                  {/* Precautions */}
                  {scanResult.medicineInfo.precautions.length > 0 && (
                    <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="shield" size={20} color="#f59e0b" />
                        <Text className="text-yellow-800 dark:text-yellow-300 font-semibold text-lg ml-2">
                          {t('aiscan.precautions')}
                        </Text>
                      </View>
                      {scanResult.medicineInfo.precautions.map((prec, idx) => (
                        <Text key={idx} className="text-yellow-700 dark:text-yellow-400 text-sm mb-1">
                          • {prec}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Drug Interactions */}
                  {scanResult.medicineInfo.interactions && scanResult.medicineInfo.interactions.length > 0 && (
                    <View className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-300 dark:border-orange-700 p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="alert-circle" size={20} color="#f97316" />
                        <Text className="text-orange-800 dark:text-orange-300 font-semibold text-lg ml-2">
                          {t('aiscan.drug_interactions')}
                        </Text>
                      </View>
                      {scanResult.medicineInfo.interactions.map((interaction, idx) => (
                        <Text key={idx} className="text-orange-700 dark:text-orange-400 text-sm mb-1">
                          • {interaction}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Food-specific alerts */}
              {scanResult.scanType === 'food' && (
                <>
                  {/* Danger Alert */}
                  {!scanResult.isSafe && (
                    <View className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4 mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="warning" size={24} color="#ef4444" />
                        <Text className="text-red-600 dark:text-red-400 font-bold text-xl ml-2">
                          {t('aiscan.danger_not_eat')}
                        </Text>
                      </View>
                      {scanResult.allergens
                        .filter(a => a.found)
                        .map((allergen, idx) => (
                          <View key={idx} className="flex-row items-center mt-2">
                            <Ionicons
                              name="close-circle"
                              size={20}
                              color="#ef4444"
                            />
                            <Text className="text-red-700 dark:text-red-300 ml-2 font-semibold">
                              {t('aiscan.contains')}: {allergen.allergen} ({allergen.severity} {t('aiscan.risk')})
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}

                  {/* Safe Alert */}
                  {scanResult.isSafe && (
                    <View className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4 mb-4">
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        <Text className="text-green-600 dark:text-green-400 font-bold text-xl ml-2">
                          {t('aiscan.safe_to_eat')}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Nutrition Score (Food only) */}
              {scanResult.scanType === 'food' && (
                <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <Text className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                    {t('aiscan.nutrition_score')}
                  </Text>
                  <View className="flex-row items-center">
                    <View
                      className="w-20 h-20 rounded-full items-center justify-center"
                      style={{ backgroundColor: getGradeColor(scanResult.nutritionScore.grade) }}
                    >
                      <Text className="text-white text-3xl font-bold">
                        {scanResult.nutritionScore.grade}
                      </Text>
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-gray-600 dark:text-gray-400 text-sm">
                        {t('aiscan.score')}: {scanResult.nutritionScore.score}/100
                      </Text>
                      {scanResult.nutritionScore.reasons.length > 0 && (
                        <Text className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                          {scanResult.nutritionScore.reasons[0]}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Ingredients (Food only) */}
              {scanResult.scanType === 'food' && scanResult.ingredients.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <Text className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                    {t('aiscan.ingredients')}
                  </Text>
                  <Text className="text-gray-700 dark:text-gray-300 text-sm">
                    {scanResult.ingredients.join(', ')}
                  </Text>
                </View>
              )}

              {/* Warnings */}
              {scanResult.warnings.length > 0 && (
                <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-500 p-4 mb-4">
                  <Text className="text-yellow-800 dark:text-yellow-300 font-semibold mb-2">
                    {t('aiscan.warnings')}
                  </Text>
                  {scanResult.warnings.map((warning, idx) => (
                    <Text
                      key={idx}
                      className="text-yellow-700 dark:text-yellow-400 text-sm mb-1"
                    >
                      • {warning}
                    </Text>
                  ))}
                </View>
              )}

              {/* Safe Alternatives (Food only) */}
              {scanResult.scanType === 'food' && scanResult.safeAlternatives.length > 0 && (
                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-500 p-4 mb-4">
                  <Text className="text-blue-800 dark:text-blue-300 font-semibold mb-2">
                    {t('aiscan.safe_alternatives')}
                  </Text>
                  {scanResult.safeAlternatives.map((alt, idx) => (
                    <Text
                      key={idx}
                      className="text-blue-700 dark:text-blue-400 text-sm mb-1"
                    >
                      • {alt}
                    </Text>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  onPress={handleReset}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg py-3 items-center"
                >
                  <Text className="text-gray-900 dark:text-white font-semibold">
                    {t('aiscan.scan_another')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  className="flex-1 bg-blue-600 dark:bg-blue-700 rounded-lg py-3 items-center"
                >
                  <Ionicons name="share" size={20} color="#fff" />
                  <Text className="text-white font-semibold mt-1">{t('aiscan.share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

