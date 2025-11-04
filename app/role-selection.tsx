import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function RoleSelection() {
  const router = useRouter()

  const handleRoleSelect = (role: 'patient' | 'doctor' | 'hospital') => {
    router.push(`/login?role=${role}`)
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Hero Section */}
        <View className="px-6 py-12">
          {/* Header */}
          <View className="items-center mb-16">
            <View className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg mb-6">
              <Ionicons name="medical" size={48} color="#2563eb" />
            </View>
            <Text className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Swasthya Setu
            </Text>
            <Text className="text-xl text-gray-600 dark:text-gray-400 text-center mb-2">
              Your Digital Healthcare Companion
            </Text>
            <Text className="text-base text-gray-500 dark:text-gray-500 text-center">
              Choose your role to access personalized healthcare services
            </Text>
          </View>

          {/* Role Options */}
          <View className="space-y-6 mb-8">
            {/* Patient Option */}
            <TouchableOpacity
              onPress={() => handleRoleSelect('patient')}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-gray-700 active:scale-95"
              activeOpacity={0.9}
            >
              <View className="flex-row items-center">
                <View className="bg-blue-500 p-4 rounded-xl mr-4">
                  <Ionicons name="person" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Patient
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    Book appointments, consult doctors, manage health records
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#6b7280" />
              </View>
            </TouchableOpacity>

            {/* Doctor Option */}
            <TouchableOpacity
              onPress={() => handleRoleSelect('doctor')}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-green-100 dark:border-gray-700 active:scale-95"
              activeOpacity={0.9}
            >
              <View className="flex-row items-center">
                <View className="bg-green-500 p-4 rounded-xl mr-4">
                  <Ionicons name="medical" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Doctor
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    Manage practice, consult patients, provide healthcare
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#6b7280" />
              </View>
            </TouchableOpacity>

            {/* Hospital Option */}
            <TouchableOpacity
              onPress={() => handleRoleSelect('hospital')}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-purple-100 dark:border-gray-700 active:scale-95"
              activeOpacity={0.9}
            >
              <View className="flex-row items-center">
                <View className="bg-purple-500 p-4 rounded-xl mr-4">
                  <Ionicons name="business" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Hospital
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    Manage operations, staff coordination, patient care
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#6b7280" />
              </View>
            </TouchableOpacity>

           
          </View>
        </View>

    

        {/* Footer */}
        <View className="px-6 pb-8">
          <Text className="text-sm text-gray-500 dark:text-gray-500 text-center">
            Secure • Private • HIPAA Compliant
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}