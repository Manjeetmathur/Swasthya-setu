import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Platform } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, addDoc, query, where, getDocs, Timestamp, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import { useLanguageStore } from '@/stores/languageStore'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { Ionicons } from '@expo/vector-icons'
import { Calendar } from 'react-native-calendars'
import DateTimePicker from '@react-native-community/datetimepicker'
import React from 'react'

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

interface TimeSlotGridProps {
  timeSlots: string[]
  bookedSlots: string[]
  selectedTime: string
  onTimeSelect: (time: string) => void
}

const TimeSlotGrid = React.memo(({ timeSlots, bookedSlots, selectedTime, onTimeSelect }: TimeSlotGridProps) => {
  const { t } = useLanguageStore()
  
  return (
    <View className="flex-row flex-wrap gap-2 mb-4">
      {timeSlots.map((slot) => {
        const isBooked = bookedSlots.includes(slot)
        const isSelected = selectedTime === slot
        
        return (
          <TouchableOpacity
            key={slot}
            onPress={() => !isBooked && onTimeSelect(slot)}
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
                {t('home.book.booked')}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
})

export default function BookAppointment() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { userData } = useAuthStore()
  const { initiateCall, isLoading: isInitiatingCall } = useCallStore()
  const { t } = useLanguageStore()
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
  const [slotsCache, setSlotsCache] = useState<{[key: string]: string[]}>({})

  useEffect(() => {
    loadDoctors()
    
    // Check if doctorId is passed from params
    if (params.doctorId) {
      setSelectedDoctor(params.doctorId as string)
    }
    
    // Cleanup listener on unmount
    return () => {
      if (slotsListener) {
        slotsListener()
      }
    }
  }, [params.doctorId])

  // Auto-select doctor when selectedDoctor changes (from params) or doctors load
  useEffect(() => {
    if (selectedDoctor && doctors.length > 0) {
      const doctor = doctors.find(d => d.id === selectedDoctor)
      if (doctor) {
        setSelectedDoctorData(doctor)
      }
    }
  }, [selectedDoctor, doctors])

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
      Alert.alert(t('home.book.error'), t('home.book.failed_to_load_doctors'))
    } finally {
      setLoadingDoctors(false)
    }
  }

  const loadBookedSlots = useCallback(async (doctorId: string, selectedDate: string) => {
    if (!doctorId || !selectedDate) return
    
    console.log('Loading slots for:', doctorId, selectedDate)
    setLoadingSlots(true)
    
    // Clean up previous listener
    if (slotsListener) {
      slotsListener()
      setSlotsListener(null)
    }
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Loading timeout - showing empty slots')
      setBookedSlots([])
      setLoadingSlots(false)
    }, 10000) // 10 second timeout
    
    try {
      const appointmentsRef = collection(db, 'appointments')
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      console.log('Date range:', startOfDay, endOfDay)
      
      const q = query(
        appointmentsRef,
        where('doctorId', '==', doctorId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay))
      )
      
      // Use getDocs for immediate result
      const snapshot = await getDocs(q)
      clearTimeout(timeoutId) // Clear timeout on success
      
      const booked = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Appointment data:', data)
        return data.time
      }).filter(time => time) // Filter out undefined times
      
      console.log('Found booked slots:', booked)
      setBookedSlots(booked)
      setLoadingSlots(false)
      
      // Set up realtime listener for updates
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const updatedBooked = snapshot.docs.map(doc => {
          const data = doc.data()
          return data.time
        }).filter(time => time)
        console.log('Updated booked slots:', updatedBooked)
        setBookedSlots(updatedBooked)
      }, (error) => {
        console.error('Error in realtime listener:', error)
      })
      
      setSlotsListener(() => unsubscribe)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Error loading booked slots:', error)
      // Show empty slots on error so user can still book
      setBookedSlots([])
      setLoadingSlots(false)
      Alert.alert(t('home.book.warning'), t('home.book.could_not_load_slots'))
    }
  }, [t, slotsListener])

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

  const handleVideoCall = async (doctor: Doctor) => {
    if (!userData?.uid || !userData?.displayName) {
      Alert.alert(t('home.book.error'), t('home.book.please_login'))
      return
    }

    try {
      await initiateCall(
        userData.uid,
        doctor.id,
        userData.displayName,
        doctor.displayName,
        '', // No appointment ID for direct calls
        'video'
      )
      
      Alert.alert(
        t('home.book.video_call_initiated'),
        `${t('home.book.calling_doctor')} ${doctor.displayName}...`,
        [{ text: t('home.ok') }]
      )
    } catch (error) {
      console.error('Error initiating video call:', error)
      Alert.alert(t('home.book.error'), t('home.book.failed_to_start_call'))
    }
  }

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !date || !time || !reason) {
      Alert.alert(t('home.book.error'), t('home.book.please_fill_all_fields'))
      return
    }

    if (!userData) {
      Alert.alert(t('home.book.error'), t('home.book.user_not_found'))
      return
    }

    setLoading(true)
    try {
      const selectedDate = new Date(date)
      selectedDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]))

      await addDoc(collection(db, 'appointments'), {
        patientId: userData.uid,
        doctorId: selectedDoctor,
        patientName: userData.displayName || t('home.book.patient'),
        doctorName: doctors.find((d) => d.id === selectedDoctor)?.displayName || t('home.book.doctor'),
        date: Timestamp.fromDate(selectedDate),
        time: time,
        status: 'pending',
        reason: reason,
        appointmentType: 'doctor',
        createdAt: Timestamp.now()
      })

      Alert.alert(t('home.book.success'), t('home.book.appointment_booked_success'), [
        { text: t('home.ok'), onPress: () => {
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
      Alert.alert(t('home.book.error'), error.message || t('home.book.failed_to_book'))
    } finally {
      setLoading(false)
    }
  }

  const timeSlots = useMemo(() => [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ], [])

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('home.book.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('home.book.select_doctor')}
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
                  {t('home.book.doctor_prefix')} {selectedDoctorData.displayName}
                </Text>
                <Text className="text-blue-600 dark:text-blue-400 font-medium">
                  {selectedDoctorData.doctorData?.specialization}
                </Text>
              </View>
            ) : (
              <Text className="text-gray-500 dark:text-gray-400">
                {t('home.book.choose_doctor')}
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
                {t('home.book.doctor_prefix')} {selectedDoctorData.displayName}
              </Text>
              <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <Text className="text-green-700 dark:text-green-300 text-xs font-medium">
                  ✓ {t('home.book.verified')}
                </Text>
              </View>
            </View>
            <Text className="text-blue-600 dark:text-blue-400 font-medium mb-1">
              {selectedDoctorData.doctorData.specialization}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">
              {selectedDoctorData.doctorData.experience} {t('home.book.years_experience')} • {selectedDoctorData.doctorData.qualifications}
            </Text>
            {selectedDoctorData.doctorData.hospitalAffiliation && (
              <Text className="text-gray-500 dark:text-gray-500 text-sm mb-1">
                {selectedDoctorData.doctorData.hospitalAffiliation}
              </Text>
            )}
            {selectedDoctorData.doctorData.consultationFee && (
              <Text className="text-green-600 dark:text-green-400 text-sm font-medium">
                ₹{selectedDoctorData.doctorData.consultationFee} {t('home.book.consultation_fee')}
              </Text>
            )}
          </View>
        )}

        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4 mt-6">
          {t('home.book.select_date')}
        </Text>
        
        {/* Date Picker */}
        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          className="p-4 mb-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
            <Text className={`ml-3 ${date ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              {date ? new Date(date).toLocaleDateString() : t('home.book.select_date_placeholder')}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={24} color="#6b7280" />
        </TouchableOpacity>

        {/* Time Selection */}
        {date && selectedDoctor && (
          <>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('home.book.select_time')}
            </Text>
            
            {loadingSlots ? (
              <View className="flex-col items-center py-4">
                <Text className="text-gray-500 mb-2">{t('home.book.loading_slots')}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('Skip loading pressed')
                    setLoadingSlots(false)
                    setBookedSlots([])
                  }}
                  className="px-4 py-2 bg-blue-100 rounded-lg"
                >
                  <Text className="text-blue-600 text-sm">{t('home.book.skip_loading')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TimeSlotGrid 
                timeSlots={timeSlots}
                bookedSlots={bookedSlots}
                selectedTime={time}
                onTimeSelect={setTime}
              />
            )}
          </>
        )}

        <Input
          label={t('home.book.reason_for_visit')}
          placeholder={t('home.book.reason_placeholder')}
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
        />

        <Button
          title={t('home.book.book_appointment')}
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
                {t('home.book.select_doctor')}
              </Text>
              <TouchableOpacity onPress={() => setShowDoctorDropdown(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
              {loadingDoctors ? (
                <Text className="text-gray-500 text-center py-4">{t('home.book.loading_doctors')}</Text>
              ) : doctors.length === 0 ? (
                <Text className="text-gray-500 text-center py-4">{t('home.book.no_doctors_available')}</Text>
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
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {t('home.book.doctor_prefix')} {doctor.displayName}
                        </Text>
                        {doctor.doctorData && (
                          <View className="mt-1">
                            <Text className="text-blue-600 dark:text-blue-400 font-medium">
                              {doctor.doctorData.specialization}
                            </Text>
                            <Text className="text-gray-600 dark:text-gray-400 text-sm">
                              {doctor.doctorData.experience} {t('home.book.years_experience')} • {doctor.doctorData.qualifications}
                            </Text>
                            {doctor.doctorData.hospitalAffiliation && (
                              <Text className="text-gray-500 dark:text-gray-500 text-sm">
                                {doctor.doctorData.hospitalAffiliation}
                              </Text>
                            )}
                            {doctor.doctorData.consultationFee && (
                              <Text className="text-green-600 dark:text-green-400 text-sm font-medium mt-1">
                                ₹{doctor.doctorData.consultationFee} {t('home.book.consultation_fee')}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                      <View className="items-end">
                        {selectedDoctor === doctor.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                        )}
                      </View>
                    </View>
                    
                    {doctor.doctorData && doctor.doctorData.isVerified && (
                      <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full mt-2">
                        <Text className="text-green-700 dark:text-green-300 text-xs font-medium">
                          ✓ {t('home.book.verified')}
                        </Text>
                      </View>
                    )}
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
                {t('home.book.select_date_modal')}
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

