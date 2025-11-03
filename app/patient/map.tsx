import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Linking, FlatList } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { HealthcareMapService, HealthcareFacility, LocationCoords } from '@/lib/healthcareMapService';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function HealthcareMapScreen() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [facilities, setFacilities] = useState<HealthcareFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'all' | 'clinic' | 'hospital' | 'pharmacy'>('all');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchCoords, setSearchCoords] = useState<LocationCoords | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearbyFacilities();
    }
  }, [location, selectedType]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show nearby healthcare facilities.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
      setLoading(false);
    }
  };

  const fetchNearbyFacilities = async () => {
    // We'll let the map handle facility discovery
    setLoading(false);
    setFacilities([]); // Clear facilities as map will show them
  };

  const fetchPlaceSuggestions = async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}`;
      
      const response = await fetch(autocompleteUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setSuggestions(data.predictions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchLocation(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchPlaceSuggestions(text);
    }, 300);
  };

  const selectSuggestion = async (suggestion: PlaceSuggestion) => {
    setSearchLocation(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    
    try {
      setLoading(true);
      
      // Use Google Geocoding API to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(suggestion.description)}&key=AIzaSyDvMru3f6vM1zWAtvguibtGVeqwymMaWEc`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const coords = {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        };
        
        setSearchCoords(coords);
        setLoading(false);
      } else {
        Alert.alert('Location Not Found', 'Please try a different location name.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Search Error', 'Failed to search for location. Please try again.');
      setLoading(false);
    }
  };

  const searchForLocation = async () => {
    if (!searchLocation.trim()) return;
    setShowSuggestions(false);
    
    try {
      setLoading(true);
      
      // Use Google Geocoding API to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchLocation)}&key=AIzaSyDvMru3f6vM1zWAtvguibtGVeqwymMaWEc`;
      
      const response = await fetch(geocodeUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const coords = {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        };
        
        setSearchCoords(coords);
        setLoading(false);
      } else {
        Alert.alert('Location Not Found', 'Please try a different location name.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Search Error', 'Failed to search for location. Please try again.');
      setLoading(false);
    }
  };

  const goToCurrentLocation = async () => {
    setSearchCoords(null);
    setSearchLocation('');
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Force refresh current location
    try {
      setLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pharmacy':
        return 'medical';
      case 'hospital':
        return 'business';
      case 'clinic':
        return 'fitness';
      default:
        return 'location';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pharmacy':
        return '#10b981';
      case 'hospital':
        return '#ef4444';
      case 'clinic':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const openInMaps = (facility: HealthcareFacility) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lon}&destination_place_id=${facility.id}`;
    Linking.openURL(url);
  };

  const callFacility = (facility: HealthcareFacility) => {
    if (facility.phoneNumber) {
      Linking.openURL(`tel:${facility.phoneNumber}`);
    } else {
      Alert.alert('No Phone Number', 'Phone number not available for this facility.');
    }
  };

  const generateMapHTML = () => {
    const currentLocation = searchCoords || location;
    let baseLocation = '';
    let facilityQuery = '';
    
    // Add facility type to search query
    switch (selectedType) {
      case 'all':
        facilityQuery = '+healthcare+facilities+near+me';
        break;
      case 'clinic':
        facilityQuery = '+clinic+near+me';
        break;
      case 'hospital':
        facilityQuery = '+hospital+near+me';
        break;
      case 'pharmacy':
        facilityQuery = '+pharmacy+near+me';
        break;
    }
    
    // Build map query - keep location stable, only change facility type
    if (currentLocation) {
      baseLocation = `${currentLocation.latitude},${currentLocation.longitude}`;
      // Always center on the location coordinates, then add facility search
      return generateMapHTMLWithLocation(baseLocation, facilityQuery);
    } else if (searchLocation.trim()) {
      return generateMapHTMLWithLocation(encodeURIComponent(searchLocation), facilityQuery);
    } else {
      return generateMapHTMLWithLocation('ranchi', facilityQuery);
    }
  };

  const generateMapHTMLWithLocation = (locationQuery: string, facilityQuery: string) => {
    // Create a stable map URL that centers on location and shows facilities
    const mapUrl = `https://maps.google.com/maps?width=600&height=400&hl=en&q=${locationQuery}${facilityQuery}&t=&z=15&ie=UTF8&iwloc=near&output=embed`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; overflow: hidden; }
          
          .embed-map-responsive {
            position: relative;
            text-align: right;
            width: 100%;
            height: 100vh;
            padding-bottom: 0;
          }
          
          .embed-map-container {
            overflow: hidden;
            background: none !important;
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
          }
          
          .embed-map-frame {
            width: 100% !important;
            height: 100% !important;
            position: absolute;
            top: 0;
            left: 0;
            border: none;
          }
          
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: Arial, sans-serif;
            color: #666;
            z-index: 10;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">Loading map...</div>
        <div class="embed-map-responsive">
    }      <div class="embed-map-container">
            <iframe 
              class="embed-map-frame" 
              frameborder="0" 
              scrolling="no" 
              marginheight="0" 
              marginwidth="0" 
              src="${mapUrl}"
              onload="document.getElementById('loading').style.display='none'"
              onerror="document.getElementById('loading').innerHTML='Failed to load map'">
            </iframe>
          </div>
        </div>
        
        <script>
          // Hide loading after a timeout as fallback
          setTimeout(() => {
    const       const loading = document.getElementById('loading');
            if (loading) {
              loading.style.display = 'none';
            }
          }, 3000);
          
          // Send message to React Native that map is ready
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage('mapLoaded:true');
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    const message = event.nativeEvent.data;
    
    if (message.startsWith('directions:')) {
      const coords = message.replace('directions:', '');
      const [lat, lon] = coords.split(',');
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
      Linking.openURL(url);
    } else if (message.startsWith('mapLoaded:')) {
      console.log('Map loaded successfully');
      // Map is ready, you can add any additional logic here
    }
  };

  const TabButton = ({ type, label, icon }: { type: 'all' | 'clinic' | 'hospital' | 'pharmacy'; label: string; icon: string }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        selectedType === type && styles.tabButtonActive
      ]}
      onPress={() => setSelectedType(type)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={selectedType === type ? '#ffffff' : '#6b7280'} 
        style={styles.tabIcon}
      />
      <Text style={[
        styles.tabButtonText,
        selectedType === type && styles.tabButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-outline" size={64} color="#6b7280" />
        <Text style={styles.errorText}>Unable to get your location</Text>
        <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Healthcare Map</Text>
        <Text style={styles.headerSubtitle}>
          Find nearby pharmacies, hospitals, and clinics
        </Text>
      </View>

      {/* Location Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location (e.g., Ranchi, Delhi, Mumbai)"
            value={searchLocation}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={searchForLocation}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            returnKeyType="search"
          />
          {searchLocation.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchLocation('');
              setSuggestions([]);
              setShowSuggestions(false);
            }} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={searchForLocation}
          disabled={!searchLocation.trim()}
        >
          <Ionicons name="navigate" size={18} color="#ffffff" />
        </TouchableOpacity>
        
        {searchCoords && (
          <TouchableOpacity 
            style={styles.currentLocationButton} 
            onPress={() => {
              setSearchCoords(null);
              setSearchLocation('');
            }}
          >
            <Ionicons name="location" size={18} color="#2563eb" />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => selectSuggestion(item)}
              >
                <Ionicons name="location-outline" size={16} color="#6b7280" style={styles.suggestionIcon} />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionMainText}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.suggestionSecondaryText}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton type="all" label="All" icon="location" />
        <TabButton type="clinic" label="Clinics" icon="fitness" />
        <TabButton type="hospital" label="Hospitals" icon="business" />
        <TabButton type="pharmacy" label="Pharmacy" icon="medical" />
      </View>

      {/* Map Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading nearby facilities...</Text>
        </View>
      ) : location ? (
        <View style={styles.mapWrapper}>
          <WebView
            source={{ html: generateMapHTML() }}
            style={styles.mapContainer}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
              Alert.alert('Map Error', 'Failed to load map. Please check your internet connection.');
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error: ', nativeEvent);
            }}
            onLoadStart={() => console.log('WebView load started')}
            onLoadEnd={() => console.log('WebView load ended')}
            renderLoading={() => (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading map...</Text>
              </View>
            )}
          />
          
          {/* Floating Location Button */}
          <TouchableOpacity 
            style={styles.floatingLocationButton}
            onPress={goToCurrentLocation}
          >
            <Ionicons name="locate" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={64} color="#6b7280" />
          <Text style={styles.emptyText}>Unable to get your location</Text>
          <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    marginTop: 18,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  clearButton: {
    marginLeft: 6,
  },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#6b7280',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tabIcon: {
    marginRight: 4,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  mapContainer: {
    flex: 1,
  },
  floatingLocationButton: {
    position: 'absolute',
    bottom: 80,
    right: 12,
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});