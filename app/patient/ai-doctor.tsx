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

// Component to render markdown-formatted text from Gemini
const MarkdownText = ({ text, isUser }: { text: string; isUser: boolean }) => {
  // Simple markdown parser for bold, bullets, and line breaks
  const parseMarkdown = (content: string) => {
    const parts: (string | { type: 'bold'; text: string })[] = []
    let currentIndex = 0
    
    // Match **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g
    let match
    
    while ((match = boldRegex.exec(content)) !== null) {
      // Add text before bold
      if (match.index > currentIndex) {
        parts.push(content.substring(currentIndex, match.index))
      }
      // Add bold text
      parts.push({ type: 'bold', text: match[1] })
      currentIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (currentIndex < content.length) {
      parts.push(content.substring(currentIndex))
    }
    
    if (parts.length === 0) {
      parts.push(content)
    }
    
    return parts
  }
  
  // Split by newlines and process each line
  const lines = text.split('\n')
  
  return (
    <View>
      {lines.map((line, lineIndex) => {
        if (!line.trim()) {
          return <Text key={lineIndex} style={{ height: 8 }} />
        }
        
        // Check if line starts with bullet points
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

export default function AIDoctor() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI Doctor. I\'m here to help answer your health questions, provide medical guidance, and support you with general health information. How can I assist you today?',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 150)
    })

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0)
    })

    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
      if (Platform.OS === 'ios') {
        setKeyboardHeight(e.endCoordinates.height)
      }
    })

    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      if (Platform.OS === 'ios') {
        setKeyboardHeight(0)
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
    if (!inputText.trim() || isLoading) return

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
      // Get response from Gemini API in doctor mode
      const medicalResponse = await geminiMedicalService.getMedicalResponse(currentQuery, 'doctor')

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: medicalResponse.response,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])
      
      // Scroll to bottom after adding message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)

    } catch (error: any) {
      console.error('AI Doctor Error:', error)
      let errorMessage = 'I apologize, but I encountered an error while processing your question. Please check your internet connection and try again.'
      
      // More specific error messages
      if (error?.message?.includes('API key')) {
        errorMessage = 'I\'m experiencing a configuration issue. Please contact support.'
      } else if (error?.message?.includes('model')) {
        errorMessage = 'I\'m temporarily unavailable. Please try again in a moment.'
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'I\'m having trouble connecting. Please check your internet connection and try again.'
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
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Doctor
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Your virtual health consultant
          </Text>
        </View>
        <View className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
          <Ionicons name="medical" size={24} color="#3b82f6" />
        </View>
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-2"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-4 ${message.isUser ? 'items-end' : 'items-start'}`}
            >
              <View
                className={`min-w-[80%] p-3 rounded-lg ${
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
                <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-gray-500 dark:text-gray-400">
                  Doctor is thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <View className="flex-row items-end space-x-2">
            <TextInput
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 min-h-[48px] max-h-[120px]"
              placeholder="Ask your health question..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`p-3 rounded-lg ${
                inputText.trim() && !isLoading
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.trim() && !isLoading ? '#ffffff' : '#9ca3af'} 
              />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            This AI Doctor provides general guidance only. For medical emergencies or serious conditions, please consult a healthcare professional immediately.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

