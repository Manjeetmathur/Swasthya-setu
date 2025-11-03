import { TextInput, Text, View } from 'react-native'
import { cn } from '@/lib/utils'

interface InputProps {
  label?: string
  placeholder?: string
  value: string
  onChangeText: (text: string) => void
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  error?: string
  disabled?: boolean
  multiline?: boolean
  numberOfLines?: number
  className?: string
}

export default function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  className
}: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        className={cn(
          'border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-gray-100',
          'text-base',
          error && 'border-red-500',
          disabled && 'opacity-50',
          multiline && 'min-h-[100px]',
          className
        )}
        placeholderTextColor="#9ca3af"
      />
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  )
}

