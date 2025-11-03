import { create } from 'zustand'
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Bed {
  id: string
  bedNumber: string
  ward: string
  type: 'general' | 'icu'
  status: 'available' | 'occupied' | 'maintenance'
  patientId?: string | null
  patientName?: string | null
  admissionDate?: Timestamp | null
  hospitalId?: string
}

export interface BedBooking {
  id: string
  patientId: string
  doctorId: string
  patientName: string
  doctorName: string
  bedId: string
  bedNumber: string
  ward: string
  department: string
  reason?: string
  urgency: 'normal' | 'urgent' | 'emergency'
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requestedAt: Timestamp
  approvedAt?: Timestamp
  appointmentId?: string
  callId?: string
}

interface BedManagementStore {
  beds: Bed[]
  bookings: BedBooking[]
  availableBeds: Bed[]
  isLoading: boolean

  subscribeToBeds: (department?: string, hospitalId?: string) => () => void

  checkBedAvailability: (department?: string, urgency?: 'normal' | 'urgent' | 'emergency') => Bed[]

  bookBed: (
    patientId: string,
    doctorId: string,
    patientName: string,
    doctorName: string,
    bedId: string,
    ward: string,
    department: string,
    urgency: 'normal' | 'urgent' | 'emergency',
    reason?: string,
    appointmentId?: string,
    callId?: string
  ) => Promise<string>

  subscribeToBookings: (userId: string, role: 'patient' | 'doctor') => () => void

  // Hospital-specific functions
  addBed: (bed: Omit<Bed, 'id'>) => Promise<void>
  updateBedStatus: (bedId: string, status: Bed['status'], patientData?: { patientId?: string; patientName?: string; admissionDate?: Timestamp }) => Promise<void>
  getBedStats: () => { total: number; available: number; occupied: number; maintenance: number }
  getBedsByWard: (ward: string) => Bed[]
}

export const useBedManagementStore = create<BedManagementStore>((set, get) => ({
  beds: [],
  bookings: [],
  availableBeds: [],
  isLoading: false,

  subscribeToBeds: (department?: string, hospitalId?: string) => {
    set({ isLoading: true })
    
    const bedsRef = collection(db, 'beds')
    let q
    
    if (hospitalId && department) {
      q = query(
        bedsRef,
        where('hospitalId', '==', hospitalId),
        where('department', '==', department)
      )
    } else if (hospitalId) {
      q = query(
        bedsRef,
        where('hospitalId', '==', hospitalId)
      )
    } else if (department) {
      q = query(
        bedsRef,
        where('department', '==', department)
      )
    } else {
      q = bedsRef
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const beds = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Bed[]
        
        const available = beds.filter(bed => bed.status === 'available')
        
        set({ beds, availableBeds: available, isLoading: false })
      },
      (error) => {
        console.error('Error fetching beds:', error)
        set({ beds: [], availableBeds: [], isLoading: false })
      }
    )

    return unsubscribe
  },

  checkBedAvailability: (department?: string, urgency?: 'normal' | 'urgent' | 'emergency') => {
    const { beds } = get()
    
    let filteredBeds = beds.filter(bed => bed.status === 'available')
    
    if (department) {
      filteredBeds = filteredBeds.filter(bed => bed.department === department)
    }

    // For emergency, also show beds in maintenance that could be made available
    if (urgency === 'emergency') {
      const maintenanceBeds = beds.filter(
        bed => bed.status === 'maintenance' && (!department || bed.department === department)
      )
      filteredBeds = [...filteredBeds, ...maintenanceBeds]
    }

    return filteredBeds
  },

  bookBed: async (
    patientId,
    doctorId,
    patientName,
    doctorName,
    bedId,
    ward,
    department,
    urgency,
    reason,
    appointmentId,
    callId
  ) => {
    try {
      set({ isLoading: true })

      const bookingData = {
        patientId,
        doctorId,
        patientName,
        doctorName,
        bedId,
        bedNumber: get().beds.find(b => b.id === bedId)?.bedNumber || '',
        ward,
        department,
        urgency,
        reason: reason || '',
        status: urgency === 'emergency' ? 'approved' : 'pending',
        requestedAt: Timestamp.now(),
        appointmentId: appointmentId || null,
        callId: callId || null,
        ...(urgency === 'emergency' ? { approvedAt: Timestamp.now() } : {})
      }

      const docRef = await addDoc(collection(db, 'bedBookings'), bookingData)

      // If emergency and auto-approved, update bed status
      if (urgency === 'emergency') {
        await updateDoc(doc(db, 'beds', bedId), {
          status: 'reserved',
          patientId,
          patientName,
          reservedUntil: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)) // 24 hours
        })
      }
      
      set({ isLoading: false })
      return docRef.id
    } catch (error) {
      console.error('Error booking bed:', error)
      set({ isLoading: false })
      throw error
    }
  },

  subscribeToBookings: (userId: string, role: 'patient' | 'doctor') => {
    set({ isLoading: true })
    
    const field = role === 'patient' ? 'patientId' : 'doctorId'
    const bookingsRef = collection(db, 'bedBookings')
    
    const q = query(
      bookingsRef,
      where(field, '==', userId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as BedBooking[]
        
        set({ bookings, isLoading: false })
      },
      (error) => {
        console.error('Error fetching bookings:', error)
        set({ bookings: [], isLoading: false })
      }
    )

    return unsubscribe
  },

  // Hospital-specific functions
  addBed: async (bedData: Omit<Bed, 'id'>) => {
    try {
      set({ isLoading: true })
      await addDoc(collection(db, 'beds'), bedData)
      set({ isLoading: false })
    } catch (error) {
      console.error('Error adding bed:', error)
      set({ isLoading: false })
      throw error
    }
  },

  updateBedStatus: async (bedId: string, status: Bed['status'], patientData?: { patientId?: string; patientName?: string; admissionDate?: Timestamp }) => {
    try {
      set({ isLoading: true })
      const updateData: Partial<Bed> = { status }
      
      if (patientData) {
        updateData.patientId = patientData.patientId || null
        updateData.patientName = patientData.patientName || null
        updateData.admissionDate = patientData.admissionDate || null
      } else {
        updateData.patientId = null
        updateData.patientName = null
        updateData.admissionDate = null
      }

      await updateDoc(doc(db, 'beds', bedId), updateData)
      set({ isLoading: false })
    } catch (error) {
      console.error('Error updating bed status:', error)
      set({ isLoading: false })
      throw error
    }
  },

  getBedStats: () => {
    const { beds } = get()
    return {
      total: beds.length,
      available: beds.filter(bed => bed.status === 'available').length,
      occupied: beds.filter(bed => bed.status === 'occupied').length,
      maintenance: beds.filter(bed => bed.status === 'maintenance').length
    }
  },

  getBedsByWard: (ward: string) => {
    const { beds } = get()
    return beds.filter(bed => bed.ward === ward)
  }
}))

