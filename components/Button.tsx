import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { cn } from '@/lib/utils'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className
}: ButtonProps) {
  const baseStyles = 'rounded-lg items-center justify-center'
  
  const variantStyles = {
    primary: 'bg-blue-600 active:bg-blue-700',
    secondary: 'bg-gray-600 active:bg-gray-700',
    outline: 'border-2 border-blue-600 bg-transparent',
    ghost: 'bg-transparent'
  }

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4'
  }

  const textVariantStyles = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-blue-600',
    ghost: 'text-blue-600'
  }

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'opacity-50',
        className
      )}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'secondary' ? '#ffffff' : '#2563eb'}
          size="small"
        />
      ) : (
        <Text className={cn('font-semibold', textVariantStyles[variant], textSizeStyles[size])}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}

