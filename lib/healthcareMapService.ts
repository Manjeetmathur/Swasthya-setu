const GOOGLE_API_KEY = 'AIzaSyDvMru3f6vM1zWAtvguibtGVeqwymMaWEc';

export interface HealthcareFacility {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  type: 'pharmacy' | 'hospital' | 'clinic';
  rating?: number;
  isOpen?: boolean;
  phoneNumber?: string;
  website?: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export class HealthcareMapService {
  private static readonly RADIUS = 10000; // 10km in meters
  private static readonly BASE_URL = 'https://maps.googleapis.com/maps/api/place';

  static async fetchNearbyFacilities(
    location: LocationCoords,
    facilityType?: 'pharmacy' | 'hospital' | 'clinic'
  ): Promise<HealthcareFacility[]> {
    try {
      const { latitude, longitude } = location;
      
      // Define search keywords based on facility type
      const keywords = facilityType 
        ? [facilityType] 
        : ['pharmacy', 'hospital', 'clinic', 'medical', 'healthcare'];
      
      const keywordString = keywords.join('|');
      
      const url = `${this.BASE_URL}/nearbysearch/json?location=${latitude},${longitude}&radius=${this.RADIUS}&keyword=${keywordString}&key=${GOOGLE_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
      
      return data.results.map((place: any) => this.mapPlaceToFacility(place));
    } catch (error) {
      console.error('Error fetching nearby facilities:', error);
      throw error;
    }
  }

  static async fetchFacilitiesByType(
    location: LocationCoords
  ): Promise<{ [key: string]: HealthcareFacility[] }> {
    try {
      const [pharmacies, hospitals, clinics] = await Promise.all([
        this.fetchNearbyFacilities(location, 'pharmacy'),
        this.fetchNearbyFacilities(location, 'hospital'),
        this.fetchNearbyFacilities(location, 'clinic')
      ]);

      return {
        pharmacies,
        hospitals,
        clinics
      };
    } catch (error) {
      console.error('Error fetching facilities by type:', error);
      throw error;
    }
  }

  static async getFacilityDetails(placeId: string): Promise<any> {
    try {
      const url = `${this.BASE_URL}/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating&key=${GOOGLE_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`);
      }
      
      return data.result;
    } catch (error) {
      console.error('Error fetching facility details:', error);
      throw error;
    }
  }

  private static mapPlaceToFacility(place: any): HealthcareFacility {
    // Determine facility type based on place types or name
    let facilityType: 'pharmacy' | 'hospital' | 'clinic' = 'clinic';
    
    const types = place.types || [];
    const name = place.name?.toLowerCase() || '';
    
    if (types.includes('pharmacy') || name.includes('pharmacy') || name.includes('medical store')) {
      facilityType = 'pharmacy';
    } else if (types.includes('hospital') || name.includes('hospital') || name.includes('medical center')) {
      facilityType = 'hospital';
    } else if (types.includes('doctor') || name.includes('clinic') || name.includes('medical')) {
      facilityType = 'clinic';
    }

    return {
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address || 'Address not available',
      lat: place.geometry.location.lat,
      lon: place.geometry.location.lng,
      type: facilityType,
      rating: place.rating,
      isOpen: place.opening_hours?.open_now
    };
  }

  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}