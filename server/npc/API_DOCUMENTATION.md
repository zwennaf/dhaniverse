# NPC Server API Documentation

## Overview
The NPC server provides AI-driven chat functionality for non-playable characters in the Dhaniverse game. It supports two types of responses:

1. **Simple Chat Responses**: Enhanced AI responses using user profile data
2. **Conversation Graph Responses**: Dynamic dialogue trees for interactive NPC conversations

## API Endpoints

### 1. Simple Chat Response
**Endpoint**: `POST /api/chat/:userId`

**Purpose**: Get personalized AI responses based on user's financial profile and game data.

**Request Body**:
```json
{
  "query": "What is my financial status?"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "id": "uuid",
    "userId": "user123",
    "message": "Enhanced personalized response based on user profile...",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "type": "simple",
    "response_data": {
      "text": "Detailed financial advice..."
    }
  },
  "context": {
    "chunks": [...],
    "userProfile": {
      "risk_profile": "medium",
      "investment_experience": "beginner",
      "game_level": 5
    }
  }
}
```

### 2. Conversation Graph Response
**Endpoint**: `POST /api/conversation-graph/:userId`

**Purpose**: Generate dynamic conversation trees for interactive NPC dialogues.

**Request Body**:
```json
{
  "npcName": "maya",
  "topic": "investment advice"
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "id": "uuid",
    "userId": "user123", 
    "message": "Conversation tree generated for Maya",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "type": "conversation_graph",
    "response_data": {
      "conversation_tree": {
        "npc_name": "Maya",
        "intro": "Hey there! I see you're level 5...",
        "conversation_tree": {
          "1": {
            "npc": "Initial question...",
            "options": {
              "1a": {"text": "Option A", "next": "2a"},
              "1b": {"text": "Option B", "next": "2b"}
            }
          }
        }
      },
      "user_profile": {
        "risk_profile": "medium",
        "investment_experience": "beginner"
      }
    }
  }
}
```

### 3. Available NPCs
**Endpoint**: `GET /api/npcs`

**Purpose**: Get list of available NPC personalities.

**Response**:
```json
{
  "success": true,
  "result": {
    "npcs": [
      {
        "name": "Maya",
        "role": "financial_advisor",
        "personality_traits": ["helpful", "patient", "educational"],
        "conversation_style": "friendly and supportive",
        "expertise": ["budgeting", "savings", "basic_investing"]
      }
    ]
  }
}
```

## Available NPCs

### 1. Maya (Default)
- **Role**: Financial Advisor
- **Style**: Friendly and supportive
- **Expertise**: Budgeting, savings, basic investing, financial literacy
- **Best for**: New players and conservative investors

### 2. FinBot
- **Role**: Trader
- **Style**: Casual and witty with financial humor
- **Expertise**: Stocks, crypto, market analysis, trading strategies
- **Best for**: Tech-savvy players and active traders

### 3. Risky Rick
- **Role**: Risk Taker
- **Style**: Enthusiastic and motivational
- **Expertise**: High-risk investments, startup funding, venture capital
- **Best for**: Aggressive investors and high-risk tolerance players

### 4. Budget Beth
- **Role**: Saver
- **Style**: Methodical and thorough
- **Expertise**: Budgeting, expense tracking, debt management, conservative investing
- **Best for**: Conservative players focused on saving and budgeting

## User Profile System

The system automatically extracts user profiles from ContRAG context data:

```typescript
interface UserProfile {
  risk_profile: 'low' | 'medium' | 'high';
  investment_experience: 'beginner' | 'intermediate' | 'advanced';
  past_choices: string[];
  financial_goals: string[];
  character_type: string;
  game_level: number;
  achievements: string[];
  personality_traits: string[];
}
```

## Testing the Endpoints

### Test Simple Chat:
```bash
curl -X POST http://localhost:3001/api/chat/68af40e9c23410b23d54886c \
  -H "Content-Type: application/json" \
  -d '{"query": "What is my financial status?"}'
```

### Test Conversation Graph:
```bash
curl -X POST http://localhost:3001/api/conversation-graph/68af40e9c23410b23d54886c \
  -H "Content-Type: application/json" \
  -d '{"npcName": "finbot", "topic": "crypto investments"}'
```

### Test Available NPCs:
```bash
curl http://localhost:3001/api/npcs
```

## Features

### Enhanced AI Responses
- Personalized based on user's game level, character type, and financial profile
- Risk-adjusted advice based on user's tolerance level
- Character-specific bonuses and recommendations
- Achievement-based bonus calculations
- Financial milestone tracking

### Dynamic Conversation Trees
- Generated based on user profile and NPC personality
- Branching dialogue with 2 options per turn
- 4-5 turn conversations with meaningful endings
- Personalized content based on past choices and progress
- Character-specific dialogue styles and expertise

### Intelligent User Profiling
- Extracts data from ContRAG context chunks
- Analyzes financial behavior patterns
- Determines risk tolerance from portfolio allocation
- Tracks investment experience and game progress
- Identifies personality traits from choices

## Integration Notes

1. **Requires ContRAG Setup**: User context must be built using `/api/build-context/:userId` before personalized responses work
2. **WebSocket Support**: Real-time chat also uses enhanced responses
3. **Error Handling**: Graceful fallbacks when user context is unavailable
4. **Logging**: Comprehensive logging for debugging and monitoring
