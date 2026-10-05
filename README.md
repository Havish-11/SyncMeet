# SyncMeet

A real-time meeting workspace built on WebRTC. Create or join a room, talk over video/audio, share your screen, and chat, all in the browser.

Built for the GDGxIris Recruitments 2026 standalone task.

## Features

- Email/password signup and login (JWT)
- Lobby page to create or join a room by ID
- Peer-to-peer video and audio (WebRTC)
- Screen sharing
- In-room text chat
- Clean handling of users leaving or disconnecting

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React (Vite) |
| Backend | Node.js, Express |
| Database | MongoDB |
| Auth | JWT |
| Signaling | Socket.IO |
| Media | WebRTC (STUN) |

## How It Works

1. **Auth:** the user logs in and receives a JWT, which the client sends with API calls and when connecting the socket.
2. **Rooms:** joining a room connects the user to a Socket.IO room with that ID.
3. **Signaling:** the server only relays WebRTC messages (`offer`, `answer`, `ice-candidate`) between peers. No media passes through it.
4. **Peer connections:** each pair of users has its own `RTCPeerConnection`. The new joiner creates offers to everyone already in the room (mesh topology).
5. **Media:** local camera/mic streams are held in a shared `MediaContext` and attached to each peer connection. Remote streams are rendered as video tiles.
6. **Disconnects:** when a socket disconnects, the server notifies the room and clients close that peer's connection and remove its tile.

> Mesh topology works well for small rooms (roughly 2–4 people). Larger rooms would need an SFU.

## Project Structure

```
syncmeet/
├── client/                 # React frontend
│   └── src/
│       ├── context/        # MediaContext (local stream, mic/cam toggles)
│       ├── hooks/          # useWebRTC, useSocket, etc.
│       ├── utils/          # rtc.js (peer connection helpers)
│       ├── components/     # VideoTile, Controls, Chat, ...
│       └── pages/          # Lobby, Room, Login/Register
└── server/                 # Express backend
    ├── models/             # Mongoose models (User)
    ├── routes/             # Auth routes
    ├── middleware/         # JWT verification
    └── index.js            # Express + Socket.IO setup
```

Adjust folder names to match your repo if they differ.

## Prerequisites

- Node.js 18+
- MongoDB (local install or a MongoDB Atlas connection string)
- A modern browser with camera/mic access (Chrome, Edge, Firefox)

## Setup

### 1. Clone

```bash
git clone https://github.com/Havish-11/SyncMeet
cd syncmeet
```

### 2. Backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/syncmeet
JWT_SECRET=replace_with_a_long_random_string
CLIENT_URL=http://localhost:5173
```

Start it:

```bash
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

Start it:

```bash
npm run dev
```

Open http://localhost:5173.

## Usage

1. Register an account and log in.
2. In the **Lobby**, create a new room or enter an existing room ID.
3. Allow camera and microphone access when the browser asks.
4. Share the room ID or URL with others so they can join.
5. Use the controls to mute/unmute, toggle video, share your screen, or open chat.
6. Click **Leave** to exit. Others are notified and your tile disappears.

To test locally, open the room in two different browser windows or profiles (or on two devices on the same network).

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `PORT` | server | API/socket port |
| `MONGO_URI` | server | MongoDB connection string |
| `JWT_SECRET` | server | Secret used to sign tokens |
| `CLIENT_URL` | server | Allowed CORS origin for the frontend |
| `VITE_API_URL` | client | Backend REST base URL |
| `VITE_SOCKET_URL` | client | Socket.IO server URL |

## Troubleshooting

- **No video from the other peer:** check the browser console for ICE errors. Make sure both users joined the same room and that offers/answers/candidates are being relayed (log them on the server).
- **Works on localhost but not across networks:** STUN alone fails behind strict NATs. Add a TURN server to the `iceServers` config in `rtc.js`.
- **Camera/mic blocked:** getUserMedia requires HTTPS or `localhost`. Check site permissions in the browser.
- **Screen share not showing for others:** the new screen track must replace the camera track on each peer connection (`RTCRtpSender.replaceTrack`) or be added and renegotiated.
- **CORS or socket connection errors:** confirm `CLIENT_URL` matches the frontend origin exactly, with no trailing slash.

## Limitations

- Mesh topology, so quality drops as the room grows
- STUN only by default, no TURN fallback
- Bonus tasks were skipped

