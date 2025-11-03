import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore'
import { db , auth } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'

import { signOut } from 'firebase/auth'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'

interface User {
  id: string
  displayName: string
  email: string
  role: string
  createdAt: any
  doctorData?: {
    medicalLicense: string
    specialization: string
    experience: number
    qualifications: string
    certifications: string[]
    hospitalAffiliation?: string
    consultationFee?: number
    isVerified: boolean
  }
  hospitalData?: {
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

interface AppointmentStats {
  total: number
  pending: number
  confirmed: number
  completed: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { userData, logout } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'all' | 'doctors' | 'patients' | 'hospitals'>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load users
      const usersRef = collection(db, 'users')
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'))
      const usersSnapshot = await getDocs(usersQuery)
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
      setUsers(usersList)

      // Load appointment stats
      const appointmentsRef = collection(db, 'appointments')
      const appointmentsSnapshot = await getDocs(appointmentsRef)
      const appointmentsList = appointmentsSnapshot.docs.map((doc) => doc.data())

      const appointmentStats: AppointmentStats = {
        total: appointmentsList.length,
        pending: appointmentsList.filter((apt) => apt.status === 'pending').length,
        confirmed: appointmentsList.filter((apt) => apt.status === 'confirmed').length,
        completed: appointmentsList.filter((apt) => apt.status === 'completed').length
      }
      setStats(appointmentStats)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      await logout()
      router.replace('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const verifyDoctor = async (userId: string, doctorName: string) => {
    Alert.alert(
      'Verify Doctor',
      `Are you sure you want to verify Dr. ${doctorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                'doctorData.isVerified': true
              })
              
              // Refresh data
              await loadData()
              
              Alert.alert('Success', `Dr. ${doctorName} has been verified successfully!`)
            } catch (error) {
              console.error('Error verifying doctor:', error)
              Alert.alert('Error', 'Failed to verify doctor')
            }
          }
        }
      ]
    )
  }

  const unverifyDoctor = async (userId: string, doctorName: string) => {
    Alert.alert(
      'Unverify Doctor',
      `Are you sure you want to unverify Dr. ${doctorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unverify',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                'doctorData.isVerified': false
              })
              
              // Refresh data
              await loadData()
              
              Alert.alert('Success', `Dr. ${doctorName} has been unverified.`)
            } catch (error) {
              console.error('Error unverifying doctor:', error)
              Alert.alert('Error', 'Failed to unverify doctor')
            }
          }
        }
      ]
    )
  }

  const verifyHospital = async (userId: string, hospitalName: string) => {
    Alert.alert(
      'Verify Hospital',
      `Are you sure you want to verify ${hospitalName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                'hospitalData.isVerified': true
              })
              
              // Refresh data
              await loadData()
              
              Alert.alert('Success', `${hospitalName} has been verified successfully!`)
            } catch (error) {
              console.error('Error verifying hospital:', error)
              Alert.alert('Error', 'Failed to verify hospital')
            }
          }
        }
      ]
    )
  }

  const unverifyHospital = async (userId: string, hospitalName: string) => {
    Alert.alert(
      'Unverify Hospital',
      `Are you sure you want to unverify ${hospitalName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unverify',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                'hospitalData.isVerified': false
              })
              
              // Refresh data
              await loadData()
              
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      case 'doctor':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'patient':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      case 'hospital':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  const getFilteredUsers = () => {
    switch (selectedTab) {
      case 'doctors':
        return users.filter(user => user.role === 'doctor')
      case 'patients':
        return users.filter(user => user.role === 'patient')
      case 'hospitals':
        return users.filter(user => user.role === 'hospital')
      default:
        return users
    }
  }

  const doctorCount = users.filter(user => user.role === 'doctor').length
  const patientCount = users.filter(user => user.role === 'patient').length
  const hospitalCount = users.filter(user => user.role === 'hospital').length
  const unverifiedDoctors = users.filter(user => user.role === 'doctor' && !user.doctorData?.isVerified).length
  const unverifiedHospitals = users.filter(user => user.role === 'hospital' && !user.hospitalData?.isVerified).length

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push('/admin/hospital-verification')}>
            <Ionicons name="business-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/admin/profile')}>
            <Ionicons name="person-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-6 py-4">
          <View className="mb-6">
            {/* First Row */}
            <View className="flex-row mb-4" style={{ gap: 10 }}>
              <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex-1">
                <Text className="text-sm text-blue-900 dark:text-blue-100 mb-1">
                  Total Doctors
                </Text>
                <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {doctorCount}
                </Text>
              </View>
              <View className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex-1">
                <Text className="text-sm text-green-900 dark:text-green-100 mb-1">
                  Total Patients
                </Text>
                <Text className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {patientCount}
                </Text>
              </View>
            </View>
            
            {/* Second Row */}
            <View className="flex-row mb-4" style={{ gap: 10 }}>
              <View className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 flex-1">
                <Text className="text-sm text-purple-900 dark:text-purple-100 mb-1">
                  Total Hospitals
                </Text>
                <Text className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {hospitalCount}
                </Text>
              </View>
              <View className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 flex-1">
                <Text className="text-sm text-indigo-900 dark:text-indigo-100 mb-1">
                  Total Appointments
                </Text>
                <Text className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stats.total}
                </Text>
              </View>
            </View>

            {/* Third Row */}
            <View className="flex-row" style={{ gap: 10 }}>
              <View className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 flex-1">
                <Text className="text-sm text-orange-900 dark:text-orange-100 mb-1">
                  Unverified Doctors
                </Text>
                <Text className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {unverifiedDoctors}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/admin/hospital-verification')}
                className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 flex-1"
              >
                <Text className="text-sm text-red-900 dark:text-red-100 mb-1">
                  Unverified Hospitals
                </Text>
                <Text className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {unverifiedHospitals}
                </Text>
                <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Tap to manage
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View className="flex-row mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <TouchableOpacity
              onPress={() => setSelectedTab('all')}
              className={`flex-1 py-1.5 px-2 rounded-md ${
                selectedTab === 'all' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center text-xs font-medium ${
                selectedTab === 'all'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                All ({users.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('doctors')}
              className={`flex-1 py-1.5 px-2 rounded-md ${
                selectedTab === 'doctors' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center text-xs font-medium ${
                selectedTab === 'doctors'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Doctors ({doctorCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('patients')}
              className={`flex-1 py-1.5 px-2 rounded-md ${
                selectedTab === 'patients' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center text-xs font-medium ${
                selectedTab === 'patients'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Patients ({patientCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedTab('hospitals')}
              className={`flex-1 py-1.5 px-2 rounded-md ${
                selectedTab === 'hospitals' 
                  ? 'bg-white dark:bg-gray-700' 
                  : 'bg-transparent'
              }`}
            >
              <Text className={`text-center text-xs font-medium ${
                selectedTab === 'hospitals'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                Hospitals ({hospitalCount})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <Text className="text-gray-500 text-center py-8">Loading users...</Text>
          ) : getFilteredUsers().length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                No users found
              </Text>
            </View>
          ) : (
            getFilteredUsers().map((user) => (
              <View
                key={user.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user.displayName || 'No Name'}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 mt-1">
                      {user.email}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {user.role === 'doctor' && user.doctorData && (
                      <View className={`px-2 py-1 rounded-full ${
                        user.doctorData.isVerified 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <Text className={`text-xs font-semibold ${
                          user.doctorData.isVerified 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {user.doctorData.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                        </Text>
                      </View>
                    )}
                    {user.role === 'hospital' && user.hospitalData && (
                      <View className={`px-2 py-1 rounded-full ${
                        user.hospitalData.isVerified 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <Text className={`text-xs font-semibold ${
                          user.hospitalData.isVerified 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {user.hospitalData.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                        </Text>
                      </View>
                    )}
                    <View className={`px-3 py-1 rounded-full ${getRoleColor(user.role)}`}>
                      <Text className="text-xs font-semibold uppercase">
                        {user.role}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Doctor-specific information */}
                {user.role === 'doctor' && user.doctorData && (
                  <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        <Text className="font-medium">Specialization:</Text> {user.doctorData.specialization}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        <Text className="font-medium">Experience:</Text> {user.doctorData.experience} years
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <Text className="font-medium">License:</Text> {user.doctorData.medicalLicense}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <Text className="font-medium">Qualifications:</Text> {user.doctorData.qualifications}
                    </Text>
                    
                    {/* Verification buttons */}
                    <View className="flex-row gap-2">
                      {user.doctorData.isVerified ? (
                        <Button
                          title="Unverify"
                          onPress={() => unverifyDoctor(user.id, user.displayName || 'Doctor')}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        />
                      ) : (
                        <Button
                          title="Verify Doctor"
                          onPress={() => verifyDoctor(user.id, user.displayName || 'Doctor')}
                          size="sm"
                          className="flex-1"
                        />
                      )}
                    </View>
                  </View>
                )}

                {/* Hospital-specific information */}
                {user.role === 'hospital' && user.hospitalData && (
                  <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <View className="mb-3">
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Text className="font-medium">Hospital Name:</Text> {user.hospitalData.hospitalName}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Text className="font-medium">Type:</Text> {user.hospitalData.hospitalType}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Text className="font-medium">License:</Text> {user.hospitalData.hospitalLicense}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Text className="font-medium">Address:</Text> {user.hospitalData.address}, {user.hospitalData.city}, {user.hospitalData.state} - {user.hospitalData.pincode}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Text className="font-medium">Phone:</Text> {user.hospitalData.phoneNumber}
                      </Text>
                      {user.hospitalData.emergencyNumber && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Text className="font-medium">Emergency:</Text> {user.hospitalData.emergencyNumber}
                        </Text>
                      )}
                      <View className="flex-row flex-wrap gap-2 mb-2">
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          <Text className="font-medium">Total Beds:</Text> {user.hospitalData.totalBeds}
                        </Text>
                        {user.hospitalData.icuBeds && (
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            <Text className="font-medium">ICU Beds:</Text> {user.hospitalData.icuBeds}
                          </Text>
                        )}
                      </View>
                      {user.hospitalData.specialties.length > 0 && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Text className="font-medium">Specialties:</Text> {user.hospitalData.specialties.join(', ')}
                        </Text>
                      )}
                      {user.hospitalData.facilities.length > 0 && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Text className="font-medium">Facilities:</Text> {user.hospitalData.facilities.join(', ')}
                        </Text>
                      )}
                      {user.hospitalData.accreditation && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Text className="font-medium">Accreditation:</Text> {user.hospitalData.accreditation}
                        </Text>
                      )}
                      {user.hospitalData.establishedYear && (
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <Text className="font-medium">Established:</Text> {user.hospitalData.establishedYear}
                        </Text>
                      )}
                    </View>
                    
                    {/* Verification buttons */}
                    <View className="flex-row gap-2">
                      {user.hospitalData.isVerified ? (
                        <Button
                          title="Unverify"
                          onPress={() => unverifyHospital(user.id, user.hospitalData?.hospitalName || 'Hospital')}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        />
                      ) : (
                        <Button
                          title="Verify Hospital"
                          onPress={() => verifyHospital(user.id, user.hospitalData?.hospitalName || 'Hospital')}
                          size="sm"
                          className="flex-1"
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

