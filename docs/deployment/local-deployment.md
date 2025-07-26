# Local Deployment Guide

This guide covers the complete local deployment process for all Dhaniverse components, including the ICP canister, game servers, and frontend application.

## Overview

Local deployment involves setting up and running all project components in a local development environment that mirrors the production setup. This includes:

- ICP canister deployment to local replica
- Game server deployment with database connections
- WebSocket server deployment for real-time features
- Frontend application build and deployment
- Service integration and testing

## Prerequisites

Before starting local deployment, ensure you have completed:

- [Prerequisites setup](../setup/prerequisites.md)
- [Local development environment setup](../setup/local-setup.md)
- [Configuration of environment variables](../setup/configuration.md)

## Deployment Architecture

```mermaid
graph TB
    subgraph "Local Environment"
        subgraph "ICP Infrastructure"
            DFX[DFX Local Replica]
            Canister[Dhaniverse Backend Canister]
            DFX --> Canister
        end
        
        subgraph "Application Servers"
            GameServer[Game Server :8000]
            WSServer[WebSocket Server :8001]
            Frontend[Frontend Server :5173]
        end
        
        subgraph "External Services"
            MongoDB[(MongoDB Atlas/Local)]
            APIs[External APIs]
        end
        
        Frontend --> GameServer
        Frontend --> WSServer
        Frontend --> Canister
        GameServer --> MongoDB
        GameServer --> APIs
        WSServer --> GameServer
    end
```

## Component Deployment

### 1. ICP Canister Deployment

#### Start Local ICP Replica

```bash
# Navigate to project root
cd dhaniverse

# Start DFX with clean state
dfx start --clean --background --host 127.0.0.1:4943

# Verify replica is running
dfx ping local
```

#### Build and Deploy Canister

```bash
# Navigate to canister directory
cd packages/icp-canister

# Install dependencies
npm install

# Build the Rust canister
cargo build --target wasm32-unknown-unknown --release

# Generate Candid interface
dfx build dhaniverse_backend

# Deploy to local replica
dfx deploy dhaniverse_backend --network local

# Verify deployment
dfx canister status dhaniverse_backend --network local
```

#### Test Canister Functions

```bash
# Test health check
dfx canister call dhaniverse_backend healthCheck

# Test account creation
dfx canister call dhaniverse_backend createAccount '("test-principal-123")'

# Test stock price functionality
dfx canister call dhaniverse_backend fetchStockPrice '("AAPL")'

# Get canister ID for frontend integration
dfx canister id dhaniverse_backend
```

### 2. Database Deployment

#### MongoDB Atlas Setup

```bash
# Verify MongoDB connection string in environment files
cat server/game/.env | grep MONGODB_URI
cat server/ws/.env | grep MONGODB_URI

# Test connection (optional)
mongosh "mongodb+srv://username:password@cluster.mongodb.net/dhaniverse"
```

#### Local MongoDB Setup (Alternative)

```bash
# Start local MongoDB service
# macOS with Homebrew
brew services start mongodb-community

# Linux with systemd
sudo systemctl start mongod

# Windows
net start MongoDB

# Verify MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"
```

### 3. Game Server Deployment

#### Environment Configuration

```bash
# Navigate to game server directory
cd server/game

# Verify environment configuration
cat .env

# Required variables:
# MONGODB_URI=mongodb+srv://...
# JWT_SECRET=your-secure-secret
# NODE_ENV=development
# PORT=8000
```

#### Deploy Game Server

```bash
# Install dependencies (if needed)
deno cache --reload index.ts

# Start server in development mode
deno run --allow-net --allow-env --allow-read --env-file=.env --watch index.ts

# Alternative: Use npm script from root
cd ../..
npm run server:game
```

#### Verify Game Server

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test API endpoints
curl -X GET http://localhost:8000/api/players

# Check server logs for database connection
# Should see: "Connected to MongoDB successfully"
```

### 4. WebSocket Server Deployment

#### Environment Configuration

```bash
# Navigate to WebSocket server directory
cd server/ws

# Verify environment configuration
cat .env

# Required variables:
# PORT=8001
# JWT_SECRET=your-secure-secret (must match game server)
# AUTH_SERVER_URL=http://localhost:8000
```

#### Deploy WebSocket Server

```bash
# Start WebSocket server
deno run --allow-net --allow-env --allow-read --env-file=.env --watch ws.ts

# Alternative: Use npm script from root
cd ../..
npm run server:ws
```

#### Verify WebSocket Server

```bash
# Test WebSocket server health
curl http://localhost:8001/health

# Test WebSocket connection (using wscat if available)
wscat -c ws://localhost:8001

# Check server logs for successful startup
```

### 5. Frontend Application Deployment

#### Build Frontend

```bash
# Navigate to project root
cd dhaniverse

# Install dependencies
npm install

# Build frontend assets
npm run build

# Verify build output
ls -la dist/
```

#### Configure Frontend Environment

```bash
# Create or update .env.local with canister ID
echo "VITE_DHANIVERSE_CANISTER_ID=$(dfx canister id dhaniverse_backend)" > .env.local

# Add other environment variables
echo "VITE_GAME_SERVER_URL=http://localhost:8000" >> .env.local
echo "VITE_WS_SERVER_URL=ws://localhost:8001" >> .env.local
```

#### Deploy Frontend Server

```bash
# Start development server
npm run dev

# Alternative: Start production preview
npm run preview

# Server will be available at http://localhost:5173
```

## Automated Deployment

### Using Deployment Scripts

#### Windows Deployment

```bash
# Use provided batch scripts
start-dfx-clean.bat      # Start DFX with clean state
deploy-canisters.bat     # Deploy ICP canisters
start-servers.bat        # Start all servers

# Or use the comprehensive deployment script
deploy-icp.sh           # Complete ICP deployment with testing
```

#### Unix/Linux/macOS Deployment

```bash
# Make scripts executable
chmod +x deploy-icp.sh
chmod +x packages/icp-canister/deploy-local.sh

# Run deployment script
./deploy-icp.sh

# Or deploy canister specifically
cd packages/icp-canister
./deploy-local.sh
cd ../..
```

### Complete Deployment Script

Create a comprehensive deployment script:

```bash
#!/bin/bash
# complete-local-deploy.sh

echo "Starting complete local deployment..."

# 1. Start DFX
echo "Starting DFX local replica..."
dfx start --clean --background --host 127.0.0.1:4943
sleep 10

# 2. Deploy canister
echo "Deploying ICP canister..."
cd packages/icp-canister
dfx deploy dhaniverse_backend --network local
CANISTER_ID=$(dfx canister id dhaniverse_backend)
cd ../..

# 3. Update environment
echo "VITE_DHANIVERSE_CANISTER_ID=$CANISTER_ID" > .env.local

# 4. Build frontend
echo "Building frontend..."
npm run build

# 5. Start servers in background
echo "Starting game server..."
npm run server:game &
GAME_PID=$!

echo "Starting WebSocket server..."
npm run server:ws &
WS_PID=$!

echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# 6. Wait and verify
sleep 5
echo "Verifying deployments..."

# Test endpoints
curl -f http://localhost:8000/health && echo "✓ Game server running"
curl -f http://localhost:8001/health && echo "✓ WebSocket server running"
curl -f http://localhost:5173 && echo "✓ Frontend server running"

echo "Deployment complete!"
echo "Frontend: http://localhost:5173"
echo "Game Server: http://localhost:8000"
echo "WebSocket Server: http://localhost:8001"
echo "Canister ID: $CANISTER_ID"

# Save PIDs for cleanup
echo "$GAME_PID $WS_PID $FRONTEND_PID" > .deployment_pids
```

## Service Integration Testing

### End-to-End Testing

```bash
# Test complete user flow
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass"}'

# Test canister integration
dfx canister call dhaniverse_backend createAccount '("test-principal")'

# Test WebSocket connection
# Use browser developer tools or WebSocket testing tool
```

### Integration Verification Checklist

- [ ] ICP canister responds to health checks
- [ ] Game server connects to database successfully
- [ ] WebSocket server authenticates with game server
- [ ] Frontend loads and displays correctly
- [ ] Wallet connection functionality works
- [ ] Game features interact with canister
- [ ] Real-time features work through WebSocket
- [ ] API endpoints return expected responses

## Monitoring and Logs

### Log Locations

```bash
# DFX logs
dfx logs dhaniverse_backend

# Game server logs
# Check terminal output where server is running

# WebSocket server logs
# Check terminal output where server is running

# Frontend logs
# Check browser developer console
```

### Health Monitoring

```bash
# Create monitoring script
#!/bin/bash
# monitor-services.sh

echo "Monitoring local services..."

# Check DFX
dfx ping local && echo "✓ DFX running" || echo "✗ DFX not running"

# Check game server
curl -f http://localhost:8000/health && echo "✓ Game server healthy" || echo "✗ Game server down"

# Check WebSocket server
curl -f http://localhost:8001/health && echo "✓ WebSocket server healthy" || echo "✗ WebSocket server down"

# Check frontend
curl -f http://localhost:5173 && echo "✓ Frontend accessible" || echo "✗ Frontend not accessible"

# Check canister
dfx canister call dhaniverse_backend healthCheck && echo "✓ Canister healthy" || echo "✗ Canister not responding"
```

## Cleanup and Shutdown

### Graceful Shutdown

```bash
# Stop development servers (Ctrl+C in each terminal)

# Or kill background processes
if [ -f .deployment_pids ]; then
    kill $(cat .deployment_pids)
    rm .deployment_pids
fi

# Stop DFX
dfx stop

# Stop MongoDB (if local)
brew services stop mongodb-community  # macOS
sudo systemctl stop mongod            # Linux
net stop MongoDB                      # Windows
```

### Clean Deployment State

```bash
# Remove build artifacts
rm -rf dist/
rm -rf node_modules/
rm -rf .dfx/

# Clean canister state
dfx start --clean --background
dfx deploy --network local

# Reset database (if needed)
# Connect to MongoDB and drop collections
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Find processes using ports
lsof -i :4943  # DFX
lsof -i :8000  # Game server
lsof -i :8001  # WebSocket server
lsof -i :5173  # Frontend

# Kill conflicting processes
kill -9 <PID>
```

#### Canister Deployment Failures
```bash
# Check DFX status
dfx ping local

# Restart DFX with clean state
dfx stop
dfx start --clean --background

# Rebuild and redeploy
cd packages/icp-canister
cargo clean
dfx build
dfx deploy --network local
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh "$MONGODB_URI"

# Check environment variables
env | grep MONGODB_URI

# Verify network access (for Atlas)
ping cluster0.mongodb.net
```

#### Service Communication Issues
```bash
# Check CORS configuration
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8000/api/health

# Verify JWT secrets match between services
grep JWT_SECRET server/game/.env
grep JWT_SECRET server/ws/.env
```

## Performance Optimization

### Local Development Optimization

```bash
# Use development builds for faster compilation
export NODE_ENV=development
export DENO_ENV=development

# Enable hot reloading
npm run dev  # Frontend hot reload
# Deno servers use --watch flag automatically

# Optimize DFX performance
dfx start --artificial-delay 0
```

### Resource Monitoring

```bash
# Monitor resource usage
top -p $(pgrep -f "dfx\|deno\|node")

# Check disk usage
du -sh .dfx/
du -sh node_modules/
du -sh dist/
```

## Next Steps

After successful local deployment:

1. Review [Production Deployment Guide](production-deployment.md) for mainnet deployment
2. Set up [Monitoring and Maintenance](monitoring.md) procedures
3. Consider [Scaling Strategies](scaling.md) for production use
4. Test with [API Documentation](../api/) examples
5. Implement [Development Workflow](../development/development-workflow.md) practices

## Additional Resources

- [DFX Command Reference](https://internetcomputer.org/docs/current/references/cli-reference/dfx-parent)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)