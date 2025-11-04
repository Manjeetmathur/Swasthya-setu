import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { useAppointmentsStore } from '@/stores/appointmentsStore'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Ionicons } from '@expo/vector-icons'

interface Patient {
  id: string
  displayName: string
  email: string
  photoURL?: string
  phoneNumber?: string
}

interface PatientRecord {
  patient: Patient
  totalAppointments: number
  lastVisit?: Date
  upcomingAppointments: number
}

export default function DoctorPatients() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const { appointments, subscribeToAppointments } = useAppointmentsStore()
  const [patients, setPatients] = useState<PatientRecord[]>([])
  const [filteredPatients, setFilteredPatients] = useState<PatientRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribeAppointments = subscribeToAppointments(userData.uid, 'doctor')
      
      return () => {
        unsubscribeAppointments()
      }
    }
  }, [userData?.uid, subscribeToAppointments])

  useEffect(() => {
    loadPatients()
  }, [appointments, userData?.uid])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients)
    } else {
      const filtered = patients.filter((patient) =>
        patient.patient.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.patient.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPatients(filtered)
    }
  }, [searchQuery, patients])

  const loadPatients = async () => {
    if (!userData?.uid) return
    
    setLoading(true)
    try {
      // Get unique patient IDs from appointments
      const patientIds = new Set<string>()
      appointments.forEach((apt) => {
        if (apt.patientId) {
          patientIds.add(apt.patientId)
        }
      })

      // Fetch patient data
      const patientRecords: PatientRecord[] = []
      
      for (const patientId of patientIds) {
        try {
          const patientDocRef = doc(db, 'users', patientId)
          const patientDocSnap = await getDoc(patientDocRef)
          
          if (patientDocSnap.exists()) {
            const patientData = {
              id: patientDocSnap.id,
              ...patientDocSnap.data()
            } as Patient

            // Calculate statistics
            const patientAppointments = appointments.filter((apt) => apt.patientId === patientId)
            
            const completedAppointments = patientAppointments.filter((apt) => apt.status === 'completed')
            const lastVisit = completedAppointments.length > 0
              ? completedAppointments.sort((a, b) => b.date.toMillis() - a.date.toMillis())[0].date.toDate()
              : undefined

            const upcomingAppointments = patientAppointments.filter((apt) => {
              const aptDate = apt.date.toDate()
              const today = new Date()
              return apt.status === 'confirmed' && aptDate >= today
            }).length

            patientRecords.push({
              patient: patientData,
              totalAppointments: patientAppointments.length,
              lastVisit,
              upcomingAppointments
            })
          }
        } catch (error) {
          console.error(`Error fetching patient ${patientId}:`, error)
        }
      }

      // Sort by last visit (most recent first)
      patientRecords.sort((a, b) => {
        if (!a.lastVisit && !b.lastVisit) return 0
        if (!a.lastVisit) return 1
        if (!b.lastVisit) return -1
        return b.lastVisit.getTime() - a.lastVisit.getTime()
      })

      setPatients(patientRecords)
      setFilteredPatients(patientRecords)
    } catch (error) {
      console.error('Error loading patients:', error)
      Alert.alert('Error', 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const handleViewPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient)
    setShowPatientModal(true)
  }

  const getPatientAppointments = (patientId: string) => {
    return appointments.filter((apt) => apt.patientId === patientId)
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          My Patients
        </Text>
        <TouchableOpacity
          onPress={loadPatients}
          className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg"
        >
          <Ionicons name="refresh" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 flex-row items-center">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search patients by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="refresh" size={48} color="#6b7280" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4">
              Loading patients...
            </Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center px-6">
              {searchQuery ? 'No patients found matching your search' : 'No patients yet'}
            </Text>
          </View>
        ) : (
          <View className="px-6 py-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
            </Text>
            
            {filteredPatients.map((patientRecord) => (
              <TouchableOpacity
                key={patientRecord.patient.id}
                onPress={() => handleViewPatient(patientRecord)}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <View className="flex-row items-center mb-3">
                  <View className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full items-center justify-center mr-3">
                    <Text className="text-blue-600 dark:text-blue-400 text-lg font-bold">
                      {patientRecord.patient.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {patientRecord.patient.displayName}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                      {patientRecord.patient.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </View>

                <View className="flex-row flex-wrap gap-3 mt-3">
                  <View className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                    <Text className="text-blue-600 dark:text-blue-400 text-xs font-semibold">
                      {patientRecord.totalAppointments} Appointments
                    </Text>
                  </View>
                  {patientRecord.upcomingAppointments > 0 && (
                    <View className="bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                      <Text className="text-green-600 dark:text-green-400 text-xs font-semibold">
                        {patientRecord.upcomingAppointments} Upcoming
                      </Text>
                    </View>
                  )}
                </View>

                {patientRecord.lastVisit && (
                  <Text className="text-gray-500 dark:text-gray-500 text-xs mt-3">
                    Last visit: {patientRecord.lastVisit.toLocaleDateString()}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Patient Detail Modal */}
      <Modal
        visible={showPatientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-end">
          <View className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Patient Details
              </Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <ScrollView>
                <View className="mb-6">
                  <View className="bg-blue-100 dark:bg-blue-900/30 w-20 h-20 rounded-full items-center justify-center mx-auto mb-4">
                    <Text className="text-blue-600 dark:text-blue-400 text-3xl font-bold">
                      {selectedPatient.patient.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
                    {selectedPatient.patient.displayName}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-center">
                    {selectedPatient.patient.email}
                  </Text>
                </View>

                {/* Statistics */}
                <View className="flex-row flex-wrap gap-4 mb-6">
                  <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex-1 min-w-[48%]">
                    <Text className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {selectedPatient.totalAppointments}
                    </Text>
                    <Text className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                      Total Appointments
                    </Text>
                  </View>
                  <View className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex-1 min-w-[48%]">
                    <Text className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                      {selectedPatient.upcomingAppointments}
                    </Text>
                    <Text className="text-green-600 dark:text-green-400 text-sm font-semibold">
                      Upcoming
                    </Text>
                  </View>
                </View>

                {/* Recent Appointments */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Recent Appointments
                  </Text>
                  {getPatientAppointments(selectedPatient.patient.id)
                    .slice(0, 5)
                    .map((apt) => (
                      <View
                        key={apt.id}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-2"
                      >
                        <Text className="text-gray-900 dark:text-white font-semibold">
                          {apt.date.toDate().toLocaleDateString()} at {apt.time}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          {apt.reason}
                        </Text>
                        <View className="mt-2">
                          <View
                            className={`px-2 py-1 rounded-full self-start ${
                              apt.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : apt.status === 'confirmed'
                                ? 'bg-blue-100 dark:bg-blue-900/30'
                                : apt.status === 'pending'
                                ? 'bg-orange-100 dark:bg-orange-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                apt.status === 'completed'
                                  ? 'text-green-700 dark:text-green-300'
                                  : apt.status === 'confirmed'
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : apt.status === 'pending'
                                  ? 'text-orange-700 dark:text-orange-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {apt.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

