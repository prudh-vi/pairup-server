# 🔥 PairUp — Real-Time Stranger Video Chat Platform

PairUp is a production-grade real-time video chat application that connects random users instantly using WebRTC peer-to-peer streaming and Socket.IO signaling. It supports live video, audio, chat messaging, and skip-based matchmaking similar to platforms like Omegle and Azar.

The system is fully deployed on Google Cloud with HTTPS, WebSocket Secure (WSS), and NGINX reverse proxy.

---

## 🚀 Features

- 🎥 Real-time video & audio streaming (WebRTC)
- 💬 Live text chat
- 🔀 Stranger matchmaking system
- ⏭ Skip & reconnect functionality
- 🔐 Secure WebSocket signaling (WSS)
- 🌐 Production deployment with custom domain & SSL
- 📱 Responsive UI (Desktop + Mobile)
- ⚡ Low-latency peer-to-peer communication

---

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Framer Motion (Animations)
- Socket.IO Client
- WebRTC APIs

### Backend
- Bun Runtime
- Socket.IO Server
- Node HTTP Server
- TypeScript

### Infrastructure & DevOps
- Google Cloud VM (Compute Engine)
- NGINX Reverse Proxy
- Let's Encrypt SSL
- PM2 Process Manager
- Git-based CI workflow
- Custom Domain Routing

---

## 🧠 System Architecture

Client Browser
|
HTTPS + WSS
|
NGINX
|
Socket.IO Signaling Server (Bun)
|
WebRTC Peer-to-Peer Connection
|
Direct Video & Audio Stream


Signaling is handled via Socket.IO while actual media streams flow directly peer-to-peer using WebRTC.

---

## 🌍 Production Deployment

Backend is deployed on Google Cloud VM with:

- Custom Domain
- SSL Encryption
- Reverse Proxy
- Persistent Background Process

Live Backend URL:
https://backxpairup.zrxprudhvi.tech


Frontend hosted using Vercel.

---

## ⚙️ Local Development Setup

### Backend Setup

```bash
git clone https://github.com/prudh-vi/pairup-server.git
cd pairup-server
bun install
bun run src/index.ts
```

Backend runs on:

http://localhost:4000

### Frontend Setup
```bash
git clone https://github.com/prudh-vi/pairup-server.git
cd pairup-server/frontend
bun install
bun run dev
```
Frontend runs on:

http://localhost:3000



🔌 Environment Configuration

Update frontend socket connection:

io("https://backxpairup.zrxprudhvi.tech")

For local:

io("http://localhost:4000")

📦 Production Process Manager

PM2 is used for:

Auto restart on crash
Background execution
Startup on server reboot

🧪 Tested Capabilities

Cross-network peer connections
Mobile browser compatibility
Secure WebSocket upgrade (WSS)
NAT traversal via ICE candidates


📈 Future Improvements

TURN Server integration for strict NAT networks
User filters & interest matching
Reporting & moderation system
Scaling signaling using Redis adapter

Load balancer setup

Authentication layer
