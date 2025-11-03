import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, addDoc, query, where, getDocs, Timestamp, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { Ionicons } from '@expo/vector-icons'
import { Calendar } from 'react-native-calendars'
import DateTimePicker from '@react-native-community/datetimepicker'

interface Doctor {
  id: string
  displayName: string
  email: string
  specialization?: string
  experience?: number
  qualifications?: string
  consultationFee?: number
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
}

export default function BookAppointment() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [selectedDoctorData, setSelectedDoctorData] = useState<Doctor | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  
  // Debug log for modal state
  useEffect(() => {
    console.log('showDoctorDropdown state changed:', showDoctorDropdown)
  }, [showDoctorDropdown])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsListener, setSlotsListener] = useState<(() => void) | null>(null)

  useEffect(() => {
    loadDoctors()
    
    // Cleanup listener on unmount
    return () => {
      if (slotsListener) {
        slotsListener()
      }
    }
  }, [])

  // Cleanup previous listener when doctor or date changes
  useEffect(() => {
    if (slotsListener) {
      slotsListener()
      setSlotsListener(null)
    }
  }, [selectedDoctor, date])

  const loadDoctors = async () => {
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
      Alert.alert('Error', 'Failed to load doctors')
    } finally {
      setLoadingDoctors(false)
    }
  }

  const loadBookedSlots = (doctorId: string, selectedDate: string) => {
    if (!doctorId || !selectedDate) return
    
    setLoadingSlots(true)
    
    // Clean up previous listener
    if (slotsListener) {
      slotsListener()
    }
    
    try {
      const appointmentsRef = collection(db, 'appointments')
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      const q = query(
        appointmentsRef,
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      // Set up realtime listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const booked = snapshot.docs.map(doc => doc.data().time)
        setBookedSlots(booked)
        setLoadingSlots(false)
      }, (error) => {
        console.error('Error loading booked slots:', error)
        setLoadingSlots(false)
      })
      
      setSlotsListener(() => unsubscribe)
    } catch (error) {
      console.error('Error setting up slots listener:', error)
      setLoadingSlots(false)
    }
  }

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor.id)
    setSelectedDoctorData(doctor)
    setShowDoctorDropdown(false)
    setTime('') // Reset time when doctor changes
    if (date) {
      loadBookedSlots(doctor.id, date)
    }
  }

  const handleDateSelect = (day: any) => {
    const selectedDate = day.dateString
    setDate(selectedDate)
    setShowCalendar(false)
    setTime('') // Reset time when date changes
    if (selectedDoctor) {
      loadBookedSlots(selectedDoctor, selectedDate)
    }
  }

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !date || !time || !reason) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (!userData) {
      Alert.alert('Error', 'User not found')
      return
    }

    setLoading(true)
    try {
      const selectedDate = new Date(date)
      selectedDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]))

      await addDoc(collection(db, 'appointments'), {
        patientId: userData.uid,
        doctorId: selectedDoctor,
        patientName: userData.displayName || 'Patient',
        doctorName: doctors.find((d) => d.id === selectedDoctor)?.displayName || 'Doctor',
        date: Timestamp.fromDate(selectedDate),
        time: time,
        status: 'pending',
        reason: reason,
        createdAt: Timestamp.now()
      })

      Alert.alert('Success', 'Appointment booked successfully!', [
        { text: 'OK', onPress: () => {
          // Reset form
          setSelectedDoctor('')
          setSelectedDoctorData(null)
          setDate('')
          setTime('')
          setReason('')
          setBookedSlots([])
          router.back()
        }}
      ])
    } catch (error: any) {
      console.error('Error booking appointment:', error)
      Alert.alert('Error', error.message || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ]

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Book Appointment
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Doctor
        </Text>

        {/* Doctor Dropdown */}
        <TouchableOpacity
          onPress={() => {
            console.log('Doctor dropdown pressed')
            setShowDoctorDropdown(true)
          }}
          className="p-4 mb-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-row items-center justify-between"
        >
          <View className="flex-1">
            {selectedDoctorData ? (
              <View>
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  Dr. {selectedDoctorData.displayName}
                </Text>
                <Text className="text-blue-600 dark:text-blue-400 font-medium">
                  {selectedDoctorData.doctorData?.specialization}
                </Text>
              </View>
            ) : (
              <Text className="text-gray-500 dark:text-gray-400">
                Choose a doctor
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={24} color="#6b7280" />
        </TouchableOpacity>

        {/* Selected Doctor Details */}
        {selectedDoctorData && selectedDoctorData.doctorData && (
          <View className="p-4 mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Dr. {selectedDoctorData.displayName}
              </Text>
              <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <Text className="text-green-700 dark:text-green-300 text-xs font-medium">
                  ✓ Verified
                </Text>
              </View>
            </View>
            <Text className="text-blue-600 dark:text-blue-400 font-medium mb-1">
              {selectedDoctorData.doctorData.specialization}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">
              {selectedDoctorData.doctorData.experience} years experience • {selectedDoctorData.doctorData.qualifications}
            </Text>
            {selectedDoctorData.doctorData.hospitalAffiliation && (
              <Text className="text-gray-500 dark:text-gray-500 text-sm mb-1">
                {selectedDoctorData.doctorData.hospitalAffiliation}
              </Text>
            )}
            {selectedDoctorData.doctorData.consultationFee && (
              <Text className="text-green-600 dark:text-green-400 text-sm font-medium">
                ₹{selectedDoctorData.doctorData.consultationFee} consultation fee
              </Text>
            )}
          </View>
        )}

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4 mt-6">
          Select Date
        </Text>
        
        {/* Date Picker */}
        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          className="p-4 mb-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text className={`ml-3 ${date ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {date ? new Date(date).toLocaleDateString('en-GB') : 'Select date'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={24} color="#6b7280" />
        </TouchableOpacity>

        {/* Time Selection */}
        {date && selectedDoctor && (
          <>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Time
            </Text>
            
            {loadingSlots ? (
              <Text className="text-gray-500 text-center py-4">Loading available slots...</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {timeSlots.map((slot) => {
                  const isBooked = bookedSlots.includes(slot)
                  const isSelected = time === slot
                  
                  return (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => !isBooked && setTime(slot)}
                      disabled={isBooked}
                      className={`px-4 py-2 rounded-lg border ${
                        isBooked
                          ? 'border-red-300 bg-red-100 dark:bg-red-900/30'
                          : isSelected
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <Text
                        className={`font-medium ${
                          isBooked
                            ? 'text-red-600 dark:text-red-400'
                            : isSelected
                            ? 'text-white'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {slot}
                      </Text>
                      {isBooked && (
                        <Text className="text-red-500 text-xs text-center mt-1">
                          Booked
                        </Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </>
        )}

        <Input
          label="Reason for Visit"
          placeholder="Describe your symptoms or reason"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
        />

        <Button
          title="Book Appointment"
          onPress={handleBookAppointment}
          loading={loading}
          className="mt-6 mb-8"
        />
      </ScrollView>

      {/* Doctor Selection Modal */}
      <Modal
        visible={showDoctorDropdown}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDoctorDropdown(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          activeOpacity={1}
          onPress={() => setShowDoctorDropdown(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => {}}
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
              minHeight: '50%'
            }}
          >
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Select Doctor
              </Text>
              <TouchableOpacity onPress={() => setShowDoctorDropdown(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
              {loadingDoctors ? (
                <Text className="text-gray-500 text-center py-4">Loading doctors...</Text>
              ) : doctors.length === 0 ? (
                <Text className="text-gray-500 text-center py-4">No doctors available</Text>
              ) : (
                doctors.map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    onPress={() => handleDoctorSelect(doctor)}
                    className={`p-4 mb-3 rounded-lg border-2 ${
                      selectedDoctor === doctor.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          Dr. {doctor.displayName}
                        </Text>
                        {doctor.doctorData && (
                          <View className="mt-1">
                            <Text className="text-blue-600 dark:text-blue-400 font-medium">
                              {doctor.doctorData.specialization}
                            </Text>
                            <Text className="text-gray-600 dark:text-gray-400 text-sm">
                              {doctor.doctorData.experience} years experience • {doctor.doctorData.qualifications}
                            </Text>
                            {doctor.doctorData.hospitalAffiliation && (
                              <Text className="text-gray-500 dark:text-gray-500 text-sm">
                                {doctor.doctorData.hospitalAffiliation}
                              </Text>
                            )}
                            {doctor.doctorData.consultationFee && (
                              <Text className="text-green-600 dark:text-green-400 text-sm font-medium mt-1">
                                ₹{doctor.doctorData.consultationFee} consultation fee
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                      <View className="items-end">
                        {selectedDoctor === doctor.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                        )}
                        <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full mt-2">
                          <Text className="text-green-700 dark:text-green-300 text-xs font-medium">
                            ✓ Verified
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View className="flex-1 justify-center bg-black/50 px-6">
          <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Select Date
              </Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={{
                [date]: { selected: true, selectedColor: '#2563eb' }
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#2563eb',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#2563eb',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#00adf5',
                selectedDotColor: '#ffffff',
                arrowColor: '#2563eb',
                disabledArrowColor: '#d9e1e8',
                monthTextColor: '#2d4150',
                indicatorColor: '#2563eb',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

