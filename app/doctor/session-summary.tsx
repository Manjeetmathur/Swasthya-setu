import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '@/stores/authStore'
import { CallData } from '@/stores/callStore'
import { usePrescriptionStore, Medication } from '@/stores/prescriptionStore'
import { useBedManagementStore } from '@/stores/bedManagementStore'
import Button from '@/components/Button'
import { Ionicons } from '@expo/vector-icons'

export default function SessionSummary() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { callId, patientId, patientName, appointmentId } = params
  
  const { userData } = useAuthStore()
  const { createPrescription, isLoading: isCreatingPrescription } = usePrescriptionStore()
  const { 
    checkBedAvailability, 
    bookBed, 
    subscribeToBeds,
    isLoading: isBedLoading 
  } = useBedManagementStore()

  const [call, setCall] = useState<CallData | null>(null)
  const [activeTab, setActiveTab] = useState<'prescription' | 'bed'>('prescription')
  
  // Prescription state
  const [medications, setMedications] = useState<Medication[]>([{ name: '', dosage: '', frequency: '', duration: '' }])
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [showAddMedication, setShowAddMedication] = useState(false)
  
  // Bed state
  const [showBedModal, setShowBedModal] = useState(false)
  const [availableBeds, setAvailableBeds] = useState<any[]>([])
  const [selectedBed, setSelectedBed] = useState<string | null>(null)
  const [bedUrgency, setBedUrgency] = useState<'normal' | 'urgent' | 'emergency'>('normal')
  const [bedReason, setBedReason] = useState('')

  // Helper function to safely convert timestamp to Date
  const getDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null
    if (timestamp instanceof Date) return timestamp
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate()
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000)
    }
    return new Date(timestamp)
  }

  useEffect(() => {
    // Create call object from params
    if (callId && patientId && patientName && userData) {
      const callData: CallData = {
        id: callId as string,
        patientId: patientId as string,
        doctorId: userData.uid,
        patientName: patientName as string,
        doctorName: userData.displayName || 'Doctor',
        appointmentId: appointmentId as string || undefined,
        status: 'ended',
        startTime: new Date() as any,
        endTime: new Date() as any,
        callType: 'video'
      }
      setCall(callData)
    }

    // Subscribe to beds
    const unsubscribe = subscribeToBeds()
    
    return () => {
      unsubscribe()
    }
  }, [callId, patientId, patientName, appointmentId, userData, subscribeToBeds])

  useEffect(() => {
    // Check bed availability when bed tab is opened
    if (activeTab === 'bed') {
      const beds = checkBedAvailability()
      setAvailableBeds(beds)
    }
  }, [activeTab, checkBedAvailability])

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }])
  }

  const handleRemoveMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index))
    }
  }

  const handleUpdateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  const handleCreatePrescription = async () => {
    if (!call || !userData) return

    // Validate medications
    const validMedications = medications.filter(
      med => med.name && med.dosage && med.frequency && med.duration
    )

    if (validMedications.length === 0) {
      Alert.alert('Error', 'Please add at least one medication')
      return
    }

    try {
      await createPrescription(
        call.patientId,
        call.doctorId,
        call.patientName,
        call.doctorName,
        validMedications,
        diagnosis || undefined,
        notes || undefined,
        call.id,
        call.appointmentId
      )
      
      Alert.alert('Success', 'Prescription created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to create prescription')
    }
  }

  const handleBookBed = async () => {
    if (!call || !userData || !selectedBed) {
      Alert.alert('Error', 'Please select a bed')
      return
    }

    const bed = availableBeds.find(b => b.id === selectedBed)
    if (!bed) return

    try {
      await bookBed(
        call.patientId,
        call.doctorId,
        call.patientName,
        call.doctorName,
        bed.id,
        bed.ward,
        bed.department,
        bedUrgency,
        bedReason || undefined,
        call.appointmentId,
        call.id
      )

      Alert.alert(
        'Success', 
        bedUrgency === 'emergency' 
          ? 'Bed booked and approved immediately (Emergency)' 
          : 'Bed booking request submitted',
        [
          { text: 'OK', onPress: () => {
            setShowBedModal(false)
            router.back()
          }}
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to book bed')
    }
  }

  if (!call) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading session data...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Session Summary
        </Text>
      </View>

      {/* Patient Info */}
      <View className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Patient: {call.patientName}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Session ended at {call.endTime ? getDateFromTimestamp(call.endTime)?.toLocaleString() || 'N/A' : 'N/A'}
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity
          onPress={() => setActiveTab('prescription')}
          className={`flex-1 py-4 items-center ${
            activeTab === 'prescription'
              ? 'border-b-2 border-blue-600'
              : ''
          }`}
        >
          <Text className={`font-semibold ${
            activeTab === 'prescription'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Prescription
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('bed')}
          className={`flex-1 py-4 items-center ${
            activeTab === 'bed'
              ? 'border-b-2 border-blue-600'
              : ''
          }`}
        >
          <Text className={`font-semibold ${
            activeTab === 'bed'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            Bed Booking
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Prescription Tab */}
        {activeTab === 'prescription' && (
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Prescription
            </Text>

            {/* Medications */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  Medications
                </Text>
                <TouchableOpacity
                  onPress={handleAddMedication}
                  className="bg-blue-600 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Add</Text>
                </TouchableOpacity>
              </View>

              {medications.map((med, index) => (
                <View
                  key={index}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      Medication {index + 1}
                    </Text>
                    {medications.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveMedication(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    placeholder="Medication name"
                    value={med.name}
                    onChangeText={(text) => handleUpdateMedication(index, 'name', text)}
                    className="bg-white dark:bg-gray-700 rounded-lg px-4 py-3 mb-2 text-gray-900 dark:text-white"
                  />
                  <TextInput
                    placeholder="Dosage (e.g., 500mg)"
                    value={med.dosage}
                    onChangeText={(text) => handleUpdateMedication(index, 'dosage', text)}
                    className="bg-white dark:bg-gray-700 rounded-lg px-4 py-3 mb-2 text-gray-900 dark:text-white"
                  />
                  <TextInput
                    placeholder="Frequency (e.g., Twice daily)"
                    value={med.frequency}
                    onChangeText={(text) => handleUpdateMedication(index, 'frequency', text)}
                    className="bg-white dark:bg-gray-700 rounded-lg px-4 py-3 mb-2 text-gray-900 dark:text-white"
                  />
                  <TextInput
                    placeholder="Duration (e.g., 7 days)"
                    value={med.duration}
                    onChangeText={(text) => handleUpdateMedication(index, 'duration', text)}
                    className="bg-white dark:bg-gray-700 rounded-lg px-4 py-3 mb-2 text-gray-900 dark:text-white"
                  />
                  <TextInput
                    placeholder="Instructions (optional)"
                    value={med.instructions || ''}
                    onChangeText={(text) => handleUpdateMedication(index, 'instructions', text)}
                    className="bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                    multiline
                  />
                </View>
              ))}
            </View>

            {/* Diagnosis */}
            <View className="mb-4">
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                Diagnosis
              </Text>
              <TextInput
                placeholder="Enter diagnosis"
                value={diagnosis}
                onChangeText={setDiagnosis}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                multiline
              />
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                Additional Notes
              </Text>
              <TextInput
                placeholder="Enter any additional notes"
                value={notes}
                onChangeText={setNotes}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                multiline
              />
            </View>

            <Button
              title="Create Prescription"
              onPress={handleCreatePrescription}
              loading={isCreatingPrescription}
            />
          </View>
        )}

        {/* Bed Tab */}
        {activeTab === 'bed' && (
          <View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Check Bed Availability
            </Text>

            {isBedLoading ? (
              <Text className="text-gray-500 text-center py-8">Checking bed availability...</Text>
            ) : availableBeds.length === 0 ? (
              <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center">
                <Ionicons name="bed-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                  No beds available at the moment
                </Text>
              </View>
            ) : (
              <>
                <View className="mb-4">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    Available Beds: {availableBeds.length}
                  </Text>
                </View>

                {availableBeds.slice(0, 5).map((bed) => (
                  <TouchableOpacity
                    key={bed.id}
                    onPress={() => {
                      setSelectedBed(bed.id)
                      setShowBedModal(true)
                    }}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          Bed {bed.bedNumber}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400 mt-1">
                          {bed.ward} - {bed.department}
                        </Text>
                      </View>
                      <Ionicons name="bed" size={24} color="#2563eb" />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Bed Booking Modal */}
            <Modal
              visible={showBedModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowBedModal(false)}
            >
              <View className="flex-1 bg-black/50 items-center justify-end">
                <View className="w-full bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-[80%]">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-xl font-bold text-gray-900 dark:text-white">
                      Book Bed
                    </Text>
                    <TouchableOpacity onPress={() => setShowBedModal(false)}>
                      <Ionicons name="close" size={24} color="#374151" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView>
                    {selectedBed && (
                      <View className="mb-4">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                          Selected Bed
                        </Text>
                        <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <Text className="text-gray-900 dark:text-white">
                            {availableBeds.find(b => b.id === selectedBed)?.bedNumber} - 
                            {availableBeds.find(b => b.id === selectedBed)?.ward}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View className="mb-4">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                        Urgency
                      </Text>
                      <View className="flex-row gap-2">
                        {(['normal', 'urgent', 'emergency'] as const).map((urgency) => (
                          <TouchableOpacity
                            key={urgency}
                            onPress={() => setBedUrgency(urgency)}
                            className={`flex-1 px-4 py-3 rounded-lg ${
                              bedUrgency === urgency
                                ? urgency === 'emergency'
                                  ? 'bg-red-600'
                                  : urgency === 'urgent'
                                  ? 'bg-orange-600'
                                  : 'bg-blue-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          >
                            <Text className={`text-center font-semibold ${
                              bedUrgency === urgency
                                ? 'text-white'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View className="mb-6">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                        Reason for Bed Booking
                      </Text>
                      <TextInput
                        placeholder="Enter reason"
                        value={bedReason}
                        onChangeText={setBedReason}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
                        multiline
                      />
                    </View>

                    <Button
                      title={bedUrgency === 'emergency' ? "Book Immediately" : "Request Bed"}
                      onPress={handleBookBed}
                    />

                    <TouchableOpacity
                      onPress={() => setShowBedModal(false)}
                      className="mt-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700"
                    >
                      <Text className="text-center font-semibold text-gray-900 dark:text-white">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

