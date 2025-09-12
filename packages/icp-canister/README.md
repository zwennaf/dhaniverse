# Dhaniverse ICP Canister Setup Guide

## 🚀 Quick Start for Developers

### Prerequisites
- [DFX SDK](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (v0.15.0+)
- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)

### Installation Commands
```bash
# Install DFX
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Verify installations
dfx --version
cargo --version
node --version
```

## 🏗️ Project Structure
```
client/packages/icp-canister/
├── src/                    # Rust source code
├── dfx.json               # DFX configuration
├── Cargo.toml             # Rust dependencies
├── canister_ids.json      # Canister IDs for networks
├── scripts/               # Deployment scripts
└── README.md              # This file
```

## 🔧 Development Workflow

### 1. Local Development
```bash
# Navigate to canister directory
cd client/packages/icp-canister

# Start local replica
dfx start --clean --background

# Deploy locally
dfx deploy --network local

# Test functions
dfx canister call dhaniverse_backend health_check
```

### 2. Mainnet Deployment
```bash
# Build for production
dfx build --network ic

# Deploy to mainnet
dfx deploy --network ic

# Verify deployment
dfx canister --network ic status dhaniverse_backend
```

## 🌐 Network Configuration

### Mainnet Canister IDs
- **Backend**: `2v55c-vaaaa-aaaas-qbrpq-cai`
- **Frontend**: TBD (will be assigned on first frontend deploy)

### URLs
- **Backend API**: https://2v55c-vaaaa-aaaas-qbrpq-cai.icp0.io/
- **Candid UI**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=2v55c-vaaaa-aaaas-qbrpq-cai

## 📡 Server-Sent Events (SSE) API

### Overview
The canister provides Server-Sent Events (SSE) support for real-time communication. This allows clients to subscribe to streams of updates for rooms, peer connections, and WebRTC signaling.

### SSE Endpoints

#### Subscribe to Room Events
```
GET /sse/rooms/{roomId}/subscribe
```

**Headers:**
- `Authorization: Bearer {wallet_address}:{session_token}` (required)
- `Last-Event-ID: {eventId}` (optional, for reconnection)

**Query Parameters:**
- `token={wallet_address}:{session_token}` (alternative to Authorization header)

**Response:**
- Content-Type: `text/event-stream`
- Connection: `keep-alive`
- Cache-Control: `no-cache`

### Event Types

#### 1. Peer Joined
```
event: peer-joined
data: {"peerId": "peer-123", "meta": {"username": "alice"}}
```

#### 2. Peer Left
```
event: peer-left
data: {"peerId": "peer-123"}
```

#### 3. WebRTC Offer
```
event: offer
data: {"from": "peer-1", "to": "peer-2", "sdp": "v=0\r\n..."}
```

#### 4. WebRTC Answer
```
event: answer
data: {"from": "peer-2", "to": "peer-1", "sdp": "v=0\r\n..."}
```

#### 5. ICE Candidate
```
event: ice-candidate
data: {"from": "peer-1", "to": "peer-2", "candidate": {"candidate": "...", "sdpMid": "0"}}
```

#### 6. Room State
```
event: room-state
data: {"peers": ["peer-1", "peer-2"], "meta": {"connectionCount": "2"}}
```

### Client Examples

#### Browser (JavaScript)
```javascript
// Create EventSource connection
const eventSource = new EventSource(
  `https://canister-id.icp0.io/sse/rooms/room123/subscribe?token=${walletAddress}:${sessionToken}`
);

// Handle connection events
eventSource.onopen = () => {
  console.log('SSE connection opened');
};

eventSource.onerror = (error) => {
  console.error('SSE connection error:', error);
  // EventSource will automatically reconnect
};

// Handle specific event types
eventSource.addEventListener('peer-joined', (event) => {
  const data = JSON.parse(event.data);
  console.log('Peer joined:', data.peerId, data.meta);
});

eventSource.addEventListener('offer', (event) => {
  const data = JSON.parse(event.data);
  if (data.to === myPeerId) {
    handleIncomingOffer(data.from, data.sdp);
  }
});

// Handle all events
eventSource.onmessage = (event) => {
  console.log('Event:', event.type, JSON.parse(event.data));
};

// Clean up
// eventSource.close();
```

#### Node.js
```javascript
const EventSource = require('eventsource');

const eventSource = new EventSource(
  `https://canister-id.icp0.io/sse/rooms/room123/subscribe`,
  {
    headers: {
      'Authorization': `Bearer ${walletAddress}:${sessionToken}`
    }
  }
);

eventSource.on('peer-joined', (event) => {
  const data = JSON.parse(event.data);
  console.log('Peer joined:', data);
});

eventSource.on('error', (error) => {
  console.error('SSE error:', error);
});
```

#### React Hook
```javascript
import { useEffect, useState } from 'react';

function useSSERoom(roomId, auth) {
  const [events, setEvents] = useState([]);
  const [connectionState, setConnectionState] = useState('connecting');

  useEffect(() => {
    if (!roomId || !auth) return;

    const eventSource = new EventSource(
      `/sse/rooms/${roomId}/subscribe?token=${auth.walletAddress}:${auth.sessionToken}`
    );

    eventSource.onopen = () => setConnectionState('connected');
    eventSource.onerror = () => setConnectionState('error');

    eventSource.onmessage = (event) => {
      const eventData = {
        id: event.lastEventId,
        type: event.type,
        data: JSON.parse(event.data),
        timestamp: Date.now()
      };
      setEvents(prev => [...prev, eventData]);
    };

    return () => {
      eventSource.close();
      setConnectionState('disconnected');
    };
  }, [roomId, auth]);

  return { events, connectionState };
}
```

### Broadcasting Events (Canister Methods)

#### Peer Lifecycle
```rust
// Broadcast when peer joins
await canister.sse_broadcast_peer_joined(roomId, peerId, meta);

// Broadcast when peer leaves
await canister.sse_broadcast_peer_left(roomId, peerId);
```

#### WebRTC Signaling
```rust
// Broadcast WebRTC offer
await canister.sse_broadcast_offer(roomId, fromPeer, toPeer, sdp);

// Broadcast WebRTC answer
await canister.sse_broadcast_answer(roomId, fromPeer, toPeer, sdp);

// Broadcast ICE candidate
await canister.sse_broadcast_ice_candidate(roomId, fromPeer, toPeer, candidate);
```

### Configuration

#### Default Limits
```rust
SseConfig {
    max_connections_per_room: 100,
    max_buffer_size_per_room: 1000,
    connection_timeout_ms: 300_000,    // 5 minutes
    max_event_age_ms: 600_000,         // 10 minutes
    cleanup_interval_ms: 60_000,       // 1 minute
}
```

#### Monitoring
```rust
// Get room statistics
let (connections, events) = canister.sse_get_room_stats(roomId);

// Get global statistics
let (rooms, connections, total_events) = canister.sse_get_global_stats();

// Cleanup expired connections
let cleaned = canister.sse_cleanup_connections();
```

### Authentication

SSE endpoints use the same authentication system as other canister methods:

1. **Session Token Format**: `{wallet_address}:{session_token}`
2. **Validation**: Checks existing session validity
3. **Authorization**: Authenticated users can access any room (configurable)

### Reconnection

Clients automatically reconnect with `Last-Event-ID` header:
- Browser `EventSource` handles this automatically
- Manual reconnection sends `Last-Event-ID: {lastEventId}`
- Server replays missed events from circular buffer

### Error Handling

#### HTTP Status Codes
- `200`: Successful connection
- `400`: Invalid URL or request format
- `401`: Authentication failed
- `403`: Access denied to room
- `429`: Too many connections (rate limited)
- `500`: Internal server error

#### Connection Limits
- Max 100 connections per room (configurable)
- Connections timeout after 5 minutes of inactivity
- Old events are cleaned up after 10 minutes

### Best Practices

1. **Handle Reconnection**: Use EventSource for automatic reconnection
2. **Store Last Event ID**: For manual reconnection scenarios
3. **Validate Events**: Check event types and data structure
4. **Rate Limiting**: Don't spam broadcast methods
5. **Cleanup**: Close connections when component unmounts

## 👥 Team Setup

### For New Team Members
1. **Clone the repository**
2. **Install prerequisites** (see above)
3. **Run setup script**: `./scripts/setup.sh`
4. **Create DFX identity**: `dfx identity new [your-name]`
5. **Switch to your identity**: `dfx identity use [your-name]`

### Identity Management
```bash
# List identities
dfx identity list

# Create new identity
dfx identity new developer-name

# Switch identity
dfx identity use developer-name

# Get your principal
dfx identity get-principal
```

## 🔐 Permissions & Controllers

### Current Controller
- **Principal**: `36q22-eox2s-m6uxb-5jaib-gclok-vqa4e-ougby-bzglh-ky7i7-iaq2r-jqe`
- **Identity**: `gursimran`

### Adding New Controllers
```bash
# Add team member as controller
dfx canister --network ic update-settings --add-controller [PRINCIPAL_ID] dhaniverse_backend

# Remove controller (admin only)
dfx canister --network ic update-settings --remove-controller [PRINCIPAL_ID] dhaniverse_backend
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
cargo test

# Integration tests
cargo test --test integration_tests

# Canister tests
dfx canister call dhaniverse_backend health_check
```

### Available Test Functions
- `health_check()` - Basic connectivity test
- `get_canister_metrics()` - Performance metrics
- `get_system_health()` - System status

## 📦 Build & Deploy Scripts

### Quick Commands
```bash
# Local development
npm run dev:local

# Build for production
npm run build:ic

# Deploy to mainnet
npm run deploy:ic

# Full rebuild and deploy
npm run redeploy:ic
```

## 🔄 CI/CD Integration

### GitHub Actions (Recommended)
```yaml
# .github/workflows/deploy.yml
name: Deploy to IC
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install DFX
        run: sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
      - name: Deploy
        run: |
          cd client/packages/icp-canister
          dfx deploy --network ic
```

## 🚨 Troubleshooting

### Common Issues
1. **"Canister not found"** - Check canister_ids.json matches network
2. **"Permission denied"** - Ensure you're added as controller
3. **"Build failed"** - Check Rust toolchain and dependencies
4. **"Network timeout"** - Try `dfx ping ic` to test connectivity

### Debug Commands
```bash
# Check canister status
dfx canister --network ic status dhaniverse_backend

# View canister info
dfx canister --network ic info dhaniverse_backend

# Check cycles balance
dfx wallet --network ic balance
```

## 💰 Cycles Management

### Monitoring
```bash
# Check canister cycles
dfx canister --network ic status dhaniverse_backend

# Top up cycles (if needed)
dfx canister --network ic deposit-cycles 1000000000000 dhaniverse_backend
```

### Cycle Alerts
- Monitor cycles regularly
- Set up alerts when < 1T cycles
- Budget ~100B cycles per month for active development

## 📚 Additional Resources
- [Internet Computer Documentation](https://internetcomputer.org/docs/)
- [DFX Command Reference](https://internetcomputer.org/docs/current/references/cli-reference/)
- [Rust CDK Documentation](https://docs.rs/ic-cdk/)
- [Candid Guide](https://internetcomputer.org/docs/current/developer-docs/backend/candid/)