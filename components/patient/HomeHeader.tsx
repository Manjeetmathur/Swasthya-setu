import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useLanguageStore } from '@/stores/languageStore'

interface HomeHeaderProps {
  userName?: string
}

export default function HomeHeader({ userName }: HomeHeaderProps) {
  const router = useRouter()
  const { t } = useLanguageStore()

  return (
    <View className="flex-row justify-between items-center mb-6">
      <View>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('home.welcome_back')},
        </Text>
        <Text className="text-xl text-gray-600 dark:text-gray-400">
          {userName || 'Patient'}
        </Text>
      </View>
      <TouchableOpacity onPress={() => router.push('/patient/profile')}>
        <Ionicons name="person-outline" size={24} color="#6b7280" />
      </TouchableOpacity>
    </View>
  )
}

