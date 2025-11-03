import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { useBedManagementStore } from '@/stores/bedManagementStore'
import Button from '@/components/Button'

export default function BedManagement() {
  const { userData } = useAuthStore()
  const { 
    beds, 
    subscribeToBeds, 
    updateBedStatus, 
    addBed, 
    getBedStats,
    isLoading
  } = useBedManagementStore()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBedNumber, setNewBedNumber] = useState('')
  const [newBedType, setNewBedType] = useState<'general' | 'icu'>('general')
  const [newBedWard, setNewBedWard] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userData?.hospitalData) {
      const unsubscribe = subscribeToBeds(undefined, userData.uid)
      return unsubscribe
    }
  }, [userData])

  const handleAddBed = async () => {
    if (!newBedNumber.trim() || !newBedWard.trim()) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (!userData?.hospitalData) return

    setLoading(true)
    try {
      await addBed({
        bedNumber: newBedNumber.trim(),
        type: newBedType,
        ward: newBedWard.trim(),
        status: 'available',
        patientId: null,
        patientName: null,
        admissionDate: null,
        hospitalId: userData.uid
      })
      
      setShowAddModal(false)
      setNewBedNumber('')
      setNewBedWard('')
      setNewBedType('general')
      Alert.alert('Success', 'Bed added successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to add bed')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBedStatus = async (bedId: string, newStatus: 'available' | 'occupied' | 'maintenance') => {
    if (!userData?.hospitalData) return

    try {
      await updateBedStatus(bedId, newStatus)
      Alert.alert('Success', 'Bed status updated successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to update bed status')
    }
  }

  const getBedStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return { bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle' }
      case 'occupied':
        return { bg: '#fef3c7', text: '#92400e', icon: 'person' }
      case 'maintenance':
        return { bg: '#fee2e2', text: '#991b1b', icon: 'construct' }
      default:
        return { bg: '#f3f4f6', text: '#374151', icon: 'help-circle' }
    }
  }

  const groupedBeds = beds.reduce((acc, bed) => {
    if (!acc[bed.ward]) {
      acc[bed.ward] = []
    }
    acc[bed.ward].push(bed)
    return acc
  }, {} as Record<string, typeof beds>)

  const bedStats = getBedStats()
  const icuBeds = beds.filter(bed => bed.type === 'icu')
  const availableICUBeds = icuBeds.filter(bed => bed.status === 'available').length

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Bed Management
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-purple-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Add Bed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View className="px-6 py-4">
          <View className="flex-row flex-wrap gap-3">
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[45%]">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {bedStats.total}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                Total Beds
              </Text>
            </View>
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[45%]">
              <Text className="text-2xl font-bold text-green-600">
                {bedStats.available}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                Available
              </Text>
            </View>
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[45%]">
              <Text className="text-2xl font-bold text-yellow-600">
                {bedStats.occupied}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                Occupied
              </Text>
            </View>
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex-1 min-w-[45%]">
              <Text className="text-2xl font-bold text-red-600">
                {availableICUBeds}/{icuBeds.length}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                ICU Available
              </Text>
            </View>
          </View>
        </View>

        {/* Beds by Ward */}
        <View className="px-6 pb-6">
          {Object.entries(groupedBeds).map(([ward, wardBeds]) => (
            <View key={ward} className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {ward} ({wardBeds.length} beds)
              </Text>
              <View className="space-y-2">
                {wardBeds.map((bed) => {
                  const statusColor = getBedStatusColor(bed.status)
                  return (
                    <View
                      key={bed.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <View
                            className="p-2 rounded-lg mr-3"
                            style={{ backgroundColor: statusColor.bg }}
                          >
                            <Ionicons 
                              name={statusColor.icon as any} 
                              size={20} 
                              color={statusColor.text} 
                            />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                                Bed {bed.bedNumber}
                              </Text>
                              {bed.type === 'icu' && (
                                <View className="ml-2 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                  <Text className="text-red-800 dark:text-red-200 text-xs font-medium">
                                    ICU
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-gray-600 dark:text-gray-400 text-sm capitalize">
                              {bed.status}
                            </Text>
                            {bed.patientName && (
                              <Text className="text-gray-800 dark:text-gray-200 text-sm">
                                Patient: {bed.patientName}
                              </Text>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Update Bed Status',
                              `Current status: ${bed.status}`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Available',
                                  onPress: () => handleUpdateBedStatus(bed.id, 'available')
                                },
                                {
                                  text: 'Occupied',
                                  onPress: () => handleUpdateBedStatus(bed.id, 'occupied')
                                },
                                {
                                  text: 'Maintenance',
                                  onPress: () => handleUpdateBedStatus(bed.id, 'maintenance')
                                }
                              ]
                            )
                          }}
                          className="p-2"
                        >
                          <Ionicons name="ellipsis-vertical" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Bed Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-1">
            <View className="flex-row justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Add New Bed
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-4">
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bed Number
                  </Text>
                  <TextInput
                    value={newBedNumber}
                    onChangeText={setNewBedNumber}
                    placeholder="Enter bed number"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ward
                  </Text>
                  <TextInput
                    value={newBedWard}
                    onChangeText={setNewBedWard}
                    placeholder="Enter ward name"
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bed Type
                  </Text>
                  <View className="flex-row space-x-4">
                    <TouchableOpacity
                      onPress={() => setNewBedType('general')}
                      className={`flex-1 p-3 rounded-lg border ${
                        newBedType === 'general'
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          newBedType === 'general'
                            ? 'text-purple-600'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        General
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setNewBedType('icu')}
                      className={`flex-1 p-3 rounded-lg border ${
                        newBedType === 'icu'
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          newBedType === 'icu'
                            ? 'text-purple-600'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        ICU
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View className="p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                title="Add Bed"
                onPress={handleAddBed}
                loading={loading}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}