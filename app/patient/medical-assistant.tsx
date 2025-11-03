import { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { geminiMedicalService, MedicineSuggestion } from '@/lib/geminiService'

interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export default function MedicalAssistant() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your medical assistant. You can ask me about medicines, their uses, side effects, and general medical information. How can I help you today?',
      isUser: false,
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)



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
      // Check if it's a medical query
      if (!geminiMedicalService.isMedicalQuery(currentQuery)) {
        const nonMedicalResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: 'I can only help with medical and health-related questions. Please ask about medicines, symptoms, treatments, or general health information.',
          isUser: false,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, nonMedicalResponse])
        setIsLoading(false)
        return
      }

      // Get response from Gemini API
      const medicalResponse = await geminiMedicalService.getMedicalResponse(currentQuery)

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: medicalResponse.response,
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])

      // Add medicine suggestions if available
      if (medicalResponse.suggestions && medicalResponse.suggestions.length > 0) {
        const suggestionText = `**Medicine Suggestions:**\n\n${medicalResponse.suggestions.map(s => 
          `• **${s.name}**: ${s.description}\n  Usage: ${s.usage}`
        ).join('\n\n')}`

        const suggestionMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: suggestionText,
          isUser: false,
          timestamp: new Date()
        }

        setTimeout(() => {
          setMessages(prev => [...prev, suggestionMessage])
        }, 1000)
      }

    } catch (error) {
      console.error('Medical Assistant Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error while processing your request. Please check your internet connection and try again.',
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
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
            Medical Assistant
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Ask about medicines and health
          </Text>
        </View>
        <Ionicons name="medical" size={24} color="#3b82f6" />
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          className="flex-1 px-4 py-2"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-4 ${message.isUser ? 'items-end' : 'items-start'}`}
            >
              <View
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-blue-600 rounded-br-sm'
                    : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm'
                }`}
              >
                <Text
                  className={`${
                    message.isUser
                      ? 'text-white'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {message.text}
                </Text>
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
              <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-bl-sm">
                <Text className="text-gray-500 dark:text-gray-400">
                  Thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <View className="flex-row items-end space-x-2">
            <TextInput
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800 min-h-[48px] max-h-[120px]"
              placeholder="Ask about medicines, symptoms, or health..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}