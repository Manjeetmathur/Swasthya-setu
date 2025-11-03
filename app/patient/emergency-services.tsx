import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native'
import { useRoute, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { HospitalResponse } from '@/stores/emergencyStore'
import Button from '@/components/Button'

export default function EmergencyServices() {
  const router = useRouter()
  const route = useRoute()
  const params = route.params as { hospitals: string } | undefined

  const [hospitals, setHospitals] = useState<HospitalResponse[]>([])
  const [selectedHospital, setSelectedHospital] = useState<HospitalResponse | null>(null)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (params?.hospitals) {
      try {
        const parsedHospitals = JSON.parse(params.hospitals)
        setHospitals(parsedHospitals)
      } catch (error) {
        console.error('Error parsing hospitals:', error)
      }
    }
  }, [params])

  const handleCall = (hospitalPhone: string) => {
    Linking.openURL(`tel:${hospitalPhone}`)
  }

  const handleGetDirections = (latitude: number, longitude: number) => {
    const url = `https://maps.google.com/?q=${latitude},${longitude}`
    Linking.openURL(url)
  }

  const handleRequestAmbulance = (hospital: HospitalResponse) => {
    Alert.alert(
      'Request Ambulance',
      `Request ambulance from ${hospital.hospitalName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            setLoading(true)
            try {
              // Simulate ambulance request
              await new Promise(resolve => setTimeout(resolve, 1500))
              Alert.alert(
                'Ambulance Requested',
                `Ambulance from ${hospital.hospitalName} will arrive in approximately ${hospital.responseTime}`,
                [{ text: 'OK' }]
              )
            } catch (error) {
              Alert.alert('Error', 'Failed to request ambulance')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
            Emergency Services
          </Text>
        </View>

        <View className="px-6 py-6">
          {/* Summary Card */}
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-circle" size={20} color="#2563eb" />
              <Text className="text-blue-900 dark:text-blue-200 font-bold ml-2">
                Emergency Services Available
              </Text>
            </View>
            <Text className="text-blue-800 dark:text-blue-300 text-sm">
              {hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''} found within 20 km
            </Text>
          </View>

          {/* Emergency Info Banner */}
          <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6 border-l-4 border-l-red-600">
            <View className="flex-row items-start">
              <Ionicons name="alert" size={16} color="#dc2626" className="mt-1 mr-2" />
              <Text className="text-red-900 dark:text-red-200 text-xs flex-1">
                For life-threatening emergencies, always call 112 first. These are nearby hospitals that can provide emergency care.
              </Text>
            </View>
          </View>

          {/* Hospitals List */}
          {hospitals.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 items-center">
              <Ionicons name="medical" size={48} color="#9ca3af" />
              <Text className="text-gray-900 dark:text-white font-semibold mt-4">
                No Hospitals Found
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mt-2 text-sm">
                No emergency services available in your area. Please call 112 immediately.
              </Text>
              <Button
                title="Call Emergency (112)"
                onPress={() => Linking.openURL('tel:112')}
                className="mt-6"
              />
            </View>
          ) : (
            <View className="space-y-4">
              {hospitals.map((hospital, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedHospital(hospital)}
                  className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden"
                  activeOpacity={0.7}
                >
                  <View className="p-4">
                    {/* Hospital Header */}
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {hospital.hospitalName}
                        </Text>
                        <View className="flex-row items-center">
                          <View
                            className="w-6 h-6 rounded-full items-center justify-center mr-2"
                            style={{
                              backgroundColor: hospital.canRespond ? '#10b98120' : '#ef444420'
                            }}
                          >
                            <Ionicons
                              name={hospital.canRespond ? 'checkmark' : 'close'}
                              size={14}
                              color={hospital.canRespond ? '#10b981' : '#ef4444'}
                            />
                          </View>
                          <Text
                            className={`text-sm font-semibold ${
                              hospital.canRespond
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}
                          >
                            {hospital.canRespond ? 'Can Respond' : 'Limited Capacity'}
                          </Text>
                        </View>
                      </View>
                      <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
                        <Text className="text-blue-900 dark:text-blue-200 font-bold text-sm">
                          {hospital.distance.toFixed(1)} km
                        </Text>
                      </View>
                    </View>

                    {/* Hospital Info Grid */}
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <View className="flex-row justify-between mb-2">
                        <View className="flex-1">
                          <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Response Time
                          </Text>
                          <View className="flex-row items-center">
                            <Ionicons name="car" size={14} color="#2563eb" />
                            <Text className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                              {hospital.responseTime}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-1 items-center">
                          <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Available Beds
                          </Text>
                          <View className="flex-row items-center justify-center">
                            <Ionicons name="bed" size={14} color="#10b981" />
                            <Text className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                              {hospital.availableBeds}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-1 items-end">
                          <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Ambulances
                          </Text>
                          <View className="flex-row items-center justify-end">
                            <Ionicons name="medical" size={14} color="#dc2626" />
                            <Text className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                              {hospital.ambulancesAvailable}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {hospital.icuBeds > 0 && (
                        <View className="flex-row items-center mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                          <Ionicons name="heart-circle" size={14} color="#dc2626" />
                          <Text className="text-xs text-gray-700 dark:text-gray-300 ml-2">
                            ICU Beds: {hospital.icuBeds}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleGetDirections(
                          hospital.coordinates.latitude,
                          hospital.coordinates.longitude
                        )}
                        className="flex-1 bg-blue-600 rounded-lg py-2.5 flex-row items-center justify-center"
                      >
                        <Ionicons name="navigate" size={16} color="white" />
                        <Text className="text-white font-semibold ml-1 text-sm">Directions</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRequestAmbulance(hospital)}
                        disabled={loading}
                        className="flex-1 bg-red-600 rounded-lg py-2.5 items-center justify-center flex-row"
                      >
                        {loading ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <>
                            <Ionicons name="medkit" size={16} color="white" />
                            <Text className="text-white font-semibold ml-1 text-sm">Ambulance</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Emergency Button */}
          <View className="mt-6 mb-4">
            <Button
              title="Call Emergency (112)"
              onPress={() => Linking.openURL('tel:112')}
              className="bg-red-600 active:bg-red-700"
            />
            <Text className="text-center text-gray-600 dark:text-gray-400 text-xs mt-3">
              Always call emergency services for life-threatening situations
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Selected Hospital Details Modal */}
      {selectedHospital && (
        <View className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <View className="bg-white dark:bg-gray-800 rounded-lg m-6 p-6 max-w-sm">
            <View className="flex-row justify-between items-start mb-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                {selectedHospital.hospitalName}
              </Text>
              <TouchableOpacity onPress={() => setSelectedHospital(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="location" size={16} color="#2563eb" className="mr-2" />
                <Text className="text-gray-700 dark:text-gray-300 text-sm flex-1">
                  {selectedHospital.distance.toFixed(1)} km away
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="car" size={16} color="#2563eb" className="mr-2" />
                <Text className="text-gray-700 dark:text-gray-300 text-sm flex-1">
                  {selectedHospital.responseTime}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="bed" size={16} color="#2563eb" className="mr-2" />
                <Text className="text-gray-700 dark:text-gray-300 text-sm flex-1">
                  {selectedHospital.availableBeds} beds available
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setSelectedHospital(null)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 rounded-lg py-2.5"
              >
                <Text className="text-gray-900 dark:text-white font-semibold text-center">Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRequestAmbulance(selectedHospital)}
                className="flex-1 bg-red-600 rounded-lg py-2.5"
              >
                <Text className="text-white font-semibold text-center">Request Ambulance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}