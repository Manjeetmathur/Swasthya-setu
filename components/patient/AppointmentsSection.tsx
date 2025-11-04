import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Appointment } from '@/stores/appointmentsStore'
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
          <Text className="text-purple-600 dark:text-purple-400 text-sm font-semibold mr-1">
            {showAll ? 'Show Less' : 'View All'}
          </Text>
          <Ionicons 
            name={showAll ? 'chevron-up' : 'chevron-forward'} 
            size={16} 
            color="#9333ea" 
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text className="text-gray-500 text-center py-8">{t('home.loading_appointments')}</Text>
      ) : upcomingAppointments.length === 0 ? (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 items-center border border-gray-200 dark:border-gray-700">
          <View className="bg-gray-100 dark:bg-gray-700 rounded-full p-4 mb-4">
            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
          </View>
          <Text className="text-gray-900 dark:text-white font-semibold text-lg mb-2 text-center">
            {t('home.no_appointments')}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
            Book your first appointment to get started
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/patient/book')}
            className="bg-blue-600 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-semibold">
              {t('home.book_first_appointment')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        displayedAppointments.map((appointment) => (
          <TouchableOpacity
            key={appointment.id}
            onPress={() => onAppointmentPress(appointment)}
            className="bg-white dark:bg-gray-800 rounded-2xl p-5 mb-3 border border-gray-200 dark:border-gray-700 shadow-md"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3
            }}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-2">
                  <View className={`p-2 rounded-xl mr-3 ${
                    appointment.appointmentType === 'hospital' || appointment.hospitalId 
                      ? 'bg-purple-100 dark:bg-purple-900/30' 
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {appointment.appointmentType === 'hospital' || appointment.hospitalId ? (
                      <Ionicons name="business" size={20} color="#8b5cf6" />
                    ) : (
                      <Ionicons name="medical" size={20} color="#3b82f6" />
                    )}
                  </View>
                  <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1" numberOfLines={1}>
                    {(appointment.appointmentType === 'hospital' || appointment.hospitalId)
                      ? appointment.hospitalName || 'Hospital'
                      : `Dr. ${appointment.doctorName || 'Doctor'}`
                    }
                  </Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar" size={14} color="#6b7280" />
                  <Text className="text-gray-600 dark:text-gray-400 text-sm ml-2">
                    {appointment.date.toDate().toLocaleDateString()} at {appointment.time}
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="document-text" size={14} color="#6b7280" style={{ marginTop: 2 }} />
                  <Text className="text-gray-500 dark:text-gray-500 text-sm ml-2 flex-1" numberOfLines={2}>
                    {t('home.reason')}: {appointment.reason}
                  </Text>
                </View>
              </View>
              <View
                className={`px-3 py-1.5 rounded-full ${
                  appointment.status === 'confirmed'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-yellow-100 dark:bg-yellow-900/30'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
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

