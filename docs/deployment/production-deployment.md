# Production Deployment Guide

This guide covers the complete production deployment process for all Dhaniverse components to Internet Computer mainnet and production servers.

## Overview

Production deployment involves deploying components to live environments that serve real users. This includes:

- ICP canister deployment to Internet Computer mainnet
- Game server deployment to Deno Deploy
- WebSocket server deployment to production infrastructure
- Frontend deployment to CDN/hosting platform
- Database configuration for production workloads
- Security hardening and monitoring setup

## Production Architecture

```mermaid
graph TB
    subgraph "Internet Computer Mainnet"
        ICMainnet[IC Network]
        ProdCanister[Dhaniverse Backend Canister]
        ICMainnet --> ProdCanister
    end
    
    subgraph "Deno Deploy"
        DenoInfra[Deno Deploy Infrastructure]
        GameServerProd[Game Server]
        WSServerProd[WebSocket Server]
        DenoInfra --> GameServerProd
        DenoInfra --> WSServerProd
    end
    
    subgraph "CDN/Hosting"
        CDN[Content Delivery Network]
        FrontendProd[Frontend Application]
        CDN --> FrontendProd
    end
    
    subgraph "External Services"
        MongoAtlas[(MongoDB Atlas)]
        ExternalAPIs[External APIs]
        Monitoring[Monitoring Services]
    end
    
    FrontendProd --> GameServerProd
    FrontendProd --> WSServerProd
    FrontendProd --> ProdCanister
    GameServerProd --> MongoAtlas
    GameServerProd --> ExternalAPIs
    WSServerProd --> GameServerProd
    
    Monitoring --> GameServerProd
    Monitoring --> WSServerProd
    Monitoring --> ProdCanister
```

## Pre-Deployment Checklist

### Security Preparation

- [ ] Generate secure JWT secrets for production
- [ ] Configure production MongoDB Atlas cluster with security
- [ ] Set up SSL/TLS certificates for custom domains
- [ ] Review and harden CORS policies
- [ ] Configure rate limiting and DDoS protection
- [ ] Set up backup and disaster recovery procedures

### Environment Preparation

- [ ] Create production environment variable files
- [ ] Configure production database with proper indexes
- [ ] Set up monitoring and alerting systems
- [ ] Prepare deployment scripts and CI/CD pipelines
- [ ] Test all components in staging environment
- [ ] Document rollback procedures

### Resource Planning

- [ ] Estimate compute and storage requirements
- [ ] Plan for traffic scaling and load balancing
- [ ] Configure auto-scaling policies
- [ ] Set up cost monitoring and budgets
- [ ] Plan maintenance windows and update procedures

## ICP Canister Production Deployment

### Mainnet Preparation

#### Install and Configure DFX for Mainnet

```bash
# Ensure latest DFX version
dfx upgrade

# Verify DFX version (should be latest stable)
dfx --version

# Configure identity for mainnet deployment
dfx identity new production-deploy
dfx identity use production-deploy

# Add cycles to identity for deployment costs
# Transfer ICP to identity and convert to cycles
dfx ledger account-id
dfx cycles balance
```

#### Prepare Canister for Production

```bash
# Navigate to canister directory
cd packages/icp-canister

# Optimize build for production
cargo build --target wasm32-unknown-unknown --release --locked

# Generate optimized WASM
ic-wasm target/wasm32-unknown-unknown/release/rust_icp_canister.wasm \
  -o target/wasm32-unknown-unknown/release/rust_icp_canister_optimized.wasm \
  shrink

# Update dfx.json for production settings
```

#### Deploy to IC Mainnet

```bash
# Deploy to Internet Computer mainnet
dfx deploy --network ic --with-cycles 1000000000000

# Verify deployment
dfx canister status dhaniverse_backend --network ic

# Get production canister ID
PROD_CANISTER_ID=$(dfx canister id dhaniverse_backend --network ic)
echo "Production Canister ID: $PROD_CANISTER_ID"

# Test production canister
dfx canister call dhaniverse_backend healthCheck --network ic
```

#### Configure Canister Settings

```bash
# Set canister controllers (add backup controllers)
dfx canister update-settings dhaniverse_backend \
  --add-controller <backup-principal-id> \
  --network ic

# Configure compute allocation and memory allocation
dfx canister update-settings dhaniverse_backend \
  --compute-allocation 10 \
  --memory-allocation 1073741824 \
  --network ic

# Set freezing threshold for automatic top-ups
dfx canister update-settings dhaniverse_backend \
  --freezing-threshold 2592000 \
  --network ic
```

### Canister Monitoring Setup

```bash
# Create monitoring script for canister health
#!/bin/bash
# monitor-canister.sh

CANISTER_ID="your-production-canister-id"

# Check canister status
dfx canister status $CANISTER_ID --network ic

# Check cycles balance
CYCLES=$(dfx canister status $CANISTER_ID --network ic | grep "Balance:" | awk '{print $2}')
echo "Cycles balance: $CYCLES"

# Alert if cycles are low (less than 1T)
if [ "$CYCLES" -lt 1000000000000 ]; then
    echo "WARNING: Low cycles balance!"
    # Send alert notification
fi

# Test canister functionality
dfx canister call $CANISTER_ID healthCheck --network ic
```

## Game Server Production Deployment

### Deno Deploy Setup

#### Prepare for Deno Deploy

```bash
# Navigate to game server directory
cd server/game

# Install Deno Deploy CLI
deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts

# Login to Deno Deploy
deployctl login
```

#### Configure Production Environment

```bash
# Create production environment configuration
cat > .env.production << EOF
# Production Database Configuration
MONGODB_URI=mongodb+srv://prod-user:secure-password@production-cluster.mongodb.net/dhaniverse?retryWrites=true&w=majority

# Production JWT Secret (generate secure random string)
JWT_SECRET=$(openssl rand -base64 32)

# Production Server Configuration
NODE_ENV=production
DENO_ENV=production
PORT=8000

# Production CORS Configuration
ALLOWED_ORIGINS=https://dhaniverse.com,https://www.dhaniverse.com

# External API Configuration
STOCK_API_KEY=your-production-api-key
NEWS_API_KEY=your-production-news-api-key

# Monitoring Configuration
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
EOF
```

#### Deploy to Deno Deploy

```bash
# Deploy game server
deployctl deploy --project=dhaniverse-game-server index.ts

# Configure environment variables in Deno Deploy dashboard
# Or use CLI to set environment variables
deployctl env set MONGODB_URI "mongodb+srv://..." --project=dhaniverse-game-server
deployctl env set JWT_SECRET "your-secure-jwt-secret" --project=dhaniverse-game-server
deployctl env set NODE_ENV "production" --project=dhaniverse-game-server

# Verify deployment
curl https://dhaniverse-game-server.deno.dev/health
```

#### Configure Custom Domain

```bash
# Add custom domain in Deno Deploy dashboard
# Configure DNS records:
# CNAME api.dhaniverse.com -> dhaniverse-game-server.deno.dev

# Verify SSL certificate
curl -I https://api.dhaniverse.com/health
```

### Database Production Configuration

#### MongoDB Atlas Production Setup

```bash
# Create production cluster with appropriate tier
# Configure cluster with:
# - Multi-region deployment for high availability
# - Automated backups with point-in-time recovery
# - Performance monitoring and alerting
# - Network security with IP whitelisting
# - Database user with minimal required permissions

# Create production database user
# Username: dhaniverse-prod
# Password: Generate secure password
# Roles: readWrite on dhaniverse database

# Configure connection string
MONGODB_URI="mongodb+srv://dhaniverse-prod:secure-password@production-cluster.mongodb.net/dhaniverse?retryWrites=true&w=majority&ssl=true"
```

#### Database Indexes and Optimization

```javascript
// Connect to production database and create indexes
use dhaniverse;

// User collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });

// Game session indexes
db.sessions.createIndex({ "userId": 1 });
db.sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

// Transaction indexes
db.transactions.createIndex({ "userId": 1, "createdAt": -1 });
db.transactions.createIndex({ "type": 1, "createdAt": -1 });

// Stock data indexes
db.stocks.createIndex({ "symbol": 1 });
db.stocks.createIndex({ "lastUpdated": -1 });
```

## WebSocket Server Production Deployment

### Prepare WebSocket Server

```bash
# Navigate to WebSocket server directory
cd server/ws

# Create production environment
cat > .env.production << EOF
# Production Server Configuration
PORT=8001
DENO_ENV=production
SERVER_DOMAIN=ws.dhaniverse.com

# JWT Configuration (must match game server)
JWT_SECRET=your-secure-jwt-secret

# CORS Settings
ALLOWED_ORIGINS=https://dhaniverse.com,https://www.dhaniverse.com

# Auth Server URLs
AUTH_SERVER_URL=https://api.dhaniverse.com
PRODUCTION_AUTH_SERVER_URL=https://api.dhaniverse.com

# WebSocket Configuration
MAX_CONNECTIONS=10000
HEARTBEAT_INTERVAL=30000
CONNECTION_TIMEOUT=60000
EOF
```

### Deploy WebSocket Server

```bash
# Deploy to Deno Deploy
deployctl deploy --project=dhaniverse-websocket ws.ts

# Configure environment variables
deployctl env set JWT_SECRET "your-secure-jwt-secret" --project=dhaniverse-websocket
deployctl env set AUTH_SERVER_URL "https://api.dhaniverse.com" --project=dhaniverse-websocket
deployctl env set ALLOWED_ORIGINS "https://dhaniverse.com,https://www.dhaniverse.com" --project=dhaniverse-websocket

# Configure custom domain
# CNAME ws.dhaniverse.com -> dhaniverse-websocket.deno.dev

# Test WebSocket connection
wscat -c wss://ws.dhaniverse.com
```

## Frontend Production Deployment

### Build Production Frontend

```bash
# Navigate to project root
cd dhaniverse

# Create production environment configuration
cat > .env.production << EOF
# Production API URLs
VITE_GAME_SERVER_URL=https://api.dhaniverse.com
VITE_WS_SERVER_URL=wss://ws.dhaniverse.com
VITE_DHANIVERSE_CANISTER_ID=your-production-canister-id

# Production Configuration
VITE_NODE_ENV=production
VITE_APP_VERSION=$(git describe --tags --always)

# Analytics and Monitoring
VITE_GOOGLE_ANALYTICS_ID=your-ga-id
VITE_SENTRY_DSN=your-frontend-sentry-dsn

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
EOF

# Build for production
npm run build

# Verify build output
ls -la dist/
```

### Deploy to CDN/Hosting Platform

#### Option A: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod

# Configure custom domain
vercel domains add dhaniverse.com
vercel domains add www.dhaniverse.com

# Configure environment variables in Vercel dashboard
```

#### Option B: Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Configure custom domain and SSL
netlify domains:add dhaniverse.com
```

#### Option C: AWS CloudFront + S3

```bash
# Create S3 bucket for static hosting
aws s3 mb s3://dhaniverse-frontend-prod

# Configure bucket for static website hosting
aws s3 website s3://dhaniverse-frontend-prod \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://dhaniverse-frontend-prod --delete

# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### Configure CDN and Caching

```json
// cloudfront-config.json
{
  "CallerReference": "dhaniverse-frontend-$(date +%s)",
  "Comment": "Dhaniverse Frontend Distribution",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-dhaniverse-frontend-prod",
        "DomainName": "dhaniverse-frontend-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-dhaniverse-frontend-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "Compress": true
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

## SSL/TLS and Security Configuration

### SSL Certificate Setup

```bash
# For custom domains, configure SSL certificates
# Most hosting platforms provide automatic SSL

# For manual setup with Let's Encrypt
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d dhaniverse.com \
  -d www.dhaniverse.com \
  -d api.dhaniverse.com \
  -d ws.dhaniverse.com
```

### Security Headers Configuration

```javascript
// Add to server configuration
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.dhaniverse.com wss://ws.dhaniverse.com https://*.ic0.app"
};
```

## Environment Configuration Management

### Production Environment Variables

```bash
# Create secure environment management script
#!/bin/bash
# setup-production-env.sh

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Set environment variables in deployment platforms
echo "Setting up production environment variables..."

# Deno Deploy (Game Server)
deployctl env set JWT_SECRET "$JWT_SECRET" --project=dhaniverse-game-server
deployctl env set MONGODB_URI "$PROD_MONGODB_URI" --project=dhaniverse-game-server
deployctl env set NODE_ENV "production" --project=dhaniverse-game-server

# Deno Deploy (WebSocket Server)
deployctl env set JWT_SECRET "$JWT_SECRET" --project=dhaniverse-websocket
deployctl env set AUTH_SERVER_URL "https://api.dhaniverse.com" --project=dhaniverse-websocket

# Frontend hosting platform (example for Vercel)
vercel env add VITE_DHANIVERSE_CANISTER_ID production
vercel env add VITE_GAME_SERVER_URL production
vercel env add VITE_WS_SERVER_URL production

echo "Production environment configured successfully!"
```

## Deployment Automation

### CI/CD Pipeline Setup

```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy-canister:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install DFX
        run: |
          wget https://github.com/dfinity/sdk/releases/download/0.15.1/dfx-0.15.1-x86_64-linux.tar.gz
          tar -xzf dfx-0.15.1-x86_64-linux.tar.gz
          sudo mv dfx /usr/local/bin/
          
      - name: Setup Identity
        run: |
          echo "${{ secrets.DFX_IDENTITY }}" | base64 -d > identity.pem
          dfx identity import production identity.pem
          dfx identity use production
          
      - name: Deploy Canister
        run: |
          cd packages/icp-canister
          dfx deploy --network ic --with-cycles 1000000000000
          
  deploy-servers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
          
      - name: Deploy Game Server
        run: |
          cd server/game
          deno install --allow-read --allow-write --allow-env --allow-net --allow-run --no-check -r -f https://deno.land/x/deploy/deployctl.ts
          deployctl deploy --project=dhaniverse-game-server index.ts
        env:
          DENO_DEPLOY_TOKEN: ${{ secrets.DENO_DEPLOY_TOKEN }}
          
      - name: Deploy WebSocket Server
        run: |
          cd server/ws
          deployctl deploy --project=dhaniverse-websocket ws.ts
        env:
          DENO_DEPLOY_TOKEN: ${{ secrets.DENO_DEPLOY_TOKEN }}
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build frontend
        run: npm run build
        env:
          VITE_DHANIVERSE_CANISTER_ID: ${{ secrets.PROD_CANISTER_ID }}
          VITE_GAME_SERVER_URL: https://api.dhaniverse.com
          VITE_WS_SERVER_URL: wss://ws.dhaniverse.com
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## Health Checks and Monitoring

### Production Health Monitoring

```bash
#!/bin/bash
# production-health-check.sh

echo "Checking production services health..."

# Check frontend
curl -f https://dhaniverse.com && echo "✓ Frontend healthy" || echo "✗ Frontend down"

# Check game server
curl -f https://api.dhaniverse.com/health && echo "✓ Game server healthy" || echo "✗ Game server down"

# Check WebSocket server
curl -f https://ws.dhaniverse.com/health && echo "✓ WebSocket server healthy" || echo "✗ WebSocket server down"

# Check ICP canister
dfx canister call $PROD_CANISTER_ID healthCheck --network ic && echo "✓ Canister healthy" || echo "✗ Canister not responding"

# Check database connectivity
mongosh "$PROD_MONGODB_URI" --eval "db.adminCommand('ping')" && echo "✓ Database healthy" || echo "✗ Database connection failed"
```

### Automated Monitoring Setup

```javascript
// monitoring/uptime-monitor.js
const endpoints = [
  'https://dhaniverse.com',
  'https://api.dhaniverse.com/health',
  'https://ws.dhaniverse.com/health'
];

async function checkEndpoints() {
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        console.log(`✓ ${endpoint} is healthy`);
      } else {
        console.error(`✗ ${endpoint} returned ${response.status}`);
        // Send alert notification
      }
    } catch (error) {
      console.error(`✗ ${endpoint} is unreachable: ${error.message}`);
      // Send alert notification
    }
  }
}

// Run every 5 minutes
setInterval(checkEndpoints, 5 * 60 * 1000);
```

## Rollback Procedures

### Emergency Rollback Plan

```bash
#!/bin/bash
# emergency-rollback.sh

echo "Initiating emergency rollback..."

# Rollback canister to previous version
PREVIOUS_WASM="backups/dhaniverse_backend_$(date -d '1 day ago' +%Y%m%d).wasm"
if [ -f "$PREVIOUS_WASM" ]; then
    dfx canister install dhaniverse_backend --mode upgrade --wasm "$PREVIOUS_WASM" --network ic
    echo "Canister rolled back successfully"
fi

# Rollback servers to previous deployment
deployctl rollback --project=dhaniverse-game-server
deployctl rollback --project=dhaniverse-websocket

# Rollback frontend
vercel rollback --yes

echo "Rollback completed. Verifying services..."
./production-health-check.sh
```

## Performance Optimization

### Production Performance Tuning

```bash
# Optimize canister performance
dfx canister update-settings dhaniverse_backend \
  --compute-allocation 20 \
  --memory-allocation 2147483648 \
  --network ic

# Configure database connection pooling
# In MongoDB Atlas, set:
# - Max connections: 500
# - Connection timeout: 30s
# - Socket timeout: 60s

# Enable CDN caching for static assets
# Configure cache headers for different asset types
```

### Load Testing

```bash
# Install load testing tools
npm install -g artillery

# Create load test configuration
cat > load-test.yml << EOF
config:
  target: 'https://api.dhaniverse.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "Health check"
    requests:
      - get:
          url: "/health"
  - name: "API endpoints"
    requests:
      - post:
          url: "/api/auth/login"
          json:
            username: "testuser"
            password: "testpass"
EOF

# Run load test
artillery run load-test.yml
```

## Disaster Recovery

### Backup Procedures

```bash
#!/bin/bash
# backup-production.sh

DATE=$(date +%Y%m%d_%H%M%S)

# Backup canister WASM
dfx canister call dhaniverse_backend backup_state --network ic > "backups/canister_backup_$DATE.json"

# Backup database
mongodump --uri="$PROD_MONGODB_URI" --out="backups/db_backup_$DATE"

# Backup configuration files
tar -czf "backups/config_backup_$DATE.tar.gz" \
  .env.production \
  dfx.json \
  vercel.json

echo "Backup completed: $DATE"
```

### Recovery Procedures

```bash
#!/bin/bash
# restore-production.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 <backup_date>"
    exit 1
fi

# Restore database
mongorestore --uri="$PROD_MONGODB_URI" --drop "backups/db_backup_$BACKUP_DATE"

# Restore canister state (if supported)
dfx canister call dhaniverse_backend restore_state \
  "$(cat backups/canister_backup_$BACKUP_DATE.json)" \
  --network ic

echo "Recovery completed from backup: $BACKUP_DATE"
```

## Cost Optimization

### Resource Cost Monitoring

```bash
# Monitor ICP cycles usage
dfx canister status dhaniverse_backend --network ic | grep "Balance:"

# Set up cost alerts for cloud services
# Configure billing alerts in AWS/GCP/Azure
# Set up Deno Deploy usage monitoring

# Optimize resource allocation based on usage patterns
```

## Maintenance Procedures

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

echo "Running production maintenance..."

# Update dependencies (in staging first)
# npm update
# cargo update

# Clean up old logs and temporary files
find logs/ -name "*.log" -mtime +30 -delete

# Optimize database
mongosh "$PROD_MONGODB_URI" --eval "db.runCommand({compact: 'users'})"

# Check and top up canister cycles if needed
CYCLES=$(dfx canister status dhaniverse_backend --network ic | grep "Balance:" | awk '{print $2}')
if [ "$CYCLES" -lt 5000000000000 ]; then
    dfx cycles top-up dhaniverse_backend 10000000000000 --network ic
fi

echo "Maintenance completed"
```

## Next Steps

After successful production deployment:

1. Set up comprehensive [Monitoring and Alerting](monitoring.md)
2. Implement [Scaling Strategies](scaling.md) for growth
3. Establish regular maintenance and update procedures
4. Monitor performance and optimize based on real usage
5. Plan for future feature deployments and updates

## Additional Resources

- [Internet Computer Deployment Guide](https://internetcomputer.org/docs/current/developer-docs/deploy/overview)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [MongoDB Atlas Production Checklist](https://docs.atlas.mongodb.com/reference/production-checklist/)
- [Web Security Best Practices](https://owasp.org/www-project-top-ten/)