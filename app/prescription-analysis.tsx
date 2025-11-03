import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import Button from '@/components/Button'

export default function PrescriptionAnalysis() {
  const router = useRouter()
  const [prescriptionText, setPrescriptionText] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzePrescription = async () => {
    if (!prescriptionText.trim()) {
      Alert.alert('Error', 'Please enter prescription text')
      return
    }

    setIsAnalyzing(true)
    try {
      // Simulate AI analysis - replace with actual AI service call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockAnalysis = `**Prescription Analysis:**

**Medications Identified:**
• Paracetamol 500mg - Pain reliever and fever reducer
• Amoxicillin 250mg - Antibiotic for bacterial infections
• Cetirizine 10mg - Antihistamine for allergies

**Dosage Instructions:**
• Take medications as prescribed by your doctor
• Complete the full course of antibiotics
• Take with food to avoid stomach upset

**Precautions:**
• Avoid alcohol while taking these medications
• Consult doctor if symptoms persist
• Check for drug allergies before taking

**Side Effects to Watch:**
• Nausea, dizziness (Paracetamol)
• Stomach upset, diarrhea (Amoxicillin)
• Drowsiness (Cetirizine)

**Drug Interactions:**
• No major interactions found between these medications
• Inform your doctor about any other medications you're taking

**Note:** This is an AI-generated analysis for informational purposes only. Always consult with a healthcare professional for medical advice.`
      
      setAnalysisResult(mockAnalysis)
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze prescription')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearAnalysis = () => {
    setPrescriptionText('')
    setAnalysisResult('')
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 py-4 bg-white dark:bg-gray-800 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 p-2 -ml-2"
            >
              <Ionicons name="arrow-back" size={24} color="#2563eb" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                Prescription Analysis
              </Text>
              <Text className="text-gray-600 dark:text-gray-400">
                AI-powered medication insights
              </Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6">
          {/* Info Card */}
          <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#2563eb" className="mr-3 mt-1" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-900 dark:text-blue-100 font-semibold mb-1">
                  How it works
                </Text>
                <Text className="text-blue-800 dark:text-blue-200 text-sm leading-5">
                  Simply enter your prescription details below and our AI will analyze the medications, dosages, interactions, and provide helpful insights.
                </Text>
              </View>
            </View>
          </View>

          {/* Input Section */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-6">
            <View className="flex-row items-center mb-4">
              <View className="bg-orange-500 p-3 rounded-xl mr-3">
                <Ionicons name="document-text" size={24} color="white" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Enter Prescription
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prescription details:
              </Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-gray-900 dark:text-white min-h-[120px]"
                placeholder="Type or paste your prescription text here...

Example:
- Paracetamol 500mg, twice daily
- Amoxicillin 250mg, three times daily for 7 days
- Cetirizine 10mg, once daily"
                placeholderTextColor="#9ca3af"
                value={prescriptionText}
                onChangeText={setPrescriptionText}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className="flex-row space-x-3">
              <Button
                title={isAnalyzing ? "Analyzing..." : "Analyze Prescription"}
                onPress={analyzePrescription}
                loading={isAnalyzing}
                className="flex-1"
              />
              {(prescriptionText || analysisResult) && (
                <Button
                  title="Clear"
                  onPress={clearAnalysis}
                  variant="outline"
                  className="px-6"
                />
              )}
            </View>
          </View>

          {/* Results Section */}
          {analysisResult && (
            <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-6">
              <View className="flex-row items-center mb-4">
                <View className="bg-green-500 p-3 rounded-xl mr-3">
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                </View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Analysis Results
                </Text>
              </View>

              <View className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <Text className="text-gray-800 dark:text-gray-200 leading-6 whitespace-pre-line">
                  {analysisResult}
                </Text>
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="warning" size={24} color="#f59e0b" className="mr-3 mt-1" />
              <View className="flex-1 ml-3">
                <Text className="text-yellow-900 dark:text-yellow-100 font-semibold mb-2">
                  Important Disclaimer
                </Text>
                <Text className="text-yellow-800 dark:text-yellow-200 text-sm leading-5">
                  This analysis is for informational purposes only and should not replace professional medical advice. Always consult with a qualified healthcare provider before making any changes to your medication regimen.
                </Text>
              </View>
            </View>
          </View>

          {/* Features */}
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              What we analyze
            </Text>
            <View className="space-y-3">
              <View className="flex-row items-center">
                <Ionicons name="medical" size={20} color="#2563eb" />
                <Text className="text-gray-700 dark:text-gray-300 ml-3">
                  Medication identification and purpose
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time" size={20} color="#2563eb" />
                <Text className="text-gray-700 dark:text-gray-300 ml-3">
                  Dosage and timing instructions
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="#2563eb" />
                <Text className="text-gray-700 dark:text-gray-300 ml-3">
                  Potential side effects and precautions
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="link" size={20} color="#2563eb" />
                <Text className="text-gray-700 dark:text-gray-300 ml-3">
                  Drug interactions and contraindications
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}