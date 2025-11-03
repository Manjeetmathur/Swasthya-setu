import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { getChatId } from '@/lib/helpers'
import { Ionicons } from '@expo/vector-icons'

interface Message {
  id: string
  text: string
  senderId: string
  receiverId: string
  senderName: string
  timestamp: Timestamp
}

interface Doctor {
  id: string
  displayName: string
  email: string
  doctorData: {
    specialization: string
    experience: string
    isVerified: boolean
    hospitalAffiliation?: string
  }
}

export default function PatientChat() {
  const router = useRouter()
  const { userData } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const textInputRef = useRef<TextInput>(null)

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height)
      setIsKeyboardVisible(true)
      // Scroll to bottom when keyboard opens
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

  // Load verified doctors
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const doctorsRef = collection(db, 'users')
        const q = query(doctorsRef, where('role', '==', 'doctor'))
        const snapshot = await getDocs(q)
        
        const verifiedDoctors = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(doctor => doctor.doctorData?.isVerified) as Doctor[]
        
        setDoctors(verifiedDoctors)
      } catch (error) {
        console.error('Error loading doctors:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDoctors()
  }, [])

  // Load messages when doctor is selected
  useEffect(() => {
    if (userData?.uid && selectedDoctor) {
      const messagesRef = collection(db, 'messages')
      const chatId = getChatId(userData.uid, selectedDoctor.id)
      const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        orderBy('timestamp', 'asc')
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Message[]
        setMessages(messagesList)
      })

      return () => unsubscribe()
    }
  }, [userData?.uid, selectedDoctor])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !userData || !selectedDoctor) return

    try {
      const chatId = getChatId(userData.uid, selectedDoctor.id)
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        senderId: userData.uid,
        receiverId: selectedDoctor.id,
        senderName: userData.displayName || 'Patient',
        chatId: chatId,
        timestamp: Timestamp.now()
      })
      setMessageText('')
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (!selectedDoctor) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Chat with Doctors
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-4">
          {loading ? (
            <Text className="text-gray-500 text-center py-8">Loading doctors...</Text>
          ) : doctors.length === 0 ? (
            <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 items-center mt-8">
              <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                No verified doctors available for chat
              </Text>
            </View>
          ) : (
            doctors.map((doctor) => (
              <TouchableOpacity
                key={doctor.id}
                onPress={() => setSelectedDoctor(doctor)}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 border border-gray-200 dark:border-gray-700"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mr-4">
                    <Ionicons name="person" size={24} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        Dr. {doctor.displayName}
                      </Text>
                      <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full ml-2">
                        <Text className="text-green-700 dark:text-green-300 text-xs font-medium">
                          Verified
                        </Text>
                      </View>
                    </View>
                    <Text className="text-gray-600 dark:text-gray-400 mt-1">
                      {doctor.doctorData.specialization}
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-500 text-sm">
                      {doctor.doctorData.experience} • {doctor.doctorData.hospitalAffiliation || 'Private Practice'}
                    </Text>
                  </View>
                  <Ionicons name="chatbubble-outline" size={20} color="#2563eb" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1"
        style={{
          paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0
        }}
      >
        <View className="flex-row items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={() => setSelectedDoctor(null)} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Dr. {selectedDoctor.displayName}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDoctor.doctorData.specialization}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => {
            const isMyMessage = message.senderId === userData?.uid
            return (
              <View
                key={message.id}
                className={`mb-4 ${isMyMessage ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isMyMessage
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Text
                    className={`${
                      isMyMessage ? 'text-white' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {message.text}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      isMyMessage
                        ? 'text-blue-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {message.timestamp.toDate().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <View 
          className="flex-row items-end px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ 
            paddingBottom: Platform.OS === 'android' ? Math.max(12, keyboardHeight > 0 ? 12 : 12) : 12 
          }}
        >
          <TextInput
            ref={textInputRef}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 mr-3 text-gray-900 dark:text-white min-h-[44px] max-h-[120px]"
            multiline
            textAlignVertical="top"
            onFocus={() => {
              // Scroll to bottom when input is focused
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true })
              }, 400)
            }}
            onContentSizeChange={() => {
              // Auto scroll when text expands
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
            disabled={!messageText.trim()}
            style={{
              opacity: messageText.trim() ? 1 : 0.5
            }}
          >
            <Ionicons
              name="send"
              size={18}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

