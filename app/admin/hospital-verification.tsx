import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'

interface Hospital {
  id: string
  displayName: string
  email: string
  role: string
  createdAt: any
  hospitalData: {
    hospitalName: string
    hospitalLicense: string
    hospitalType: string
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

export default function HospitalVerification() {
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'verified' | 'unverified'>('all')

  useEffect(() => {
    loadHospitals()
  }, [])

  const loadHospitals = async () => {
    try {
      const usersRef = collection(db, 'users')
      const hospitalsQuery = query(
        usersRef, 
        where('role', '==', 'hospital'),
        orderBy('createdAt', 'desc')
      )
      const hospitalsSnapshot = await getDocs(hospitalsQuery)
      const hospitalsList = hospitalsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Hospital[]
      setHospitals(hospitalsList)
    } catch (error) {
      console.error('Error loading hospitals:', error)
      Alert.alert('Error', 'Failed to load hospitals')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadHospitals()
  }

  const verifyHospital = async (hospitalId: string, hospitalName: string) => {
    Alert.alert(
      'Verify Hospital',
      `Are you sure you want to verify ${hospitalName}? This will allow them to login and access the hospital dashboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', hospitalId), {
                'hospitalData.isVerified': true
              })
              
              // Refresh data
              await loadHospitals()
              
              Alert.alert('Success', `${hospitalName} has been verified successfully! They can now login to their dashboard.`)
            } catch (error) {
              console.error('Error verifying hospital:', error)
              Alert.alert('Error', 'Failed to verify hospital')
            }
          }
        }
      ]
    )
  }

  const unverifyHospital = async (hospitalId: string, hospitalName: string) => {
    Alert.alert(
      'Unverify Hospital',
      `Are you sure you want to unverify ${hospitalName}? This will prevent them from logging in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unverify',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', hospitalId), {
                'hospitalData.isVerified': false
              })
              
              // Refresh data
              await loadHospitals()
              
              Alert.alert('Success', `${hospitalName} has been unverified.`)
            } catch (error) {
              console.error('Error unverifying hospital:', error)
              Alert.alert('Error', 'Failed to unverify hospital')
            }
          }
        }
      ]
    )
  }

  const getFilteredHospitals = () => {
    switch (selectedFilter) {
      case 'verified':
        return hospitals.filter(hospital => hospital.hospitalData?.isVerified)
      case 'unverified':
        return hospitals.filter(hospital => !hospital.hospitalData?.isVerified)
      default:
        return hospitals
    }
  }

  const verifiedCount = hospitals.filter(hospital => hospital.hospitalData?.isVerified).length
  const unverifiedCount = hospitals.filter(hospital => !hospital.hospitalData?.isVerified).length

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Hospital Verification
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
          {/* Statistics */}
          <View className="flex-row mb-6" style={{ gap: 16 }}>
            <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 flex-1">
              <Text className="text-sm text-purple-900 dark:text-purple-100 mb-1">
                Total Hospitals
              </Text>
              <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {hospitals.length}
              </Text>
            </View>
            <View className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex-1">
              <Text className="text-sm text-green-900 dark:text-green-100 mb-1">
                Verified
              </Text>
              <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                {verifiedCount}
              </Text>
            </View>
            <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex-1">
              <Text className="text-sm text-red-900 dark:text-red-100 mb-1">
                Pending
              </Text>
              <Text className="text-2xl font-bold text-red-600 dark:text-red-400">
                {unverifiedCount}
              </Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <TouchableOpacity
              onPress={() => setSelectedFilter('all')}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedFilter === 'all' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center font-medium ${
                selectedFilter === 'all'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                All ({hospitals.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedFilter('unverified')}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedFilter === 'unverified' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center font-medium ${
                selectedFilter === 'unverified'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Pending ({unverifiedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedFilter('verified')}
              className={`flex-1 py-2 px-4 rounded-md ${
                selectedFilter === 'verified' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center font-medium ${
                selectedFilter === 'verified'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Verified ({verifiedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text className="text-gray-500 text-center py-8">Loading hospitals...</Text>
          ) : getFilteredHospitals().length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center">
              <Ionicons name="business-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                No hospitals found
              </Text>
            </View>
          ) : (
            getFilteredHospitals().map((hospital) => (
              <View
                key={hospital.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {hospital.hospitalData?.hospitalName || hospital.displayName || 'No Name'}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 mt-1">
                      {hospital.email}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${
                    hospital.hospitalData?.isVerified 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      hospital.hospitalData?.isVerified 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {hospital.hospitalData?.isVerified ? 'VERIFIED' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                {/* Hospital Details */}
                <View className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <View className="mb-3">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Text className="font-medium">Type:</Text> {hospital.hospitalData?.hospitalType}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Text className="font-medium">License:</Text> {hospital.hospitalData?.hospitalLicense}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Text className="font-medium">Address:</Text> {hospital.hospitalData?.address}, {hospital.hospitalData?.city}, {hospital.hospitalData?.state} - {hospital.hospitalData?.pincode}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Text className="font-medium">Phone:</Text> {hospital.hospitalData?.phoneNumber}
                    </Text>
                    {hospital.hospitalData?.emergencyNumber && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Text className="font-medium">Emergency:</Text> {hospital.hospitalData.emergencyNumber}
                      </Text>
                    )}
                    <View className="flex-row flex-wrap gap-4 mb-1">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        <Text className="font-medium">Total Beds:</Text> {hospital.hospitalData?.totalBeds}
                      </Text>
                      {hospital.hospitalData?.icuBeds && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          <Text className="font-medium">ICU Beds:</Text> {hospital.hospitalData.icuBeds}
                        </Text>
                      )}
                    </View>
                    {hospital.hospitalData?.specialties && hospital.hospitalData.specialties.length > 0 && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Text className="font-medium">Specialties:</Text> {hospital.hospitalData.specialties.join(', ')}
                      </Text>
                    )}
                    {hospital.hospitalData?.facilities && hospital.hospitalData.facilities.length > 0 && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Text className="font-medium">Facilities:</Text> {hospital.hospitalData.facilities.join(', ')}
                      </Text>
                    )}
                    {hospital.hospitalData?.accreditation && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Text className="font-medium">Accreditation:</Text> {hospital.hospitalData.accreditation}
                      </Text>
                    )}
                    {hospital.hospitalData?.establishedYear && (
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Text className="font-medium">Established:</Text> {hospital.hospitalData.establishedYear}
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-2 mt-3">
                    {hospital.hospitalData?.isVerified ? (
                      <Button
                        title="Unverify Hospital"
                        onPress={() => unverifyHospital(hospital.id, hospital.hospitalData?.hospitalName || 'Hospital')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      />
                    ) : (
                      <Button
                        title="Verify Hospital"
                        onPress={() => verifyHospital(hospital.id, hospital.hospitalData?.hospitalName || 'Hospital')}
                        size="sm"
                        className="flex-1"
                      />
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}