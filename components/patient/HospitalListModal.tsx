import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Hospital } from '@/types'

interface HospitalListModalProps {
  visible: boolean
  onClose: () => void
  onHospitalSelect?: (hospital: Hospital) => void
}

export default function HospitalListModal({ visible, onClose, onHospitalSelect }: HospitalListModalProps) {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      fetchHospitals()
    }
  }, [visible])

  const fetchHospitals = async () => {
    setLoading(true)
    try {
      const usersRef = collection(db, 'users')
      const hospitalQuery = query(
        usersRef,
        where('role', '==', 'hospital'),
        where('hospitalData.isVerified', '==', true)
      )
      
      const querySnapshot = await getDocs(hospitalQuery)
      const hospitalsList: Hospital[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.hospitalData) {
          hospitalsList.push({
            id: doc.id,
            hospitalData: data.hospitalData
          })
        }
      })
      
      setHospitals(hospitalsList)
    } catch (error) {
      console.error('Error fetching hospitals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleHospitalSelect = (hospital: Hospital) => {
    onClose()
    if (onHospitalSelect) {
      onHospitalSelect(hospital)
    } else {
      // Default behavior: navigate to hospitals page
      router.push('/patient/hospitals')
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
            Select Hospital
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#9333ea" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading hospitals...</Text>
          </View>
        ) : hospitals.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="business-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center">
              No verified hospitals available
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 p-4">
            <View className="space-y-3">
              {hospitals.map((hospital) => (
                <TouchableOpacity
                  key={hospital.id}
                  onPress={() => handleHospitalSelect(hospital)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <View className="flex-row items-center">
                    <View className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                      <Ionicons name="business" size={24} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {hospital.hospitalData.hospitalName}
                        </Text>
                        <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full ml-2">
                          <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                            VERIFIED
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {hospital.hospitalData.hospitalType}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                          {hospital.hospitalData.city}, {hospital.hospitalData.state}
                        </Text>
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

