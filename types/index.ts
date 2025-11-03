export interface Doctor {
  id: string
  displayName: string
  email: string
  doctorData?: {
    medicalLicense: string
    specialization: string
    experience: number
    qualifications: string
    certifications: string[]
    hospitalAffiliation?: string
    consultationFee?: number
    isVerified: boolean
  }
}

export interface Hospital {
  id: string
  hospitalData: {
    hospitalName: string
    hospitalType: string
    hospitalLicense: string
    address: string
    city: string
    state: string
    pincode: string
    phoneNumber: string
    emergencyNumber?: string
    totalBeds: number
    icuBeds?: number
    specialties: string[]
    facilities: string[]
    accreditation?: string
    establishedYear?: number
    isVerified: boolean
  }
}

export type StaffRole = 'nurse' | 'doctor' | 'technician' | 'admin' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'other'
export type StaffDepartment = 'emergency' | 'icu' | 'surgery' | 'cardiology' | 'orthopedics' | 'pediatrics' | 'radiology' | 'laboratory' | 'pharmacy' | 'administration' | 'general'

export interface Staff {
  id: string
  hospitalId: string
  name: string
  email: string
  phoneNumber: string
  employeeId: string
  role: StaffRole
  department: StaffDepartment
  designation?: string
  qualification?: string
  experience?: number
  shift?: 'morning' | 'afternoon' | 'night' | 'general'
  salary?: number
  hireDate: Date
  status: 'active' | 'inactive' | 'on_leave'
  address?: string
  emergencyContact?: {
    name: string
    phone: string
    relation: string
  }
  documents?: {
    idProof?: string
    certificates?: string[]
  }
  createdAt: Date
  updatedAt: Date
}

