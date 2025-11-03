import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import HospitalListModal from './HospitalListModal'
import DoctorListModal from './DoctorListModal'
import { Hospital } from '@/types'

interface QuickActionsSectionProps {
  onHospitalSelect?: (hospital: Hospital) => void
}

export default function QuickActionsSection({ onHospitalSelect }: QuickActionsSectionProps) {
  const router = useRouter()
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
          Quick Actions
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-purple-600 rounded-lg p-4 items-center"
            onPress={() => setShowHospitalModal(true)}
          >
            <Ionicons name="business-outline" size={24} color="#ffffff" />
            <Text className="text-white font-semibold mt-2">Hospitals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-blue-600 rounded-lg p-4 items-center"
            onPress={() => setShowDoctorModal(true)}
          >
            <Ionicons name="medical-outline" size={24} color="#ffffff" />
            <Text className="text-white font-semibold mt-2">Doctors</Text>
          </TouchableOpacity>
        </View>
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

