import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import HospitalListModal from './HospitalListModal'
import DoctorListModal from './DoctorListModal'
import { Hospital } from '@/types'
import { useLanguageStore } from '@/stores/languageStore'

interface QuickActionsSectionProps {
  onHospitalSelect?: (hospital: Hospital) => void
}

export default function QuickActionsSection({ onHospitalSelect }: QuickActionsSectionProps) {
  const router = useRouter()
  const { t } = useLanguageStore()
  const [showHospitalModal, setShowHospitalModal] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)

  const handleHospitalSelect = (hospital: Hospital) => {
    setShowHospitalModal(false)
    if (onHospitalSelect) {
      onHospitalSelect(hospital)
    }
  }

  const handleDoctorSelect = (doctor: any) => {
    setShowDoctorModal(false)
    router.push({
      pathname: '/patient/book',
      params: {
        doctorId: doctor.id,
        doctorName: doctor.displayName
      }
    })
  }

  return (
    <>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('home.quick_actions')}
        </Text>
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            className="flex-1 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-5 items-center shadow-lg"
            style={{
              backgroundColor: '#9333ea',
              shadowColor: '#9333ea',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8
            }}
            onPress={() => setShowHospitalModal(true)}
          >
            <View className="bg-white/20 rounded-full p-3 mb-2">
              <Ionicons name="business" size={28} color="#ffffff" />
            </View>
            <Text className="text-white font-bold text-base mt-1">{t('home.hospitals')}</Text>
            <Text className="text-white/80 text-xs mt-1">Find & book</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 items-center shadow-lg"
            style={{
              backgroundColor: '#2563eb',
              shadowColor: '#2563eb',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8
            }}
            onPress={() => setShowDoctorModal(true)}
          >
            <View className="bg-white/20 rounded-full p-3 mb-2">
              <Ionicons name="medical" size={28} color="#ffffff" />
            </View>
            <Text className="text-white font-bold text-base mt-1">{t('home.doctors')}</Text>
            <Text className="text-white/80 text-xs mt-1">Consult now</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 items-center shadow-lg"
          style={{
            backgroundColor: '#16a34a',
            shadowColor: '#16a34a',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8
          }}
          onPress={() => router.push('/patient/diseases')}
        >
          <View className="flex-row items-center">
            <View className="bg-white/20 rounded-full p-2 mr-3">
              <Ionicons name="library" size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">{t('home.diseases_cures')}</Text>
              <Text className="text-white/80 text-xs">Health encyclopedia</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>

      <HospitalListModal
        visible={showHospitalModal}
        onClose={() => setShowHospitalModal(false)}
        onHospitalSelect={handleHospitalSelect}
      />

      <DoctorListModal
        visible={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        onDoctorSelect={handleDoctorSelect}
      />
    </>
  )
}

