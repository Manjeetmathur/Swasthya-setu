import { useEffect, useState } from 'react'
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
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting(t('home.greeting.good_morning'))
    } else if (hour < 17) {
      setGreeting(t('home.greeting.good_afternoon'))
    } else if (hour < 21) {
      setGreeting(t('home.greeting.good_evening'))
    } else {
      setGreeting(t('home.greeting.good_night'))
    }
  }, [t])

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {greeting}
          </Text>
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {userName || 'Patient'}
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400">
            {t('home.how_are_you_feeling')}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/patient/profile')}
          className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full"
        >
          <Ionicons name="person" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

