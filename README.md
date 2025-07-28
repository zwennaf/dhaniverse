# Dhaniverse — Gamified Financial Management Platform

**Dhaniverse** is a 2D open-world RPG game that transforms the way Gen Z and Millennials learn about personal finance. It combines interactive gameplay with real-world financial education to create an immersive learning experience.

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

## Features

- **RPG-style map exploration** with chunked loading and dynamic optimization
- **Real-world finance simulations** including stock trading and banking
- **Real-time multiplayer** with WebSocket connections and chat system
- **Blockchain integration** with ICP for tamper-proof financial education
- **Habit-building missions** for practicing budgeting, saving, and investing



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



## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with dedication for the next generation of financially savvy individuals.