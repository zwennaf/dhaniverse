# System Architecture

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Architecture](#component-architecture)
  - [Frontend Architecture](#frontend-architecture)
  - [Backend Architecture](#backend-architecture)
- [Data Flow Architecture](#data-flow-architecture)
  - [Primary Data Flow](#primary-data-flow)
  - [Real-time Communication Flow](#real-time-communication-flow)
- [Security Architecture](#security-architecture)
  - [Authentication Flow](#authentication-flow)
  - [Security Layers](#security-layers)
- [Deployment Architecture](#deployment-architecture)
  - [Development Environment](#development-environment)
  - [Production Environment](#production-environment)
- [Performance Considerations](#performance-considerations)
  - [Scalability Design](#scalability-design)
  - [Optimization Strategies](#optimization-strategies)
- [Technology Stack Summary](#technology-stack-summary)
- [Integration Points](#integration-points)

## Overview

Dhaniverse is a comprehensive Web3 gaming platform that combines traditional gaming mechanics with blockchain technology. The system is built on a distributed architecture that includes an Internet Computer Protocol (ICP) canister backend, multiple game servers, a React-based frontend, and various supporting services.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        FE[React Frontend<br/>Vite + TypeScript]
        PH[Phaser.js Game Engine]
        UI[UI Components<br/>Tailwind CSS]
    end
    
    subgraph "Game Services Layer"
        GS[Game Server<br/>Deno + Oak]
        WS[WebSocket Server<br/>Deno]
        MO[Map Optimizer<br/>TypeScript Package]
    end
    
    subgraph "Blockchain Layer"
        ICP[ICP Canister<br/>Rust Backend]
        WM[Wallet Manager<br/>Web3 Integration]
        AUTH[Authentication<br/>Digital Signatures]
    end
    
    subgraph "Data Layer"
        MONGO[MongoDB<br/>Game State]
        STABLE[Stable Memory<br/>ICP Storage]
        LOCAL[Local Storage<br/>Browser Cache]
    end
    
    subgraph "External Services"
        IC[Internet Computer<br/>Network]
        WALLETS[Web3 Wallets<br/>MetaMask, Coinbase]
        CDN[Content Delivery<br/>Static Assets]
    end
    
    FE --> GS
    FE --> WS
    FE --> ICP
    PH --> MO
    UI --> WM
    
    GS --> MONGO
    WS --> MONGO
    ICP --> STABLE
    FE --> LOCAL
    
    ICP --> IC
    WM --> WALLETS
    FE --> CDN
    
    AUTH --> ICP
    WM --> AUTH
```

## Component Architecture

### Frontend Architecture

```mermaid
graph LR
    subgraph "React Application"
        APP[App.tsx<br/>Main Router]
        LP[Landing Page]
        GP[Game Page]
        AUTH_UI[Auth Components]
    end
    
    subgraph "Game Engine"
        GAME[game.ts<br/>Game Controller]
        SCENE[MainScene.ts<br/>Game Scene]
        SYSTEMS[Game Systems]
        ENTITIES[Game Entities]
    end
    
    subgraph "Services Layer"
        ICP_MGR[ICP Integration Manager]
        WALLET_SVC[Wallet Service]
        STORAGE_SVC[Dual Storage Manager]
        API_SVC[API Services]
    end
    
    subgraph "UI Systems"
        HUD[Game HUD]
        BANKING[Banking UI]
        STOCK[Stock Market UI]
        ATM[ATM Interface]
    end
    
    APP --> LP
    APP --> GP
    GP --> GAME
    GAME --> SCENE
    SCENE --> SYSTEMS
    SCENE --> ENTITIES
    
    GAME --> ICP_MGR
    ICP_MGR --> WALLET_SVC
    ICP_MGR --> STORAGE_SVC
    SYSTEMS --> API_SVC
    
    GP --> HUD
    HUD --> BANKING
    HUD --> STOCK
    HUD --> ATM
```

### Backend Architecture

```mermaid
graph TB
    subgraph "ICP Canister (Rust)"
        LIB[lib.rs<br/>Main Entry Point]
        AUTH_MOD[auth.rs<br/>Authentication]
        WALLET_MOD[wallet.rs<br/>Wallet Management]
        BANKING_MOD[banking.rs<br/>Banking Operations]
        STORAGE_MOD[storage.rs<br/>State Management]
        TYPES_MOD[types.rs<br/>Data Types]
        ERROR_MOD[error.rs<br/>Error Handling]
        MONITOR_MOD[monitoring.rs<br/>Performance Monitoring]
    end
    
    subgraph "Game Server (Deno)"
        SERVER_APP[ServerApp.ts<br/>Main Application]
        CONTROLLERS[Controllers<br/>Request Handlers]
        SERVICES[Services<br/>Business Logic]
        DB_LAYER[Database Layer<br/>MongoDB Integration]
        AUTH_JWT[JWT Authentication]
    end
    
    subgraph "WebSocket Server (Deno)"
        WS_SERVER[ws.ts<br/>WebSocket Handler]
        REAL_TIME[Real-time Events]
        PLAYER_SYNC[Player Synchronization]
    end
    
    LIB --> AUTH_MOD
    LIB --> WALLET_MOD
    LIB --> BANKING_MOD
    LIB --> STORAGE_MOD
    LIB --> MONITOR_MOD
    
    AUTH_MOD --> TYPES_MOD
    WALLET_MOD --> TYPES_MOD
    BANKING_MOD --> TYPES_MOD
    STORAGE_MOD --> TYPES_MOD
    
    ERROR_MOD --> AUTH_MOD
    ERROR_MOD --> WALLET_MOD
    ERROR_MOD --> BANKING_MOD
    
    SERVER_APP --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> DB_LAYER
    CONTROLLERS --> AUTH_JWT
    
    WS_SERVER --> REAL_TIME
    WS_SERVER --> PLAYER_SYNC
```

## Data Flow Architecture

### Primary Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant GS as Game Server
    participant ICP as ICP Canister
    participant DB as MongoDB
    participant IC as Internet Computer
    
    U->>FE: User Action
    FE->>GS: API Request
    GS->>DB: Query/Update Data
    DB-->>GS: Response
    GS-->>FE: API Response
    
    FE->>ICP: Blockchain Operation
    ICP->>IC: Network Call
    IC-->>ICP: Response
    ICP-->>FE: Result
    
    FE-->>U: UI Update
```

### Real-time Communication Flow

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant FE1 as Frontend 1
    participant WS as WebSocket Server
    participant FE2 as Frontend 2
    participant P2 as Player 2
    
    P1->>FE1: Game Action
    FE1->>WS: WebSocket Message
    WS->>FE2: Broadcast Event
    FE2->>P2: Real-time Update
    
    Note over WS: Handles multiplayer<br/>synchronization
```

## Security Architecture

### Authentication Flow

```mermaid
graph LR
    subgraph "Authentication Process"
        USER[User]
        WALLET[Web3 Wallet]
        SIG[Digital Signature]
        ICP_AUTH[ICP Authentication]
        SESSION[Session Management]
    end
    
    USER --> WALLET
    WALLET --> SIG
    SIG --> ICP_AUTH
    ICP_AUTH --> SESSION
    
    SESSION --> USER
```

### Security Layers

```mermaid
graph TB
    subgraph "Security Layers"
        L1[Transport Security<br/>HTTPS/WSS]
        L2[Authentication<br/>Digital Signatures]
        L3[Authorization<br/>Role-based Access]
        L4[Data Validation<br/>Input Sanitization]
        L5[Blockchain Security<br/>ICP Consensus]
    end
    
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
```

## Deployment Architecture

### Development Environment

```mermaid
graph LR
    subgraph "Local Development"
        DEV[Developer Machine]
        DFX[DFX Local Network]
        DENO_DEV[Deno Development Server]
        VITE_DEV[Vite Development Server]
        MONGO_LOCAL[Local MongoDB]
    end
    
    DEV --> DFX
    DEV --> DENO_DEV
    DEV --> VITE_DEV
    DEV --> MONGO_LOCAL
```

### Production Environment

```mermaid
graph TB
    subgraph "Production Deployment"
        IC_MAIN[Internet Computer<br/>Mainnet]
        CANISTER[Production Canister]
        GAME_PROD[Game Server<br/>Deno Deploy]
        WS_PROD[WebSocket Server<br/>Deno Deploy]
        MONGO_PROD[MongoDB Atlas]
        CDN_PROD[Vercel/CDN<br/>Frontend Assets]
    end
    
    IC_MAIN --> CANISTER
    GAME_PROD --> MONGO_PROD
    WS_PROD --> MONGO_PROD
    CDN_PROD --> CANISTER
```

## Performance Considerations

### Scalability Design

```mermaid
graph TB
    subgraph "Scalability Patterns"
        LB[Load Balancing<br/>Multiple Instances]
        CACHE[Caching Layer<br/>Redis/Memory]
        CDN_SCALE[CDN Distribution<br/>Global Edge Nodes]
        DB_SCALE[Database Scaling<br/>Sharding/Replication]
        CANISTER_SCALE[Canister Scaling<br/>Multiple Canisters]
    end
    
    LB --> CACHE
    CACHE --> CDN_SCALE
    CDN_SCALE --> DB_SCALE
    DB_SCALE --> CANISTER_SCALE
```

### Optimization Strategies

1. **Frontend Optimization**
   - Code splitting and lazy loading
   - Asset optimization and compression
   - Browser caching strategies
   - Progressive loading for game assets

2. **Backend Optimization**
   - Database query optimization
   - Connection pooling
   - Caching frequently accessed data
   - Efficient memory management in Rust

3. **Network Optimization**
   - WebSocket connection management
   - Batch API requests where possible
   - Compression for data transfer
   - CDN utilization for static assets

## Technology Stack Summary

### Frontend Technologies
- **React 19.1.0**: UI framework
- **TypeScript 5.8.3**: Type safety
- **Vite 6.2.0**: Build tool and development server
- **Phaser.js 3.88.2**: Game engine
- **Tailwind CSS 3.4.11**: Styling framework
- **Framer Motion 12.23.7**: Animations

### Backend Technologies
- **Rust**: ICP canister development
- **Deno**: Server runtime
- **Oak**: Web framework for Deno
- **MongoDB**: Database
- **Internet Computer Protocol**: Blockchain platform

### Web3 Technologies
- **@dfinity/agent 3.0.2**: ICP integration
- **@dfinity/auth-client 3.0.2**: Authentication
- **Ethers.js 6.15.0**: Ethereum integration
- **@coinbase/wallet-sdk 4.3.7**: Coinbase Wallet
- **@walletconnect/ethereum-provider 2.16.1**: WalletConnect

### Development Tools
- **DFX**: ICP development framework
- **Cargo**: Rust package manager
- **npm/pnpm**: JavaScript package management
- **Vercel**: Frontend deployment
- **Deno Deploy**: Server deployment

## Integration Points

### External Service Integration

```mermaid
graph LR
    subgraph "External Integrations"
        DHANIVERSE[Dhaniverse Platform]
        IC_NET[Internet Computer Network]
        WALLETS_EXT[External Wallets]
        MONGO_ATLAS[MongoDB Atlas]
        VERCEL[Vercel Hosting]
        DENO_DEPLOY[Deno Deploy]
    end
    
    DHANIVERSE --> IC_NET
    DHANIVERSE --> WALLETS_EXT
    DHANIVERSE --> MONGO_ATLAS
    DHANIVERSE --> VERCEL
    DHANIVERSE --> DENO_DEPLOY
```

### API Integration Architecture

```mermaid
graph TB
    subgraph "API Layer"
        REST[REST APIs<br/>Game Server]
        WS_API[WebSocket APIs<br/>Real-time]
        ICP_API[ICP Canister APIs<br/>Blockchain]
        CANDID[Candid Interface<br/>Type Safety]
    end
    
    REST --> WS_API
    WS_API --> ICP_API
    ICP_API --> CANDID
```

This architecture provides a robust, scalable foundation for the Dhaniverse Web3 gaming platform, ensuring security, performance, and maintainability across all system components.

## Related Documentation

- [Data Flow Architecture](./data-flow.md) - Detailed data flow patterns and communication
- [Security Architecture](./security-architecture.md) - Security measures and authentication
- [Technology Stack](./technology-stack.md) - Technology choices and rationale
- [ICP Canister API](../api/icp-canister.md) - Blockchain backend API reference
- [Game Server API](../api/game-server.md) - Game server endpoints and integration
- [Component Documentation](../components/) - Individual component details

---

**Navigation**: [← Architecture Index](./index.md) | [Main Documentation](../README.md) | [Data Flow →](./data-flow.md)