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
      <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
        <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          {t('home.quick_actions')}
        </Text>
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            className="flex-1 bg-purple-600 rounded-lg p-4 items-center"
            onPress={() => setShowHospitalModal(true)}
          >
            <Ionicons name="business-outline" size={24} color="#ffffff" />
            <Text className="text-white font-semibold mt-2">{t('home.hospitals')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-blue-600 rounded-lg p-4 items-center"
            onPress={() => setShowDoctorModal(true)}
          >
            <Ionicons name="medical-outline" size={24} color="#ffffff" />
            <Text className="text-white font-semibold mt-2">{t('home.doctors')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-green-600 rounded-lg p-4 items-center"
          onPress={() => router.push('/patient/diseases')}
        >
          <Ionicons name="medical" size={24} color="#ffffff" />
          <Text className="text-white font-semibold mt-2">{t('home.diseases_cures')}</Text>
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

