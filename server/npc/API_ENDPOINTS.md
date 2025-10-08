# Maya RAG Server API Documentation

Complete API reference for the NPC conversation and financial advisory system.

**Base URL:** `http://localhost:3001`

**Version:** 1.2.0

---

## Table of Contents

1. [Health & Status](#health--status)
2. [User Context Management](#user-context-management)
3. [Chat Endpoints](#chat-endpoints)
4. [Conversation Graph Endpoints](#conversation-graph-endpoints)
5. [NPC Management](#npc-management)
6. [Debug Endpoints](#debug-endpoints)

---

## Health & Status

### GET /health

Check server health and available features.

**Request:**
```bash
curl -X GET http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-07T21:04:48.869Z",
  "server": "Maya RAG Server",
  "version": "1.2.0",
  "features": {
    "simple_chat": "POST /api/chat/:userId",
    "conversation_graphs": "POST /api/conversation-graph/:userId",
    "available_npcs": "GET /api/npcs",
    "user_context": "POST /api/build-context/:userId",
    "raw_query": "POST /api/query/:userId"
  },
  "conversation_service": {
    "npcs_available": 4,
    "personalities": ["Maya", "FinBot", "Risky Rick", "Budget Beth"]
  }
}
```

---

## User Context Management

### POST /api/build-context/:userId

Build vector embeddings and context for a specific user from MongoDB collections.

**Parameters:**
- `userId` (path parameter) - User ID to build context for

**Request:**
```bash
curl -X POST http://localhost:3001/api/build-context/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Context built successfully",
  "result": {
    "status": "success",
    "chunks_created": 1
  },
  "executionTime": "245ms",
  "userId": "68af42c4c4375cbf230ebfa9"
}
```

**Use Case:** Should be called once when a user first interacts with the system to build their vector embeddings.

---

### POST /api/query/:userId

Query user context using vector similarity search (raw ContRAG chunks).

**Parameters:**
- `userId` (path parameter) - User ID to query
- `query` (body) - Natural language query

**Request:**
```bash
curl -X POST http://localhost:3001/api/query/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the user's financial profile?"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "chunks": [
      {
        "id": "users:68af42c4c4375cbf230ebfa9:0",
        "namespace": "users:68af42c4c4375cbf230ebfa9",
        "content": "Entity: users (ID: 68af42c4c4375cbf230ebfa9)...",
        "metadata": {
          "entity": "users",
          "uid": "68af42c4c4375cbf230ebfa9",
          "relations": [],
          "timestamp": "2025-08-27T17:39:16.901Z"
        }
      }
    ],
    "query": "What is the user's financial profile?",
    "timestamp": "2025-10-07T21:04:48.869Z",
    "executionTime": "42ms"
  }
}
```

**Use Case:** Low-level API for debugging vector search results.

---

## Chat Endpoints

### POST /api/chat/:userId

Generate personalized AI responses using enriched multi-collection data.

**Parameters:**
- `userId` (path parameter) - User ID for personalization
- `query` (body) - User's question or request
- `responseType` (body, optional) - Response type (`"simple"` or `"conversation_graph"`)

**Features:**
- ✅ Fetches data from 8 MongoDB collections (users, playerStates, bankAccounts, stockPortfolios, stockTransactions, fixedDeposits, gameSessions, achievements)
- ✅ Extracts user profile (risk tolerance, experience level, character type)
- ✅ Generates specialized responses based on query type
- ✅ Includes character bonuses and level-based content

#### Example 1: Stock Transactions Query

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "display my stock transactions"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "eef32818-dc20-411c-b342-d3cde53892f6",
    "userId": "68af42c4c4375cbf230ebfa9",
    "message": "📈 **Complete Stock Transaction History for Gursimran Singh**\n\n📊 **Transaction Summary:**\n• Total Transactions: **23**\n• Buy Orders: 13\n• Sell Orders: 10\n• Total Invested: ₹132,280.56\n• Total Returns from Sales: ₹83,711.24\n\n📋 **Transaction Details (Recent 20):**\n\n1. **SELL** 1000x Polygon (MATIC)\n   Price: ₹22.94 | Total: ₹22,940.00\n   Date: 10/5/2025 at 11:06:16 PM\n\n2. **BUY** 8x Amazon.com Inc. (AMZN)\n   Price: ₹11,700.00 | Total: ₹93,600.00\n   Date: 10/5/2025 at 11:05:34 PM\n\n[... 21 more transactions ...]\n\n🎯 **Trading Analysis:**\n• Your Experience Level: beginner\n• Risk Profile: low\n• Trading Activity: 23 total trades\n• Character Bonus: 20% savings interest bonus + banking perks\n\n💼 **Current Portfolio Holdings:**\n• ABBV: 1 shares @ ₹150 (+5.2%)\n• SOL: 1 shares @ ₹125 (-2.1%)\n• AMZN: 8 shares @ ₹11,700 (+3.8%)",
    "timestamp": "2025-10-07T21:04:48.869Z",
    "type": "simple",
    "response_data": {
      "text": "[Full response text]"
    }
  },
  "context": {
    "enrichedData": {
      "hasPlayerState": true,
      "hasBankAccounts": true,
      "hasStockPortfolio": true,
      "stockTransactionsCount": 23,
      "achievementsCount": 0
    },
    "userProfile": {
      "risk_profile": "low",
      "investment_experience": "beginner",
      "past_choices": ["chose_character_C2", "active_trader", "opened_bank_account"],
      "financial_goals": ["build_emergency_fund", "stable_returns"],
      "character_type": "C2",
      "game_level": 1,
      "achievements": [],
      "personality_traits": ["cautious", "practical", "active_investor"]
    }
  },
  "query": "display my stock transactions",
  "timestamp": "2025-10-07T21:04:48.869Z",
  "executionTime": "318ms"
}
```

#### Example 2: Portfolio Analysis Query

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show my portfolio performance"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "68af42c4c4375cbf230ebfa9",
    "message": "💼 **Complete Portfolio Analysis for Gursimran Singh**\n\n📊 **Portfolio Overview:**\n• Total Value: **₹95,225**\n• Total Invested: ₹93,750\n• Total Gain/Loss: 🟢 ₹1,475\n• Return on Investment: 1.57%\n• Number of Holdings: 3\n\n📈 **Detailed Holdings:**\n\n1. **AbbVie Inc** (ABBV)\n   Quantity: 1 shares\n   Avg Buy Price: ₹150.00\n   Current Price: ₹157.80\n   Total Value: ₹157.80\n   Gain/Loss: 🟢 ₹7.80 (5.20%)\n   Purchase Date: 8/27/2025\n\n2. **Solana** (SOL)\n   Quantity: 1 shares\n   Avg Buy Price: ₹125.00\n   Current Price: ₹122.38\n   Total Value: ₹122.38\n   Gain/Loss: 🔴 ₹-2.62 (-2.10%)\n   Purchase Date: 10/5/2025\n\n3. **Amazon.com Inc.** (AMZN)\n   Quantity: 8 shares\n   Avg Buy Price: ₹11,700.00\n   Current Price: ₹12,145.00\n   Total Value: ₹97,160.00\n   Gain/Loss: 🟢 ₹3,560.00 (+3.80%)\n   Purchase Date: 10/5/2025\n\n🎯 **Portfolio Insights:**\n• Total Trades Made: 23\n• Risk Profile: low\n• Experience Level: beginner\n• Character Advantage: 20% savings interest bonus + banking perks",
    "timestamp": "2025-10-07T21:05:12.345Z",
    "type": "simple"
  },
  "executionTime": "285ms"
}
```

#### Example 3: Bank Account Query

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "check my bank account balance"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "message": "🏦 **Banking Overview for Gursimran Singh**\n\n📊 **Account Summary:**\n• Total Accounts: 1\n• Combined Balance: **₹10,000**\n\n### 🏦 Account 1: DIN-123456\n• Account Holder: Gursimran Singh\n• Current Balance: **₹10,000**\n• Created: 8/27/2025\n• Total Transactions: 5\n\n**Recent Transactions (last 5):**\n💰 DEPOSIT: ₹5,000 - Initial deposit\n   8/27/2025 at 5:39:16 PM\n💰 DEPOSIT: ₹3,000 - Salary credit\n   9/15/2025 at 10:00:00 AM\n💸 WITHDRAWAL: ₹2,000 - Stock investment\n   10/5/2025 at 11:00:00 PM\n\n🎯 **Banking Insights:**\n• Character Bonus: 20% higher savings account interest rates\n• Savings Strategy: Conservative (Perfect!)"
  }
}
```

#### Example 4: Complete Stats Query

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show my complete profile"
  }'
```

**Response Includes:**
- 🎮 Game Profile (character, level, XP, achievements)
- 💰 Financial Overview (cash, bank, portfolio, total wealth)
- 📈 Investment Profile (risk tolerance, experience, trades, holdings)
- 🏦 Banking (accounts, transactions)
- 🎯 Character Advantages

---

## Conversation Graph Endpoints

### POST /api/conversation-graph/:userId

Generate dynamic branching conversation trees with enriched user data.

**Parameters:**
- `userId` (path parameter) - User ID for personalization
- `npcName` (body, optional) - NPC personality (`"maya"`, `"finbot"`, `"risky_rick"`, `"budget_beth"`)
- `topic` (body, optional) - Conversation topic

**Features:**
- ✅ Uses all 8 MongoDB collections for context
- ✅ Generates 4-5 turn branching dialogues
- ✅ Personalized based on user's financial data
- ✅ References specific transactions, holdings, and account details
- ✅ Each NPC has unique personality and expertise

#### Example 1: Financial Advisor (Maya)

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "npcName": "maya",
    "topic": "investment strategy review"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "68af42c4c4375cbf230ebfa9",
    "message": "Conversation tree generated for Maya",
    "timestamp": "2025-10-07T21:04:48.869Z",
    "type": "conversation_graph",
    "response_data": {
      "conversation_tree": {
        "npc_name": "Maya",
        "intro": "Hey there! I've been reviewing your 23 stock transactions - impressive activity for a level 1 player! Let's discuss what I've learned about your investment strategy.",
        "conversation_tree": {
          "1": {
            "npc": "I've analyzed your trading history - that chose_character_C2, active_trader, opened_bank_account combo tells me you know what you're doing... mostly. 😊",
            "options": {
              "1a": {
                "text": "Can you break this down simply?",
                "next": "2a"
              },
              "1b": {
                "text": "I prefer to play it very safe.",
                "next": "2b"
              }
            }
          },
          "2a": {
            "npc": "Great question! I've analyzed your 23 transactions - your low risk profile combined with active trading shows you're learning fast. Here's my recommendation...",
            "options": {
              "2a1": {
                "text": "This seems like a safe way to start.",
                "next": "3a"
              },
              "2a2": {
                "text": "Can you walk through the numbers?",
                "next": "3b"
              }
            }
          },
          "2b": {
            "npc": "I love that you're thinking carefully! With 3 stocks in your portfolio (ABBV, SOL, AMZN) and beginner experience, let's review your holdings...",
            "options": {
              "2b1": {
                "text": "This sounds manageable for me.",
                "next": "3c"
              },
              "2b2": {
                "text": "Is this really as safe as it sounds?",
                "next": "3d"
              }
            }
          },
          "3a": {
            "npc": "Perfect! With your C2 character strengths and level 1 experience, you're set for success. Keep up the great work!"
          },
          "3b": {
            "npc": "Excellent analysis! Your beginner background really shows. This approach should align well with your low risk tolerance."
          },
          "3c": {
            "npc": "You're on the right track! Remember, every expert was once a beginner. Your progress to level 1 shows real dedication."
          },
          "3d": {
            "npc": "Great questions! Learning is the foundation of good investing. Your C2 character will benefit from this knowledge."
          }
        }
      },
      "user_profile": {
        "risk_profile": "low",
        "investment_experience": "beginner",
        "past_choices": ["chose_character_C2", "active_trader", "opened_bank_account"],
        "financial_goals": ["build_emergency_fund", "stable_returns"],
        "character_type": "C2",
        "game_level": 1,
        "achievements": [],
        "personality_traits": ["cautious", "practical", "active_investor"]
      }
    }
  },
  "context": {
    "enrichedData": {
      "hasPlayerState": true,
      "hasBankAccounts": true,
      "hasStockPortfolio": true,
      "stockTransactionsCount": 23,
      "achievementsCount": 0,
      "bankAccountsCount": 1,
      "gameSessionsCount": 0
    },
    "userProfile": { /* same as above */ },
    "npcPersonality": {
      "name": "Maya",
      "role": "financial_advisor",
      "personality_traits": ["helpful", "patient", "educational", "encouraging"],
      "conversation_style": "friendly and supportive",
      "financial_expertise": ["budgeting", "savings", "basic_investing", "financial_literacy"]
    }
  },
  "timestamp": "2025-10-07T21:04:48.869Z",
  "executionTime": "294ms"
}
```

#### Example 2: Tech Trader (FinBot)

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "npcName": "finbot",
    "topic": "analyzing my stock transaction history"
  }'
```

**Response Highlights:**
```json
{
  "conversation_tree": {
    "intro": "*analyzes data* WHOA! 23 transactions?! BitRodent's circuits are BUZZING! Let's talk about your trading patterns - I've spotted some interesting moves! 🐹⚡",
    "conversation_tree": {
      "2a": {
        "npc": "*analyzes charts* OH YEAH! I've been tracking your 23 trades! Recent moves in Polygon, Amazon.com Inc., Amazon.com Inc. caught my attention! BitRodent is impressed! 🐹📊"
      },
      "2b": {
        "npc": "Smart caution! Your portfolio has 3 positions (ABBV, SOL, AMZN). With that low risk approach, you're building steadily!"
      }
    }
  }
}
```

#### Example 3: Risk Taker (Risky Rick)

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "npcName": "risky_rick",
    "topic": "my 23 stock trades and portfolio performance"
  }'
```

**Response Highlights:**
```json
{
  "conversation_tree": {
    "intro": "🚀 23 TRADES?! Now THAT'S what I'm talking about! Your C2 character is making MOVES! Let's review your boldest plays!",
    "conversation_tree": {
      "2a": {
        "npc": "BOOM! 23 TRANSACTIONS! That's the ENERGY I love! Your recent moves show you're not afraid to EXECUTE! Let's amplify those gains! 🚀"
      },
      "2b": {
        "npc": "Hey, I respect strategy! Your 23 trades show you're active but calculated. That low profile keeps you grounded. Smart combo!"
      }
    }
  }
}
```

#### Example 4: Saver (Budget Beth)

**Request:**
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af42c4c4375cbf230ebfa9 \
  -H "Content-Type: application/json" \
  -d '{
    "npcName": "budget_beth",
    "topic": "reviewing my savings and portfolio"
  }'
```

**Response Highlights:**
```json
{
  "conversation_tree": {
    "intro": "Hello dear! I'm so proud - you've saved ₹10,000 in your bank account! Such wonderful discipline from a level 1 player!",
    "conversation_tree": {
      "2a": {
        "npc": "Such good questions! I've reviewed your 23 transactions - you're trading responsibly with your low approach. That's wonderful discipline!"
      },
      "2b": {
        "npc": "Perfect mindset! Your 3 stock holdings (ABBV, SOL, AMZN) show you're diversifying wisely. Your careful planning is paying off!"
      }
    }
  }
}
```

---

## NPC Management

### GET /api/npcs

Get list of available NPC personalities with their traits and expertise.

**Request:**
```bash
curl -X GET http://localhost:3001/api/npcs
```

**Response:**
```json
{
  "success": true,
  "result": {
    "npcs": [
      {
        "name": "Maya",
        "role": "financial_advisor",
        "personality_traits": ["helpful", "patient", "educational", "encouraging"],
        "conversation_style": "friendly and supportive",
        "expertise": ["budgeting", "savings", "basic_investing", "financial_literacy"]
      },
      {
        "name": "FinBot",
        "role": "trader",
        "personality_traits": ["quirky", "tech-savvy", "humorous", "market-obsessed"],
        "conversation_style": "energetic and data-driven",
        "expertise": ["technical_analysis", "day_trading", "crypto", "market_trends"]
      },
      {
        "name": "Risky Rick",
        "role": "risk_taker",
        "personality_traits": ["bold", "enthusiastic", "motivational", "high-energy"],
        "conversation_style": "exciting and bold",
        "expertise": ["high_risk_investments", "growth_stocks", "aggressive_strategies", "options_trading"]
      },
      {
        "name": "Budget Beth",
        "role": "saver",
        "personality_traits": ["careful", "practical", "nurturing", "detail-oriented"],
        "conversation_style": "warm and methodical",
        "expertise": ["budgeting", "emergency_funds", "debt_management", "conservative_investing"]
      }
    ]
  },
  "timestamp": "2025-10-07T21:04:48.869Z"
}
```

---

## Debug Endpoints

### GET /api/debug/users

Debug endpoint to list users from MongoDB (ContRAG query).

**Request:**
```bash
curl -X GET http://localhost:3001/api/debug/users
```

**Response:**
```json
{
  "success": true,
  "message": "Debug query executed",
  "result": {
    "chunks": [
      {
        "id": "users:68af42c4c4375cbf230ebfa9:0",
        "namespace": "users:68af42c4c4375cbf230ebfa9",
        "content": "Entity: users...",
        "metadata": {
          "entity": "users",
          "uid": "68af42c4c4375cbf230ebfa9"
        }
      }
    ]
  },
  "executionTime": "156ms"
}
```

---

## Data Sources

All endpoints utilizing enriched user data fetch from these MongoDB collections:

1. **users** - User account, character selection, game progress
2. **playerStates** - Position, financial data, inventory, onboarding status
3. **bankAccounts** - Bank account balances and transaction history
4. **stockPortfolios** - Current stock holdings with P&L
5. **stockTransactions** - Complete trading history (buy/sell orders)
6. **fixedDeposits** - Fixed deposit investments
7. **gameSessions** - Play session history and activities
8. **achievements** - Unlocked achievements and milestones

---

## Response Features

### Personalization Factors

All responses consider:
- ✅ **Risk Profile:** low/medium/high (calculated from asset allocation)
- ✅ **Investment Experience:** beginner/intermediate/advanced (based on transaction count and portfolio value)
- ✅ **Character Type:** C1/C2/C3/C4 with unique bonuses
- ✅ **Game Level:** Unlocks features and content
- ✅ **Past Choices:** Extracted from game state and financial decisions
- ✅ **Financial Goals:** Inferred from behavior and risk profile
- ✅ **Personality Traits:** Derived from investment patterns

### Specialized Response Types

The chat endpoint generates different response formats based on query keywords:

| Query Keywords | Response Type | Includes |
|----------------|---------------|----------|
| transaction, trade, history, stock | Stock Transaction Report | All transactions, buy/sell breakdown, P&L summary, character analysis |
| portfolio, holding, investment | Portfolio Analysis | Holdings details, current prices, gains/losses, performance metrics |
| bank, account, balance, deposit | Banking Overview | Account balances, transaction history, savings insights |
| stats, profile, detail | Complete Profile | Game progress, financial overview, investment profile, character benefits |
| advice, recommend, suggest | Personalized Advice | Risk-adjusted recommendations, action items, learning path |
| Default | Comprehensive Overview | Summary of all data with suggestions |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Query is required"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to generate chat response",
  "error": "Error message details",
  "userId": "68af42c4c4375cbf230ebfa9",
  "query": "user query..."
}
```

---

## Performance Metrics

Typical response times:
- Health check: < 10ms
- Build context: 200-400ms (first time only)
- Chat queries: 250-350ms
- Conversation graphs: 250-350ms
- NPC list: < 5ms

---

## Usage Recommendations

### For Game Client Integration

1. **On User Login:**
   ```bash
   # Build context once per user (cache for session)
   POST /api/build-context/:userId
   ```

2. **For Simple Questions:**
   ```bash
   # Use chat endpoint for direct answers
   POST /api/chat/:userId
   {
     "query": "How's my portfolio doing?"
   }
   ```

3. **For Interactive Dialogues:**
   ```bash
   # Use conversation graph for branching NPC interactions
   POST /api/conversation-graph/:userId
   {
     "npcName": "maya",
     "topic": "investment advice"
   }
   ```

4. **For NPC Selection Screen:**
   ```bash
   # Get available NPCs and their traits
   GET /api/npcs
   ```

### Best Practices

- ✅ Cache conversation trees client-side for smooth UI
- ✅ Call build-context only once per user session
- ✅ Use specific topics for more relevant conversation trees
- ✅ Match NPC personality to user's needs (Maya for beginners, FinBot for traders, Rick for aggressive players, Beth for savers)
- ✅ Monitor executionTime in responses for performance tuning

---

## WebSocket Support (Bonus)

The server also supports WebSocket connections for real-time chat:

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8081?userId=68af42c4c4375cbf230ebfa9&username=GursimranSingh');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};

ws.send(JSON.stringify({
  message: "Tell me about my portfolio",
  type: "user"
}));
```

**WebSocket Port:** `8081` (configurable via `WS_PORT` environment variable)

---

## Environment Variables

```bash
OPENAI_API_KEY=sk-...           # Required for embeddings
MONGODB_URI=mongodb+srv://...    # MongoDB Atlas connection
WS_PORT=8081                     # WebSocket server port (default: 8081)
```

---

## Architecture Notes

### Enriched Data Flow

1. **Request arrives** → Extract userId from path
2. **Fetch enriched data** → UserDataEnrichmentService queries 8 MongoDB collections in parallel
3. **Extract user profile** → ConversationService analyzes enriched data for risk, experience, goals
4. **Generate response** → 
   - Chat: Specialized response generator based on query type
   - Conversation: Dynamic tree generation with NPC personality
5. **Return result** → JSON response with context and execution time

### Key Components

- **UserDataEnrichmentService:** Direct MongoDB queries for all user-related data
- **ConversationService:** User profile extraction, conversation tree generation, NPC personalities
- **ContRAG SDK:** Vector embeddings and similarity search (legacy, supplementary)
- **Express Server:** REST API and WebSocket management

---

**Last Updated:** October 7, 2025  
**API Version:** 1.2.0  
**Server Version:** Maya RAG Server 1.2.0
