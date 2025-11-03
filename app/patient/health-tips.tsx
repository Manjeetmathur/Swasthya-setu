import { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { geminiMedicalService } from '@/lib/geminiService'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

const MarkdownText = ({ text, isUser }: { text: string; isUser: boolean }) => {
  const parseMarkdown = (content: string) => {
    const parts: (string | { type: 'bold'; text: string })[] = []
    let currentIndex = 0
    
    const boldRegex = /\*\*(.*?)\*\*/g
    let match
    
    while ((match = boldRegex.exec(content)) !== null) {
      if (match.index > currentIndex) {
        parts.push(content.substring(currentIndex, match.index))
      }
      parts.push({ type: 'bold', text: match[1] })
      currentIndex = match.index + match[0].length
    }
    
    if (currentIndex < content.length) {
      parts.push(content.substring(currentIndex))
    }
    
    if (parts.length === 0) {
      parts.push(content)
    }
    
    return parts
  }
  
  const lines = text.split('\n')
  
  return (
    <View>
      {lines.map((line, lineIndex) => {
        if (!line.trim()) {
          return <Text key={lineIndex} style={{ height: 8 }} />
        }
        
        const isBullet = /^[-•]\s+/.test(line) || /^\*\s+/.test(line)
        const cleanLine = line.replace(/^[-•*]\s+/, '')
        const parts = parseMarkdown(cleanLine)
        
        return (
          <View key={lineIndex} style={{ flexDirection: 'row', marginBottom: lineIndex < lines.length - 1 ? 4 : 0 }}>
            {isBullet && (
              <Text style={{ color: isUser ? '#ffffff' : '#6b7280', marginRight: 8, fontSize: 16 }}>
                •
              </Text>
            )}
            <Text
              className={isUser ? 'text-white' : 'text-gray-900 dark:text-white'}
              style={{
                flex: 1,
                flexWrap: 'wrap',
                lineHeight: 20,
              }}
            >
              {parts.map((part, partIndex) => {
                if (typeof part === 'string') {
                  return <Text key={partIndex}>{part}</Text>
                } else {
                  return (
                    <Text key={partIndex} style={{ fontWeight: 'bold' }}>
                      {part.text}
                    </Text>
                  )
                }
              })}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export default function HealthTips() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m here to provide health and wellness tips. Ask me about nutrition, exercise, preventive care, or general wellness advice.',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const textInputRef = useRef<TextInput>(null)

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
      setIsKeyboardVisible(true)
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 150)
    })

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0)
      setIsKeyboardVisible(false)
    })

    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
      if (Platform.OS === 'ios') {
        setKeyboardHeight(e.endCoordinates.height)
        setIsKeyboardVisible(true)
      }
    })

    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      if (Platform.OS === 'ios') {
        setKeyboardHeight(0)
        setIsKeyboardVisible(false)
      }
    })

    return () => {
      keyboardDidShowListener?.remove()
      keyboardDidHideListener?.remove()
      keyboardWillShowListener?.remove()
      keyboardWillHideListener?.remove()
    }
  }, [])

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentQuery = inputText.trim()
    setInputText('')
    setIsLoading(true)

    try {
      const medicalResponse = await geminiMedicalService.getMedicalResponse(currentQuery, 'health-tips')

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: medicalResponse.response,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)

    } catch (error: any) {
      console.error('Health Tips Error:', error)
      let errorMessage = 'Sorry, I encountered an error. Please check your internet connection and try again.'
      
      if (error?.message?.includes('API key')) {
        errorMessage = 'API configuration error. Please check your Gemini API key.'
      } else if (error?.message?.includes('model')) {
        errorMessage = 'Model error. Please check if Gemini 2.0 Flash is available.'
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.'
      }
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#6b7280" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Health Tips
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Wellness & lifestyle advice
          </Text>
        </View>
        <Ionicons name="heart" size={24} color="#10b981" />
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-2"
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingBottom: Platform.OS === 'android' ? keyboardHeight : 20 
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (isKeyboardVisible) {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }, 100)
            }
          }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-4 ${message.isUser ? 'items-end' : 'items-start'}`}
            >
              <View
                className={`w-[70%] p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-600 rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm'
                }`}
              >
                {message.isUser ? (
                  <Text
                    className="text-white"
                    style={{ lineHeight: 20 }}
                  >
                    {message.text}
                  </Text>
                ) : (
                  <MarkdownText text={message.text} isUser={false} />
                )}
                <Text
                  className={`text-xs mt-1 ${
                    message.isUser
                      ? 'text-blue-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
          ))}
          
          {isLoading && (
            <View className="items-start mb-4">
              <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-bl-sm flex-row items-center">
                <ActivityIndicator size="small" color="#6b7280" style={{ marginRight: 8 }} />
                <Text className="text-gray-500 dark:text-gray-400">
                  AI is thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View 
          className="flex-row items-end px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ 
            paddingBottom: Platform.OS === 'android' ? 12 : 12 
          }}
        >
          <TextInput
            ref={textInputRef}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask for health tips (e.g., diet, exercise, sleep...)"
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 mr-3 text-gray-900 dark:text-white min-h-[44px] max-h-[120px]"
            multiline
            maxLength={500}
            textAlignVertical="top"
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
            blurOnSubmit={false}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }, 400)
            }}
            onContentSizeChange={() => {
              if (isKeyboardVisible) {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true })
                }, 100)
              }
            }}
            style={{
              fontSize: 16,
              lineHeight: 20,
            }}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            className="bg-blue-600 rounded-full p-3 mb-1"
            disabled={!inputText.trim() || isLoading}
            style={{
              opacity: (inputText.trim() && !isLoading) ? 1 : 0.5
            }}
          >
            <Ionicons
              name="send"
              size={18}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

