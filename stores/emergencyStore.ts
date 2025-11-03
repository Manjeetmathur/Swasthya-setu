import { create } from 'zustand'
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type EmergencyType = 'cardiac' | 'accident' | 'trauma' | 'respiratory' | 'stroke' | 'allergic' | 'poisoning' | 'seizure' | 'unconscious' | 'burn' | 'choking' | 'chest_pain' | 'abdominal' | 'fracture' | 'spinal' | 'drowning' | 'electrocution' | 'severe_headache' | 'eye_injury' | 'pregnancy' | 'mental_crisis' | 'infection' | 'gunshot' | 'general'
export type EmergencyStatus = 'active' | 'responded' | 'resolved' | 'cancelled'

export interface EmergencySeverity {
  level: 'low' | 'medium' | 'high' | 'critical'
  estimatedCasualties?: number
  affectedArea?: string
}

export interface EmergencyAlert {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  type: EmergencyType
  severity: EmergencySeverity
  latitude: number
  longitude: number
  address: string
  description: string
  status: EmergencyStatus
  videoStreamUrl?: string
  respondingHospitals: string[]
  ambulanceDispatched: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  estimatedArrivalTime?: number // in minutes
}

export interface HospitalResponse {
  hospitalId: string
  hospitalName: string
  distance: number // in km
  availableBeds: number
  icuBeds: number
  ambulancesAvailable: number
  responseTime: string
  canRespond: boolean
  coordinates: {
    latitude: number
    longitude: number
  }
}

interface EmergencyState {
  activeAlert: EmergencyAlert | null
  emergencyHistory: EmergencyAlert[]
  nearbyHospitals: HospitalResponse[]
  isLoading: boolean
  error: string | null

  // Actions
  createEmergencyAlert: (
    patientId: string,
    patientName: string,
    patientPhone: string,
    type: EmergencyType,
    severity: EmergencySeverity,
    latitude: number,
    longitude: number,
    address: string,
    description: string
  ) => Promise<EmergencyAlert | null>

  updateEmergencyStatus: (alertId: string, status: EmergencyStatus) => Promise<void>
  
  getEmergencyAlert: (alertId: string) => Promise<EmergencyAlert | null>
  
  subscribeToDoctorAlerts: (callback: (alerts: EmergencyAlert[]) => void) => () => void
  
  subscribeToHospitalAlerts: (callback: (alerts: EmergencyAlert[]) => void) => () => void
  
  findNearbyHospitals: (latitude: number, longitude: number, maxDistance?: number) => Promise<HospitalResponse[]>
  
  notifyNearbyHospitals: (alertId: string, hospitals: HospitalResponse[]) => Promise<void>
  
  startVideoStream: (alertId: string) => Promise<string>
  
  endEmergency: (alertId: string) => Promise<void>
  
  cancelEmergency: (alertId: string) => Promise<void>
  
  setError: (error: string | null) => void
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  activeAlert: null,
  emergencyHistory: [],
  nearbyHospitals: [],
  isLoading: false,
  error: null,

  createEmergencyAlert: async (
    patientId,
    patientName,
    patientPhone,
    type,
    severity,
    latitude,
    longitude,
    address,
    description
  ) => {
    set({ isLoading: true, error: null })
    try {
      const newAlert = {
        patientId,
        patientName,
        patientPhone,
        type,
        severity,
        latitude,
        longitude,
        address,
        description,
        status: 'active' as EmergencyStatus,
        respondingHospitals: [],
        ambulanceDispatched: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      const docRef = await addDoc(collection(db, 'emergencyAlerts'), newAlert)
      
      const alert: EmergencyAlert = {
        id: docRef.id,
        ...newAlert
      }

      set({ activeAlert: alert })
      return alert
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create emergency alert'
      set({ error: errorMessage })
      console.error('Emergency alert creation error:', error)
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  updateEmergencyStatus: async (alertId, status) => {
    try {
      await updateDoc(doc(db, 'emergencyAlerts', alertId), {
        status,
        updatedAt: Timestamp.now()
      })
    } catch (error: any) {
      console.error('Error updating emergency status:', error)
      throw error
    }
  },

  getEmergencyAlert: async (alertId) => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'emergencyAlerts'), where('__name__', '==', alertId))
      )
      
      if (querySnapshot.empty) return null
      
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as EmergencyAlert
    } catch (error) {
      console.error('Error fetching emergency alert:', error)
      return null
    }
  },

  subscribeToDoctorAlerts: (callback) => {
    const q = query(
      collection(db, 'emergencyAlerts'),
      where('status', '==', 'active')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as EmergencyAlert))
      callback(alerts)
    })

    return unsubscribe
  },

  subscribeToHospitalAlerts: (callback) => {
    const q = query(
      collection(db, 'emergencyAlerts'),
      where('status', 'in', ['active', 'responded'])
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as EmergencyAlert))
      callback(alerts)
    })

    return unsubscribe
  },

  findNearbyHospitals: async (latitude, longitude, maxDistance = 10) => {
    set({ isLoading: true })
    try {
      const querySnapshot = await getDocs(
        collection(db, 'hospitals')
      )

      const hospitals: HospitalResponse[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const hospitalLat = data.hospitalData?.coordinates?.latitude || data.coordinates?.latitude
        const hospitalLng = data.hospitalData?.coordinates?.longitude || data.coordinates?.longitude

        if (hospitalLat && hospitalLng) {
          const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLng)

          if (distance <= maxDistance) {
            hospitals.push({
              hospitalId: doc.id,
              hospitalName: data.hospitalData?.hospitalName || data.displayName || 'Unknown Hospital',
              distance,
              availableBeds: data.hospitalData?.availableBeds || 0,
              icuBeds: data.hospitalData?.icuBeds || 0,
              ambulancesAvailable: data.hospitalData?.ambulancesAvailable || 1,
              responseTime: `${Math.ceil(distance / 40)} mins`, // Assuming avg speed 40km/h
              canRespond: (data.hospitalData?.availableBeds || 0) > 0,
              coordinates: {
                latitude: hospitalLat,
                longitude: hospitalLng
              }
            })
          }
        }
      })

      // Sort by distance
      hospitals.sort((a, b) => a.distance - b.distance)
      
      set({ nearbyHospitals: hospitals })
      return hospitals
    } catch (error: any) {
      set({ error: error.message })
      console.error('Error finding nearby hospitals:', error)
      return []
    } finally {
      set({ isLoading: false })
    }
  },

  notifyNearbyHospitals: async (alertId, hospitals) => {
    try {
      const hospitalIds = hospitals.map(h => h.hospitalId).slice(0, 3) // Top 3 closest hospitals

      await updateDoc(doc(db, 'emergencyAlerts', alertId), {
        respondingHospitals: hospitalIds,
        updatedAt: Timestamp.now()
      })

      // Create notifications for each hospital
      for (const hospitalId of hospitalIds) {
        await addDoc(collection(db, 'notifications'), {
          type: 'emergency_alert',
          hospitalId,
          emergencyAlertId: alertId,
          status: 'pending',
          createdAt: Timestamp.now()
        })
      }
    } catch (error: any) {
      console.error('Error notifying hospitals:', error)
      throw error
    }
  },

  startVideoStream: async (alertId) => {
    try {
      // This would integrate with a real video streaming service (Agora, Twilio, etc.)
      // For now, returning a placeholder stream URL
      const streamUrl = `stream://emergency/${alertId}/${Date.now()}`

      await updateDoc(doc(db, 'emergencyAlerts', alertId), {
        videoStreamUrl: streamUrl,
        updatedAt: Timestamp.now()
      })

      return streamUrl
    } catch (error: any) {
      console.error('Error starting video stream:', error)
      throw error
    }
  },

  endEmergency: async (alertId) => {
    try {
      await updateDoc(doc(db, 'emergencyAlerts', alertId), {
        status: 'resolved' as EmergencyStatus,
        updatedAt: Timestamp.now()
      })

      set({ activeAlert: null })
    } catch (error: any) {
      console.error('Error ending emergency:', error)
      throw error
    }
  },

  cancelEmergency: async (alertId) => {
    try {
      await updateDoc(doc(db, 'emergencyAlerts', alertId), {
        status: 'cancelled' as EmergencyStatus,
        updatedAt: Timestamp.now()
      })

      set({ activeAlert: null })
    } catch (error: any) {
      console.error('Error cancelling emergency:', error)
      throw error
    }
  },

  setError: (error) => set({ error })
}))

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}