import { create } from 'zustand'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface Prescription {
  id: string
  patientId: string
  doctorId: string
  patientName: string
  doctorName: string
  callId?: string
  appointmentId?: string
  medications: Medication[]
  diagnosis?: string
  notes?: string
  createdAt: Timestamp
}

interface PrescriptionStore {
  prescriptions: Prescription[]
  isLoading: boolean
  
  createPrescription: (
    patientId: string,
    doctorId: string,
    patientName: string,
    doctorName: string,
    medications: Medication[],
    diagnosis?: string,
    notes?: string,
    callId?: string,
    appointmentId?: string
  ) => Promise<string>
  
  subscribeToPrescriptions: (userId: string, role: 'patient' | 'doctor') => () => void
}

export const usePrescriptionStore = create<PrescriptionStore>((set, get) => ({
  prescriptions: [],
  isLoading: false,

  createPrescription: async (
    patientId,
    doctorId,
    patientName,
    doctorName,
    medications,
    diagnosis,
    notes,
    callId,
    appointmentId
  ) => {
    try {
      set({ isLoading: true })
      
      const prescriptionData = {
        patientId,
        doctorId,
        patientName,
        doctorName,
        medications,
        diagnosis: diagnosis || '',
        notes: notes || '',
        callId: callId || null,
        appointmentId: appointmentId || null,
        createdAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, 'prescriptions'), prescriptionData)
      
      set({ isLoading: false })
      return docRef.id
    } catch (error) {
      console.error('Error creating prescription:', error)
      set({ isLoading: false })
      throw error
    }
  },

  subscribeToPrescriptions: (userId: string, role: 'patient' | 'doctor') => {
    set({ isLoading: true })
    
    const field = role === 'patient' ? 'patientId' : 'doctorId'
    const prescriptionsRef = collection(db, 'prescriptions')
    
    const q = query(
      prescriptionsRef,
      where(field, '==', userId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const prescriptions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Prescription[]
        
        set({ prescriptions, isLoading: false })
      },
      (error) => {
        console.error('Error fetching prescriptions:', error)
        set({ prescriptions: [], isLoading: false })
      }
    )

    return unsubscribe
  }
}))

