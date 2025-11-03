import * as Location from 'expo-location'

export interface LocationPermissionResult {
  granted: boolean
  error?: string
}

export class LocationService {
  /**
   * Request location permission from user
   */
  static async requestLocationPermission(): Promise<LocationPermissionResult> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      
      if (status === 'granted') {
        return { granted: true }
      } else if (status === 'denied') {
        return {
          granted: false,
          error: 'Location permission was denied. Please enable it in settings to use this app.'
        }
      } else {
        return {
          granted: false,
          error: 'Location permission is required to use this app.'
        }
      }
    } catch (error) {
      return {
        granted: false,
        error: `Failed to request location permission: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Check if location permission is granted
   */
  static async checkLocationPermission(): Promise<LocationPermissionResult> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      
      if (status === 'granted') {
        return { granted: true }
      } else {
        return {
          granted: false,
          error: 'Location permission is required to use this app.'
        }
      }
    } catch (error) {
      return {
        granted: false,
        error: `Failed to check location permission: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get current location
   */
  static async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      })
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      }
    } catch (error) {
      throw new Error(`Failed to get location: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}