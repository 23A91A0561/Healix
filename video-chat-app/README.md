# CartickMeet

CartickMeet is a multi-peer video chat application built using **Next.js, TypeScript, WebRTC and Socket.IO**.

Users can create a room, share the room link, and join a video call with up to **4 participants** using peer-to-peer WebRTC connections.

---

## Demo

- Live Demo: https://cartickmeet.onrender.com
- Video Demo: https://youtu.be/EQqCp3UqzqY?si=Ftu4lQ9s0hfI1L6a
---

# Tech Stack

- Next.js
- TypeScript
- WebRTC
- Socket.IO
- Tailwind CSS
- Docker
- Docker Compose
---

# Features

- Create a new meeting room
- Join a room using room link
- Up to **4 participants per room**
- Peer-to-peer video and audio using WebRTC
- Mute / Unmute microphone
- Toggle camera on/off
- Hangup call with cleanup
- Real-time chat inside room
- Connection status indicators
- Dockerized application

---

# Project Structure

```text
.
├── app
│   ├── api/health/route.ts
│   ├── room/[roomId]/page.tsx
│   ├── layout.tsx
│   └── page.tsx
│
├── components
│   └── media-video.tsx
│
├── hooks
│   ├── useSocket.ts
│   ├── useUserMedia.ts
│   └── useWebRTC.ts
│
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── server.ts
└── README.md
```

---

# Clone and Run

### 1. Clone repository

```bash
git clone https://github.com/karthikgarikina/video-chat-app
cd video-chat-app
```

### 2. Run using Docker

```bash
docker-compose up --build
```

### Application URL

```text
http://localhost:3000
```

---

# API Endpoints

## Health Check

**GET**

```text
http://127.0.0.1:3000/api/health
```

Example response:

```json
{
  "status": "ok",
  "timestamp": 1710000000000
}
```

Used for container health verification.

---

# WebSocket Events

The application uses Socket.IO for signaling and chat.

## Client -> Server

### `join-room`

Join a meeting room.

```json
{
  "roomId": "room-id"
}
```

### `offer`

Send WebRTC offer.

```json
{
  "target": "socket-id",
  "sdp": "offer-sdp"
}
```

### `answer`

Send WebRTC answer.

```json
{
  "target": "socket-id",
  "sdp": "answer-sdp"
}
```

### `ice-candidate`

Exchange ICE candidates.

```json
{
  "target": "socket-id",
  "candidate": {}
}
```

### `chat-message`

Send message to room.

```json
{
  "message": "Hello"
}
```

## Server -> Client

### `all-users`

List of users already in the room.

```json
["socket-id-1", "socket-id-2"]
```

### `user-joined`

Triggered when a new participant joins.

```json
"socket-id"
```

### `offer / answer / ice-candidate`

Forwarded signaling messages between peers.

### `user-left`

Triggered when a participant disconnects.

```json
"socket-id"
```

### `chat-message`

Broadcast chat message to all users.

```json
{
  "sender": "socket-id",
  "message": "Hello"
}
```

---

# Environment Variables

See `.env.example`

```env
PORT=3000
NEXT_PUBLIC_STUN_SERVER=stun:stun.l.google.com:19302
```

---

# Notes

- Maximum 4 users per room
- Video is transmitted peer-to-peer via WebRTC
- Server handles signaling and chat only
- No database is required
- Video demo link: replace with your final demo URL
