import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function QuickActionsSection() {
  const router = useRouter()

  return (
    <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
      <Text className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
        Quick Actions
      </Text>
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-blue-600 rounded-lg p-4 items-center"
          onPress={() => router.push('/patient/book')}
        >
          <Ionicons name="calendar-outline" size={24} color="#ffffff" />
          <Text className="text-white font-semibold mt-2">Book Appointment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-green-600 rounded-lg p-4 items-center"
          onPress={() => router.push('/patient/chat')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#ffffff" />
          <Text className="text-white font-semibold mt-2">Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

