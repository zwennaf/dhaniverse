# Maya RAG Server

A RAG-powered NPC conversation system with multi-collection MongoDB integration for personalized financial advice in the Dhaniverse game.

## ✨ Features

- 🤖 **4 Unique NPCs** with distinct personalities and expertise
- 📊 **Multi-Collection Data** from 8 MongoDB collections (users, playerStates, bankAccounts, stockPortfolios, stockTransactions, fixedDeposits, gameSessions, achievements)
- 💬 **Dual Response Types**: Simple chat and branching conversation graphs
- 🎯 **Personalized Content** based on user's actual financial data, risk profile, and game progress
- ⚡ **Fast Performance** (250-350ms response time)
- 🔄 **Real-time Updates** using direct MongoDB queries

## 📚 Documentation

- **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** - Complete API reference with all examples
- **[QUICK_START.md](./QUICK_START.md)** - Getting started guide  
- **[API_SUMMARY.md](./API_SUMMARY.md)** - Visual overview and quick reference

## Setup Instructions

### 1. Install Dependencies

```bash
cd /Users/dave/Work/products/dhaniverse/server/maya
npm install
```

### 2. Environment Configuration

The `.env` file is already configured with your MongoDB connection. You need to add your Gemini API key:

```bash
# Edit .env and replace with your actual Gemini API key
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 3. Start Vector Database (PostgreSQL with pgvector)

```bash
# Start PostgreSQL with pgvector using Docker Compose
npm run docker:up

# Verify PostgreSQL is running
docker exec maya-postgres-1 pg_isready -U postgres
```

### 4. Initialize Contrag (Schema Introspection)

```bash
# Introspect your MongoDB schema
npm run introspect
```

This will analyze your MongoDB database structure and understand the relationships between entities.

### 5. Build Context for Users

Before users can chat, you need to build their personalized context:

```bash
# Build context for a specific user (replace USER_ID with actual user ID)
npm run build-context USER_ID
```

Or via API:
```bash
curl -X POST http://localhost:3001/api/build-context/USER_ID
```

### 6. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Or build and run production
npm run build
npm start
```

## 🚀 Quick Start

### Most Common Endpoints

```bash
# 1. Simple chat with personalized AI response
curl -X POST http://localhost:3001/api/chat/USER_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "show my stock transactions"}'

# 2. Conversation graph with branching dialogue
curl -X POST http://localhost:3001/api/conversation-graph/USER_ID \
  -H "Content-Type: application/json" \
  -d '{"npcName": "maya", "topic": "investment advice"}'

# 3. List available NPCs
curl http://localhost:3001/api/npcs

# 4. Health check
curl http://localhost:3001/health
```

### Test with Sample User

```bash
# User ID: 68af42c4c4375cbf230ebfa9 (has 23 stock transactions, 3 holdings)

# View stock transactions
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -d '{"query": "show my transactions"}' | jq '.result.message'

# Chat with FinBot about trading
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -d '{"npcName": "finbot", "topic": "my trades"}' | jq '.result.response_data.conversation_tree.intro'
```

See **[QUICK_START.md](./QUICK_START.md)** for more examples.

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description | Response Time |
|--------|----------|-------------|---------------|
| POST | `/api/chat/:userId` | Personalized AI responses | 250-350ms |
| POST | `/api/conversation-graph/:userId` | Branching dialogue trees | 250-350ms |
| GET | `/api/npcs` | List available NPCs | < 5ms |
| GET | `/health` | Server status | < 10ms |

### Query Types (Chat Endpoint)

The chat endpoint intelligently detects query type and formats responses:

- **Stock transactions** → Complete trading history with P&L
- **Portfolio** → Holdings with current prices and gains/losses  
- **Bank account** → Balance and transaction history
- **Stats/Profile** → Comprehensive overview
- **Advice** → Personalized recommendations

### Available NPCs (Conversation Endpoint)

| NPC | Role | Personality | Best For |
|-----|------|-------------|----------|
| `maya` | Financial Advisor | Friendly, educational | Beginners, general advice |
| `finbot` | Trader | Quirky, data-driven | Active traders, analysis |
| `risky_rick` | Risk Taker | Bold, high-energy | Aggressive strategies |
| `budget_beth` | Saver | Careful, practical | Conservative investing |

See **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** for complete documentation.

## Usage Example

### 1. Build User Context

```bash
curl -X POST http://localhost:3001/api/build-context/user123
```

### 2. Connect to WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8081?userId=user123&username=John');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(`${message.username}: ${message.message}`);
};

// Send a message
ws.send(JSON.stringify({
  message: "What's my current balance and recent transactions?"
}));
```

### 3. Query via REST

```bash
curl -X POST http://localhost:3001/api/query/user123 \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me my stock portfolio performance"}'
```

## 📊 Data Sources

Every request fetches from **8 MongoDB Collections** in parallel:

```
┌─────────────────────┬──────────────────────────────────────┐
│ Collection          │ Data Provided                        │
├─────────────────────┼──────────────────────────────────────┤
│ users               │ Account, character, game level       │
│ playerStates        │ Position, financial data, progress   │
│ bankAccounts        │ Balance, transactions history        │
│ stockPortfolios     │ Holdings, current prices, P&L        │
│ stockTransactions   │ All buy/sell orders (complete)       │
│ fixedDeposits       │ FD investments, interest             │
│ gameSessions        │ Play history, activities             │
│ achievements        │ Unlocked milestones                  │
└─────────────────────┴──────────────────────────────────────┘
```

## 💬 NPC Capabilities

All NPCs can discuss with personalized context:

- **Financial Overview** - Real balance, wealth, account details from `bankAccounts` & `playerStates`
- **Trading History** - All 23+ transactions from `stockTransactions` with specific stock names
- **Portfolio Analysis** - Current holdings from `stockPortfolios` with P&L calculations
- **Banking** - Account balances and transaction history from `bankAccounts`
- **Game Progress** - Level, achievements from `users` & `achievements`
- **Risk Profile** - Calculated from asset allocation and trading patterns
- **Character Bonuses** - C2 gets 20% savings interest, other characters have unique perks

### Example NPC Responses

**FinBot discussing your trades:**
> "*analyzes charts* OH YEAH! I've been tracking your 23 trades! Recent moves in Polygon, Amazon.com Inc., Amazon.com Inc. caught my attention! BitRodent is impressed! 🐹📊"

**Budget Beth acknowledging your savings:**
> "Hello dear! I'm so proud - you've saved ₹10,000 in your bank account! Such wonderful discipline from a level 1 player!"

**Risky Rick celebrating activity:**
> "🚀 23 TRADES?! Now THAT'S what I'm talking about! Your C2 character is making MOVES! Let's review your boldest plays!"

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Maya RAG       │    │   MongoDB       │
│   Chat Client   │◄───┤   Server         │◄───┤   (Dhaniverse)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Contrag SDK    │◄───┤   PostgreSQL    │
                       │                  │    │   (pgvector)    │
                       └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Gemini         │
                       │   Embeddings     │
                       └──────────────────┘
```

## Development

- The server uses TypeScript and supports hot reload with `npm run dev`
- WebSocket connections are tracked and automatically cleaned up
- Context building is done per-user and cached in the vector database
- The AI responses are currently rule-based but designed to easily integrate with LLMs

## Troubleshooting

1. **PostgreSQL Connection Issues**: Make sure Docker is running and PostgreSQL is accessible at localhost:5432
2. **MongoDB Connection**: Verify your connection string in the .env file
3. **Gemini API**: Ensure your API key is valid and has sufficient credits
4. **Context Building**: Users must have their context built before meaningful chat interactions

## Next Steps

1. Integrate with a proper LLM (OpenAI GPT, Claude, etc.) for better responses
2. Add more master entities (PlayerState, BankAccount, etc.)
3. Implement conversation memory and context
4. Add authentication and rate limiting
5. Create a web-based chat interface
