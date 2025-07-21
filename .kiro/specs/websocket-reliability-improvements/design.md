# Design Document

## Overview

This design addresses the WebSocket reliability issues in Dhaniverse by implementing a robust connection management system that prioritizes WebSocket connectivity during game initialization, prevents duplicate connections, ensures reliable real-time updates, and provides comprehensive error handling and recovery mechanisms.

The current implementation suffers from several critical issues:
1. WebSocket connection is established after game assets load, causing delays and failures
2. No proper duplicate connection management leads to multiple connections per user
3. Unreliable reconnection logic with poor error handling
4. Session management issues causing player state inconsistencies
5. Missing connection status feedback for users

## Architecture

### Connection Priority System
The new architecture will implement a **Connection-First Loading Pattern** where WebSocket connectivity is established as the highest priority during game initialization, before any game assets are loaded.

```
Game Load Flow (New):
1. Show loading screen with connection status
2. Establish WebSocket connection (with retries)
3. Authenticate user session
4. Load game assets in parallel with connection establishment
5. Initialize multiplayer features only after successful connection
6. Fallback to offline mode if connection fails after max attempts
```

### Connection State Management
A centralized connection state manager will track and manage all WebSocket connection states:

```typescript
enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting', 
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    FAILED = 'failed',
    OFFLINE = 'offline'
}
```

### Duplicate Connection Prevention
Implement a multi-layered approach to prevent duplicate connections:
1. **Client-side**: Connection instance management with proper cleanup
2. **Server-side**: Enhanced IP and user-based connection tracking
3. **Session-based**: JWT token validation with connection replacement logic

## Components and Interfaces

### 1. Enhanced WebSocketManager

**Purpose**: Centralized WebSocket connection management with reliability features

**Key Responsibilities**:
- Priority connection establishment during game initialization
- Duplicate connection prevention and cleanup
- Robust reconnection logic with exponential backoff
- Connection state management and status reporting
- Message queuing during connection instability

**New Methods**:
```typescript
class WebSocketManager {
    // Priority connection establishment
    async connectWithPriority(username: string): Promise<ConnectionResult>
    
    // Connection state management
    getConnectionState(): ConnectionState
    onConnectionStateChange(callback: (state: ConnectionState) => void): void
    
    // Duplicate connection prevention
    private cleanupExistingConnections(): void
    private preventDuplicateConnections(): void
    
    // Enhanced reconnection
    private reconnectWithBackoff(): Promise<void>
    private resetReconnectionState(): void
    
    // Message reliability
    private queueMessage(message: any): void
    private flushMessageQueue(): void
    
    // Session management
    private restoreSession(): Promise<void>
    private syncPlayerState(): void
}
```

### 2. Connection Status Manager

**Purpose**: Provide real-time connection status feedback to users

**Features**:
- Visual connection status indicators
- Connection quality monitoring
- User-friendly error messages with action suggestions
- Offline mode notifications

**Interface**:
```typescript
interface ConnectionStatusManager {
    showConnectionStatus(status: ConnectionState, details?: string): void
    hideConnectionStatus(): void
    showConnectionError(error: ConnectionError, retryCallback?: () => void): void
    updatePlayerCount(count: number): void
}
```

### 3. Enhanced WebSocketService (Backend)

**Purpose**: Improved server-side connection management

**Enhancements**:
- Better duplicate connection handling
- Connection quality monitoring
- Message delivery guarantees
- Session restoration capabilities

**New Features**:
```typescript
class WebSocketService {
    // Enhanced connection management
    private handleDuplicateConnections(userId: string, newSocketId: string): void
    private validateConnectionQuality(socketId: string): ConnectionQuality
    
    // Message reliability
    private ensureMessageDelivery(socketId: string, message: any): Promise<boolean>
    private handleMessageQueue(socketId: string): void
    
    // Session management
    private restoreUserSession(userId: string, socketId: string): void
    private syncUserState(userId: string): UserState
}
```

### 4. Game Initialization Manager

**Purpose**: Coordinate game loading with WebSocket connection priority

**Responsibilities**:
- Manage loading sequence with connection priority
- Handle offline mode fallback
- Coordinate asset loading with connection establishment
- Provide loading progress feedback

## Data Models

### Connection State Model
```typescript
interface ConnectionState {
    state: ConnectionState
    lastConnected: Date | null
    reconnectAttempts: number
    connectionQuality: 'excellent' | 'good' | 'poor' | 'unstable'
    latency: number
    playerCount: number
}
```

### Message Queue Model
```typescript
interface QueuedMessage {
    id: string
    type: string
    payload: any
    timestamp: Date
    attempts: number
    priority: 'high' | 'normal' | 'low'
}
```

### Session State Model
```typescript
interface SessionState {
    userId: string
    username: string
    position: { x: number, y: number }
    lastActivity: Date
    connectionId: string
    isAuthenticated: boolean
}
```

## Error Handling

### Connection Error Types
```typescript
enum ConnectionError {
    NETWORK_UNAVAILABLE = 'network_unavailable',
    SERVER_UNREACHABLE = 'server_unreachable', 
    AUTHENTICATION_FAILED = 'authentication_failed',
    SESSION_EXPIRED = 'session_expired',
    DUPLICATE_CONNECTION = 'duplicate_connection',
    CONNECTION_TIMEOUT = 'connection_timeout'
}
```

### Error Recovery Strategies

1. **Network Unavailable**: 
   - Show offline mode option
   - Periodic connectivity checks
   - Auto-reconnect when network restored

2. **Server Unreachable**:
   - Exponential backoff reconnection
   - Alternative server endpoints (if available)
   - Graceful degradation to offline mode

3. **Authentication Failed**:
   - Token refresh attempt
   - Re-authentication prompt
   - Session restoration

4. **Duplicate Connection**:
   - Automatic cleanup of old connections
   - User notification of connection replacement
   - Session state preservation

### Retry Logic
```typescript
interface RetryConfig {
    maxAttempts: number
    baseDelay: number
    maxDelay: number
    backoffMultiplier: number
    jitter: boolean
}

const connectionRetryConfig: RetryConfig = {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true
}
```

## Testing Strategy

### Unit Tests
- WebSocketManager connection lifecycle
- Message queuing and delivery
- Reconnection logic with various failure scenarios
- Duplicate connection prevention
- Session state management

### Integration Tests
- End-to-end connection establishment
- Multi-user connection scenarios
- Network interruption simulation
- Server restart recovery
- Cross-browser compatibility

### Load Testing
- Multiple simultaneous connections
- Connection churn (rapid connect/disconnect)
- Message throughput under load
- Memory leak detection during long sessions

### User Experience Tests
- Connection timing during game load
- Offline mode functionality
- Connection status feedback accuracy
- Reconnection user experience

## Performance Considerations

### Connection Optimization
- Connection pooling for multiple game instances
- Efficient message serialization/deserialization
- Reduced connection handshake overhead
- Smart message batching for position updates

### Memory Management
- Proper cleanup of disconnected player objects
- Message queue size limits with LRU eviction
- Connection state garbage collection
- Event listener cleanup

### Network Efficiency
- Message compression for large payloads
- Delta compression for position updates
- Adaptive update frequency based on connection quality
- Intelligent message prioritization

## Security Enhancements

### Connection Security
- Enhanced JWT token validation
- Connection rate limiting per IP
- Anti-tampering measures for connection replacement
- Secure WebSocket (WSS) enforcement in production

### Session Security
- Session token rotation
- Connection fingerprinting
- Suspicious activity detection
- Graceful handling of security violations

## Monitoring and Observability

### Connection Metrics
- Connection success/failure rates
- Average connection establishment time
- Reconnection frequency and success rates
- Message delivery success rates

### User Experience Metrics
- Time to first successful connection
- Connection stability duration
- User-reported connection issues
- Offline mode usage patterns

### Server-side Monitoring
- Active connection counts
- Connection churn rates
- Message throughput
- Error rates by type

## Migration Strategy

### Phase 1: Enhanced Connection Management
- Implement new WebSocketManager with priority connection
- Add connection state management
- Deploy duplicate connection prevention

### Phase 2: Reliability Improvements
- Add message queuing and retry logic
- Implement robust reconnection with backoff
- Add connection status feedback

### Phase 3: Session Management
- Implement session restoration
- Add offline mode support
- Enhanced error handling and recovery

### Backward Compatibility
- Maintain existing WebSocket message formats
- Gradual rollout with feature flags
- Fallback to current implementation if issues arise