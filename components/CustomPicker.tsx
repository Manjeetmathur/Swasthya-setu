import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface PickerOption<T> {
  label: string
  value: T
}

interface CustomPickerProps<T extends string> {
  selectedValue: T
  onValueChange: (value: T) => void
  options: PickerOption<T>[]
  placeholder?: string
  className?: string
}

export default function CustomPicker<T extends string>({
  selectedValue,
  onValueChange,
  options,
  placeholder = 'Select...',
  className = ''
}: CustomPickerProps<T>) {
  const [modalVisible, setModalVisible] = useState(false)
  
  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between ${className}`}
      >
        <Text className="text-gray-900 dark:text-white flex-1">
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            className="bg-white dark:bg-gray-800 rounded-t-3xl max-h-[70%]"
          >
            <View className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Option
              </Text>
            </View>
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  onPress={() => {
                    onValueChange(option.value)
                    setModalVisible(false)
                  }}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between ${
                    option.value === selectedValue ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <Text className={`text-base ${
                    option.value === selectedValue
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {option.label}
                  </Text>
                  {option.value === selectedValue && (
                    <Ionicons name="checkmark" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

