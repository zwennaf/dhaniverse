# Dhaniverse — Gamified Financial Management Platform

![dhaniverse readme](https://github.com/user-attachments/assets/a734781e-3fb3-4339-a5de-d21b3143685f)

> "We're not just making financial education fun — we're making it relevant to young India's unique challenges."

**Dhaniverse** is a 2D open-world RPG game that transforms the way Gen Z and Millennials learn about personal finance. It combines interactive gameplay with real-world financial education to create an immersive learning experience.

## About the Project

Dhaniverse is an immersive financial literacy platform designed to teach real-world money skills through interactive gameplay. The platform enables users to learn saving, investing, budgeting, and entrepreneurship in a low-risk, high-reward virtual environment.

**Key Benefits:**
- Perfect for students and young professionals
- Built with behavioral economics and gamification principles
- Real-life financial simulations and decision-making scenarios

## Documentation

For comprehensive information about the project, please refer to our detailed documentation:

- **[Getting Started](docs/setup/index.md)** - Setup and installation guide
- **[Architecture Overview](docs/architecture/index.md)** - System design and technical architecture
- **[API Documentation](docs/api/index.md)** - Complete API reference
- **[Development Guide](docs/development/index.md)** - Development workflow and standards
- **[Deployment Guide](docs/deployment/index.md)** - Production deployment instructions
- **[Component Documentation](docs/components/index.md)** - Detailed component specifications

## Technology Stack

### Frontend
- **React.js** with TypeScript for UI components
- **Phaser 3** for WebGL 2D game rendering
- **Vite** build system for fast development
- **Modular ESModules** architecture

### Backend
- **Deno** runtime with MongoDB database
- **WebSocket** for real-time multiplayer functionality
- **JWT** authentication with token management
- **Oak** framework for REST APIs

### Blockchain Integration (ICP)
- **Internet Computer Protocol** for decentralized features
- **Azle Framework** for TypeScript canisters
- **Principal-based Authentication** for secure identity management
- **Dual Storage Strategy** for hybrid local/blockchain data

### Design & Assets
- **Figma** for UI/UX design
- **Tiled Map Editor** for game world creation
- **Custom packages** for map optimization and chunking

## Core Features

### Gameplay Elements
- **RPG-style map exploration** with chunked loading and dynamic optimization
- **Habit-building missions** for practicing budgeting, saving, and investing
- **Real-world finance simulations** including stock trading and tax planning
- **Real-time multiplayer** with WebSocket connections and chat system
- **Advanced error handling** with graceful degradation and retry mechanisms

### Technical Features
- **High-performance map optimization** with binary chunking and encryption
- **Smart loading system** with predictive caching and memory management
- **Real-time multiplayer infrastructure** with room-based gameplay
- **Comprehensive error handling** chain for robust user experience
- **WebGL optimization** with automatic fallback and recovery systems
- **Modular architecture** with separate packages for specialized functionality
- **Blockchain integration** with ICP for tamper-proof financial education
- **Decentralized leaderboards** with verifiable trading achievements
- **On-chain banking** with optional wallet connection for enhanced features

### Use Cases
- Curriculum add-on for schools and colleges
- Fintech onboarding for Gen Z users
- Self-paced learning tool for individuals

## Business Model

| Model | Description |
|-------|-------------|
| **Freemium** | Basic access free, advanced levels behind subscription |
| **In-Game Purchases** | Cosmetic upgrades, power-ups, financial tools |
| **Premium Zones** | Unlock deeper simulations like Startup Street & Investor Island |
| **Ethical In-Game Ads** | Contextual, skippable ads from relevant brands |

**Target Demographics:** 18–35 years | **Global Scale:** Localized content for different currencies and regions

## Project Structure

### Architecture Overview

```
dhaniverse/
├── packages/                   # Modular packages
│   ├── map-optimizer/          # High-performance map optimization
│   │   ├── src/
│   │   │   ├── chunker/        # Map chunking algorithms
│   │   │   ├── manager/        # Chunk management system
│   │   │   ├── parser/         # Binary map parsing
│   │   │   └── types/          # TypeScript definitions
│   │   └── package.json
│   └── icp-canister/           # ICP blockchain integration
│       ├── src/
│       │   ├── index.ts        # Main canister implementation
│       │   └── types.ts        # Blockchain data models
│       └── dfx.json            # ICP deployment configuration
├── src/                        # Game client source
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
├── server/                     # Deno backend
│   ├── src/
│   │   ├── auth/               # Authentication systems
│   │   ├── db/                 # Database schemas & operations
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # WebSocket & business logic
│   │   └── websocket-server.ts # Real-time multiplayer
│   └── deno.json
├── docs/                       # Comprehensive documentation
│   ├── setup/                  # Installation and configuration
│   ├── architecture/           # System design documentation
│   ├── api/                    # API reference
│   ├── development/            # Development guidelines
│   ├── deployment/             # Deployment instructions
│   └── components/             # Component specifications
├── public/                     # Static assets
│   ├── maps/chunks/            # Optimized map chunks
│   ├── characters/             # Character sprites
│   └── UI/                     # Interface assets
└── tools/                      # Build & optimization tools
```

### Key Systems

#### Map Optimization Package
- **Binary chunking** for faster loading
- **AES-256 encryption** for security
- **Smart caching** with LRU eviction
- **Memory management** with WebGL optimization
- **Error recovery** with graceful degradation

#### Multiplayer Infrastructure
- **WebSocket server** with room-based sessions
- **Real-time chat** with message broadcasting
- **Player synchronization** with position interpolation
- **Connection management** with automatic reconnection
- **Anti-tampering** measures and rate limiting

#### Financial Simulation Systems
- **Stock market** with real-time price updates
- **Banking system** with fixed deposits and transactions
- **Portfolio management** with profit/loss tracking
- **Building interactions** (Bank, Stock Market, etc.)
- **Progress tracking** with level and experience systems

#### ICP Blockchain Integration
- **On-chain Banking Ledger** - Player balances stored immutably on Internet Computer
- **Decentralized Leaderboards** - Trading achievements verified and tamper-proof
- **Progressive Enhancement** - Works without wallet, enhanced with ICP connection
- **Dual Storage Strategy** - Seamless fallback between blockchain and traditional storage
- **Principal-based Security** - Secure user authentication via ICP identity system

## Future Scope & Expansion

- Mobile App and Wearables Integration
- AI-powered Personal Finance Advisors
- School and College Partnerships
- Real-world banking and investing integrations
- B2B solutions for Banks, Fintechs, Edtechs, and Governments

**Market Potential:** ₹15,000 Cr Indian Financial Literacy Market  
**Global Reach:** 1.8 Billion+ Gen Zs entering financial independence  
**App Market Growth:** $1.5B by 2025, 24% YoY growth

## WCHL25 Hackathon Integration

### Blockchain Utility Demonstration

Dhaniverse showcases practical blockchain integration that enhances rather than replaces traditional systems:

- **Tamper-proof Financial Records**: Player banking data stored immutably on ICP
- **Verifiable Achievements**: Stock trading leaderboards that can't be manipulated
- **Decentralized Identity**: Principal-based authentication for secure, portable user profiles
- **Educational Transparency**: On-chain data proves learning progress and financial literacy gains

### Technical Innovation

- **Progressive Enhancement**: Game works perfectly without blockchain, enhanced with ICP
- **Dual Storage Architecture**: Intelligent switching between local and on-chain data
- **Real-world Application**: Blockchain solves actual problems in financial education
- **User-friendly Onboarding**: Optional wallet connection doesn't disrupt gameplay flow

### Hackathon Demo Flow

1. **Traditional Gameplay**: Start playing immediately without any blockchain setup
2. **Wallet Connection**: Optional ICP wallet integration for enhanced features
3. **On-chain Banking**: Deposit/withdraw with immutable transaction records
4. **Leaderboard Competition**: Compete on tamper-proof trading performance rankings
5. **Data Verification**: Demonstrate blockchain data integrity and transparency

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Deno runtime for backend services
- MongoDB for database
- Git for version control

### Quick Start

```bash
# Clone the repository
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

# ICP Canister development
cd packages/icp-canister
npm run start        # Start local ICP replica
npm run deploy       # Deploy canister to local network
npm run build        # Build canister for deployment
```

### Building & Deployment

- **Frontend**: Built with Vite, deployed on Vercel
- **Backend**: Deno runtime, deployed on Deno Deploy
- **Database**: MongoDB with connection pooling
- **WebSocket**: Separate service for real-time features

## Live Demo

Experience Dhaniverse in action: **https://dhaniverse.vercel.app**

### Quick Start Guide

1. **Visit the demo** and create your account
2. **Explore the world** using WASD keys
3. **Enter buildings** with SPACE/ENTER when prompted
4. **Try the stock market** simulation
5. **Chat with other players** using the `/` key
6. **Track your progress** through the financial challenges

## Contributing

We welcome open-source collaboration! Interested in contributing? Help us expand quests, optimize performance, or integrate global financial systems.

For detailed contribution guidelines, please see our [Development Guide](docs/development/index.md).

## Awards & Recognition

- Featured in GitHub's trending repositories
- Gamification Excellence in EdTech category
- Innovation in Financial Literacy award finalist

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with dedication for the next generation of financially savvy individuals.