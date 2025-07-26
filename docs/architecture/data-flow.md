# Data Flow Architecture

## Overview

The Dhaniverse platform implements a sophisticated data flow architecture that manages information exchange between the React frontend, Phaser.js game engine, Deno game servers, WebSocket services, and the ICP canister backend. This document details how data flows through the system for various operations including authentication, gaming, financial transactions, and real-time multiplayer interactions.

## Primary Data Flow Patterns

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant WM as Wallet Manager
    participant W as Web3 Wallet
    participant ICP as ICP Canister
    participant IC as Internet Computer
    
    U->>FE: Initiate Login
    FE->>WM: Connect Wallet Request
    WM->>W: Request Connection
    W->>U: Wallet Authorization
    U->>W: Approve Connection
    W-->>WM: Wallet Address + Chain ID
    WM->>W: Request Signature
    W->>U: Sign Message Request
    U->>W: Sign Message
    W-->>WM: Digital Signature
    WM->>ICP: authenticate_with_signature(address, signature)
    ICP->>IC: Verify Signature
    IC-->>ICP: Verification Result
    ICP-->>WM: AuthResult + Session Token
    WM-->>FE: Authentication Success
    FE-->>U: Login Complete
```

### 2. Game State Synchronization Flow

```mermaid
sequenceDiagram
    participant P as Phaser Game
    participant FE as React Frontend
    participant GS as Game Server
    participant DB as MongoDB
    participant ICP as ICP Canister
    participant WS as WebSocket Server
    
    P->>FE: Player Action (Move, Interact)
    FE->>GS: POST /api/player/update
    GS->>DB: Update Player State
    DB-->>GS: Confirmation
    GS-->>FE: Updated State
    FE-->>P: Update Game Objects
    
    Note over GS,WS: For multiplayer actions
    GS->>WS: Broadcast Player Update
    WS->>FE: Real-time Event
    FE->>P: Update Other Players
    
    Note over FE,ICP: For blockchain operations
    FE->>ICP: Financial Transaction
    ICP-->>FE: Transaction Result
    FE->>GS: Sync Blockchain State
    GS->>DB: Update Financial Data
```
### Game State Persistence Flow

```mermaid
graph LR
    subgraph "State Management"
        GAME_STATE[Game State<br/>In Memory]
        LOCAL_CACHE[Local Storage<br/>Browser Cache]
        GAME_DB[MongoDB<br/>Game Database]
        BLOCKCHAIN[ICP Canister<br/>Blockchain State]
    end
    
    GAME_STATE --> LOCAL_CACHE
    GAME_STATE --> GAME_DB
    GAME_STATE --> BLOCKCHAIN
    
    LOCAL_CACHE -.-> GAME_STATE
    GAME_DB -.-> GAME_STATE
    BLOCKCHAIN -.-> GAME_STATE
    
    style LOCAL_CACHE fill:#e1f5fe
    style GAME_DB fill:#f3e5f5
    style BLOCKCHAIN fill:#e8f5e8
```

## API Data Flow Specifications

### REST API Data Flow

```mermaid
graph TB
    subgraph "HTTP Request Flow"
        CLIENT[Client Request]
        MIDDLEWARE[Middleware<br/>Auth, CORS, Logging]
        ROUTER[Route Handler]
        CONTROLLER[Controller Logic]
        SERVICE[Service Layer]
        DATABASE[Database Operation]
    end
    
    CLIENT --> MIDDLEWARE
    MIDDLEWARE --> ROUTER
    ROUTER --> CONTROLLER
    CONTROLLER --> SERVICE
    SERVICE --> DATABASE
    
    DATABASE --> SERVICE
    SERVICE --> CONTROLLER
    CONTROLLER --> ROUTER
    ROUTER --> MIDDLEWARE
    MIDDLEWARE --> CLIENT
```

### ICP Canister API Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant AGENT as ICP Agent
    participant CANISTER as ICP Canister
    participant STABLE as Stable Memory
    participant IC as Internet Computer
    
    FE->>AGENT: API Call with Parameters
    AGENT->>CANISTER: Candid Encoded Request
    CANISTER->>STABLE: Read/Write State
    STABLE-->>CANISTER: State Data
    CANISTER->>IC: Consensus (if update call)
    IC-->>CANISTER: Consensus Result
    CANISTER-->>AGENT: Candid Encoded Response
    AGENT-->>FE: Decoded Response
```

## Data Transformation Layers

### Frontend Data Transformation

```mermaid
graph LR
    subgraph "Data Transformation Pipeline"
        RAW[Raw API Data]
        VALIDATE[Validation Layer<br/>Type Checking]
        TRANSFORM[Transform Layer<br/>Data Mapping]
        NORMALIZE[Normalization<br/>State Structure]
        CACHE[Cache Layer<br/>Performance]
        UI[UI Components]
    end
    
    RAW --> VALIDATE
    VALIDATE --> TRANSFORM
    TRANSFORM --> NORMALIZE
    NORMALIZE --> CACHE
    CACHE --> UI
```

### Backend Data Processing

```mermaid
graph TB
    subgraph "Backend Processing Pipeline"
        INPUT[Input Data<br/>HTTP/WebSocket]
        SANITIZE[Input Sanitization<br/>Security Layer]
        VALIDATE_BE[Business Validation<br/>Rules Engine]
        PROCESS[Business Logic<br/>Processing]
        PERSIST[Data Persistence<br/>Database/Blockchain]
        RESPONSE[Response Generation<br/>Output Formatting]
    end
    
    INPUT --> SANITIZE
    SANITIZE --> VALIDATE_BE
    VALIDATE_BE --> PROCESS
    PROCESS --> PERSIST
    PERSIST --> RESPONSE
```

## Error Handling and Recovery

### Error Propagation Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant SVC as Service Layer
    participant API as API Layer
    participant DB as Database
    participant ERR as Error Handler
    
    UI->>SVC: User Action
    SVC->>API: API Request
    API->>DB: Database Query
    DB-->>API: Error Response
    API->>ERR: Handle Error
    ERR->>ERR: Log Error
    ERR->>ERR: Determine Recovery
    ERR-->>API: Recovery Action
    API-->>SVC: Fallback Response
    SVC-->>UI: User-Friendly Message
```

### Dual Storage Synchronization

```mermaid
graph TB
    subgraph "Dual Storage Pattern"
        ACTION[User Action]
        LOCAL[Local Storage<br/>Immediate Response]
        QUEUE[Sync Queue<br/>Pending Operations]
        BLOCKCHAIN[Blockchain Storage<br/>Authoritative State]
        CONFLICT[Conflict Resolution<br/>Merge Strategy]
    end
    
    ACTION --> LOCAL
    LOCAL --> QUEUE
    QUEUE --> BLOCKCHAIN
    BLOCKCHAIN --> CONFLICT
    CONFLICT --> LOCAL
    
    style LOCAL fill:#ffecb3
    style BLOCKCHAIN fill:#c8e6c9
    style CONFLICT fill:#ffcdd2
```

## Performance Optimization Patterns

### Caching Strategy

```mermaid
graph LR
    subgraph "Multi-Level Caching"
        BROWSER[Browser Cache<br/>Static Assets]
        MEMORY[Memory Cache<br/>Frequently Used Data]
        REDIS[Redis Cache<br/>Session Data]
        CDN[CDN Cache<br/>Global Distribution]
        DB_CACHE[Database Cache<br/>Query Results]
    end
    
    BROWSER --> MEMORY
    MEMORY --> REDIS
    REDIS --> CDN
    CDN --> DB_CACHE
```

### Data Loading Patterns

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant CACHE as Cache Layer
    participant API as API Service
    participant DB as Database
    
    U->>FE: Request Data
    FE->>CACHE: Check Cache
    
    alt Cache Hit
        CACHE-->>FE: Cached Data
        FE-->>U: Immediate Response
    else Cache Miss
        FE->>API: Fetch Data
        API->>DB: Query Database
        DB-->>API: Raw Data
        API-->>FE: Processed Data
        FE->>CACHE: Store in Cache
        FE-->>U: Response with Data
    end
```

## Security Data Flow

### Authentication Data Protection

```mermaid
graph TB
    subgraph "Security Layers"
        INPUT[User Input]
        SANITIZE[Input Sanitization]
        ENCRYPT[Encryption Layer]
        SIGN[Digital Signature]
        VERIFY[Signature Verification]
        AUTHORIZE[Authorization Check]
        EXECUTE[Execute Operation]
    end
    
    INPUT --> SANITIZE
    SANITIZE --> ENCRYPT
    ENCRYPT --> SIGN
    SIGN --> VERIFY
    VERIFY --> AUTHORIZE
    AUTHORIZE --> EXECUTE
```

### Data Privacy Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant ENCRYPT as Encryption Service
    participant API as API Gateway
    participant DECRYPT as Decryption Service
    participant DB as Secure Database
    
    U->>FE: Sensitive Data
    FE->>ENCRYPT: Encrypt Data
    ENCRYPT-->>FE: Encrypted Payload
    FE->>API: Send Encrypted Data
    API->>DECRYPT: Decrypt for Processing
    DECRYPT-->>API: Decrypted Data
    API->>DB: Store Securely
    DB-->>API: Confirmation
    API-->>FE: Success Response
    FE-->>U: Operation Complete
```

This comprehensive data flow architecture ensures efficient, secure, and reliable data movement throughout the Dhaniverse platform while maintaining performance and scalability requirements.