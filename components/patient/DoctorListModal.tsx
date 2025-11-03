import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Doctor } from '@/types'
import { useLanguageStore } from '@/stores/languageStore'

interface DoctorListModalProps {
  visible: boolean
  onClose: () => void
  onDoctorSelect?: (doctor: Doctor) => void
}

export default function DoctorListModal({ visible, onClose, onDoctorSelect }: DoctorListModalProps) {
  const router = useRouter()
  const { t } = useLanguageStore()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      fetchDoctors()
    }
  }, [visible])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const doctorsRef = collection(db, 'users')
      const q = query(doctorsRef, where('role', '==', 'doctor'))
      const snapshot = await getDocs(q)
      const allDoctors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Doctor[]
      
      // Filter only verified doctors
      const verifiedDoctors = allDoctors.filter(doctor => 
        doctor.doctorData && doctor.doctorData.isVerified
      )
      
      setDoctors(verifiedDoctors)
    } catch (error) {
      console.error('Error loading doctors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDoctorSelect = (doctor: Doctor) => {
    onClose()
    if (onDoctorSelect) {
      onDoctorSelect(doctor)
    } else {
      // Default behavior: navigate to book page with doctor
      router.push({
        pathname: '/patient/book',
        params: {
          doctorId: doctor.id,
          doctorName: doctor.displayName
        }
      })
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {t('home.select_doctor')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#9333ea" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">{t('home.loading')}</Text>
          </View>
        ) : doctors.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="medical-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center">
              {t('home.no_verified_doctors')}
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 p-4">
            <View className="space-y-3">
              {doctors.map((doctor) => (
                <TouchableOpacity
                  key={doctor.id}
                  onPress={() => handleDoctorSelect(doctor)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                      <Ionicons name="person" size={24} color="#2563eb" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          Dr. {doctor.displayName}
                        </Text>
                        {doctor.doctorData?.isVerified && (
                          <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full ml-2">
                            <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                              {t('home.verified')}
                            </Text>
                          </View>
                        )}
                      </View>
                      {doctor.doctorData?.specialization && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {doctor.doctorData.specialization}
                        </Text>
                      )}
                      <View className="flex-row items-center mt-1">
                        {doctor.doctorData?.experience && (
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            {doctor.doctorData.experience} {t('home.years_experience')}
                          </Text>
                        )}
                        {doctor.doctorData?.consultationFee && (
                          <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                            • ₹{doctor.doctorData.consultationFee}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

