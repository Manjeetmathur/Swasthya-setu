import { create } from 'zustand'
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  Timestamp,
  orderBy 
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Staff, StaffRole, StaffDepartment } from '@/types'

interface StaffState {
  staff: Staff[]
  isLoading: boolean
  error: string | null

  // Actions
  subscribeToStaff: (hospitalId: string) => () => void
  addStaff: (
    hospitalId: string,
    staffData: Omit<Staff, 'id' | 'hospitalId' | 'createdAt' | 'updatedAt'>
  ) => Promise<string | null>
  updateStaff: (
    staffId: string,
    updates: Partial<Omit<Staff, 'id' | 'hospitalId' | 'createdAt'>>
  ) => Promise<void>
  deleteStaff: (staffId: string) => Promise<void>
  getStaffByRole: (role: StaffRole) => Staff[]
  getStaffByDepartment: (department: StaffDepartment) => Staff[]
  getActiveStaff: () => Staff[]
  getStaffStats: () => {
    total: number
    active: number
    inactive: number
    onLeave: number
    byRole: Record<StaffRole, number>
    byDepartment: Record<StaffDepartment, number>
  }
  setError: (error: string | null) => void
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: [],
  isLoading: false,
  error: null,

  subscribeToStaff: (hospitalId) => {
    set({ isLoading: true })
    
    const q = query(
      collection(db, 'staff'),
      where('hospitalId', '==', hospitalId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const staffList: Staff[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          staffList.push({
            id: doc.id,
            ...data,
            hireDate: data.hireDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Staff)
        })
        set({ staff: staffList, isLoading: false, error: null })
      },
      (error) => {
        console.error('Error fetching staff:', error)
        set({ error: error.message, isLoading: false })
      }
    )

    return unsubscribe
  },

  addStaff: async (hospitalId, staffData) => {
    set({ isLoading: true, error: null })
    try {
      const newStaff = {
        ...staffData,
        hospitalId,
        hireDate: Timestamp.fromDate(staffData.hireDate || new Date()),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      const docRef = await addDoc(collection(db, 'staff'), newStaff)
      return docRef.id
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add staff member'
      set({ error: errorMessage, isLoading: false })
      console.error('Error adding staff:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  updateStaff: async (staffId, updates) => {
    set({ isLoading: true, error: null })
    try {
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now(),
      }

      // Convert Date fields to Timestamp
      if (updates.hireDate) {
        updateData.hireDate = Timestamp.fromDate(updates.hireDate)
      }

      await updateDoc(doc(db, 'staff', staffId), updateData)
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update staff member'
      set({ error: errorMessage, isLoading: false })
      console.error('Error updating staff:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  deleteStaff: async (staffId) => {
    set({ isLoading: true, error: null })
    try {
      await deleteDoc(doc(db, 'staff', staffId))
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete staff member'
      set({ error: errorMessage, isLoading: false })
      console.error('Error deleting staff:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  getStaffByRole: (role) => {
    return get().staff.filter((s) => s.role === role)
  },

  getStaffByDepartment: (department) => {
    return get().staff.filter((s) => s.department === department)
  },

  getActiveStaff: () => {
    return get().staff.filter((s) => s.status === 'active')
  },

  getStaffStats: () => {
    const staff = get().staff
    const stats = {
      total: staff.length,
      active: staff.filter((s) => s.status === 'active').length,
      inactive: staff.filter((s) => s.status === 'inactive').length,
      onLeave: staff.filter((s) => s.status === 'on_leave').length,
      byRole: {} as Record<StaffRole, number>,
      byDepartment: {} as Record<StaffDepartment, number>,
    }

    // Initialize counters
    const roles: StaffRole[] = ['nurse', 'doctor', 'technician', 'admin', 'receptionist', 'pharmacist', 'lab_technician', 'other']
    const departments: StaffDepartment[] = ['emergency', 'icu', 'surgery', 'cardiology', 'orthopedics', 'pediatrics', 'radiology', 'laboratory', 'pharmacy', 'administration', 'general']

    roles.forEach((role) => {
      stats.byRole[role] = staff.filter((s) => s.role === role).length
    })

    departments.forEach((dept) => {
      stats.byDepartment[dept] = staff.filter((s) => s.department === dept).length
    })

    return stats
  },

  setError: (error) => set({ error }),
}))

