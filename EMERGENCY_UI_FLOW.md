# Emergency Services - UI Flow & Screens

## 🎨 User Interface Flow

### Patient Journey

```
PATIENT HOME SCREEN
┌─────────────────────────────────┐
│ Welcome back, John              │
│                      [Logout]   │
├─────────────────────────────────┤
│ Quick Actions                   │
│ ┌────────────┬────────────┐     │
│ │ Appointment│    Chat    │     │
│ └────────────┴────────────┘     │
├─────────────────────────────────┤
│ ⚠️ EMERGENCY SERVICES           │
│ ┌─────────────────────────────┐ │
│ │  🚨 SOS - EMERGENCY         │ │
│ │  One-tap alert to hospitals │ │
│ │              [  ➜  ]       │ │
│ └─────────────────────────────┘ │
│ ┌──────────┬──────────┬────────┐ │
│ │  Accident│ Mass    │Outbreak│ │
│ │  Alert   │ Casualty│ Alert  │ │
│ └──────────┴──────────┴────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 📍 Check Emergency Services │ │
│ │ View nearby hospitals & ETA │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ AI Health Assistant             │ 
│ Medical Assistant | Medicine... │
├─────────────────────────────────┤
│ Upcoming Appointments           │
│ Dr. Smith - Dec 15 at 2:00 PM   │
│ [CONFIRMED]                     │
└─────────────────────────────────┘
        │
        │ User clicks SOS
        ▼
```

---

## 📋 Emergency Dialog Screens

### Screen 1: Emergency Type Selection

```
EMERGENCY DIALOG - STEP 1
┌──────────────────────────────────┐
│ Emergency Services          [✕]   │
├──────────────────────────────────┤
│                                  │
│ Select Emergency Type            │
│ Choose the type of emergency     │
│                                  │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ ❤️ Cardiac Emergency          │ │
│ │ Heart attack or chest pain    │ │
│ │              [➜]             │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ⚠️ Trauma/Injury             │ │
│ │ Accident or severe injury    │ │
│ │              [➜]             │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 🌪️ Respiratory Emergency     │ │
│ │ Difficulty breathing         │ │
│ │              [➜]             │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 🚗 Accident                  │ │
│ │ Traffic or other accident    │ │
│ │              [➜]             │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Scroll down for more options]   │
│                                  │
└──────────────────────────────────┘

User selects type → Next Screen
```

### Screen 2: Emergency Details

```
EMERGENCY DIALOG - STEP 2
┌──────────────────────────────────┐
│ [←] ❤️ Cardiac Emergency          │
├──────────────────────────────────┤
│                                  │
│ ⚠️ IMPORTANT                     │
│ Emergency services will be       │
│ immediately notified of your     │
│ location                         │
│                                  │
├──────────────────────────────────┤
│ Additional Details (optional)    │
│                                  │
│ Description of situation:        │
│ ┌──────────────────────────────┐ │
│ │ Experiencing severe chest    │ │
│ │ pain and shortness of breath │ │
│ │ Started 5 minutes ago        │ │
│ └──────────────────────────────┘ │
│                                  │
│ Estimated casualties: 1          │
│                                  │
│ What happens next:               │
│ 1️⃣ Location shared with hospitals │
│ 2️⃣ Responders dispatched        │
│ 3️⃣ Video link established       │
│                                  │
│ [Confirm & Send Emergency Alert] │
│ [Cancel]                         │
│                                  │
└──────────────────────────────────┘

User confirms → Alert sent
```

---

## 🏥 Active Emergency Display

```
PATIENT HOME - WITH ACTIVE EMERGENCY
┌──────────────────────────────────┐
│ Welcome back, John               │
├──────────────────────────────────┤
│
├══════════════════════════════════┤
│ 🚨 EMERGENCY ALERT ACTIVE        │
│ ├─ Cardiac Emergency (CRITICAL)  │
│ ├─ Location: Main St, City       │
│ ├─ Status: 3 hospitals responding│
│ ├─ Ambulance ETA: ~8 mins        │
│ │  [⚫ Live video active]         │
│ │                                │
│ │ [📺 View Details] [✕ Cancel]   │
│ └──────────────────────────────────┤
│
├──────────────────────────────────┤
│ AI Health Assistant              │
│ ...                              │
└──────────────────────────────────┘
```

---

## 🏨 Emergency Services Details Page

```
EMERGENCY SERVICES PAGE
┌──────────────────────────────────┐
│ [←] Emergency Services           │
├──────────────────────────────────┤
│ ✅ Emergency Services Available  │
│ 5 hospitals found within 20 km   │
│                                  │
│ ⚠️ Always call 112 for           │
│ life-threatening situations      │
│                                  │
├──────────────────────────────────┤
│ Hospital 1: Apollo Hospital      │
│ ├─ ✅ Can Respond | 2.5 km away  │
│ ├─ 🚗 Response Time: 5 mins      │
│ ├─ 🛏️ Available Beds: 45         │
│ ├─ 🏥 ICU Beds: 12               │
│ ├─ 🚑 Ambulances: 3             │
│ ├─ [🗺️ Directions] [🚑 Ambulance] │
│ └──────────────────────────────────┤
│                                  │
│ Hospital 2: Max Healthcare       │
│ ├─ ✅ Can Respond | 3.2 km away  │
│ ├─ 🚗 Response Time: 7 mins      │
│ ├─ 🛏️ Available Beds: 32         │
│ ├─ 🚑 Ambulances: 2             │
│ ├─ [🗺️ Directions] [🚑 Ambulance] │
│ └──────────────────────────────────┤
│                                  │
│ Hospital 3: City Clinic          │
│ ├─ ⚠️ Limited | 4.1 km away      │
│ ├─ 🚗 Response Time: 9 mins      │
│ ├─ 🛏️ Available Beds: 2          │
│ ├─ [🗺️ Directions] [🚑 Ambulance] │
│ └──────────────────────────────────┤
│                                  │
│ [Emergency: Call 112]            │
│ Always call emergency services   │
│ for life-threatening situations  │
│                                  │
└──────────────────────────────────┘
```

---

## 👥 Hospital Dashboard View

```
HOSPITAL DASHBOARD - EMERGENCIES
┌──────────────────────────────────┐
│ Hospital Admin Panel          🔔 3 │
├──────────────────────────────────┤
│ Active Emergency Alerts          │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ CRITICAL - Cardiac Emergency │ │
│ │ Patient: John Doe            │ │
│ │ Location: 2.5 km away        │ │
│ │ ETA: 5 minutes               │ │
│ │ 📹 Video stream active       │ │
│ │ Severity: CRITICAL           │ │
│ │                              │ │
│ │ [👁️ Watch Triage] [✓Respond]│ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ HIGH - Trauma Case           │ │
│ │ Patient: Jane Smith          │ │
│ │ Location: 4.2 km away        │ │
│ │ ETA: 7 minutes               │ │
│ │ Severity: HIGH               │ │
│ │                              │ │
│ │ [👁️ View Details] [✓Respond]│ │
│ └──────────────────────────────┘ │
│                                  │
│ Responded Emergencies            │
│ ├─ Cardiac - John Doe (In Transit)
│ ├─ Road Accident - Maria Silva   │
│ └─ Respiratory - Ahmad Hassan    │
│                                  │
└──────────────────────────────────┘
```

---

## 🩺 Doctor Monitor View

```
DOCTOR EMERGENCY MONITOR
┌──────────────────────────────────┐
│ Emergency Alerts Monitor      🔴  │
├──────────────────────────────────┤
│ LIVE EMERGENCIES - 7 Active      │
│                                  │
│ CRITICAL PRIORITY:               │
│ ┌──────────────────────────────┐ │
│ │ ❤️ Cardiac - John Doe        │ │
│ │ Location: Downtown Hospital  │ │
│ │ Video: LIVE                  │ │
│ │ Status: Ambulance En Route   │ │
│ │                              │ │
│ │ [👁️ Watch Stream] [💬 Advise] │ │
│ └──────────────────────────────┘ │
│                                  │
│ HIGH PRIORITY:                   │
│ ┌──────────────────────────────┐ │
│ │ ⚠️ Trauma - Jane Smith       │ │
│ │ Location: Main Road Accident │ │
│ │ Responding: Apollo Hospital  │ │
│ │ Status: Ambulance Dispatched │ │
│ │                              │ │
│ │ [👁️ Watch Stream] [💬 Advise] │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Emergency Map] [Alert History]  │
│                                  │
└──────────────────────────────────┘
```

---

## 🗺️ Mass Casualty Event View

```
MASS CASUALTY EVENT DETECTED
┌──────────────────────────────────┐
│ ⚠️ CRITICAL EVENT - MASS CASUALTY │
├──────────────────────────────────┤
│ Event: Traffic Collision         │
│ Location: NH-1, Sector 5         │
│ Estimated Casualties: 12         │
│ Status: CRITICAL                 │
│                                  │
│ Severity Distribution:           │
│ 🔴 CRITICAL: 3 patients          │
│ 🟠 HIGH: 5 patients              │
│ 🟡 MEDIUM: 4 patients            │
│                                  │
│ Hospitals Notified: 12           │
│ Ambulances Dispatched: 8         │
│ Responders En Route: 12          │
│                                  │
│ Coordinate: 28.6139, 77.2090     │
│ [🗺️ View on Map]                 │
│                                  │
│ Responding Hospitals:            │
│ ✅ Apollo - 3 ambulances         │
│ ✅ Max Healthcare - 2 ambulances │
│ ✅ City Clinic - 1 ambulance     │
│ ⏳ Waiting response from 9 others │
│                                  │
│ [📞 NIC Notification Sent]       │
│ [📊 Event Report]                │
│                                  │
└──────────────────────────────────┘
```

---

## 🔄 Emergency Status Progression

```
EMERGENCY WORKFLOW

1️⃣ PATIENT INITIATES
   ┌─────────────────┐
   │ Patient home    │
   │ Click SOS       │
   └────────┬────────┘
            │
            ▼
2️⃣ ALERT CREATION
   ┌─────────────────────────────┐
   │ Emergency Dialog            │
   │ - Type: Cardiac             │
   │ - Location: Acquired        │
   │ - Severity: CRITICAL        │
   └────────┬────────────────────┘
            │
            ▼
3️⃣ HOSPITAL NOTIFICATION
   ┌─────────────────────────────┐
   │ Hospitals Notified:         │
   │ - Apollo (2.5 km)           │
   │ - Max (3.2 km)              │
   │ - City (4.1 km)             │
   └────────┬────────────────────┘
            │
            ▼
4️⃣ RESPONSE INITIATED
   ┌─────────────────────────────┐
   │ Hospital Accepts Alert      │
   │ Status: RESPONDED           │
   │ Ambulance: Dispatched       │
   │ ETA: 5 minutes              │
   └────────┬────────────────────┘
            │
            ▼
5️⃣ ACTIVE TRIAGE
   ┌─────────────────────────────┐
   │ Video Stream: ACTIVE        │
   │ Doctor Assessment: In Progress
   │ Paramedic Guidance: Started │
   └────────┬────────────────────┘
            │
            ▼
6️⃣ PATIENT TRANSFER
   ┌─────────────────────────────┐
   │ Ambulance: Arriving         │
   │ Patient: En Route to Hospital
   │ Status: IN_TRANSIT          │
   └────────┬────────────────────┘
            │
            ▼
7️⃣ ADMISSION & RESOLUTION
   ┌─────────────────────────────┐
   │ Hospital: Admitted          │
   │ Status: RESOLVED            │
   │ Records: Saved              │
   │ Follow-up: Scheduled        │
   └─────────────────────────────┘
```

---

## 🎨 Color Scheme & Status Indicators

### Emergency Types (Background Colors)
```
🔴 Cardiac Emergency       - Red (#DC2626)
🟠 Trauma/Injury          - Orange (#EA580C)
🔵 Respiratory Emergency   - Cyan (#0891B2)
🟡 Accident                - Amber (#D97706)
🟣 Mass Casualty          - Purple (#7C3AED)
🟢 Disease Outbreak       - Green (#059669)
⚪ General Emergency       - Indigo (#6366F1)
```

### Severity Indicators
```
🔴 CRITICAL   - Life-threatening (Cardiac, Mass Casualty, Outbreak)
🟠 HIGH       - Urgent (Trauma, Respiratory, Accident)
🟡 MEDIUM     - Important (General Emergency)
🟢 LOW        - Stable (Minor incidents)
```

### Status Indicators
```
🟢 ACTIVE     - Alert just triggered
🔵 RESPONDED  - Hospital accepted
🟡 IN_TRANSIT - Patient being transported
✅ RESOLVED   - Patient admitted
❌ CANCELLED  - Alert cancelled
⏸️ PENDING    - Waiting for response
```

### Hospital Capacity
```
✅ GREEN  - Can Respond       (Beds available, ambulances ready)
🟡 YELLOW - Limited Capacity  (Few beds/ambulances)
❌ RED    - Cannot Respond    (No available resources)
```

---

## 📱 Responsive Design

### Mobile (Portrait)
```
┌─────────────────────┐
│ Emergency Dialog    │
│ (Full Screen)       │
│ Full width buttons  │
│ Stack layout        │
└─────────────────────┘
```

### Tablet (Landscape)
```
┌────────────────────────────────────────┐
│ Emergency Dialog (Centered)            │
│ ┌────────────────────────────────────┐ │
│ │  Type selection (Grid layout)      │ │
│ │  ┌──────────┬──────────┬──────────┐ │
│ │  │ Cardiac  │ Trauma   │ Respiratory
│ │  └──────────┴──────────┴──────────┘ │
│ │  Details input below               │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## 🔐 Permission Requests

```
FIRST TIME LAUNCH
┌────────────────────────────────────┐
│ Location Permission Required       │
│                                    │
│ "Swasthya Setu" needs to access    │
│ your location to provide           │
│ emergency services                 │
│                                    │
│ [Deny]  [Allow]                    │
└────────────────────────────────────┘
        │         │
        ▼         ▼
   Denied     Allowed
        │         │
        ▼         ▼
   Fallback   Proceed to
   to IP      Emergency
   Location   Services
```

---

## 📊 Animations & Transitions

### SOS Button
```
Normal State → Hover State → Active State
   [Red]          [Darker]       [Pulse]
  Static       Light Shadow   Animated pulse
```

### Emergency Alert
```
Created → Slide Up → Pulse → Expand/Collapse
  Scale     From      Alert    Animated
  0.8x      Bottom    Zone
```

### Status Updates
```
Color transition:
ACTIVE (Red) → RESPONDED (Blue) → RESOLVED (Green)
Fade effect with icon animation
```

---

## ♿ Accessibility Features

- ✅ High contrast mode support
- ✅ Large touch targets (min 48x48pt)
- ✅ Screen reader compatibility
- ✅ Clear labeling of buttons
- ✅ Vibration feedback on actions
- ✅ Voice input for emergency triggers (future)

---

For implementation details, see component files:
- `components/EmergencyDialog.tsx`
- `components/EmergencyAlert.tsx`
- `components/EmergencyServicesSection.tsx`
- `app/patient/emergency-services.tsx`