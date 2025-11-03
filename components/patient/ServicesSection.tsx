import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import EmergencyAlert from '@/components/EmergencyAlert'
import EmergencyServicesSection from '@/components/EmergencyServicesSection'
import { EmergencyAlert as EmergencyAlertType } from '@/stores/emergencyStore'
import { Hospital } from '@/types'
import { useLanguageStore } from '@/stores/languageStore'

interface ServicesSectionProps {
  activeAlert: EmergencyAlertType | null
  onCancelEmergency: () => void
  onEmergencyPress: () => void
  hospitals: Hospital[]
  loadingHospitals: boolean
  onHospitalPress: (hospital: Hospital) => void
}

export default function ServicesSection({
  activeAlert,
  onCancelEmergency,
  onEmergencyPress,
  hospitals,
  loadingHospitals,
  onHospitalPress
}: ServicesSectionProps) {
  const router = useRouter()
  const { t } = useLanguageStore()

  return (
    <View>
      {/* Active Emergency Alert */}
      {activeAlert && (
        <EmergencyAlert
          alert={activeAlert}
          onCancel={onCancelEmergency}
        />
      )}

      {/* Emergency Services Section */}
      <EmergencyServicesSection
        onEmergency={onEmergencyPress}
      />

      {/* Medical AI Assistant Cards */}
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('home.ai_health_assistant')}
        </Text>

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-800"
            onPress={() => router.push('/patient/medicine-info')}
          >
            <Ionicons name="medical" size={24} color="#8b5cf6" />
            <Text className="text-gray-900 dark:text-white font-semibold mt-2 text-sm">
              {t('home.medicine_info')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {t('home.medicine_info_short')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
            onPress={() => router.push('/patient/symptoms-check')}
          >
            <Ionicons name="medical" size={24} color="#3b82f6" />
            <Text className="text-gray-900 dark:text-white font-semibold mt-2 text-sm">
              {t('home.symptoms_check')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {t('home.health_guidance')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800"
            onPress={() => router.push('/patient/health-tips')}
          >
            <Ionicons name="heart" size={24} color="#10b981" />
            <Text className="text-gray-900 dark:text-white font-semibold mt-2 text-sm">
              {t('home.health_tips')}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {t('home.wellness_advice')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* E-Hospital Section */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {t('home.e_hospital')}
          </Text>
          {hospitals.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/patient/hospitals')}
              className="0 dark:bg-purple-700 px-4 py-2 rounded-lg"
            >
              <Text className="text-black text-sm font-semibold">
                {t('home.view_all')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {loadingHospitals ? (
          <Text className="text-gray-500 text-center py-8">{t('home.loading_hospitals')}</Text>
        ) : hospitals.length === 0 ? (
          <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center">
            <Ionicons name="business-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
              {t('home.no_hospitals')}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {hospitals.slice(0, 2).map((hospital) => (
              <TouchableOpacity
                key={hospital.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                onPress={() => onHospitalPress(hospital)}
              >
                <View className="flex-row items-center mb-3">
                  <View className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg mr-3">
                    <Ionicons name="business" size={24} color="#8b5cf6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                      {hospital.hospitalData.hospitalName}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {hospital.hospitalData.hospitalType}
                    </Text>
                  </View>
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                    <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                      {t('home.verified')}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center mb-2">
                  <Ionicons name="location" size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1" numberOfLines={1}>
                    {hospital.hospitalData.city}, {hospital.hospitalData.state}
                  </Text>
                </View>
                
                {hospital.hospitalData.specialties.length > 0 && (
                  <View className="mb-2">
                    <View className="flex-row flex-wrap gap-1">
                      {hospital.hospitalData.specialties.slice(0, 2).map((specialty, index) => (
                        <View key={index} className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                          <Text className="text-xs text-blue-700 dark:text-blue-300">
                            {specialty}
                          </Text>
                        </View>
                      ))}
                      {hospital.hospitalData.specialties.length > 2 && (
                        <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            +{hospital.hospitalData.specialties.length - 2} {t('home.more')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="bed" size={14} color="#6b7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      {hospital.hospitalData.totalBeds} beds
                    </Text>
                    {hospital.hospitalData.icuBeds && (
                      <>
                        <Text className="text-gray-400 mx-2">•</Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {hospital.hospitalData.icuBeds} ICU
                        </Text>
                      </>
                    )}
                  </View>
                  <Text className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Tap for details →
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

