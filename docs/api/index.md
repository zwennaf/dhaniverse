# API Documentation

This section provides complete API reference documentation for all Dhaniverse services and endpoints, including authentication, data formats, and usage examples.

## Table of Contents

- [ICP Canister API](./icp-canister.md) - Rust canister methods and blockchain integration
- [Game Server API](./game-server.md) - Deno server REST endpoints and authentication
- [WebSocket API](./websocket.md) - Real-time communication protocols and message formats
- [Frontend APIs](./frontend-apis.md) - React service APIs and component interfaces

## API Overview

### Authentication Flow
All APIs use Web3 wallet-based authentication. See the [Authentication Guide](../setup/configuration.md#authentication) for setup details.

### Base URLs
- **ICP Canister**: `rdmx6-jaaaa-aaaaa-aaadq-cai` (local) / Production canister ID
- **Game Server**: `http://localhost:8000` (local) / Production URL
- **WebSocket Server**: `ws://localhost:8080` (local) / Production WebSocket URL

### Common Response Formats

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-26T10:30:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-26T10:30:00Z"
}
```

## Quick Navigation

### Related Documentation
- [Architecture](../architecture/) - System design and component relationships
- [Components](../components/) - Individual component documentation
- [Setup & Configuration](../setup/) - API configuration and environment setup
- [Development](../development/) - Development workflows and testing

### Integration Guides
- [Wallet Integration](../components/blockchain-integration.md#wallet-integration)
- [Game Server Integration](../components/game-engine.md#server-integration)
- [Real-time Features](../components/ui-components.md#real-time-components)

---

[← Back to Main Documentation](../README.md)