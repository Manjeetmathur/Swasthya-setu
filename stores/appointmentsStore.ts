import { create } from 'zustand'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  patientName: string
  doctorName: string
  date: Timestamp
  time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  reason: string
  notes?: string
  createdAt: Timestamp
}

interface AppointmentsState {
  appointments: Appointment[]
  isLoading: boolean
  subscribeToAppointments: (userId: string, role: 'patient' | 'doctor') => () => void
  setLoading: (isLoading: boolean) => void
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
  subscribeToAppointments: (userId: string, role: 'patient' | 'doctor') => {
    set({ isLoading: true })
    
    const appointmentsRef = collection(db, 'appointments')
    const field = role === 'patient' ? 'patientId' : 'doctorId'
    
    const unsubscribeRef: { current: (() => void) | null } = { current: null }
    let isFallbackActive = false

    const setupQuery = (useOrderBy: boolean) => {
      const q = useOrderBy
        ? query(
            appointmentsRef,
            where(field, '==', userId),
            orderBy('date', 'desc')
          )
        : query(
            appointmentsRef,
            where(field, '==', userId)
          )

      return onSnapshot(
        q,
        (snapshot) => {
          const appointments = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as Appointment[]
          
          // Sort by date descending in memory (needed for fallback, safe for ordered query too)
          appointments.sort((a, b) => {
            if (a.date && b.date) {
              return b.date.toMillis() - a.date.toMillis()
            }
            return 0
          })
          
          set({ appointments, isLoading: false })
        },
        (error: any) => {
          // If index error and we haven't tried fallback yet, switch to query without orderBy
          if (
            error?.code === 'failed-precondition' &&
            error?.message?.includes('index') &&
            !isFallbackActive
          ) {
            console.log('Index not ready, using fallback query without orderBy...')
            isFallbackActive = true
            
            // Unsubscribe from the current query
            if (unsubscribeRef.current) {
              unsubscribeRef.current()
            }
            
            // Set up fallback query
            unsubscribeRef.current = setupQuery(false)
          } else {
            console.error('Error fetching appointments:', error)
            set({ appointments: [], isLoading: false })
          }
        }
      )
    }

    // Start with ordered query
    unsubscribeRef.current = setupQuery(true)

    // Return unsubscribe function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }
}))

