import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Appointment } from '@/stores/appointmentsStore'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'
import { useLanguageStore } from '@/stores/languageStore'

interface AppointmentsSectionProps {
  appointments: Appointment[]
  isLoading: boolean
  onAppointmentPress: (appointment: Appointment) => void
}

export default function AppointmentsSection({
  appointments,
  isLoading,
  onAppointmentPress
}: AppointmentsSectionProps) {
  const router = useRouter()
  const { t } = useLanguageStore()
  const [showAll, setShowAll] = useState(false)
  
  const upcomingAppointments = appointments.filter(
    (apt) => apt.status === 'confirmed' || apt.status === 'pending'
  )
  
  const displayedAppointments = showAll ? upcomingAppointments : upcomingAppointments.slice(0, 2)

  return (
    <View>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('home.upcoming_appointments')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowAll(!showAll)}
          className="flex-row items-center"
        >
          <Text className="text-blue-600 dark:text-blue-400 font-medium text-sm mr-1">
            {showAll ? 'Show Less' : 'View All'}
          </Text>
          <Ionicons 
            name={showAll ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color="#2563eb" 
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text className="text-gray-500 text-center py-8">{t('home.loading_appointments')}</Text>
      ) : upcomingAppointments.length === 0 ? (
        <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center">
          <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
          <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
            {t('home.no_appointments')}
          </Text>
          <Button
            title={t('home.book_first_appointment')}
            onPress={() => router.push('/patient/book')}
            className="mt-4"
            size="sm"
          />
        </View>
      ) : (
        displayedAppointments.map((appointment) => (
          <TouchableOpacity
            key={appointment.id}
            onPress={() => onAppointmentPress(appointment)}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  {appointment.appointmentType === 'hospital' || appointment.hospitalId ? (
                    <Ionicons name="business" size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="medical" size={18} color="#3b82f6" style={{ marginRight: 6 }} />
                  )}
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(appointment.appointmentType === 'hospital' || appointment.hospitalId)
                      ? appointment.hospitalName || 'Hospital'
                      : `Dr. ${appointment.doctorName || 'Doctor'}`
                    }
                  </Text>
                </View>
                <Text className="text-gray-600 dark:text-gray-400 mt-1">
                  {appointment.date.toDate().toLocaleDateString()} at {appointment.time}
                </Text>
                <Text className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                  {t('home.reason')}: {appointment.reason}
                </Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${
                  appointment.status === 'confirmed'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    appointment.status === 'confirmed'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}
                >
                  {appointment.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  )
}

