import { create } from 'zustand'
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface QueueEntry {
  id: string
  patientId: string
  doctorId: string
  patientName: string
  doctorName: string
  appointmentId?: string
  callId?: string
  queueNumber: number
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  department?: string
  priority: 'normal' | 'urgent' | 'emergency'
  reason?: string
  estimatedWaitTime?: number // in minutes
  createdAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
}

interface HospitalQueueStore {
  queueEntries: QueueEntry[]
  isLoading: boolean
  nextQueueNumber: number

  addToQueue: (
    patientId: string,
    doctorId: string,
    patientName: string,
    doctorName: string,
    department?: string,
    priority?: 'normal' | 'urgent' | 'emergency',
    reason?: string,
    appointmentId?: string,
    callId?: string
  ) => Promise<string>

  updateQueueStatus: (queueId: string, status: QueueEntry['status']) => Promise<void>

  subscribeToQueue: (department?: string) => () => void
}

export const useHospitalQueueStore = create<HospitalQueueStore>((set, get) => ({
  queueEntries: [],
  isLoading: false,
  nextQueueNumber: 1,

  addToQueue: async (
    patientId,
    doctorId,
    patientName,
    doctorName,
    department,
    priority = 'normal',
    reason,
    appointmentId,
    callId
  ) => {
    try {
      set({ isLoading: true })

      // Get current queue to determine next queue number
      const queueRef = collection(db, 'hospitalQueue')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = Timestamp.fromDate(today)

      const todayQueueQuery = query(
        queueRef,
        where('createdAt', '>=', todayTimestamp),
        where('status', 'in', ['waiting', 'in-progress'])
      )

      const snapshot = await getDocs(todayQueueQuery)
      
      const entries = snapshot.docs.map(doc => doc.data() as QueueEntry)
      const maxQueueNumber = entries.length > 0
        ? Math.max(...entries.map(e => e.queueNumber || 0))
        : 0
      
      const nextQueueNumber = maxQueueNumber + 1

      // Calculate estimated wait time based on queue length and priority
      const currentWaiting = entries.filter(
        q => q.status === 'waiting' && (!department || q.department === department)
      ).length
      const estimatedWaitTime = priority === 'emergency' ? 0 : 
                                  priority === 'urgent' ? currentWaiting * 5 :
                                  currentWaiting * 10

      const queueData = {
        patientId,
        doctorId,
        patientName,
        doctorName,
        queueNumber: nextQueueNumber,
        status: 'waiting' as const,
        department: department || 'general',
        priority,
        reason: reason || '',
        appointmentId: appointmentId || null,
        callId: callId || null,
        estimatedWaitTime,
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, 'hospitalQueue'), queueData)
      
      set({ isLoading: false })
      return docRef.id
    } catch (error) {
      console.error('Error adding to queue:', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateQueueStatus: async (queueId: string, status: QueueEntry['status']) => {
    try {
      const updateData: any = { status }
      
      if (status === 'in-progress') {
        updateData.startedAt = Timestamp.now()
      } else if (status === 'completed' || status === 'cancelled') {
        updateData.completedAt = Timestamp.now()
      }

      await updateDoc(doc(db, 'hospitalQueue', queueId), updateData)
    } catch (error) {
      console.error('Error updating queue status:', error)
      throw error
    }
  },

  subscribeToQueue: (department?: string) => {
    set({ isLoading: true })
    
    const queueRef = collection(db, 'hospitalQueue')
    let q
    
    if (department) {
      q = query(
        queueRef,
        where('department', '==', department),
        where('status', 'in', ['waiting', 'in-progress']),
        orderBy('createdAt', 'asc')
      )
    } else {
      q = query(
        queueRef,
        where('status', 'in', ['waiting', 'in-progress']),
        orderBy('createdAt', 'asc')
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as QueueEntry[]
        
        // Also get max queue number
        const maxNumber = entries.length > 0
          ? Math.max(...entries.map(e => e.queueNumber || 0))
          : 0
        
        set({ queueEntries: entries, nextQueueNumber: maxNumber + 1, isLoading: false })
      },
      (error) => {
        console.error('Error fetching queue:', error)
        set({ queueEntries: [], isLoading: false })
      }
    )

    return unsubscribe
  }
}))

