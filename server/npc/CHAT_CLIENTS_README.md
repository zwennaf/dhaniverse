# Maya RAG Chat Clients 🤖💬

Multiple ways to interact with Maya, your AI financial advisor powered by RAG (Retrieval-Augmented Generation).

## Available Chat Clients

### 1. 🌐 Web Chat Client (`maya-chat-client.html`)
**Beautiful web interface with real-time chat**

**Features:**
- Modern, responsive UI with gradient design
- Real-time context building and querying  
- User information display
- RAG context visualization
- Message history with timestamps
- Loading indicators and status updates
- Mobile-friendly responsive design

**Usage:**
```bash
# Open in browser
open maya-chat-client.html
# OR
npm run chat-web
```

**Interface Elements:**
- **User ID Input**: Enter the user ID to chat as
- **Message Textarea**: Type your questions/prompts
- **Send Message**: Get AI responses with RAG context
- **Build Context**: Manually rebuild user context
- **Clear Chat**: Reset the conversation

### 2. 💻 Command Line Interface (`maya-chat-cli.js`)
**Terminal-based chat for developers and automation**

**Features:**
- Interactive CLI with colored output
- Automatic context building
- User information display
- Command system (exit, clear, switch, help)
- Text wrapping for readable responses
- Error handling and status updates

**Usage:**
```bash
# Run CLI directly
node maya-chat-cli.js

# OR use npm script
npm run chat

# Commands within CLI:
# exit/quit - Exit the chat
# clear     - Clear the screen
# switch    - Switch to different user
# help      - Show help message
```

### 3. 📦 Programmatic API (`maya-chat-api.js`)
**JavaScript module for integration into other applications**

**Features:**
- Promise-based API
- Context caching
- Multiple response types (simple, enhanced, detailed)
- Error handling and fallbacks
- Health checks and status monitoring
- Extensible and customizable

**Usage:**
```javascript
import { MayaChatAPI } from './maya-chat-api.js';

const maya = new MayaChatAPI();

// Build context for user
await maya.buildContext('68af40e9c23410b23d54886c');

// Simple chat
const response = await maya.chat(
  '68af40e9c23410b23d54886c', 
  "What's my current balance?"
);

// Enhanced chat with suggestions
const detailedResponse = await maya.chat(
  '68af40e9c23410b23d54886c',
  "How can I improve my investments?",
  { responseType: 'detailed' }
);
```

## How It Works

### RAG Pipeline Flow:
1. **Input**: User ID + Prompt
2. **Context Building**: Retrieves user data from MongoDB
3. **Vector Search**: Finds relevant chunks using pgvector + Gemini embeddings
4. **LLM Generation**: Creates contextual response using retrieved data
5. **Output**: Personalized AI response with context citations

### Supported Query Types:

#### 💰 Financial Queries
- "What's my current balance?"
- "Show me my transaction history"
- "How much money do I have?"

#### 📈 Investment Queries  
- "What should I invest in?"
- "Show me my portfolio performance"
- "What are good investment strategies?"

#### 🎮 Game Progress Queries
- "What's my current level?"
- "How can I level up faster?"
- "Show me my achievements"

#### 🏦 Banking Queries
- "What banking services are available?"
- "How do fixed deposits work?"
- "Show me my banking options"

## Example Responses

### User Context Retrieved:
```json
{
  "email": "noorytfamily@gmail.com",
  "username": "akall", 
  "character": "C1",
  "level": 1,
  "experience": 0,
  "createdAt": "2025-08-27T17:31:21.004Z"
}
```

### Sample AI Response:
```
Hi akall! Based on your account data (noorytfamily@gmail.com), I can see you're at level 1 with 0 experience points. For detailed financial information including your balance and investments, I'd need to access your playerStates and bankAccounts data. Would you like me to help you understand your current financial position in the game?
```

## Setup Requirements

### 1. Server Running
Ensure the Maya RAG server is running:
```bash
npm run dev
# Server running on http://localhost:3001
# WebSocket on ws://localhost:8081
```

### 2. Dependencies Installed
```bash
npm install
# Installs: contrag, node-fetch, chalk, etc.
```

### 3. Services Running
- ✅ MongoDB (production connection)
- ✅ PostgreSQL with pgvector (Docker)
- ✅ Gemini API (embedding generation)

## Configuration

### Environment Variables (.env)
```properties
# API Keys
GEMINI_API_KEY=your-gemini-api-key

# Server Ports  
PORT=3001
WS_PORT=8081

# Database URLs
MONGODB_URI=your-mongodb-connection-string
```

### API Endpoints Used
- `POST /api/build-context/{userId}` - Build RAG context
- `POST /api/query/{userId}` - Query with RAG context
- `GET /health` - Server health check

## Testing

### Quick Test:
```bash
# Test user ID (has data)
User ID: 68af40e9c23410b23d54886c

# Sample queries:
"Hello Maya, what's my current status?"
"What's my level and experience?"
"Help me with financial planning"
"Show me investment options"
```

### API Test:
```javascript
import { testMayaChat } from './maya-chat-api.js';

// Run comprehensive test
const result = await testMayaChat();
console.log(result);
```

## Advanced Features

### Context Caching
- Automatic context caching in memory
- Smart context rebuilding when needed
- Multi-user context management

### Response Types
- **Simple**: Basic response only
- **Enhanced**: Response + suggestions  
- **Detailed**: Response + context summary + suggestions

### Error Handling
- Graceful fallbacks when context unavailable
- Network error recovery
- User-friendly error messages

## Customization

### Adding New Response Types
Edit the `generateResponse()` method in `maya-chat-api.js`:
```javascript
if (query.includes('your-keyword')) {
    return this.generateYourCustomResponse(username, userInfo);
}
```

### Styling the Web Client
Modify CSS variables in `maya-chat-client.html`:
```css
:root {
    --primary-color: #4f46e5;
    --secondary-color: #7c3aed;
    --success-color: #10b981;
}
```

### CLI Commands
Add new commands in `maya-chat-cli.js`:
```javascript
if (prompt.toLowerCase() === 'your-command') {
    // Handle your command
    continue;
}
```

---

## 🚀 Ready to Chat!

All three clients are ready to use. Choose the one that fits your workflow:
- **Web Client**: Best for interactive testing and demos
- **CLI**: Perfect for development and automation  
- **API**: Ideal for integration into other applications

Start chatting with Maya and get personalized financial advice powered by your game data! 💰🤖
