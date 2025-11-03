import { create } from 'zustand'
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CallData {
  id: string
  patientId: string
  doctorId: string
  patientName: string
  doctorName: string
  appointmentId?: string
  status: 'initiating' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed'
  startTime: Timestamp
  endTime?: Timestamp
  duration?: number
  callType: 'video' | 'audio'
}

interface CallStore {
  activeCalls: CallData[]
  incomingCall: CallData | null
  currentCall: CallData | null
  isLoading: boolean
  
  // Actions
  initiateCall: (patientId: string, doctorId: string, patientName: string, doctorName: string, appointmentId?: string) => Promise<string>
  answerCall: (callId: string) => Promise<void>
  declineCall: (callId: string) => Promise<void>
  endCall: (callId: string) => Promise<void>
  subscribeToIncomingCalls: (userId: string, userType: 'patient' | 'doctor') => () => void
  setCurrentCall: (call: CallData | null) => void
  clearIncomingCall: () => void
}

export const useCallStore = create<CallStore>((set, get) => ({
  activeCalls: [],
  incomingCall: null,
  currentCall: null,
  isLoading: false,

  initiateCall: async (patientId: string, doctorId: string, patientName: string, doctorName: string, appointmentId?: string) => {
    try {
      set({ isLoading: true })
      
      const callData = {
        patientId,
        doctorId,
        patientName,
        doctorName,
        appointmentId,
        status: 'initiating' as const,
        startTime: Timestamp.now(),
        callType: 'video' as const
      }

      const docRef = await addDoc(collection(db, 'calls'), callData)
      
      // Update status to ringing
      await updateDoc(doc(db, 'calls', docRef.id), {
        status: 'ringing'
      })

      set({ isLoading: false })
      return docRef.id
    } catch (error) {
      console.error('Error initiating call:', error)
      set({ isLoading: false })
      throw error
    }
  },

  answerCall: async (callId: string) => {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'connected'
      })
      
      const { incomingCall } = get()
      if (incomingCall && incomingCall.id === callId) {
        set({ 
          currentCall: { ...incomingCall, status: 'connected' },
          incomingCall: null 
        })
      }
    } catch (error) {
      console.error('Error answering call:', error)
      throw error
    }
  },

  declineCall: async (callId: string) => {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'declined',
        endTime: Timestamp.now()
      })
      
      set({ incomingCall: null })
    } catch (error) {
      console.error('Error declining call:', error)
      throw error
    }
  },

  endCall: async (callId: string) => {
    try {
      const endTime = Timestamp.now()
      const { currentCall } = get()
      
      let duration = 0
      if (currentCall && currentCall.startTime) {
        duration = endTime.seconds - currentCall.startTime.seconds
      }

      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endTime,
        duration
      })
      
      set({ currentCall: null })
    } catch (error) {
      console.error('Error ending call:', error)
      throw error
    }
  },

  subscribeToIncomingCalls: (userId: string, userType: 'patient' | 'doctor') => {
    const field = userType === 'patient' ? 'patientId' : 'doctorId'
    
    const q = query(
      collection(db, 'calls'),
      where(field, '==', userId),
      where('status', 'in', ['ringing', 'connected']),
      orderBy('startTime', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls: CallData[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        calls.push({
          id: doc.id,
          ...data
        } as CallData)
      })

      // Find incoming call (ringing status)
      const incomingCall = calls.find(call => call.status === 'ringing')
      const currentCall = calls.find(call => call.status === 'connected')

      set({ 
        activeCalls: calls,
        incomingCall: incomingCall || null,
        currentCall: currentCall || null
      })
    })

    return unsubscribe
  },

  setCurrentCall: (call: CallData | null) => {
    set({ currentCall: call })
  },

  clearIncomingCall: () => {
    set({ incomingCall: null })
  }
}))