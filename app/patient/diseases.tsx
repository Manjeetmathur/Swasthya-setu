import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useLanguageStore } from '@/stores/languageStore'

interface Disease {
  id: string
  name: string
  description: string
  symptoms: string[]
  causes: string[]
  cure: string[]
  prevention: string[]
  severity: 'low' | 'moderate' | 'high'
}

const diseaseKeys = [
  'common_cold',
  'influenza', 
  'hypertension',
  'diabetes',
  'asthma',
  'migraine'
]

export default function Diseases() {
  const router = useRouter()
  const { t } = useLanguageStore()
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null)

  const getDiseases = (): Disease[] => {
    return diseaseKeys.map((key, index) => {
      const symptoms = t(`diseases.diseases_list.${key}.symptoms`)
      const causes = t(`diseases.diseases_list.${key}.causes`)
      const cure = t(`diseases.diseases_list.${key}.cure`)
      const prevention = t(`diseases.diseases_list.${key}.prevention`)
      
      return {
        id: (index + 1).toString(),
        name: t(`diseases.diseases_list.${key}.name`),
        description: t(`diseases.diseases_list.${key}.description`),
        symptoms: Array.isArray(symptoms) ? symptoms : [symptoms].filter(Boolean),
        causes: Array.isArray(causes) ? causes : [causes].filter(Boolean),
        cure: Array.isArray(cure) ? cure : [cure].filter(Boolean),
        prevention: Array.isArray(prevention) ? prevention : [prevention].filter(Boolean),
        severity: key === 'common_cold' ? 'low' : 
                  key === 'hypertension' || key === 'diabetes' ? 'high' : 'moderate'
      }
    })
  }

  const diseases = getDiseases()

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900 pt-10">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {t('diseases.title')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-gray-600 dark:text-gray-400 mb-4">
          {t('diseases.description')}
        </Text>

        <View className="space-y-4 mt-4 mb-6">
          {diseases.map((disease) => (
            <TouchableOpacity
              key={disease.id}
              onPress={() => setSelectedDisease(disease)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {disease.name}
                </Text>
                <View className={`px-3 py-1 rounded-full ${getSeverityColor(disease.severity)}`}>
                  <Text className={`text-xs font-semibold capitalize`}>
                    {t(`diseases.severity.${disease.severity}`)}
                  </Text>
                </View>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {disease.description}
              </Text>
              <View className="flex-row items-center">
                <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
                <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  {t('diseases.tap_details')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Disease Detail Modal */}
      {selectedDisease && (
        <View className="absolute inset-0 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl" style={{ maxHeight: '85%', height: '85%' }}>
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedDisease.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDisease(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-4" style={{ height: '100%' }}>
              <Text className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedDisease.description}
              </Text>

              {/* Symptoms */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('diseases.sections.symptoms')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {selectedDisease.symptoms.map((symptom, index) => (
                    <View key={index} className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                      <Text className="text-sm text-blue-700 dark:text-blue-300">
                        {symptom}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Causes */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('diseases.sections.causes')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {selectedDisease.causes.map((cause, index) => (
                    <View key={index} className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                      <Text className="text-sm text-orange-700 dark:text-orange-300">
                        {cause}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Cure */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('diseases.treatment_cure')}
                </Text>
                <View className="space-y-2">
                  {selectedDisease.cure.map((cure, index) => (
                    <View key={index} className="flex-row items-start">
                      <View className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full mt-1 mr-3">
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      </View>
                      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {cure}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Prevention */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('diseases.sections.prevention')}
                </Text>
                <View className="space-y-2">
                  {selectedDisease.prevention.map((prevent, index) => (
                    <View key={index} className="flex-row items-start">
                      <View className="bg-purple-100 dark:bg-purple-900/30 p-1 rounded-full mt-1 mr-3">
                        <Ionicons name="shield-checkmark" size={16} color="#9333ea" />
                      </View>
                      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {prevent}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4 mb-8">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="warning" size={20} color="#2563eb" />
                  <Text className="text-blue-900 dark:text-blue-100 font-semibold ml-2">
                    {t('diseases.important_note')}
                  </Text>
                </View>
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  {t('diseases.disclaimer')}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

