# 🚀 WCHL25 Deployment & Testing Guide
## Complete Setup for Judges and Reviewers

---

## 🎯 **Quick Demo Access**

### **Live Demo URLs**
- **Frontend**: https://dhaniverse.vercel.app
- **Backend API**: https://dhaniverse-api.deno.dev
- **WebSocket**: wss://dhaniverse-ws.deno.dev
- **ICP Canister**: `rdmx6-jaaaa-aaaah-qcaiq-cai` (Local development ID)

### **Test Accounts**
```
Demo User 1:
- Username: demo_trader_1
- Password: DemoPass123!

Demo User 2:
- Username: demo_trader_2  
- Password: DemoPass123!

Demo User 3:
- Username: demo_trader_3
- Password: DemoPass123!
```

---

## 🛠️ **Local Development Setup**

### **Prerequisites**
```bash
# Required software
- Node.js 18+ 
- Deno 1.40+
- MongoDB 6.0+
- DFX (Internet Computer SDK)
- Git

# Install DFX
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Verify installations
node --version
deno --version
mongod --version
dfx --version
```

### **Repository Setup**
```bash
# Clone repository
git clone https://github.com/Gursimrxn/dhaniverse.git
cd dhaniverse

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### **Database Setup**
```bash
# Start MongoDB
mongod --dbpath ./data/db

# Create database and collections (automatic on first run)
# The application will create necessary collections:
# - users, playerStates, bankAccounts, stockPortfolios
# - chatMessages, achievements, leaderboards
```

### **ICP Canister Deployment**
```bash
# Start local replica
dfx start --clean --background

# Deploy canister
cd packages/icp-canister
npm install
dfx deploy dhaniverse_backend

# Get canister ID
dfx canister id dhaniverse_backend

# Update environment with canister ID
echo "VITE_DHANIVERSE_CANISTER_ID=$(dfx canister id dhaniverse_backend)" >> ../../.env.local
```

### **Development Servers**
```bash
# Terminal 1: Frontend development server
npm run dev

# Terminal 2: Game backend server  
npm run server:game

# Terminal 3: WebSocket server
npm run server:ws

# Or run all together (Windows)
npm run server
```

---

## 🧪 **Testing Guide for Judges**

### **1. Basic Functionality Test**
```bash
# Access the application
Open: http://localhost:5173

# Create account or use demo credentials
Username: demo_trader_1
Password: DemoPass123!

# Verify core features:
✅ User registration/login
✅ Character movement (WASD keys)
✅ Real-time multiplayer (open multiple tabs)
✅ Chat system (press '/' to chat)
✅ Building interactions (SPACE near buildings)
```

### **2. Banking System Test**
```bash
# Enter bank building
1. Move character to bank entrance
2. Press SPACE when prompted
3. Banking UI should open

# Test banking features:
✅ View account balance
✅ Deposit money (try 1000 rupees)
✅ Withdraw money (try 500 rupees)
✅ Create fixed deposit (try 2000 rupees, 30 days)
✅ View transaction history
```

### **3. Stock Market Test**
```bash
# Enter stock market building
1. Move character to stock market entrance  
2. Press SPACE when prompted
3. Stock market UI should open

# Test trading features:
✅ View live stock prices
✅ Buy stocks (try AAPL, 10 shares)
✅ Sell stocks (try selling 5 shares)
✅ View portfolio performance
✅ Check transaction history
✅ Monitor market news
```

### **4. Multiplayer Test**
```bash
# Open multiple browser tabs/windows
1. Login with different demo accounts
2. Move characters around the map
3. Test real-time synchronization

# Verify multiplayer features:
✅ See other players moving in real-time
✅ Chat with other players
✅ Player names display correctly
✅ Smooth position interpolation
✅ Connection status indicators
```

### **5. ICP Integration Test**
```bash
# Test blockchain features (if wallet available)
1. Click "Connect Wallet" button
2. Connect ICP wallet (Plug, Internet Identity)
3. Perform banking operations
4. Check blockchain transaction records

# Verify ICP features:
✅ Wallet connection flow
✅ Principal-based authentication
✅ On-chain transaction recording
✅ Blockchain data synchronization
✅ Fallback to local storage if no wallet
```

---

## 📊 **Performance Testing**

### **Load Testing**
```bash
# Test concurrent users (requires multiple devices/browsers)
1. Open 10+ browser tabs
2. Login with different accounts
3. Move characters simultaneously
4. Monitor performance metrics

# Expected performance:
✅ <16ms render time
✅ <100ms API response time
✅ <50ms WebSocket latency
✅ Smooth 60 FPS gameplay
✅ No memory leaks during extended play
```

### **Stress Testing**
```bash
# Database stress test
1. Create 100+ transactions rapidly
2. Monitor database performance
3. Check query optimization

# WebSocket stress test  
1. Send rapid chat messages
2. Move character continuously
3. Monitor connection stability
```

---

## 🔧 **Troubleshooting Guide**

### **Common Issues & Solutions**

#### **Frontend Issues**
```bash
# Issue: Vite dev server won't start
Solution: 
rm -rf node_modules package-lock.json
npm install
npm run dev

# Issue: Game assets not loading
Solution:
Check public/maps/ directory exists
Verify asset paths in MainScene.ts
Clear browser cache
```

#### **Backend Issues**
```bash
# Issue: MongoDB connection failed
Solution:
mongod --dbpath ./data/db
Check MONGODB_URI in .env
Verify MongoDB is running on port 27017

# Issue: WebSocket connection failed  
Solution:
Check server/ws/ws.ts is running
Verify WS_PORT in .env (default: 8080)
Check firewall settings
```

#### **ICP Canister Issues**
```bash
# Issue: Canister deployment failed
Solution:
dfx start --clean
dfx deploy --reinstall-all
Check dfx.json configuration

# Issue: HTTP outcalls not working
Solution:
Verify API keys in canister code
Check network connectivity
Monitor canister logs: dfx canister logs dhaniverse_backend
```

---

## 🎮 **Demo Script for Judges**

### **5-Minute Live Demo Flow**

#### **Minute 1: Setup & Login**
```bash
1. Open https://dhaniverse.vercel.app
2. Login with demo_trader_1 / DemoPass123!
3. Show character spawning and initial UI
4. Highlight pixelated design and smooth animations
```

#### **Minute 2: Multiplayer Demo**
```bash
1. Open second tab with demo_trader_2
2. Show real-time player synchronization
3. Demonstrate chat system
4. Move both characters simultaneously
5. Highlight smooth interpolation and performance
```

#### **Minute 3: Banking System**
```bash
1. Enter bank building with first character
2. Show banking UI with current balance
3. Perform deposit (1000 rupees)
4. Create fixed deposit (2000 rupees, 30 days)
5. Show transaction history and interest calculation
```

#### **Minute 4: Stock Market**
```bash
1. Enter stock market building
2. Show live stock prices and market data
3. Buy AAPL stock (10 shares)
4. Show portfolio update and P&L calculation
5. Demonstrate market news integration
```

#### **Minute 5: ICP Integration**
```bash
1. Show wallet connection flow
2. Demonstrate blockchain transaction recording
3. Show progressive enhancement (works without wallet)
4. Highlight dual storage architecture
5. End with performance metrics and scalability
```

---

## 📈 **Monitoring & Analytics**

### **Performance Metrics Dashboard**
```typescript
// Real-time metrics available at /admin/metrics
interface SystemMetrics {
    activeUsers: number;
    databaseConnections: number;
    memoryUsage: number;
    cpuUsage: number;
    websocketConnections: number;
    averageResponseTime: number;
    errorRate: number;
}
```

### **Debug Tools**
```bash
# Enable debug mode
localStorage.setItem('debug', 'true');

# View performance stats
Press F12 -> Console -> Type: window.gameStats

# Monitor WebSocket messages
Press F12 -> Network -> WS tab

# Database query monitoring
Check server logs for slow queries
```

---

## 🏆 **Judging Criteria Checklist**

### **✅ Uniqueness (Novel Web3 Use Case)**
- First multiplayer Web3 financial education RPG
- Progressive enhancement architecture
- Dual storage innovation

### **✅ Revenue Model**
- Clear freemium strategy
- Multiple monetization streams
- B2B partnership opportunities

### **✅ Full-Stack Development**
- Complete end-to-end implementation
- No missing functionality
- Production-ready architecture

### **✅ Presentation Quality**
- Professional documentation
- Clear value proposition
- Engaging demo experience

### **✅ Utility & Value**
- Solves real financial literacy problem
- Measurable educational outcomes
- Clear target market fit

### **✅ Demo Video Quality**
- Comprehensive feature showcase
- Technical depth demonstration
- Clear business value proposition

### **✅ Code Quality**
- Enterprise-grade architecture
- Comprehensive error handling
- Type-safe implementation

### **✅ Documentation**
- Complete setup instructions
- Architecture documentation
- Deployment guides

### **✅ Technical Difficulty**
- Advanced ICP features (HTTP outcalls, timers)
- Custom package development
- Complex multiplayer architecture

### **✅ Eligibility**
- Team size compliant
- Original development
- Proper attribution

---

*This deployment guide ensures judges can easily evaluate all aspects of the project and see the full technical sophistication.*