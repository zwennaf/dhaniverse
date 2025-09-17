# Quick Start Guide

## Prerequisites

1. **Docker**: Make sure Docker is installed and running
2. **Node.js**2. **PostgreSQL Connection Issues**
   - Ensure Docker is running: `docker ps`
   - Check PostgreSQL status: `docker exec maya-postgres-1 pg_isready -U postgres`
   - Restart if needed: `docker-compose down && docker-compose up -d`rsion 18 or higher
3. **Gemini API Key**: For embeddings (get one from https://makersuite.google.com/app/apikey)

## Setup Steps

### 1. Run the Setup Script

```bash
./setup.sh
```

This will:
- Install all Node.js dependencies
- Start PostgreSQL with pgvector extension via Docker
- Build the TypeScript project

### 2. Configure Gemini API Key

Edit the `.env` file and replace `your-gemini-api-key-here` with your actual Gemini API key:

```bash
GEMINI_API_KEY=your-actual-gemini-key-here
```

### 3. Introspect Your Database Schema

```bash
npm run introspect
```

This uses Contrag to analyze your MongoDB schema and understand the relationships between collections.

### 4. Start the Server

```bash
npm run dev
```

The server will start on:
- **HTTP API**: http://localhost:3001
- **WebSocket**: ws://localhost:8081

## Testing the Setup

### Option 1: Web Client

Open `test-client.html` in your browser to use the built-in test client.

### Option 2: API Testing

1. **Build context for a user:**
   ```bash
   curl -X POST http://localhost:3001/api/build-context/user123
   ```

2. **Query user context:**
   ```bash
   curl -X POST http://localhost:3001/api/query/user123 \
     -H "Content-Type: application/json" \
     -d '{"query": "What is my current balance?"}'
   ```

### Option 3: WebSocket Testing

Using JavaScript in browser console or Node.js:

```javascript
const ws = new WebSocket('ws://localhost:8081?userId=user123&username=TestUser');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(`${message.username}: ${message.message}`);
};

// Send a message
ws.send(JSON.stringify({
  message: "What's my financial status?"
}));
```

## Understanding the Flow

1. **Schema Introspection**: Contrag analyzes your MongoDB collections and identifies master entities (User, PlayerState, etc.)

2. **Context Building**: For each user, Contrag traverses the entity graph starting from the User entity, collecting related data from all connected collections (bank accounts, transactions, game sessions, etc.)

3. **Embedding & Storage**: The collected context is chunked, embedded using Gemini, and stored in PostgreSQL with pgvector

4. **Chat & Retrieval**: When users ask questions, their query is embedded and matched against their personal context chunks to provide relevant, personalized responses

## Next Steps

1. **Customize AI Responses**: Edit the `generateAIResponse` function in `src/server.ts` to integrate with your preferred LLM
2. **Add More Entities**: Extend support for other master entities like PlayerState, BankAccount, etc.
3. **Authentication**: Add user authentication and authorization
4. **Production Deployment**: Configure for production with proper logging, monitoring, and scaling

## Troubleshooting

### Common Issues

1. **"Cannot find module 'contrag'"**
   - Make sure you have published and installed your Contrag library
   - Check that the package name in package.json matches your published package

2. **Weaviate Connection Failed**
   - Ensure Docker is running: `docker ps`
   - Check Weaviate status: `curl http://localhost:8080/v1/meta`
   - Restart if needed: `docker-compose down && docker-compose up -d`

3. **MongoDB Connection Issues**
   - Verify your connection string in `.env`
   - Check if your IP is whitelisted in MongoDB Atlas
   - Test connection manually using MongoDB Compass or CLI

4. **Gemini API Errors**
   - Verify your API key is correct and has credits
   - Check rate limits and quotas

### Getting Help

For Contrag-specific issues, refer to your library's documentation or create an issue in the Contrag repository.

For this Maya RAG server, check the logs and error messages for specific guidance.
