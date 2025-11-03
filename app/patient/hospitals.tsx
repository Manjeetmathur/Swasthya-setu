import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Ionicons } from '@expo/vector-icons'

interface Hospital {
  id: string
  hospitalData: {
    hospitalName: string
    hospitalType: string
    hospitalLicense: string
    address: string
    city: string
    state: string
    pincode: string
    phoneNumber: string
    emergencyNumber?: string
    totalBeds: number
    icuBeds?: number
    specialties: string[]
    facilities: string[]
    accreditation?: string
    establishedYear?: number
    isVerified: boolean
  }
}

export default function AllHospitals() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [hospitalModalVisible, setHospitalModalVisible] = useState(false)

  useEffect(() => {
    fetchApprovedHospitals()
  }, [])

  const fetchApprovedHospitals = async () => {
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
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchApprovedHospitals()
  }

  const handleHospitalPress = (hospital: Hospital) => {
    setSelectedHospital(hospital)
    setHospitalModalVisible(true)
  }

  const handleCallHospital = (phoneNumber: string) => {
    Alert.alert(
      'Call Hospital',
      `Do you want to call ${phoneNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`)
          }
        }
      ]
    )
  }

  const handleEmergencyCall = (emergencyNumber: string) => {
    Alert.alert(
      'Emergency Call',
      `Do you want to call emergency number ${emergencyNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${emergencyNumber}`)
          }
        }
      ]
    )
  }

  const handleOpenMaps = (hospital: Hospital) => {
    const { address, city, state, pincode } = hospital.hospitalData
    const fullAddress = `${address}, ${city}, ${state} ${pincode}`
    const encodedAddress = encodeURIComponent(fullAddress)
    
    Alert.alert(
      'Open in Maps',
      `Open ${hospital.hospitalData.hospitalName} location in Google Maps?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
            Linking.openURL(mapsUrl)
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            All Hospitals
          </Text>
        </View>
        <View className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
          <Text className="text-purple-700 dark:text-purple-300 text-sm font-semibold">
            {hospitals.length} Verified
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          {loading ? (
            <Text className="text-gray-500 text-center py-8">Loading hospitals...</Text>
          ) : hospitals.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 items-center">
              <Ionicons name="business-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center text-lg">
                No verified hospitals available
              </Text>
              <Text className="text-gray-400 dark:text-gray-500 mt-2 text-center">
                Check back later for new hospitals
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {hospitals.map((hospital) => (
                <TouchableOpacity
                  key={hospital.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                  onPress={() => handleHospitalPress(hospital)}
                >
                  <View className="flex-row items-center mb-3">
                    <View className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                      <Ionicons name="business" size={28} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                        {hospital.hospitalData.hospitalName}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {hospital.hospitalData.hospitalType}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-500 dark:text-gray-500 ml-1" numberOfLines={1}>
                          {hospital.hospitalData.city}, {hospital.hospitalData.state}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                        VERIFIED
                      </Text>
                    </View>
                  </View>
                  
                  {/* Hospital Info Row */}
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="bed" size={16} color="#6b7280" />
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
                  
                  {/* Specialties Preview */}
                  {hospital.hospitalData.specialties.length > 0 && (
                    <View className="mb-3">
                      <Text className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        Specialties:
                      </Text>
                      <View className="flex-row flex-wrap gap-1">
                        {hospital.hospitalData.specialties.slice(0, 3).map((specialty, index) => (
                          <View key={index} className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <Text className="text-xs text-blue-700 dark:text-blue-300">
                              {specialty}
                            </Text>
                          </View>
                        ))}
                        {hospital.hospitalData.specialties.length > 3 && (
                          <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            <Text className="text-xs text-gray-600 dark:text-gray-400">
                              +{hospital.hospitalData.specialties.length - 3} more
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="call" size={14} color="#6b7280" />
                      <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                        {hospital.hospitalData.phoneNumber}
                      </Text>
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
      </ScrollView>

      {/* Hospital Details Modal */}
      <Modal
        visible={hospitalModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHospitalModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Hospital Details
            </Text>
            <TouchableOpacity
              onPress={() => setHospitalModalVisible(false)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-800"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedHospital && (
            <ScrollView className="flex-1 p-4">
              {/* Hospital Header */}
              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <View className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                    <Ionicons name="business" size={32} color="#8b5cf6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedHospital.hospitalData.hospitalName}
                    </Text>
                    <Text className="text-lg text-purple-600 dark:text-purple-400">
                      {selectedHospital.hospitalData.hospitalType}
                    </Text>
                  </View>
                </View>
                
                <View className="bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-full self-start">
                  <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
                    ✓ VERIFIED HOSPITAL
                  </Text>
                </View>
              </View>

              {/* Contact Information */}
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Contact Information
                </Text>
                
                <TouchableOpacity
                  className="flex-row items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3"
                  onPress={() => handleCallHospital(selectedHospital.hospitalData.phoneNumber)}
                >
                  <Ionicons name="call" size={20} color="#3b82f6" />
                  <Text className="ml-3 text-blue-600 dark:text-blue-400 font-medium">
                    {selectedHospital.hospitalData.phoneNumber}
                  </Text>
                </TouchableOpacity>

                {selectedHospital.hospitalData.emergencyNumber && (
                  <TouchableOpacity
                    className="flex-row items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-3"
                    onPress={() => handleEmergencyCall(selectedHospital.hospitalData.emergencyNumber!)}
                  >
                    <Ionicons name="medical" size={20} color="#ef4444" />
                    <Text className="ml-3 text-red-600 dark:text-red-400 font-medium">
                      Emergency: {selectedHospital.hospitalData.emergencyNumber}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  className="flex-row items-start p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  onPress={() => handleOpenMaps(selectedHospital)}
                >
                  <Ionicons name="location" size={20} color="#10b981" />
                  <View className="ml-3 flex-1">
                    <Text className="text-green-700 dark:text-green-300 font-medium">
                      {selectedHospital.hospitalData.address}, {selectedHospital.hospitalData.city}, {selectedHospital.hospitalData.state} - {selectedHospital.hospitalData.pincode}
                    </Text>
                    <Text className="text-green-600 dark:text-green-400 text-xs mt-1">
                      Tap to open in Google Maps
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#10b981" />
                </TouchableOpacity>
              </View>

              {/* Hospital Information */}
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Hospital Information
                </Text>
                
                <View className="space-y-3">
                  <View className="flex-row">
                    <Text className="text-gray-600 dark:text-gray-400 w-24">License:</Text>
                    <Text className="text-gray-900 dark:text-white flex-1">
                      {selectedHospital.hospitalData.hospitalLicense}
                    </Text>
                  </View>
                  
                  <View className="flex-row">
                    <Text className="text-gray-600 dark:text-gray-400 w-24">Total Beds:</Text>
                    <Text className="text-gray-900 dark:text-white flex-1">
                      {selectedHospital.hospitalData.totalBeds}
                    </Text>
                  </View>
                  
                  {selectedHospital.hospitalData.icuBeds && (
                    <View className="flex-row">
                      <Text className="text-gray-600 dark:text-gray-400 w-24">ICU Beds:</Text>
                      <Text className="text-gray-900 dark:text-white flex-1">
                        {selectedHospital.hospitalData.icuBeds}
                      </Text>
                    </View>
                  )}
                  
                  {selectedHospital.hospitalData.establishedYear && (
                    <View className="flex-row">
                      <Text className="text-gray-600 dark:text-gray-400 w-24">Established:</Text>
                      <Text className="text-gray-900 dark:text-white flex-1">
                        {selectedHospital.hospitalData.establishedYear}
                      </Text>
                    </View>
                  )}
                  
                  {selectedHospital.hospitalData.accreditation && (
                    <View className="flex-row">
                      <Text className="text-gray-600 dark:text-gray-400 w-24">Accreditation:</Text>
                      <Text className="text-gray-900 dark:text-white flex-1">
                        {selectedHospital.hospitalData.accreditation}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Specialties */}
              {selectedHospital.hospitalData.specialties.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Medical Specialties
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {selectedHospital.hospitalData.specialties.map((specialty, index) => (
                      <View key={index} className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                        <Text className="text-blue-700 dark:text-blue-300 text-sm">
                          {specialty}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Facilities */}
              {selectedHospital.hospitalData.facilities.length > 0 && (
                <View className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Available Facilities
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {selectedHospital.hospitalData.facilities.map((facility, index) => (
                      <View key={index} className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                        <Text className="text-green-700 dark:text-green-300 text-sm">
                          {facility}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-4 mb-8">
                <TouchableOpacity
                  className="flex-1 bg-blue-600 rounded-lg p-4 items-center"
                  onPress={() => handleCallHospital(selectedHospital.hospitalData.phoneNumber)}
                >
                  <Ionicons name="call" size={20} color="#ffffff" />
                  <Text className="text-white font-semibold mt-1">Call Hospital</Text>
                </TouchableOpacity>
                
                {selectedHospital.hospitalData.emergencyNumber && (
                  <TouchableOpacity
                    className="flex-1 bg-red-600 rounded-lg p-4 items-center"
                    onPress={() => handleEmergencyCall(selectedHospital.hospitalData.emergencyNumber!)}
                  >
                    <Ionicons name="medical" size={20} color="#ffffff" />
                    <Text className="text-white font-semibold mt-1">Emergency</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}