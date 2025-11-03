import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useCallStore } from '@/stores/callStore'
import IncomingCall from './IncomingCall'

export default function CallManager() {
  const { userData, isLoading } = useAuthStore()
  const { incomingCall, subscribeToIncomingCalls, clearIncomingCall } = useCallStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Add a small delay to ensure navigation is ready
    const timer = setTimeout(() => {
      setIsMounted(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isMounted && !isLoading && userData?.uid && userData?.role) {
      const unsubscribe = subscribeToIncomingCalls(userData.uid, userData.role === 'doctor' ? 'doctor' : 'patient')
      return unsubscribe
    }
  }, [isMounted, isLoading, userData?.uid, userData?.role, subscribeToIncomingCalls])

  const handleAnswerCall = () => {
    // The IncomingCall component will handle the answer logic
  }

  const handleDeclineCall = () => {
    clearIncomingCall()
  }

  // Only show incoming call if we're not already in a call screen and app is ready
  if (isMounted && !isLoading && incomingCall && userData?.role) {
    return (
      <IncomingCall
        call={incomingCall}
        userType={userData.role === 'doctor' ? 'doctor' : 'patient'}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
      />
    )
  }

  return null
}