# Maya RAG Server

A RAG-powered chat server using Contrag for personalized financial advice in the Dhaniverse game.

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

## API Endpoints

### REST API

- **Health Check**: `GET /health`
- **Build Context**: `POST /api/build-context/:userId`
- **Query Context**: `POST /api/query/:userId`
  ```json
  {
    "query": "What's my current balance?"
  }
  ```

### WebSocket Chat

Connect to `ws://localhost:8081` with query parameters:
- `userId`: The user's ID
- `username`: The user's display name

Example: `ws://localhost:8081?userId=123&username=John`

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

## Supported Entities

The server currently supports the **User** master entity, which includes:

- User profile and game data
- Player state (position, financial data, inventory)
- Bank accounts and transactions
- Fixed deposits
- Stock portfolios and transactions
- Game sessions and achievements
- Chat history

## Chat Features

Maya (the AI assistant) can help with:

- **Financial Overview**: Balance, wealth, and account information
- **Banking**: Account details, transactions, fixed deposits
- **Investments**: Stock portfolio analysis and performance
- **Game Progress**: Level, achievements, and progression
- **Personalized Advice**: Based on user's complete financial profile

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
