# Maya RAG Server - Quick Start Guide

## 🚀 Start the Server

```bash
cd /Users/dave/Work/products/dhaniverse/server/npc
npm start
```

Server runs on:
- HTTP: `http://localhost:3001`
- WebSocket: `ws://localhost:8081`

---

## 📋 Essential Endpoints

### 1. Check Server Status
```bash
curl http://localhost:3001/health | jq
```

### 2. Simple Chat (Personalized AI Response)
```bash
curl -X POST http://localhost:3001/api/chat/YOUR_USER_ID \
  -H "Content-Type: application/json" \
  -d '{"query": "show my stock transactions"}' | jq
```

### 3. Conversation Graph (Branching Dialogue)
```bash
curl -X POST http://localhost:3001/api/conversation-graph/YOUR_USER_ID \
  -H "Content-Type: application/json" \
  -d '{"npcName": "maya", "topic": "investment advice"}' | jq
```

### 4. List Available NPCs
```bash
curl http://localhost:3001/api/npcs | jq
```

---

## 🧪 Test with Sample User

**User ID:** `68af42c4c4375cbf230ebfa9` (Gursimran Singh)

### Test Stock Transactions
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"query": "display my stock transactions"}' | jq '.result.message'
```

### Test Portfolio Analysis
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"query": "show my portfolio"}' | jq '.result.message'
```

### Test Bank Account
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"query": "check my bank balance"}' | jq '.result.message'
```

### Test Conversation with FinBot
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"npcName": "finbot", "topic": "my trading history"}' | jq '.result.response_data.conversation_tree'
```

### Test Conversation with Risky Rick
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"npcName": "risky_rick", "topic": "aggressive investing"}' | jq '.result.response_data.conversation_tree.intro'
```

---

## 🎭 Available NPCs

| NPC | Role | Personality | Best For |
|-----|------|-------------|----------|
| **maya** | Financial Advisor | Friendly, patient, educational | Beginners, general advice |
| **finbot** | Trader | Quirky, tech-savvy, data-driven | Active traders, market analysis |
| **risky_rick** | Risk Taker | Bold, enthusiastic, high-energy | Aggressive players, growth strategies |
| **budget_beth** | Saver | Careful, practical, nurturing | Conservative players, budgeting |

---

## 📊 Data Accessed

Every request fetches from **8 MongoDB collections:**

1. ✅ users (account, character)
2. ✅ playerStates (position, financial data)
3. ✅ bankAccounts (balance, transactions)
4. ✅ stockPortfolios (holdings, P&L)
5. ✅ stockTransactions (trading history)
6. ✅ fixedDeposits (FD investments)
7. ✅ gameSessions (play history)
8. ✅ achievements (unlocked milestones)

---

## 🔍 Response Preview

**Chat Response Format:**
```json
{
  "success": true,
  "result": {
    "id": "uuid",
    "userId": "...",
    "message": "Formatted response with emojis 📈",
    "type": "simple"
  },
  "context": {
    "enrichedData": {
      "stockTransactionsCount": 23,
      "hasPortfolio": true
    },
    "userProfile": {
      "risk_profile": "low",
      "investment_experience": "beginner"
    }
  },
  "executionTime": "318ms"
}
```

**Conversation Graph Format:**
```json
{
  "success": true,
  "result": {
    "type": "conversation_graph",
    "response_data": {
      "conversation_tree": {
        "npc_name": "Maya",
        "intro": "Personalized intro with data...",
        "conversation_tree": {
          "1": {
            "npc": "First message...",
            "options": {
              "1a": { "text": "Option A", "next": "2a" },
              "1b": { "text": "Option B", "next": "2b" }
            }
          }
        }
      }
    }
  }
}
```

---

## 🛠️ Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :3001

# Rebuild TypeScript
npm run build

# Check environment variables
cat .env
```

### No data returned
```bash
# Build user context first
curl -X POST http://localhost:3001/api/build-context/YOUR_USER_ID

# Verify MongoDB connection in server logs
```

### Check server logs
Server logs show:
- 📊 Enriched data fetching
- 💬 Conversation generation
- ✅ Success/error messages
- ⏱️ Execution times

---

## 📚 Full Documentation

See `API_ENDPOINTS.md` for complete API reference with all query types and response examples.

---

## 🎮 Integration Example

```javascript
// In your game client
async function getNPCResponse(userId, query, npcName = 'maya') {
  const response = await fetch(`http://localhost:3001/api/chat/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  return data.result.message;
}

// Usage
const advice = await getNPCResponse(
  'user123', 
  'Should I invest in stocks?'
);
console.log(advice);
```

---

**Quick Reference:** See `API_ENDPOINTS.md` for detailed documentation
