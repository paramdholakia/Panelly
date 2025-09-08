# <img src="frontend/public/panelly_logo.png" alt="Panelly" width="120" height="120" style="border-radius:12px" />

# Panelly (Meeting Clone)

A full‑stack WebRTC video meeting platform with real‑time multi‑party video, screen sharing, and in‑call chat. Built with a Node.js/Express + Socket.IO backend and a React (MUI themed) frontend. Includes lightweight authentication, meeting history tracking, and a responsive modern UI using a dark (black) + orange brand palette.

---
## Table of Contents
- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Data Flow Summary](#data-flow-summary)
- [Backend Details](#backend-details)
  - [REST Endpoints](#rest-endpoints)
  - [Socket Events](#socket-events)
  - [Models](#models)
- [Frontend Details](#frontend-details)
  - [Routing](#routing)
  - [Auth Context](#auth-context)
  - [Video Engine (WebRTC)](#video-engine-webrtc)
  - [UI/UX Enhancements](#uiux-enhancements)
- [Media / WebRTC Flow](#media--webrtc-flow)
- [State Management](#state-management)
- [Environment Configuration](#environment-configuration)
- [Running Locally](#running-locally)
- [Project Scripts](#project-scripts)
- [Folder Structure](#folder-structure)
- [Security Notes & Improvements](#security-notes--improvements)
- [Scaling Considerations](#scaling-considerations)
- [Known Limitations](#known-limitations)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---
## Features
- Multi‑participant video conferencing (P2P mesh using WebRTC + STUN)
- Dynamic responsive video grid (auto layout, aspect ratio aware)
- Screen sharing (native `getDisplayMedia`)
- In‑call real‑time text chat with history replay for late joiners
- Authentication (register / login) with token persisted in `localStorage`
- Meeting history per authenticated user
- Themed dark UI with orange accent, glass surfaces, animations
- Guest quick-join (random code generation)
- Adaptive lobby (username entry + preview) before joining call

---
## Architecture Overview
```
Client (React)              Socket Transport              Other Peers
+----------------+  signal (SDP/ICE)  +--------------+   +-----------+
|  WebRTC Peer A | <----------------> |  Socket.IO   | <-> WebRTC Peers
| (Media Streams)|                    |  Signalling  |      Mesh
+----------------+                    +--------------+
       |  local media
       |  REST (login/history)
       v
+--------------------+
|   Express API      |
| (Auth + History)   |
+--------------------+
       |
       v
+--------------------+
|    MongoDB         |
+--------------------+
```

---
## Tech Stack
| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, React Router v6, MUI (custom theme), CSS Modules, WebRTC, Socket.IO client |
| Backend   | Node.js, Express, Socket.IO server, Mongoose, MongoDB Atlas |
| Auth      | Token (random 40 hex chars) stored server-side in user doc |
| Media     | WebRTC (STUN: `stun:stun.l.google.com:19302`) |
| Storage   | MongoDB Collections: `users`, `meetings` |

---
## Data Flow Summary
1. User registers or logs in (token issued + stored).
2. User creates/enters meeting code → navigates to `/:meetingCode`.
3. Client requests camera/mic; optional screen share.
4. Socket joins room (`join-call` with URL path).
5. Existing participants receive `user-joined` → create RTCPeerConnections → exchange SDP & ICE via `signal` events.
6. Streams added to mesh; chat messages broadcast via server.
7. User leaves → `disconnect` triggers `user-left` to peers.
8. Meeting code is saved in history via REST `/add_to_activity`.

---
## Backend Details
### REST Endpoints
Base path: `/api/v1/users`

| Method | Path                | Description | Body / Query |
|--------|---------------------|-------------|--------------|
| POST   | `/login`            | Authenticate user, returns token | `{ username, password }` |
| POST   | `/register`         | Create new user (hashed password) | `{ name, username, password }` |
| POST   | `/add_to_activity`  | Persist meeting to history        | `{ token, meeting_code }` |
| GET    | `/get_all_activity` | Fetch user's meeting history      | `?token=...` |

Responses use `http-status` for semantic codes. Passwords hashed with bcrypt (cost 10). Token is a random hex; no expiration logic yet.

### Socket Events
| Event            | Direction | Payload                                      | Description |
|------------------|-----------|----------------------------------------------|-------------|
| `join-call`      | Client→Srv| `path` (full URL)                            | Join a logical room keyed by URL string |
| `user-joined`    | Srv→Client| `(joiningSocketId, [allSocketIds])`          | Notifies clients of roster (used to start offers) |
| `signal`         | Bi-dir    | `(targetSocketId, message)` (SDP/ICE JSON)   | Signalling transport for WebRTC negotiation |
| `chat-message`   | Bi-dir    | `(text, senderName)` & server rebroadcasts   | In‑call chat; server stores per room in memory |
| `user-left`      | Srv→Client| `socketId`                                   | Participant disconnected |

Server keeps in‑memory maps: `connections[path]`, `messages[path]`, `timeOnline[socketId]`.

### Models
#### User
```js
{ name: String, username: String (unique), password: String (bcrypt hash), token: String }
```
#### Meeting
```js
{ user_id: String (username), meetingCode: String, date: Date }
```
> NOTE: No TTL/indexing or relational constraints added yet.

---
## Frontend Details
### Routing
| Path           | Component          | Purpose |
|----------------|--------------------|---------|
| `/`            | `landing.jsx`      | Marketing/entry hero + guest join |
| `/auth`        | `authentication.jsx` | Login / Register card |
| `/home`        | `home.jsx`         | Authenticated start/join meeting UI |
| `/history`     | `history.jsx`      | Meeting history grid |
| `/:url`        | `VideoMeet.jsx`    | Actual meeting room (WebRTC) |

Protected routes use HOC `withAuth` (wraps `HomeComponent`). Token stored in `localStorage`.

### Auth Context
`AuthContext.jsx` centralizes API calls with Axios instance `baseURL: {server}/api/v1/users`.
Exports functions:
- `handleRegister(name, username, password)`
- `handleLogin(username, password)` (stores token, navigates `/home`)
- `getHistoryOfUser()` (GET with token query param)
- `addToUserHistory(meetingCode)` (POST)

### Video Engine (WebRTC)
File: `VideoMeet.jsx`
Key elements:
- `connections` map of `socketId -> RTCPeerConnection`
- On `user-joined`, create new RTCPeerConnection for each peer + set `onicecandidate` and `onaddstream`.
- Local tracks attached with `addStream(window.localStream)` (legacy API) – NOTE: could migrate to `addTrack`.
- When local media toggled or screen share ends, renegotiation triggered by new offer.
- Streams stored in React state `videos[]` which drives dynamic grid.

Grid algorithm picks column count to minimize wasted space & preserve 16:9 aspect ratio; uses CSS `aspect-ratio` to prevent inconsistent sizing.

### UI/UX Enhancements
Implemented consistent dark + orange palette:
- Central MUI theme (`theme.js`)
- Gradient accents, glass panels, animated hero, floating mockup
- Lobby preview, tooltip controls, responsive participant grid
- Chat panel with blur, message bubbles, Enter-to-send
- Auth & history pages re-skinned for visual consistency

---
## Media / WebRTC Flow
1. Permissions requested (`getUserMedia`).
2. Local stream stored in `window.localStream` and set on `<video>`.
3. On join, peers create offers/answers and exchange via `signal` socket event.
4. ICE candidates forwarded over same `signal` channel.
5. Remote streams surfaced through `onaddstream` → appended to `videos` state.
6. Screen share toggles replace `localStream` and renegotiate offers.
7. On track end (camera turned off), a black + silent placeholder media stream inserted.

---
## State Management
- React `useState` for UI state (chat, media toggles, participants, messages).
- `useRef` holds socketId and connection references across renders.
- In‑memory arrays on server (no persistence for chat or session state across restarts).

---
## Environment Configuration
Frontend: `src/environment.js` toggles `IS_PROD`; server URL constants.
Backend: MongoDB URI hardcoded (should move to `.env`).

Recommended `.env` examples:
```
# backend/.env.example
PORT=8000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster/db
CORS_ORIGIN=http://localhost:3000
```
```
# frontend/.env.example
REACT_APP_API_BASE=http://localhost:8000
```
Update backend to read `process.env.MONGO_URI` and `process.env.PORT` for production readiness.

---
## Running Locally
Backend:
```
cd backend
npm install
npm start   # (Add a start script or use: node src/app.js)
```
Frontend:
```
cd frontend
npm install
npm start
```
Default dev URLs:
- Frontend: http://localhost:3000
- Backend:  http://localhost:8000

Open a meeting by navigating to `http://localhost:3000/testroom123` in multiple tabs.

---
## Project Scripts
Frontend `package.json`:
- `npm start` – CRA dev server
- `npm build` – Production bundle
Backend `package.json` (add if missing): Consider adding:
```json
"scripts": { "start": "node src/app.js", "dev": "nodemon src/app.js" }
```

---
## Folder Structure
```
backend/
  src/
    app.js                # Express + Socket.IO bootstrap
    controllers/
      socketManager.js    # Signalling + room memory store
      user.controller.js  # Auth + history handlers
    models/
      user.model.js
      meeting.model.js
    routes/
      users.routes.js
  .gitignore

frontend/
  src/
    App.js                # Router + providers
    theme.js              # MUI theme (dark/orange)
    environment.js        # Server endpoint flag
    contexts/AuthContext.jsx
    pages/                # landing, home, auth, history, VideoMeet
    styles/videoComponent.module.css
    utils/withAuth.jsx
  .gitignore
README.md
frontend/public/panelly_logo.png   # Brand logo (referenced in README via relative path)
```

---
## Security Notes & Improvements
| Concern | Current State | Recommendation |
|---------|---------------|----------------|
| Auth Token | Random hex stored in DB/plain | Use JWT with expiry / refresh tokens |
| Password Policy | None enforced | Add complexity + rate limiting |
| Mongo URI | Hardcoded in code | Move to `.env` + do not commit secrets |
| Chat Persistence | Memory only | Optional: persist messages or add TTL cache |
| WebRTC STUN/TURN | Only public Google STUN | Add TURN (e.g., coturn) for NAT traversal |
| Input Validation | Minimal | Add schema validation (Joi/Zod) |
| CSRF | Not applicable (API token) | If cookies added, implement CSRF protection |

---
## Scaling Considerations
- Current mesh architecture (each peer -> N-1 connections) scales poorly beyond ~6–8 participants due to bandwidth (O(n²) video streams). For larger rooms:
  - Introduce Selective Forwarding Unit (SFU) (e.g., mediasoup, Janus, Jitsi) for server-side media routing.
- Add Redis or a state store for socket room metadata to support horizontal scaling.
- Persist chat and meeting analytics in DB.
- Implement TURN servers for stricter firewalls.

---
## Known Limitations
- No TURN server (screen share / video may fail on restricted networks)
- No server-side authorization checks on socket events (room join open)
- No mute/camera state broadcast to others (only implicit via stream changes)
- Chat history lost when server restarts
- Token never expires; logout only client-side
- Uses deprecated `addStream` / `onaddstream` instead of `addTrack` / `ontrack`

---
## Future Enhancements
- Replace mesh with SFU for scalability
- Presence indicators + speaking detection (audio analyser)
- Display actual usernames on tiles (pass username when joining room)
- Add recording or snapshot feature
- Add TURN relay + ICE credential rotation
- Migrate to TypeScript for type safety
- Implement dark/light theme toggle
- Add E2E encryption (Insertable Streams) experiments

---
## Repository & Asset Hygiene
Recent cleanup removed an unused `frontend/panelly/` subfolder that contained empty duplicate page stubs. Active pages now reside solely under `frontend/src/pages/`. The logo is embedded in this README using a relative path: `frontend/public/panelly_logo.png` so GitHub can display it directly without absolute URLs.

---
## License
MIT License

Copyright (c) 2025 Panelly

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---
## Contributing
1. Fork & create a feature branch
2. Keep commits atomic
3. Open a PR describing rationale & testing notes

---
## Changelog (Latest UI Refactor)
- Added unified dark/orange theme and MUI theme provider
- Revamped landing, home, auth, history pages
- Implemented dynamic WebRTC grid + aspect-ratio tiles
- Added lobby, improved chat UI, control bar, participant count
- Added comprehensive `.gitignore` + new README

---
Feel free to open issues for questions, bugs, or enhancement ideas.