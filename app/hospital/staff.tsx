import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

export default function StaffManagement() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Staff Management
            </Text>
            <TouchableOpacity className="bg-green-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-medium">Add Staff</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coming Soon */}
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 items-center">
            <View className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
              <Ionicons name="people-outline" size={48} color="#059669" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Staff Management
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Manage your hospital staff, roles, and schedules. This feature is coming soon!
            </Text>
            <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 w-full">
              <Text className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Upcoming Features:
              </Text>
              <View className="space-y-2">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                    Add and manage staff members
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                    Assign roles and permissions
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                    Schedule management
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <Text className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                    Performance tracking
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}