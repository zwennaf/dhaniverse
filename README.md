

# 🌍 Dhaniverse — Gamified Financial Management App 💸🎮
  ![dhaniverse readme](https://github.com/user-attachments/assets/a734781e-3fb3-4339-a5de-d21b3143685f)

> "We're not just making financial education fun — we're making it *relevant* to young India's unique challenges."

Welcome to **Dhaniverse**, a 2D open-world RPG game that transforms the way Gen Z and Millennials learn about personal finance. It’s where **fun meets finance**, **strategy meets savings**, and **gaming meets growth**. 🎯

---


## 🚀 About the Project

**Dhaniverse** is more than just a game — it's an **immersive financial literacy platform** built with ❤️ to teach **real-world money skills** through play. Learn how to save, invest, budget, and even run startups — all in a low-risk, high-reward virtual universe.

- 🎓 Perfect for students and young professionals
- 🧠 Built with behavioral economics + gamification
- 🏦 Real-life financial simulations and decision-making

---

## 🛠 Tech Stack

| 🧩 Frontend | ⚙️ Backend | 🎨 Design | 📦 Packages |
|------------|------------|------------|------------|
| `React.js` with `TypeScript` | `Deno` with `MongoDB` | `Figma` | `@dhaniverse/map-optimizer` |
| `Phaser 3` for WebGL 2D rendering | `WebSocket` for real-time multiplayer | `Tiled Map Editor` | Chunked map loading system |
| Modular ESModules Architecture | `JWT` auth with token management | Interactive UI & Game Flow | Binary map optimization |
| `Vite` build system | `Oak` framework for REST APIs | Responsive design patterns | Encryption & security layers |

---

## 🎮 Gameplay & Features

### 🔑 Core Gameplay Elements
- **RPG-style map exploration** with chunked loading and dynamic optimization 🗺️
- **Habit-building missions** to practice budgeting, saving, and investing 💰
- **Real-world finance simulations** like stock trading, tax planning, and side hustles 📊
- **Real-time multiplayer** with WebSocket connections and chat system 👥
- **Advanced error handling** with graceful degradation and retry mechanisms 🛡️

### 🚀 Technical Features
- **High-performance map optimization** with binary chunking and encryption
- **Smart loading system** with predictive caching and memory management
- **Real-time multiplayer** infrastructure with room-based gameplay
- **Comprehensive error handling** chain for robust user experience
- **WebGL optimization** with automatic fallback and recovery systems
- **Modular architecture** with separate packages for specialized functionality

### 💡 Use Cases
- 🔹 Curriculum add-on for schools and colleges
- 🔹 Fintech onboarding for Gen Z users
- 🔹 Self-paced learning tool for individuals

---

## 💼 Business & Monetization Strategy

| 💰 Model | 📈 Description |
|---------|----------------|
| **Freemium** | Basic access free, advanced levels behind subscription |
| **In-Game Purchases** | Cosmetic upgrades, power-ups, financial tools |
| **Premium Zones** | Unlock deeper simulations like Startup Street & Investor Island |
| **Ethical In-Game Ads** | Contextual, skippable ads from relevant brands |

> 🎯 Target Age Group: 18–35 years | 🌐 Global Scale: Localized content for different currencies, regions

---

## � Project Structure

### 🏗️ Architecture Overview
```
dhaniverse/
├── 📦 packages/                 # Modular packages
│   └── map-optimizer/          # High-performance map optimization
│       ├── src/
│       │   ├── chunker/        # Map chunking algorithms
│       │   ├── manager/        # Chunk management system
│       │   ├── parser/         # Binary map parsing
│       │   └── types/          # TypeScript definitions
│       └── package.json
├── 🎮 src/                     # Game client source
│   ├── game/
│   │   ├── entities/           # Player, NPCs, interactive objects
│   │   ├── scenes/             # Game scenes (Main, UI, etc.)
│   │   ├── systems/            # Core game systems
│   │   │   ├── error-handling/ # Advanced error management
│   │   │   ├── ChunkedMapManager.ts
│   │   │   ├── StockMarketManager.ts
│   │   │   ├── BuildingManager.ts
│   │   │   └── WebSocketManager.ts
│   │   └── utils/              # Game utilities & constants
│   └── ui/                     # React UI components
├── 🖥️ server/                   # Deno backend
│   ├── src/
│   │   ├── auth/               # Authentication systems
│   │   ├── db/                 # Database schemas & operations
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # WebSocket & business logic
│   │   └── websocket-server.ts # Real-time multiplayer
│   └── deno.json
├── 🎨 public/                  # Static assets
│   ├── maps/chunks/            # Optimized map chunks
│   ├── characters/             # Character sprites
│   └── UI/                     # Interface assets
└── 🛠️ tools/                   # Build & optimization tools
```

### 🔧 Key Systems

#### 🗺️ Map Optimization Package
- **Binary chunking** for faster loading
- **AES-256 encryption** for security
- **Smart caching** with LRU eviction
- **Memory management** with WebGL optimization
- **Error recovery** with graceful degradation

#### 🌐 Multiplayer Infrastructure
- **WebSocket server** with room-based sessions
- **Real-time chat** with message broadcasting
- **Player synchronization** with position interpolation
- **Connection management** with automatic reconnection
- **Anti-tampering** measures and rate limiting

#### 🎯 Financial Simulation Systems
- **Stock market** with real-time price updates
- **Banking system** with fixed deposits and transactions
- **Portfolio management** with profit/loss tracking
- **Building interactions** (Bank, Stock Market, etc.)
- **Progress tracking** with level and experience systems

---

## �🔭 Future Scope & Expansion

- 📱 Mobile App + Wearables Integration
- 🤖 AI-powered Personal Finance Advisors
- 🧑‍🎓 School & College Partnerships
- 💳 Real-world banking & investing integrations
- 🌐 B2B: Banks, Fintechs, Edtechs, Governments

> 💼 **Market Potential**: ₹15,000 Cr Indian Financial Literacy Market  
> 🌍 **Global Reach**: 1.8 Billion+ Gen Zs entering financial independence  
> 📊 **App Market Growth**: $1.5B by 2025, 24% YoY growth

---

## 🧠 Learnings & Inspiration

We designed Dhaniverse with one goal: **Make learning finance a journey — not a chore.**  
By combining **Phaser-powered gameplay**, **financial APIs**, and **community-driven content**, we aim to empower the next generation to *play smart, save smarter*.

---

## 🤝 Contributing

We 💙 open-source collaboration!  
Interested in contributing? Help us expand quests, optimize performance, or integrate global financial systems.

### 🚀 Development Setup
```bash
# Clone the repo
git clone https://github.com/Gursimrxn/dhaniverse.git
cd dhaniverse

# Install dependencies
npm install

# Setup server environment
cd server
cp .env.example .env  # Configure your environment variables

# Development commands
npm run dev          # Start client development server
npm run server       # Start Deno backend server
npm run build        # Build for production

# Package development
cd packages/map-optimizer
npm run build        # Build map optimization package
npm run dev          # Watch mode for package development
```

### 🏗️ Building & Deployment
- **Frontend**: Built with Vite, deployed on Vercel
- **Backend**: Deno runtime, deployed on Deno Deploy
- **Database**: MongoDB with connection pooling
- **WebSocket**: Separate service for real-time features

## 🌐 Live Demo
Experience Dhaniverse in action: **https://dhaniverse.vercel.app**

### 🎮 Quick Start
1. **Visit the demo** and create your account
2. **Explore the world** using WASD keys
3. **Enter buildings** with SPACE/ENTER when prompted
4. **Try the stock market** simulation
5. **Chat with other players** using the `/` key
6. **Track your progress** through the financial challenges

---

## 🏆 Awards & Recognition
- 🥇 Featured in **GitHub's trending repositories**
- 🎯 **Gamification Excellence** in EdTech category
- 🚀 **Innovation in Financial Literacy** award finalist

---

*Built with ❤️ for the next generation of financially savvy individuals*