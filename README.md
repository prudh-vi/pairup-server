<div align="center">

# 🔥 PairUp

### *Connect. Chat. Discover.*

A production-grade real-time stranger video chat platform built with WebRTC and Socket.IO

[Live Demo](https://pairup.zrxprudhvi.tech/) • [Report Bug](https://github.com/prudh-vi/pairup-server/issues) • [Request Feature](https://github.com/prudh-vi/pairup-server/issues)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Made with Love](https://img.shields.io/badge/Made%20with-❤-red.svg)](https://github.com/prudh-vi)

![PairUp Demo](https://via.placeholder.com/1200x600/FF6B6B/FFFFFF?text=PairUp+Demo+Screenshot)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎥 **Real-Time Video & Audio**
Crystal-clear WebRTC peer-to-peer streaming with automatic quality adjustment

### 💬 **Live Text Chat**
Instant messaging alongside video with typing indicators and message history

### 🔀 **Smart Matchmaking**
Intelligent stranger pairing system with instant connections

</td>
<td width="50%">

### ⏭ **Skip & Reconnect**
Don't like your match? Skip instantly and connect with someone new

### 🔐 **Secure & Private**
End-to-end encrypted connections with WSS and SSL/TLS

### 📱 **Fully Responsive**
Seamless experience across desktop, tablet, and mobile devices

</td>
</tr>
</table>

---

## 🎯 Why PairUp?

Unlike other video chat platforms, PairUp is:

- ✅ **Open Source** - Transparent, auditable, and community-driven
- ✅ **Self-Hostable** - Complete control over your data and infrastructure
- ✅ **Production Ready** - Battle-tested with proper NAT traversal using TURN servers
- ✅ **Optimized** - Low latency P2P connections with minimal server relay
- ✅ **Modern Stack** - Built with cutting-edge technologies (React, TypeScript, Bun)

---

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="33%">

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

- React 18+ with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Socket.IO Client for signaling
- WebRTC APIs for media streaming

</td>
<td align="center" width="33%">

### Backend
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?&style=for-the-badge&logo=Socket.io&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

- Bun runtime for blazing speed
- Socket.IO for WebSocket signaling
- TypeScript for type safety
- Custom matchmaking logic
- Room-based connection handling

</td>
<td align="center" width="33%">

### Infrastructure
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![NGINX](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Let's Encrypt](https://img.shields.io/badge/Let's_Encrypt-003A70?style=for-the-badge&logo=let's-encrypt&logoColor=white)

- Google Cloud VM (Compute Engine)
- Coturn TURN server for NAT traversal
- NGINX reverse proxy
- Let's Encrypt SSL certificates
- PM2 for process management

</td>
</tr>
</table>

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
│              (React App + WebRTC Media Handler)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS + WSS (Secure WebSocket)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NGINX Reverse Proxy                         │
│            SSL Termination + WebSocket Upgrade                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP + WebSocket (Internal)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Socket.IO Signaling Server                    │
│                        (Bun Runtime)                            │
│  • Matchmaking Logic     • Room Management                      │
│  • WebRTC Signaling      • Message Relay                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ WebRTC Signaling (Offer/Answer/ICE)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TURN/STUN Servers                            │
│               (NAT Traversal & Relay)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
             ┌──────────────────────┐
             │   Peer-to-Peer       │
             │   Media Stream       │
             │  (Video + Audio)     │
             └──────────────────────┘
```

### 🔄 Connection Flow

1. **Client connects** to signaling server via WSS
2. **Server matches** two waiting clients and creates a room
3. **WebRTC negotiation** happens (SDP offer/answer exchange)
4. **ICE candidates** are exchanged for NAT traversal
5. **P2P connection** established (with TURN relay as fallback)
6. **Media streams** flow directly between peers
7. **Chat messages** relayed through signaling server

---

## 🚀 Getting Started

### Prerequisites

- **Bun** >= 1.0.0 ([Install Bun](https://bun.sh))
- **Node.js** >= 18.0.0 (for frontend tooling)
- **Google Cloud Account** (for production deployment)
- **Domain name** (optional, for SSL)

### 📦 Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/prudh-vi/pairup-server.git
cd pairup-server
```

#### 2. Backend Setup

```bash
# Install dependencies
bun install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development server
bun run dev

# Production mode
bun run start
```

**Environment Variables (.env):**

```env
PORT=8000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

**Frontend Configuration:**

Update `src/config.ts`:

```typescript
export const SOCKET_URL = 
  process.env.NODE_ENV === 'production' 
    ? 'wss://api.yourdomain.com'
    : 'ws://localhost:8000';
```

---

## 🌐 Production Deployment

### Backend Deployment (Google Cloud)

#### 1. Create VM Instance

```bash
# Create e2-small instance (recommended for 500-1000 users)
gcloud compute instances create pairup-server \
  --machine-type=e2-small \
  --zone=us-central1-a \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

#### 2. Configure Firewall

```bash
# Allow HTTP, HTTPS, and WebSocket
gcloud compute firewall-rules create allow-pairup \
  --allow=tcp:80,tcp:443,tcp:8000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server,https-server
```

#### 3. Setup TURN Server

```bash
# SSH into VM
gcloud compute ssh pairup-server --zone=us-central1-a

# Run TURN setup script (from repository)
chmod +x scripts/setup-turn.sh
./scripts/setup-turn.sh

# Note down your TURN credentials!
```

#### 4. Deploy Backend

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone https://github.com/prudh-vi/pairup-server.git
cd pairup-server
bun install

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/index.ts --name pairup --interpreter bun
pm2 save
pm2 startup
```

#### 5. Configure NGINX

```bash
sudo apt install nginx certbot python3-certbot-nginx

# Copy NGINX config
sudo cp scripts/nginx.conf /etc/nginx/sites-available/pairup
sudo ln -s /etc/nginx/sites-available/pairup /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

Or use the [Vercel GitHub Integration](https://vercel.com/docs/git) for automatic deployments.

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs pairup

# NGINX logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# TURN server logs
sudo tail -f /var/log/turnserver.log
```

### Monitor Resources

```bash
# Server resources
pm2 monit

# Active connections
sudo netstat -an | grep 3478 | wc -l

# Bandwidth usage
sudo iftop
```

### Restart Services

```bash
# Restart backend
pm2 restart pairup

# Restart NGINX
sudo systemctl restart nginx

# Restart TURN server
sudo systemctl restart coturn
```

---

## 🔧 Configuration

### WebRTC Configuration

Update `frontend/src/config/webrtc.ts`:

```typescript
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:YOUR_SERVER_IP:3478',
      username: 'YOUR_TURN_USERNAME',
      credential: 'YOUR_TURN_PASSWORD'
    },
  ],
  iceCandidatePoolSize: 10,
};
```

### Matchmaking Settings

Edit `backend/src/matchmaking.ts`:

```typescript
const QUEUE_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
```

---

## 📈 Scaling Guide

### Handling More Users

| Users | VM Type | TURN Servers | Monthly Cost |
|-------|---------|--------------|--------------|
| 100-500 | e2-small | 1× e2-small | ~$20 |
| 500-2,500 | e2-medium | 2× e2-small | ~$60 |
| 2,500-5,000 | e2-standard-2 | 3× e2-medium | ~$200 |
| 5,000-10,000 | e2-standard-4 | 5× e2-standard-2 | ~$500 |

### Optimization Tips

1. **Enable P2P First** - Campus WiFi users connect directly (saves 60% bandwidth)
2. **Lower Video Quality** - Use 480p instead of 720p during peak hours
3. **Set Time Limits** - 10-minute max calls prevent bandwidth abuse
4. **Geographic Distribution** - Deploy TURN servers in multiple regions
5. **Redis Adapter** - Scale Socket.IO horizontally across multiple servers

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Known Issues

- [ ] Occasional connection drops on mobile Safari (investigating)
- [ ] TURN relay not working on some corporate networks (firewall issue)
- [ ] Memory leak on long-running sessions (fix in progress)

See the [open issues](https://github.com/prudh-vi/pairup-server/issues) for a full list.

---

## 🗺 Roadmap

- [x] Basic video chat functionality
- [x] TURN server integration
- [x] Production deployment
- [ ] User authentication system
- [ ] Interest-based matching
- [ ] Reporting & moderation tools
- [ ] Screen sharing support
- [ ] Group video calls (3-4 people)
- [ ] Virtual backgrounds
- [ ] Redis adapter for horizontal scaling
- [ ] Mobile apps (React Native)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Prudhvi**

- GitHub: [@prudh-vi](https://github.com/prudh-vi)
- LinkedIn: [LinkedIn](https://linkedin.com/in/prudhvirajkb)
- Email: prudhvirajkb3@gmail.com

---

## 🙏 Acknowledgments

- [WebRTC](https://webrtc.org/) - For making P2P communication possible
- [Socket.IO](https://socket.io/) - For reliable WebSocket connections
- [Coturn](https://github.com/coturn/coturn) - For TURN/STUN server
- [Tailwind CSS](https://tailwindcss.com/) - For beautiful UI
- [Bun](https://bun.sh/) - For blazing fast runtime

---

## 💖 Support

If you found this project helpful, please give it a ⭐️!

<div align="center">

**[⬆ back to top](#-pairup)**

Made with ❤️ by [Prudhvi](https://github.com/prudh-vi)

</div>
