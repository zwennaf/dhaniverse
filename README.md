# Dhaniverse — Gamified Financial Management Platform

![dhaniverse readme](https://github.com/user-attachments/assets/a734781e-3fb3-4339-a5de-d21b3143685f)

An immersive 2D RPG that teaches real-world money skills through play.

> "We're not just making financial education fun — we're making it relevant to young India's unique challenges."

## License & Usage (Important)

This codebase is proprietary. All rights reserved. See the LICENSE file for full terms.

- No permission is granted to use, copy, modify, merge, publish, distribute, sublicense, or sell any part of this software without prior written permission.
- All game assets (including but not limited to maps, characters, sprites, UI, audio) are copyrighted by the Dhaniverse team and may not be used outside this project.
- For licensing or partnership inquiries, contact: @Gursimrxn (GitHub)

## Quick Links

- Live Demo: https://dhaniverse.in
- Documentation: [./docs/README.md](./docs/README.md)
- Architecture: [./docs/architecture/index.md](./docs/architecture/index.md)
- APIs: [./docs/api/index.md](./docs/api/index.md)



## Tech Snapshot

- Frontend: React + TypeScript, Phaser 3, Vite
- Backend: Deno (Oak), MongoDB, WebSocket, JWT
- Blockchain: Internet Computer (ICP) optional integration
- Docs: see ./docs

## Highlights

- Open-world RPG for financial literacy (budgeting, saving, investing)
- Real-time multiplayer with smooth sync
- Map optimization and chunked loading for performance

## Project Structure

### Architecture Overview (Summary)

```
dhaniverse/
├── packages/                        # Modular packages
│   ├── map-optimizer/               # Map optimization utilities
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── icp-canister/                # ICP (Internet Computer) canister (Rust)
│       ├── src/
│       ├── Cargo.toml
│       ├── rust_icp_canister.did
│       └── README.md
├── server/                          # Backend services (Deno)
│   ├── game/                        # REST APIs, DB, business logic
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── db/
│   │   │   ├── routes/              # authRouter.ts, gameRouter.ts, apiRouter.ts
│   │   │   └── config/
│   │   ├── index.ts                 # Entry (see package scripts)
│   │   └── .env.example
│   └── ws/                          # WebSocket server (real-time multiplayer)
│       ├── ws.ts
│       ├── deno.json
│       └── .env.example
├── src/                             # Frontend (React + Phaser)
│   ├── game/
│   │   ├── entities/
│   │   ├── scenes/
│   │   ├── systems/
│   │   ├── managers/                # e.g., ATMManager.ts
│   │   └── utils/                   # e.g., CharacterAnimations.ts
│   ├── ui/
│   │   ├── components/
│   │   └── contexts/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── main.ts
│   └── style.css
├── public/                          # Static assets
│   ├── characters/
│   ├── collisions/
│   ├── fonts/
│   ├── maps/
│   ├── UI/
│   ├── humans.txt
│   ├── site.webmanifest
│   ├── sw.js
│   └── favicon.ico
├── deps/                            # External declarations & candid
│   ├── init.json
│   ├── pulled.json
│   └── candid/
├── docs/                            # Comprehensive documentation
│   ├── setup/
│   ├── architecture/
│   ├── api/
│   ├── development/
│   ├── deployment/
│   └── components/
├── tools/                           # Build & documentation tools
│   ├── chunk-map.js
│   ├── docs-code-validator.js
│   ├── docs-link-checker.js
│   └── package.json
├── index.html
├── LICENSE
├── README.md
└── package.json
```

### Key Systems (Summary)

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

## Status

Roadmap and future scope are tracked in docs.

## Contributions

We are not accepting external contributions at this time.

## WCHL25 Hackathon Integration (Overview)

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

For setup and deployment, see docs/setup and docs/deployment.

## Live Demo

Experience Dhaniverse in action: **https://dhaniverse.in**

### Quick Start Guide

1. **Visit the demo** and create your account
2. **Explore the world** using WASD keys
3. **Enter buildings** with SPACE/ENTER when prompted
4. **Try the stock market** simulation
5. **Chat with other players** using the `/` key
6. **Track your progress** through the financial challenges

<!-- External contributions are not accepted. Internal guidelines are in docs/development. -->

## Awards & Recognition

- Won 1st Place at HACKMOL 6.0
- WCHL 25 NATIONAL ROUND QUALIFIER

---

Built with dedication for the next generation of financially savvy individuals.