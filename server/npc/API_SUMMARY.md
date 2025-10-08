# Maya RAG Server - API Summary

## 📡 Base URL
```
http://localhost:3001
```

---

## 🔥 Most Used Endpoints

### 1️⃣ Simple Chat (AI Response)
**POST** `/api/chat/:userId`

**Query Types:**
- Stock transactions → Detailed trading history
- Portfolio → Holdings with P&L analysis  
- Bank account → Balance and transactions
- Stats/Profile → Complete overview
- Advice → Personalized recommendations

**Example:**
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"query": "show my transactions"}'
```

**Returns:** Formatted markdown response with emojis, data from all 8 collections

---

### 2️⃣ Conversation Graph (Branching Dialogue)
**POST** `/api/conversation-graph/:userId`

**NPCs Available:**
- `maya` - Financial Advisor (friendly, educational)
- `finbot` - Trader (quirky, data-driven) 
- `risky_rick` - Risk Taker (bold, high-energy)
- `budget_beth` - Saver (careful, practical)

**Example:**
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"npcName": "finbot", "topic": "my trades"}'
```

**Returns:** 4-5 turn dialogue tree with personalized content based on user's actual data

---

### 3️⃣ List NPCs
**GET** `/api/npcs`

```bash
curl http://localhost:3001/api/npcs
```

**Returns:** All 4 NPC personalities with traits and expertise

---

### 4️⃣ Health Check
**GET** `/health`

```bash
curl http://localhost:3001/health
```

**Returns:** Server status, version, available features

---

## 📊 Data Sources (All Endpoints)

Every request uses **8 MongoDB Collections:**

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

---

## 🎯 Key Features

✅ **Real Multi-Collection Data** - All 8 collections fetched in parallel  
✅ **Personalized Responses** - Based on risk profile, experience, character  
✅ **Specific Details** - References actual stock names, holdings, transactions  
✅ **Dynamic Conversations** - NPCs mention your 23 trades, 3 holdings, etc.  
✅ **Character Bonuses** - C2 gets 20% savings interest, unique advantages  
✅ **Fast Performance** - 250-350ms response time  

---

## 🧪 Test User Data

**User ID:** `68af42c4c4375cbf230ebfa9`

**Profile:**
- Name: Gursimran Singh
- Character: C2 (Saver)
- Level: 1
- Risk Profile: Low
- Experience: Beginner

**Financial Data:**
- Bank Balance: ₹10,000
- Stock Transactions: 23 (13 buy, 10 sell)
- Portfolio Holdings: 3 stocks (ABBV, SOL, AMZN)
- Total Invested: ₹132,280
- Current Value: ~₹95,000

---

## 💡 Example Responses

### Stock Transaction Query
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -d '{"query": "show transactions"}'
```

**Returns:**
```
📈 Complete Stock Transaction History for Gursimran Singh

📊 Transaction Summary:
• Total Transactions: 23
• Buy Orders: 13
• Sell Orders: 10
• Total Invested: ₹132,280.56
• Total Returns: ₹83,711.24

📋 Transaction Details:
1. SELL 1000x Polygon (MATIC)
   Price: ₹22.94 | Total: ₹22,940.00
   Date: 10/5/2025 at 11:06:16 PM

[... 22 more transactions ...]

💼 Current Portfolio Holdings:
• ABBV: 1 shares @ ₹150 (+5.2%)
• SOL: 1 shares @ ₹125 (-2.1%)
• AMZN: 8 shares @ ₹11,700 (+3.8%)
```

### Conversation with FinBot
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -d '{"npcName": "finbot", "topic": "trading"}'
```

**Intro:**
```
*analyzes data* WHOA! 23 transactions?! BitRodent's circuits are 
BUZZING! Let's talk about your trading patterns - I've spotted 
some interesting moves! 🐹⚡
```

**Dialogue Node:**
```
*analyzes charts* OH YEAH! I've been tracking your 23 trades! 
Recent moves in Polygon, Amazon.com Inc., Amazon.com Inc. 
caught my attention! BitRodent is impressed! 🐹📊
```

---

## 🔄 Response Flow

```
User Request
    ↓
Extract userId
    ↓
Fetch Enriched Data (8 collections in parallel)
    ├── users
    ├── playerStates  
    ├── bankAccounts
    ├── stockPortfolios
    ├── stockTransactions (23 records)
    ├── fixedDeposits
    ├── gameSessions
    └── achievements
    ↓
Analyze User Profile
    ├── Risk: low
    ├── Experience: beginner
    ├── Goals: [build_emergency_fund, stable_returns]
    └── Traits: [cautious, practical, active_investor]
    ↓
Generate Response
    ├── Chat: Specialized response (transactions/portfolio/bank/stats)
    └── Conversation: Dynamic tree with NPC personality
    ↓
Return JSON with context + execution time (250-350ms)
```

---

## 🎭 NPC Personalities

| NPC | Intro Example | Dialogue Style |
|-----|---------------|----------------|
| **Maya** | "I've been reviewing your 23 transactions - impressive activity!" | References your data, educational tone |
| **FinBot** | "WHOA! 23 transactions?! BitRodent's circuits are BUZZING!" | Mentions specific stocks, quirky humor |
| **Risky Rick** | "🚀 23 TRADES?! Now THAT'S what I'm talking about!" | High energy, celebrates activity |
| **Budget Beth** | "I'm so proud - you've saved ₹10,000!" | Acknowledges bank balance, nurturing |

---

## 📈 Performance

| Endpoint | Avg Time | Data Sources |
|----------|----------|--------------|
| /health | < 10ms | None |
| /api/npcs | < 5ms | Static |
| /api/chat/:userId | 250-350ms | 8 collections |
| /api/conversation-graph/:userId | 250-350ms | 8 collections |
| /api/build-context/:userId | 200-400ms | Vector embeddings |

---

## 🚦 Quick Test Commands

```bash
# Health check
curl http://localhost:3001/health | jq '.status'

# List NPCs
curl http://localhost:3001/api/npcs | jq '.result.npcs[].name'

# Simple chat
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"query": "show my stocks"}' | jq '.result.message'

# Conversation with FinBot
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{"npcName": "finbot"}' | jq '.result.response_data.conversation_tree.intro'

# Check enriched data
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -d '{"query": "test"}' | jq '.context.enrichedData'
```

---

## 📚 Documentation Files

- **API_ENDPOINTS.md** - Complete API reference with all examples
- **QUICK_START.md** - Getting started guide
- **API_SUMMARY.md** - This file (visual overview)

---

**Version:** 1.2.0  
**Last Updated:** October 7, 2025
