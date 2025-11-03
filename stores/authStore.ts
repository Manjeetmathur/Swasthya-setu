import { create } from 'zustand'
import { User } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type UserRole = 'patient' | 'doctor' | 'admin'

interface DoctorData {
  medicalLicense: string
  specialization: string
  experience: number
  qualifications: string
  certifications: string[]
  hospitalAffiliation?: string
  consultationFee?: number
  isVerified: boolean
}

interface UserData {
  uid: string
  email: string | null
  displayName: string | null
  role: UserRole
  photoURL: string | null
  doctorData?: DoctorData
}

interface AuthState {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setUserData: (userData: UserData | null) => void
  setLoading: (isLoading: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userData: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setUserData: (userData) => set({ userData }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await AsyncStorage.clear()
    set({ user: null, userData: null, isAuthenticated: false })
  }
}))

