import { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { useStaffStore } from '@/stores/staffStore'
import { Staff, StaffRole, StaffDepartment } from '@/types'
import CustomPicker from '@/components/CustomPicker'

const ROLE_LABELS: Record<StaffRole, string> = {
  nurse: 'Nurse',
  doctor: 'Doctor',
  technician: 'Technician',
  admin: 'Administrator',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  other: 'Other'
}

const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  emergency: 'Emergency',
  icu: 'ICU',
  surgery: 'Surgery',
  cardiology: 'Cardiology',
  orthopedics: 'Orthopedics',
  pediatrics: 'Pediatrics',
  radiology: 'Radiology',
  laboratory: 'Laboratory',
  pharmacy: 'Pharmacy',
  administration: 'Administration',
  general: 'General'
}

const STATUS_COLORS: Record<'active' | 'inactive' | 'on_leave', string> = {
  active: '#10b981',
  inactive: '#ef4444',
  on_leave: '#f59e0b'
}

export default function StaffManagement() {
  const { userData } = useAuthStore()
  const { 
    staff, 
    isLoading, 
    error,
    subscribeToStaff, 
    addStaff, 
    updateStaff, 
    deleteStaff,
    getStaffStats 
  } = useStaffStore()
  
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<StaffRole | 'all'>('all')
  const [filterDepartment, setFilterDepartment] = useState<StaffDepartment | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'on_leave'>('all')

  // Form state
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    email: '',
    phoneNumber: '',
    employeeId: '',
    role: 'nurse',
    department: 'general',
    status: 'active',
    hireDate: new Date(),
  })

  useEffect(() => {
    if (userData?.uid) {
      const unsubscribe = subscribeToStaff(userData.uid)
      return unsubscribe
    }
  }, [userData?.uid])

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleAddStaff = async () => {
    if (!userData?.uid) return

    if (!formData.name || !formData.email || !formData.phoneNumber || !formData.employeeId) {
      Alert.alert('Error', 'Please fill all required fields')
      return
    }

    try {
      await addStaff(userData.uid, {
        ...formData,
        hireDate: formData.hireDate || new Date(),
      } as any)
      
      Alert.alert('Success', 'Staff member added successfully')
      setShowAddModal(false)
      resetForm()
    } catch (error) {
      Alert.alert('Error', 'Failed to add staff member')
    }
  }

  const handleUpdateStaff = async () => {
    if (!selectedStaff) return

    try {
      await updateStaff(selectedStaff.id, formData)
      Alert.alert('Success', 'Staff member updated successfully')
      setShowEditModal(false)
      resetForm()
    } catch (error) {
      Alert.alert('Error', 'Failed to update staff member')
    }
  }

  const handleDeleteStaff = (staff: Staff) => {
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete ${staff.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStaff(staff.id)
              Alert.alert('Success', 'Staff member deleted successfully')
            } catch (error) {
              Alert.alert('Error', 'Failed to delete staff member')
            }
          }
        }
      ]
    )
  }

  const handleEditStaff = (staff: Staff) => {
    setSelectedStaff(staff)
    setFormData({
      name: staff.name,
      email: staff.email,
      phoneNumber: staff.phoneNumber,
      employeeId: staff.employeeId,
      role: staff.role,
      department: staff.department,
      designation: staff.designation,
      qualification: staff.qualification,
      experience: staff.experience,
      shift: staff.shift,
      salary: staff.salary,
      hireDate: staff.hireDate,
      status: staff.status,
      address: staff.address,
    })
    setShowEditModal(true)
  }

  const handleViewDetails = (staff: Staff) => {
    setSelectedStaff(staff)
    setShowDetailModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      employeeId: '',
      role: 'nurse',
      department: 'general',
      status: 'active',
      hireDate: new Date(),
    })
    setSelectedStaff(null)
  }

  const filteredStaff = staff.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = filterRole === 'all' || member.role === filterRole
    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  })

  const stats = getStaffStats()

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Staff Management
            </Text>
            <TouchableOpacity
              onPress={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text className="text-white font-medium ml-1">Add Staff</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 flex-row items-center">
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              placeholder="Search staff..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-gray-900 dark:text-white"
            />
          </View>
        </View>

        {/* Statistics */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Overview
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700" style={{ width: '48%' }}>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">Total Staff</Text>
            </View>
            <View className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800" style={{ width: '48%' }}>
              <Text className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.active}
              </Text>
              <Text className="text-green-600 dark:text-green-400 text-sm">Active</Text>
            </View>
            <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800" style={{ width: '48%' }}>
              <Text className="text-2xl font-bold text-red-700 dark:text-red-300">
                {stats.inactive}
              </Text>
              <Text className="text-red-600 dark:text-red-400 text-sm">Inactive</Text>
            </View>
            <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800" style={{ width: '48%' }}>
              <Text className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {stats.onLeave}
              </Text>
              <Text className="text-yellow-600 dark:text-yellow-400 text-sm">On Leave</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View className="px-6 py-2">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <CustomPicker
                selectedValue={filterRole}
                onValueChange={(value) => setFilterRole(value)}
                options={[
                  { label: 'All Roles', value: 'all' as StaffRole | 'all' },
                  ...Object.entries(ROLE_LABELS).map(([key, label]) => ({
                    label,
                    value: key as StaffRole
                  }))
                ]}
              />
            </View>
            <View className="flex-1">
              <CustomPicker
                selectedValue={filterDepartment}
                onValueChange={(value) => setFilterDepartment(value)}
                options={[
                  { label: 'All Departments', value: 'all' as StaffDepartment | 'all' },
                  ...Object.entries(DEPARTMENT_LABELS).map(([key, label]) => ({
                    label,
                    value: key as StaffDepartment
                  }))
                ]}
              />
            </View>
            <View className="flex-1">
              <CustomPicker
                selectedValue={filterStatus}
                onValueChange={(value) => setFilterStatus(value)}
                options={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'On Leave', value: 'on_leave' }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Staff List */}
        <View className="px-6 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Staff Members ({filteredStaff.length})
          </Text>

          {isLoading && staff.length === 0 ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#9333ea" />
              <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading staff...</Text>
            </View>
          ) : filteredStaff.length === 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-lg p-8 items-center border border-gray-200 dark:border-gray-700">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center">
                {searchQuery || filterRole !== 'all' || filterDepartment !== 'all' || filterStatus !== 'all'
                  ? 'No staff members found matching your criteria'
                  : 'No staff members yet. Add your first staff member!'}
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {filteredStaff.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => handleViewDetails(member)}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {member.name}
                        </Text>
                        <View
                          className="ml-2 px-2 py-1 rounded-full"
                          style={{ backgroundColor: `${STATUS_COLORS[member.status]}20` }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: STATUS_COLORS[member.status] }}
                          >
                            {member.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {ROLE_LABELS[member.role]} • {DEPARTMENT_LABELS[member.department]}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        ID: {member.employeeId} • {member.email}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleEditStaff(member)}
                        className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                      >
                        <Ionicons name="create-outline" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteStaff(member)}
                        className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddModal(false)
          resetForm()
        }}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <StaffForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleAddStaff}
            onCancel={() => {
              setShowAddModal(false)
              resetForm()
            }}
            title="Add Staff Member"
          />
        </SafeAreaView>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowEditModal(false)
          resetForm()
        }}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <StaffForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleUpdateStaff}
            onCancel={() => {
              setShowEditModal(false)
              resetForm()
            }}
            title="Edit Staff Member"
          />
        </SafeAreaView>
      </Modal>

      {/* Staff Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          {selectedStaff && <StaffDetailView staff={selectedStaff} onClose={() => setShowDetailModal(false)} />}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// Staff Form Component
function StaffForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  title
}: {
  formData: Partial<Staff>
  setFormData: (data: Partial<Staff>) => void
  onSave: () => void
  onCancel: () => void
  title: string
}) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">{title}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter full name"
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter email"
              keyboardType="email-address"
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number *
            </Text>
            <TextInput
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Employee ID *
            </Text>
            <TextInput
              value={formData.employeeId}
              onChangeText={(text) => setFormData({ ...formData, employeeId: text })}
              placeholder="Enter employee ID"
              className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </Text>
            <CustomPicker
              selectedValue={formData.role || 'nurse'}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              options={Object.entries(ROLE_LABELS).map(([key, label]) => ({
                label,
                value: key as StaffRole
              }))}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department *
            </Text>
            <CustomPicker
              selectedValue={formData.department || 'general'}
              onValueChange={(value) => setFormData({ ...formData, department: value })}
              options={Object.entries(DEPARTMENT_LABELS).map(([key, label]) => ({
                label,
                value: key as StaffDepartment
              }))}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status *
            </Text>
            <CustomPicker
              selectedValue={formData.status || 'active'}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'On Leave', value: 'on_leave' }
              ]}
            />
          </View>
        </View>
      </ScrollView>

      <View className="flex-row gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
        <TouchableOpacity
          onPress={onCancel}
          className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-3 items-center"
        >
          <Text className="text-gray-900 dark:text-white font-semibold">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          className="flex-1 bg-green-600 rounded-lg p-3 items-center"
        >
          <Text className="text-white font-semibold">Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// Staff Detail View Component
function StaffDetailView({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Staff Details</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {staff.name}
            </Text>
            <View
              className="px-3 py-1 rounded-full self-start"
              style={{ backgroundColor: `${STATUS_COLORS[staff.status]}20` }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: STATUS_COLORS[staff.status] }}
              >
                {staff.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View className="space-y-3">
            <DetailRow label="Employee ID" value={staff.employeeId} />
            <DetailRow label="Email" value={staff.email} />
            <DetailRow label="Phone" value={staff.phoneNumber} />
            <DetailRow label="Role" value={ROLE_LABELS[staff.role]} />
            <DetailRow label="Department" value={DEPARTMENT_LABELS[staff.department]} />
            {staff.designation && <DetailRow label="Designation" value={staff.designation} />}
            {staff.qualification && <DetailRow label="Qualification" value={staff.qualification} />}
            {staff.experience && <DetailRow label="Experience" value={`${staff.experience} years`} />}
            {staff.shift && <DetailRow label="Shift" value={staff.shift.charAt(0).toUpperCase() + staff.shift.slice(1)} />}
            <DetailRow label="Hire Date" value={staff.hireDate.toLocaleDateString()} />
            {staff.address && <DetailRow label="Address" value={staff.address} />}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row py-2 border-b border-gray-200 dark:border-gray-700">
      <Text className="text-gray-600 dark:text-gray-400 w-32">{label}:</Text>
      <Text className="text-gray-900 dark:text-white flex-1">{value}</Text>
    </View>
  )
}
