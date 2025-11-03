import { useEmergencyStore, EmergencyType, EmergencySeverity, EmergencyAlert } from '@/stores/emergencyStore'
import * as Location from 'expo-location'
import { LocationService } from '@/lib/locationService'
import { Alert } from 'react-native'

export interface EmergencyDetails {
  type: EmergencyType
  description: string
  estimatedCasualties?: number
  affectedArea?: string
}

class EmergencyService {
  /**
   * Initialize emergency response system
   */
  static async initializeEmergencySystem() {
    try {
      // Check if location permissions are already granted
      const permission = await LocationService.checkLocationPermission()
      if (!permission.granted) {
        console.warn('Location permission denied')
        return false
      }
      return true
    } catch (error) {
      console.error('Error initializing emergency system:', error)
      return false
    }
  }

  /**
   * Get current location with high accuracy
   */
  static async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      })
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      }
    } catch (error) {
      console.error('Error getting location:', error)
      throw new Error(`Failed to get emergency location: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get address from coordinates using reverse geocoding
   */
  static async getAddressFromCoordinates(latitude: number, longitude: number) {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      })

      if (results.length > 0) {
        const address = results[0]
        return `${address.street}, ${address.city}, ${address.region} ${address.postalCode}`
      }
      return `${latitude}, ${longitude}`
    } catch (error) {
      console.error('Error getting address:', error)
      return `${latitude}, ${longitude}`
    }
  }

  /**
   * Determine emergency severity based on type and details
   */
  static determineSeverity(type: EmergencyType, details: EmergencyDetails): EmercencySeverity {
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low'
    let estimatedCasualties = 1
    let affectedArea = 'Unknown'

    switch (type) {
      case 'cardiac':
        level = 'critical'
        estimatedCasualties = 1
        affectedArea = 'Current location'
        break

      case 'trauma':
        level = 'high'
        estimatedCasualties = 1
        affectedArea = 'Current location'
        break

      case 'respiratory':
        level = 'high'
        estimatedCasualties = 1
        affectedArea = 'Current location'
        break

      case 'general':
      default:
        level = 'medium'
        estimatedCasualties = 1
        affectedArea = details.affectedArea || 'Unknown'
    }

    return {
      level,
      estimatedCasualties,
      affectedArea
    }
  }

  /**
   * Initiate one-tap emergency alert
   */
  static async triggerEmergencyAlert(
    patientId: string,
    patientName: string,
    patientPhone: string,
    type: EmergencyType,
    details: EmergencyDetails
  ): Promise<EmergencyAlert | null> {
    try {
      const store = useEmergencyStore.getState()

      // Get current location
      const location = await this.getCurrentLocation()

      // Get address
      const address = await this.getAddressFromCoordinates(location.latitude, location.longitude)

      // Determine severity
      const severity = this.determineSeverity(type, details)

      // Create emergency alert
      const alert = await store.createEmergencyAlert(
        patientId,
        patientName,
        patientPhone,
        type,
        severity,
        location.latitude,
        location.longitude,
        address,
        details.description
      )

      if (alert) {
        // Find nearby hospitals
        const nearbyHospitals = await store.findNearbyHospitals(
          location.latitude,
          location.longitude,
          15 // 15km radius
        )

        // Notify nearby hospitals
        if (nearbyHospitals.length > 0) {
          await store.notifyNearbyHospitals(alert.id, nearbyHospitals)
        }

        return alert
      }

      return null
    } catch (error) {
      console.error('Error triggering emergency alert:', error)
      throw error
    }
  }

  /**
   * Start real-time video stream for triage
   */
  static async startVideoStream(alertId: string) {
    try {
      const store = useEmergencyStore.getState()
      return await store.startVideoStream(alertId)
    } catch (error) {
      console.error('Error starting video stream:', error)
      throw error
    }
  }

  /**
   * Get emergency response summary for hospital dashboard
   */
  static async getEmergencyResponseSummary(alertId: string) {
    try {
      const store = useEmergencyStore.getState()
      const alert = await store.getEmergencyAlert(alertId)

      if (!alert) return null

      return {
        emergencyId: alertId,
        type: alert.type,
        severity: alert.severity,
        patientInfo: {
          name: alert.patientName,
          phone: alert.patientPhone
        },
        location: {
          address: alert.address,
          latitude: alert.latitude,
          longitude: alert.longitude
        },
        description: alert.description,
        status: alert.status,
        videoStreamUrl: alert.videoStreamUrl,
        respondingHospitals: alert.respondingHospitals,
        createdAt: alert.createdAt,
        estimatedArrivalTime: alert.estimatedArrivalTime
      }
    } catch (error) {
      console.error('Error getting emergency response summary:', error)
      return null
    }
  }

  /**
   * Update emergency status with NIC notification
   */
  static async updateEmergencyWithNICNotification(
    alertId: string,
    status: 'responded' | 'resolved' | 'cancelled',
    hospitalId: string,
    hospitalName: string
  ) {
    try {
      const store = useEmergencyStore.getState()

      // Update emergency status
      await store.updateEmergencyStatus(alertId, status)

      // NIC Integration: Log the event
      console.log(`[NIC Integration] Hospital ${hospitalName} (${hospitalId}) - Status: ${status}`)

      // In a real implementation, this would send data to National Incident Command system
      // via secure HTTPS endpoint with authentication

      return true
    } catch (error) {
      console.error('Error updating emergency with NIC notification:', error)
      throw error
    }
  }

  /**
   * Get emergency history for patient
   */
  static async getEmergencyHistory(patientId: string) {
    try {
      // This would query Firestore for the patient's emergency history
      // Implementation depends on Firestore structure
      return []
    } catch (error) {
      console.error('Error fetching emergency history:', error)
      return []
    }
  }

  /**
   * Cancel ongoing emergency
   */
  static async cancelEmergency(alertId: string) {
    try {
      const store = useEmergencyStore.getState()
      await store.cancelEmergency(alertId)
      return true
    } catch (error) {
      console.error('Error cancelling emergency:', error)
      throw error
    }
  }

  /**
   * Resolve emergency
   */
  static async resolveEmergency(alertId: string, resolutionNotes: string) {
    try {
      const store = useEmergencyStore.getState()
      await store.endEmergency(alertId)
      // In real implementation, save resolution notes to Firestore
      return true
    } catch (error) {
      console.error('Error resolving emergency:', error)
      throw error
    }
  }

  /**
   * Send SOS to emergency contacts
   */
  static async sendSOSNotification(
    patientName: string,
    patientPhone: string,
    location: { address: string; latitude: number; longitude: number },
    emergencyType: EmergencyType
  ) {
    try {
      // In real implementation, send SMS/push notifications to emergency contacts
      console.log(`[SOS] Emergency notification for ${patientName}`)
      console.log(`Location: ${location.address}`)
      console.log(`Type: ${emergencyType}`)
      return true
    } catch (error) {
      console.error('Error sending SOS notification:', error)
      throw error
    }
  }

  /**
   * Check if emergency services are available in the area
   */
  static async checkEmergencyServicesAvailability(latitude: number, longitude: number) {
    try {
      const store = useEmergencyStore.getState()
      const hospitals = await store.findNearbyHospitals(latitude, longitude, 20)

      return {
        emergencyServicesAvailable: hospitals.length > 0,
        nearestService: hospitals[0] || null,
        servicesWithin20km: hospitals.length,
        avgResponseTime: hospitals.length > 0 ? hospitals[0].responseTime : 'N/A'
      }
    } catch (error) {
      console.error('Error checking emergency services:', error)
      return {
        emergencyServicesAvailable: false,
        nearestService: null,
        servicesWithin20km: 0,
        avgResponseTime: 'N/A'
      }
    }
  }
}

export default EmergencyService

interface EmercencySeverity {
  level: 'low' | 'medium' | 'high' | 'critical'
  estimatedCasualties?: number
  affectedArea?: string
}