# Emergency Services Setup Guide

## Quick Start

This guide helps you set up the Emergency Services module for your MediQ application.

---

## Step 1: Install Dependencies

All required dependencies should already be installed:

```bash
# Location services
npm install expo-location

# State management
npm install zustand

# Already included
# - firebase
# - react-native
# - expo-router
```

---

## Step 2: Request Location Permissions

Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermissions": "Allow Swasthya Setu to access your location for emergency services and hospital locating"
        }
      ]
    ],
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION"
    ]
  }
}
```

---

## Step 3: Configure Firestore Collections

### A. hospitals Collection

Create a `hospitals` collection in Firestore with the following structure:

```javascript
// Document: hospitalUserId (same as auth UID)
{
  displayName: "Apollo Hospital Delhi",
  email: "admin@apollohospital.com",
  role: "hospital",
  
  hospitalData: {
    hospitalName: "Apollo Hospital Delhi",
    hospitalLicense: "LIC-2024-001",
    hospitalType: "Multi-specialty",
    
    address: "Plot 42, Institutional Area, Sector 8, Dwarka",
    city: "Delhi",
    state: "Delhi",
    pincode: "110075",
    phoneNumber: "011-4960-5000",
    emergencyNumber: "011-4960-5050",
    
    // Emergency Services Configuration
    coordinates: {
      latitude: 28.5933,
      longitude: 77.0482
    },
    
    availableBeds: 45,
    icuBeds: 12,
    ambulancesAvailable: 3,
    
    specialties: [
      "Cardiology",
      "Neurology",
      "Emergency Medicine",
      "Trauma Surgery",
      "ICU Care"
    ],
    
    facilities: [
      "24/7 Emergency",
      "Ambulance Service",
      "Trauma Center",
      "ICU",
      "CT Scanner",
      "Ventilators"
    ],
    
    totalBeds: 200,
    accreditation: "NABH Accredited",
    establishedYear: 1995,
    isVerified: true
  },
  
  createdAt: "timestamp"
}
```

### B. emergencyAlerts Collection

Firestore will auto-create this. Structure:

```javascript
{
  patientId: "user123",
  patientName: "John Doe",
  patientPhone: "9876543210",
  type: "cardiac",
  
  severity: {
    level: "critical",
    estimatedCasualties: 1,
    affectedArea: "New Delhi"
  },
  
  latitude: 28.6139,
  longitude: 77.2090,
  address: "123 Main Street, New Delhi",
  
  description: "Patient experiencing severe chest pain",
  status: "active",
  
  respondingHospitals: ["hospital123", "hospital456"],
  ambulanceDispatched: false,
  videoStreamUrl: "stream://emergency/alert123/timestamp",
  
  createdAt: "timestamp",
  updatedAt: "timestamp",
  estimatedArrivalTime: 5
}
```

### C. notifications Collection

```javascript
{
  type: "emergency_alert",
  hospitalId: "hospital123",
  emergencyAlertId: "alert456",
  
  status: "pending", // pending, acknowledged, responded
  createdAt: "timestamp"
}
```

---

## Step 4: Set Firestore Security Rules

Go to Firestore Console → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read their own data
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Emergency Alerts Rules
    match /emergencyAlerts/{alertId} {
      // Patients can create emergencies
      allow create: if request.auth != null;
      
      // Patients can read their own, Hospitals/Doctors can read all active
      allow read: if 
        request.auth.uid == resource.data.patientId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['hospital', 'doctor', 'admin'];
      
      // Can update status if authorized
      allow update: if
        request.auth.uid == resource.data.patientId && request.resource.data.status == 'cancelled' ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['hospital', 'doctor', 'admin'];
    }
    
    // Hospitals Collection Rules
    match /hospitals/{hospitalId} {
      // Anyone authenticated can read hospitals
      allow read: if request.auth != null;
      
      // Hospital staff can update their own data
      allow update: if request.auth.uid == hospitalId;
    }
    
    // Notifications Rules
    match /notifications/{notifId} {
      allow create: if request.auth != null;
      
      // Only target hospital can read
      allow read: if 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.hospitalId == resource.data.hospitalId;
      
      allow update: if
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.hospitalId == resource.data.hospitalId;
    }
  }
}
```

---

## Step 5: Update Hospital Documents

If you already have hospital registrations, add emergency coordinates:

```javascript
// In admin console or via script
db.collection('users').doc(hospitalId).update({
  'hospitalData.coordinates': {
    latitude: 28.5933,
    longitude: 77.0482
  },
  'hospitalData.ambulancesAvailable': 3,
  'hospitalData.availableBeds': 45,
  'hospitalData.icuBeds': 12
})
```

---

## Step 6: Test Emergency Feature

### Manual Testing

1. **Grant Permissions**
   - Run app
   - Navigate to patient home page
   - Emergency dialog will request location permission
   - Grant permission when prompted

2. **Trigger Emergency**
   - Tap "SOS - Emergency" button
   - Select "Cardiac Emergency"
   - Tap "Confirm & Send Emergency Alert"
   - Verify success alert

3. **Check Hospitals**
   - Go to patient home
   - Tap "Check Emergency Services"
   - Should show list of nearby hospitals
   - Tap hospital to see details

### Automated Testing

```typescript
// Test in your app
import EmergencyService from '@/lib/emergencyService'

// Initialize emergency system
await EmergencyService.initializeEmergencySystem()

// Get location
const location = await EmergencyService.getCurrentLocation()
console.log('Current location:', location)

// Trigger test emergency
const alert = await EmergencyService.triggerEmergencyAlert(
  'test-patient-123',
  'Test Patient',
  '9876543210',
  'cardiac',
  {
    type: 'cardiac',
    description: 'Test emergency alert',
    estimatedCasualties: 1,
    affectedArea: 'Test location'
  }
)

console.log('Emergency alert created:', alert)
```

---

## Step 7: Monitor in Real-Time

### Doctor Dashboard
Doctors should see active emergencies in real-time:

```typescript
import { useEmergencyStore } from '@/stores/emergencyStore'

function DoctorAlerts() {
  const { subscribeToDoctorAlerts } = useEmergencyStore()
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToDoctorAlerts((emergencyAlerts) => {
      setAlerts(emergencyAlerts)
    })

    return () => unsubscribe()
  }, [])

  // Display alerts
}
```

### Hospital Dashboard
Hospitals receive notifications and can respond:

```typescript
import { useEmergencyStore } from '@/stores/emergencyStore'

function HospitalAlerts() {
  const { subscribeToHospitalAlerts, updateEmergencyStatus } = useEmergencyStore()
  
  const handleRespond = async (alertId: string) => {
    await updateEmergencyStatus(alertId, 'responded')
  }

  // Hospital can see and respond to alerts
}
```

---

## Step 8: Configure Video Streaming (Optional)

To enable real-time video during emergencies:

### Option A: Agora Video SDK

```bash
npm install agora-react-native-rtc
```

```typescript
// In emergencyService.ts
import AgoraRTC from 'agora-react-native-rtc'

static async startVideoStream(alertId: string) {
  try {
    // Initialize Agora
    const rtcEngine = await AgoraRTC.createRtcEngine()
    await rtcEngine.initialize({
      appId: process.env.EXPO_PUBLIC_AGORA_APP_ID!
    })

    // Join channel
    await rtcEngine.joinChannel(
      process.env.EXPO_PUBLIC_AGORA_TOKEN!,
      alertId,
      0
    )

    return `agora://${alertId}`
  } catch (error) {
    console.error('Video stream error:', error)
    throw error
  }
}
```

### Option B: Twilio Video

```bash
npm install twilio-video react-native-webrtc
```

---

## Step 9: Test with Multiple Scenarios

### Scenario 1: Single Patient Emergency
```
1. Patient triggers cardiac emergency
2. System locates patient
3. Nearby hospitals notified
4. Ambulance dispatched
5. Video stream available
```

### Scenario 2: Mass Casualty Event
```
1. Patient triggers mass casualty event
2. Enter casualty count: 15
3. Severity set to CRITICAL
4. All hospitals within 30km notified
5. Coordinate multi-hospital response
```

### Scenario 3: Disease Outbreak
```
1. Patient triggers disease outbreak
2. Enter affected area
3. Severity set to CRITICAL
4. Public health authorities notified
5. Contact tracing activated
```

---

## Troubleshooting

### Issue: Location permission denied
**Solution**: 
- Check app.json plugins configuration
- Request permission explicitly before opening emergency dialog
- Test on physical device, not simulator

### Issue: No hospitals found
**Solution**:
- Verify hospitals collection exists in Firestore
- Check hospital documents have `hospitalData.coordinates`
- Verify coordinates are valid (latitude: -90 to 90, longitude: -180 to 180)
- Increase search radius from 20km to 50km

### Issue: Emergency alert not created
**Solution**:
- Check Firebase credentials in .env file
- Verify Firestore security rules allow create
- Check network connectivity
- Review Firebase console for errors

### Issue: Video stream not available
**Solution**:
- Verify video service initialized
- Check token/API key configuration
- Test with sample video URL
- Enable cameras on both devices

---

## Performance Optimization

1. **Limit Hospital Queries**: Default 20km radius, adjust as needed
2. **Batch Notifications**: Notify top 3 hospitals only
3. **Cache Coordinates**: Store hospital coordinates locally
4. **Lazy Load Details**: Load hospital details on demand

---

## Compliance Requirements

Before production deployment:

1. ✅ HIPAA compliance for patient data
2. ✅ GDPR compliance if serving EU users
3. ✅ Local health authority integration
4. ✅ Emergency contact tracing requirements
5. ✅ Data retention policies (typically 7 years)
6. ✅ Audit logging of all emergency events

---

## Production Checklist

- [ ] Firestore security rules deployed
- [ ] All hospitals configured with coordinates and availability
- [ ] Location permissions tested on all devices
- [ ] Emergency alerts tested end-to-end
- [ ] Hospital notification tested
- [ ] Video streaming service configured (optional)
- [ ] NIC integration endpoints configured
- [ ] Error handling and fallbacks in place
- [ ] Performance tested with 100+ concurrent users
- [ ] Load testing for mass casualty scenario
- [ ] Compliance audit completed
- [ ] Backup and disaster recovery plan

---

For technical support, refer to:
- Emergency Service Documentation: `EMERGENCY_SERVICES_README.md`
- Firestore Documentation: https://firebase.google.com/docs/firestore
- Expo Location: https://docs.expo.dev/versions/latest/sdk/location/
- NIC Integration: Contact your health authority
