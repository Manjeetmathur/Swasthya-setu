# Emergency Services Integration Guide

## Overview

The Emergency Services module provides comprehensive emergency response capabilities for the MediQ hackathon prototype, enabling rapid response to urgent medical situations through:

- **One-Tap Emergency Alerts**: Instant SOS activation with automatic location sharing
- **Real-Time Video Triage**: Live video streaming for remote triage assessment
- **Hospital Coordination**: Automated coordination with nearby hospitals via NIC integration
- **Multi-Scenario Support**: Handles various emergency types (accidents, trauma, cardiac, respiratory, mass casualties, outbreaks)

---

## Features

### 1. **Emergency Alert System**

#### Supported Emergency Types:
- **Cardiac Emergency**: Heart attack or chest pain (CRITICAL severity)
- **Trauma/Injury**: Accidents or severe injuries (HIGH severity)
- **Respiratory Emergency**: Difficulty breathing (HIGH severity)
- **Traffic/Road Accident**: Vehicle accidents (HIGH severity)
- **Mass Casualty Event**: Multiple people affected (CRITICAL severity)
- **Disease Outbreak**: Contagious disease spread (CRITICAL severity)
- **General Emergency**: Other medical emergencies (MEDIUM severity)

#### Alert Flow:
```
1. Patient triggers emergency → Automatic location acquisition
2. Emergency details captured → Severity level determined
3. Nearby hospitals located → Hospitals within 20km identified
4. Auto-notification sent → Top 3 closest hospitals notified
5. Video stream initiated → Real-time triage assessment enabled
6. SOS distributed → Emergency contacts notified
```

### 2. **Hospital Coordination (NIC Integration)**

The system integrates with hospital databases to:

- **Find Nearby Resources**: Identifies hospitals within configurable radius (default: 20km)
- **Check Availability**: Queries real-time bed availability and ambulance status
- **Calculate ETA**: Estimates response time based on distance and traffic
- **Coordinate Response**: Sends alerts to multiple hospitals for faster response

#### Hospital Response Data:
```typescript
interface HospitalResponse {
  hospitalId: string
  hospitalName: string
  distance: number // in km
  availableBeds: number
  icuBeds: number
  ambulancesAvailable: number
  responseTime: string // e.g., "5 mins"
  canRespond: boolean
  coordinates: { latitude: number; longitude: number }
}
```

### 3. **Real-Time Video Streaming**

- One-click video stream initiation for immediate triage
- Enables remote medical professionals to assess severity
- Supports real-time data transmission to hospitals
- Integration point for video platforms (Agora, Twilio, etc.)

### 4. **Location-Based Services**

- **GPS Positioning**: Accurate location tracking with high precision (Best for Navigation)
- **Reverse Geocoding**: Automatic address conversion from coordinates
- **Distance Calculation**: Uses Haversine formula for accurate distance measurement
- **Directions Integration**: One-tap navigation to hospitals via Google Maps

---

## File Structure

```
stores/
├── emergencyStore.ts              # Zustand store for emergency state management
│
lib/
├── emergencyService.ts            # Core emergency service logic
│
components/
├── EmergencyDialog.tsx            # Emergency type selection & details input
├── EmergencyAlert.tsx             # Active emergency status display
└── EmergencyServicesSection.tsx   # Home page emergency section
│
app/patient/
├── home.tsx                       # Updated with emergency integration
└── emergency-services.tsx         # Detailed hospital listings & ambulance requests
```

---

## Usage

### For Patients (Emergency Trigger)

1. **Tap SOS Button** on home page
2. **Select Emergency Type** from dialog
3. **Add Optional Details**:
   - Description of situation
   - Estimated casualty count (for mass events)
4. **Confirm & Send** - Alert is immediately dispatched

```typescript
// Example: Triggering an emergency
const alert = await EmergencyService.triggerEmergencyAlert(
  patientId,
  patientName,
  patientPhone,
  'cardiac', // emergency type
  {
    type: 'cardiac',
    description: 'Experiencing severe chest pain',
    estimatedCasualties: 1,
    affectedArea: 'Current location'
  }
);
```

### For Hospitals (Response Management)

1. **Receive Emergency Notification** in real-time
2. **View Emergency Details** including patient info and location
3. **Watch Video Triage** if stream is available
4. **Dispatch Ambulance** via integrated system
5. **Update Status** (responded/resolved)

```typescript
// Example: Hospital responding to emergency
const alert = await store.getEmergencyAlert(alertId);
await store.updateEmergencyStatus(alertId, 'responded');
await EmergencyService.updateEmergencyWithNICNotification(
  alertId,
  'responded',
  hospitalId,
  hospitalName
);
```

### For Doctors (Alert Monitoring)

Doctors receive real-time alerts on active emergencies and can:
- View patient location and medical details
- Access live video stream for triage
- Provide remote guidance to paramedics
- Update emergency status

---

## Database Schema

### emergencyAlerts Collection

```typescript
interface EmergencyAlert {
  id: string // Auto-generated
  patientId: string
  patientName: string
  patientPhone: string
  type: EmergencyType
  severity: {
    level: 'low' | 'medium' | 'high' | 'critical'
    estimatedCasualties?: number
    affectedArea?: string
  }
  latitude: number
  longitude: number
  address: string
  description: string
  status: 'active' | 'responded' | 'resolved' | 'cancelled'
  videoStreamUrl?: string
  respondingHospitals: string[] // Hospital IDs
  ambulanceDispatched: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  estimatedArrivalTime?: number // in minutes
}
```

### notifications Collection

```typescript
interface EmergencyNotification {
  id: string
  type: 'emergency_alert'
  hospitalId: string
  emergencyAlertId: string
  status: 'pending' | 'acknowledged' | 'resolved'
  createdAt: Timestamp
}
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Emergency Alerts - Patients can create, view own; Hospitals/Doctors can view all active
    match /emergencyAlerts/{document=**} {
      allow create: if request.auth != null;
      allow read: if 
        request.auth.token.patientId == resource.data.patientId || 
        request.auth.token.role in ['hospital', 'doctor', 'admin'];
      allow update: if 
        request.auth.token.role in ['hospital', 'doctor', 'admin'] ||
        (request.auth.token.patientId == resource.data.patientId && 
         request.resource.data.status in ['cancelled']);
    }

    // Notifications - Only target hospital can read
    match /notifications/{document=**} {
      allow create: if request.auth.token.role in ['system', 'admin'];
      allow read: if request.auth.token.hospitalId == resource.data.hospitalId;
      allow update: if request.auth.token.hospitalId == resource.data.hospitalId;
    }

    // Hospitals - Any authenticated user can read
    match /hospitals/{document=**} {
      allow read: if request.auth != null;
      allow update: if 
        request.auth.token.role == 'hospital' &&
        request.auth.token.hospitalId == document;
    }
  }
}
```

---

## NIC Integration

The National Incident Command (NIC) integration enables:

1. **Incident Logging**: All emergency events are logged with timestamps and locations
2. **Resource Coordination**: Automatic coordination of ambulances and hospital resources
3. **Mass Event Management**: Special handling for mass casualty and outbreak scenarios
4. **Data Sharing**: Secure transmission of emergency data to government health authorities
5. **Status Tracking**: Real-time tracking of emergency resolution

### Implementation Notes:

- Replace placeholder logging with actual NIC API endpoints
- Secure all communications with HTTPS and authentication tokens
- Implement data encryption for sensitive patient information
- Add audit logging for compliance requirements

---

## Location Permissions

Required permissions in `app.json`:

```json
{
  "plugins": [
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermissions": "Allow Swasthya Setu to access your location for emergency services"
      }
    ]
  ]
}
```

---

## Testing Emergency Scenarios

### Test 1: Cardiac Emergency
1. Open home page → SOS → Select "Cardiac Emergency"
2. Verify: Location captured, address resolved
3. Confirm: Nearby hospitals found and notified

### Test 2: Mass Casualty
1. SOS → Select "Mass Casualty"
2. Add casualty count (e.g., 15)
3. Verify: Severity set to CRITICAL
4. Confirm: Multiple hospitals receive alerts

### Test 3: Hospital Response
1. Hospital dashboard receives emergency notification
2. Hospital accepts response
3. Verify: Status updated to "responded"
4. Video stream available for triage

### Test 4: Video Triage
1. Emergency triggered
2. Doctor can access video stream URL
3. Verify: Real-time assessment possible

---

## Future Enhancements

- [ ] Real-time ambulance tracking via GPS
- [ ] Voice call integration for immediate communication
- [ ] AI-powered severity prediction
- [ ] Integration with SMS/WhatsApp alerts
- [ ] Ambulance ETA countdown display
- [ ] Emergency contact list management
- [ ] Medical history quick access during emergency
- [ ] Offline emergency alert capability
- [ ] Multi-language support
- [ ] Integration with government emergency response systems

---

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| Location permission denied | User didn't grant permission | Request permission when opening emergency dialog |
| No hospitals found | Network error or no hospitals in area | Show offline mode alert, fallback to 112 |
| Video stream failed to start | Stream server unavailable | Retry after 2-3 seconds or proceed without video |
| Emergency alert creation failed | Firestore quota/error | Queue alert locally, retry when online |

---

## Security Considerations

1. **Patient Privacy**: Emergency data is encrypted end-to-end
2. **Location Accuracy**: Only used during active emergency
3. **Data Retention**: Emergency records kept per regulatory requirements
4. **Access Control**: Strict role-based access to sensitive data
5. **Audit Trail**: All actions logged for compliance

---

## Support

For issues or questions:
1. Check Firestore console for error logs
2. Verify Firestore security rules are properly set
3. Test with sample emergency data
4. Check network connectivity and location permissions
5. Review Firebase console for quota/billing issues

---

## License

This emergency services module is part of the MediQ hackathon prototype and follows the same license as the main application.