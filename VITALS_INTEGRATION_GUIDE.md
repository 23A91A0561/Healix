# rPPG Vital Signs Integration Guide

## Overview

This document describes the integration of the rPPG (remote Photoplethysmography) vital signs monitoring system into the Healix platform. The system automatically monitors heart rate, respiratory rate, and heart rate variability (HRV) during video consultations between patients and doctors.

## Architecture

### Components

1. **Backend Services** (`backend/services/vitals.service.js`)
   - Manages vital signs data storage and retrieval
   - Tracks vital readings history
   - Provides vitals summary statistics

2. **Backend Controllers** (`backend/controllers/vitals.controller.js`)
   - Handles HTTP requests for vitals operations
   - Initializes and stops vitals monitoring
   - Provides endpoints for fetching vitals data

3. **Backend Routes** (`backend/routes/vitals.routes.js`)
   - REST API endpoints for vitals management
   - Authentication middleware protection

4. **Database Model** (`backend/models/Consultation.js`)
   - Extended with vitals fields
   - Stores current vitals and historical readings

5. **Frontend Video Chat Server** (`video-chat-app/server.ts`)
   - Socket.IO events for vitals data broadcast
   - Real-time vitals synchronization between participants

6. **Frontend Hook** (`video-chat-app/hooks/useVitals.ts`)
   - React hook for vitals monitoring logic
   - Manages VitalLens integration
   - Handles video frame processing

7. **Frontend Component** (`video-chat-app/components/VitalsMonitor.tsx`)
   - Visual UI for displaying vital signs
   - Start/stop monitoring controls
   - Real-time vital signs display

## Installation & Setup

### 1. Backend Setup

#### Dependencies
The backend already uses MongoDB and Express. Ensure your `backend/package.json` has these:
```json
{
  "dependencies": {
    "mongoose": "^7.0.0",
    "express": "^4.18.0",
    "express-rate-limit": "^6.0.0"
  }
}
```

#### Environment Variables
Add to your `.env` file (backend):
```
VITALS_API_KEY=your_vitallens_api_key_here
VITALS_STORAGE_LIMIT=500
```

#### Database Migration
Run your migrations to add vitals fields to Consultation collection:
```bash
cd backend
npm install
npm run migrate  # or manually update schema
```

### 2. Frontend Setup

#### Install Dependencies
```bash
cd video-chat-app
npm install vitallens
```

#### Environment Variables
Add to `.env.local` (video-chat-app):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_VITALLENS_API_KEY=your_vitallens_api_key_here
```

## API Endpoints

### Initialize Vitals Monitoring
**POST** `/api/vitals/:consultationId/initialize`

Initializes vital signs monitoring for a consultation.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Vitals monitoring initialized",
  "consultation": {
    "_id": "...",
    "vitals": {
      "isMonitoring": true,
      "lastUpdated": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Store Vital Reading
**POST** `/api/vitals/:consultationId/reading`

Stores a new vital sign reading.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "heartRate": 72,
  "respiratoryRate": 16,
  "hrv": 45
}
```

**Response:**
```json
{
  "success": true,
  "vitals": {
    "heartRate": {
      "current": 72,
      "average": 70,
      "min": 65,
      "max": 80,
      "samples": [...]
    },
    "respiratoryRate": {
      "current": 16,
      "average": 15,
      "min": 14,
      "max": 18,
      "samples": [...]
    },
    "hrv": {
      "value": 45,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  },
  "reading": {
    "timestamp": "2024-01-01T12:00:00Z",
    "heartRate": 72,
    "respiratoryRate": 16,
    "hrv": 45
  }
}
```

### Get Current Vitals
**GET** `/api/vitals/:consultationId`

Retrieves current vital signs for a consultation.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "heartRate": {
    "current": 72,
    "average": 70,
    "min": 65,
    "max": 80
  },
  "respiratoryRate": {
    "current": 16,
    "average": 15,
    "min": 14,
    "max": 18
  },
  "hrv": {
    "value": 45,
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "isMonitoring": true,
  "lastUpdated": "2024-01-01T12:00:00Z"
}
```

### Get Vitals Summary
**GET** `/api/vitals/:consultationId/summary`

Gets a comprehensive vitals summary.

**Response:**
```json
{
  "currentHeartRate": 72,
  "averageHeartRate": 70,
  "heartRateRange": {
    "min": 65,
    "max": 80
  },
  "currentRespiratoryRate": 16,
  "averageRespiratoryRate": 15,
  "respiratoryRateRange": {
    "min": 14,
    "max": 18
  },
  "hrv": 45,
  "isMonitoring": true,
  "lastUpdated": "2024-01-01T12:00:00Z",
  "readingsCount": 45
}
```

### Get Vital Readings History
**GET** `/api/vitals/:consultationId/history?limit=100`

Retrieves historical vital signs readings.

**Query Parameters:**
- `limit` (optional): Number of readings to return (default: 100)

**Response:**
```json
[
  {
    "timestamp": "2024-01-01T12:00:00Z",
    "heartRate": 72,
    "respiratoryRate": 16,
    "hrv": 45
  },
  ...
]
```

### Stop Vitals Monitoring
**POST** `/api/vitals/:consultationId/stop`

Stops vital signs monitoring for a consultation.

**Response:**
```json
{
  "message": "Vitals monitoring stopped",
  "consultation": {
    "_id": "...",
    "vitals": {
      "isMonitoring": false
    }
  }
}
```

## Socket.IO Events

### Server-Side Events

#### vital-data
Broadcasts vital signs data from a participant.

**Emit:**
```javascript
socket.emit("vital-data", {
  roomId: "heal-appointment123",
  vitals: {
    heartRate: 72,
    respiratoryRate: 16,
    hrv: 45,
    timestamp: 1234567890
  }
});
```

#### vital-data-update
Broadcasted to all participants when vital data is received.

**Receive:**
```javascript
socket.on("vital-data-update", (data) => {
  console.log("New vital data from:", data.socketId);
  console.log("Vitals:", data.vitals);
  console.log("Timestamp:", data.timestamp);
});
```

#### request-vitals
Request all vital data for a room.

**Emit:**
```javascript
socket.emit("request-vitals", {
  roomId: "heal-appointment123"
});
```

#### vitals-data
Receives aggregated vitals data for a room.

**Receive:**
```javascript
socket.on("vitals-data", (roomData) => {
  // roomData[socketId] = { vitals, socketId, timestamp }
});
```

#### close-vitals
Closes vitals monitoring for a room.

**Emit:**
```javascript
socket.emit("close-vitals", {
  roomId: "heal-appointment123"
});
```

#### vitals-monitoring-stopped
Notification that vitals monitoring has stopped.

**Receive:**
```javascript
socket.on("vitals-monitoring-stopped", () => {
  console.log("Vitals monitoring stopped for this room");
});
```

## Usage Example

### Starting a Consultation with Vitals Monitoring

```typescript
// In video-chat-app/app/room/[roomId]/page.tsx

import { useVitals } from "@/hooks/useVitals";
import { VitalsMonitor } from "@/components/VitalsMonitor";

export default function RoomPage() {
  const { socket } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize vitals monitoring hook
  const {
    isMonitoring,
    heartRate,
    respiratoryRate,
    hrv,
    startVitalsMonitoring,
    stopVitalsMonitoring,
  } = useVitals(socket, roomId, localVideoRef.current);

  // Auto-start when meeting connects
  useEffect(() => {
    if (status === "connected" && !isMonitoring) {
      startVitalsMonitoring();
    }
  }, [status, isMonitoring]);

  return (
    <>
      {/* Video elements */}
      <video ref={localVideoRef} autoPlay muted playsInline />
      
      {/* Vitals Monitor UI */}
      <VitalsMonitor
        isMonitoring={isMonitoring}
        heartRate={heartRate}
        respiratoryRate={respiratoryRate}
        hrv={hrv}
        onStart={startVitalsMonitoring}
        onStop={stopVitalsMonitoring}
      />
    </>
  );
}
```

### Retrieving Vitals for Doctor Dashboard

```typescript
import { getVitalsSummary } from "@/lib/vitalsApi";

async function DoctorDashboard({ consultationId, authToken }) {
  const vitals = await getVitalsSummary(consultationId, authToken);
  
  return (
    <div>
      <h2>Patient Vital Signs</h2>
      <p>Heart Rate: {vitals.currentHeartRate} bpm</p>
      <p>Respiratory Rate: {vitals.currentRespiratoryRate} breaths/min</p>
      <p>HRV: {vitals.hrv} ms</p>
    </div>
  );
}
```

## VitalLens Integration

The system uses VitalLens API for accurate vital signs estimation. You have two options:

### Option 1: Using VitalLens API (Recommended)
Requires API key from https://www.rouast.com/api/

```typescript
const vitalLens = new VitalLens({
  method: "vitallens",
  apiKey: "your_api_key_here",
});
```

### Option 2: Using Local rPPG Algorithms
Uses classic algorithms (POS, CHROM, G) without API calls:

```typescript
const vitalLens = new VitalLens({
  method: "pos", // or "chrom", "g"
  apiKey: "local",
});
```

## Monitoring and Alerts

### Normal Vital Sign Ranges

| Parameter | Normal Range | Alert Threshold |
|-----------|------------|-----------------|
| Heart Rate | 60-100 bpm | < 50 or > 120 |
| Respiratory Rate | 12-20 breaths/min | < 10 or > 30 |
| HRV | 20-100 ms | < 15 (stress indicator) |

### Implementing Alerts

```typescript
function checkVitalsAlert(vitals) {
  if (vitals.heartRate < 50 || vitals.heartRate > 120) {
    return { severity: "high", message: "Abnormal heart rate detected" };
  }
  
  if (vitals.respiratoryRate < 10 || vitals.respiratoryRate > 30) {
    return { severity: "high", message: "Abnormal breathing rate detected" };
  }
  
  if (vitals.hrv < 15) {
    return { severity: "medium", message: "High stress levels detected" };
  }
  
  return null;
}
```

## Performance Considerations

1. **Frame Processing**: Vitals are processed every 2 seconds to balance accuracy and performance
2. **Data Retention**: Last 100 samples stored in memory, 500 readings in database
3. **Bandwidth**: Vitals data sent every 1 second over Socket.IO
4. **Browser Support**: Requires modern browsers with:
   - WebRTC support
   - Canvas API
   - Web Workers (for VitalLens)

## Troubleshooting

### Vitals Not Updating
- Check if browser allows camera access
- Verify VitalLens API key is valid
- Check console for errors
- Ensure video element is properly rendered

### High Battery Usage
- Reduce frame processing frequency
- Disable monitoring when not needed
- Use local processing instead of API calls

### Inaccurate Readings
- Ensure good lighting conditions
- Keep face centered in frame
- Avoid rapid head movements
- Wait 30+ seconds for stabilization

## Security Considerations

1. **Data Encryption**: All vitals data transmitted over HTTPS
2. **Authentication**: All endpoints require valid JWT token
3. **Rate Limiting**: API calls limited to prevent abuse
4. **Data Privacy**: Vitals only accessible to assigned doctor and patient

## Future Enhancements

1. Multi-person vitals monitoring
2. Historical vitals charts and analytics
3. ML-based anomaly detection
4. Integration with wearable devices
5. Vitals export to medical records
6. Real-time doctor alerts for critical vitals

## Support & Documentation

- VitalLens Documentation: https://docs.rouast.com/js/
- GitHub: https://github.com/Rouast-Labs/vitallens-python
- API Reference: https://www.rouast.com/api/

## License

This integration is part of the Healix platform and follows the same license terms.
