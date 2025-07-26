# Game Server API Reference

## Overview

The Dhaniverse game server is built with Deno and Oak framework, providing REST API endpoints for authentication, player state management, banking operations, and stock trading functionality. The server uses MongoDB for data persistence and JWT for authentication.

## Base Configuration

- **Runtime**: Deno
- **Framework**: Oak
- **Database**: MongoDB
- **Authentication**: JWT tokens
- **Port**: 8000 (configurable via environment)

## Authentication

All game API endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### POST /auth/register

Registers a new user account.

**Request Body**:
```json
{
    "email": "user@example.com",
    "password": "password123",
    "gameUsername": "player1"
}
```

**Response**:
```json
{
    "token": "jwt_token_here",
    "user": {
        "id": "user_id",
        "email": "user@example.com",
        "gameUsername": "player1"
    }
}
```

**Error Responses**:
- `400`: Validation errors (missing fields, weak password, username taken)
- `500`: Internal server error

### POST /auth/login

Authenticates an existing user or auto-registers new users.

**Request Body**:
```json
{
    "email": "user@example.com",
    "password": "password123",
    "autoRegister": true
}
```

**Response**:
```json
{
    "token": "jwt_token_here",
    "user": {
        "id": "user_id",
        "email": "user@example.com",
        "gameUsername": "player1"
    },
    "isNewUser": false
}
```

### GET /auth/me

Gets current user information from JWT token.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
    "user": {
        "id": "user_id",
        "email": "user@example.com",
        "gameUsername": "player1"
    }
}
```

### POST /auth/validate-token

Validates a JWT token (used by WebSocket server).

**Request Body**:
```json
{
    "token": "jwt_token_here"
}
```

**Response**:
```json
{
    "valid": true,
    "userId": "user_id",
    "email": "user@example.com",
    "gameUsername": "player1"
}
```

### PUT /auth/profile

Updates user profile information.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "gameUsername": "newUsername"
}
```

**Response**:
```json
{
    "user": {
        "id": "user_id",
        "email": "user@example.com",
        "gameUsername": "newUsername"
    }
}
```

### POST /auth/google

Google OAuth authentication.

**Request Body**:
```json
{
    "googleToken": "google_id_token"
}
```

**Response**:
```json
{
    "success": true,
    "token": "jwt_token_here",
    "user": {
        "id": "user_id",
        "email": "user@example.com",
        "gameUsername": "player1"
    },
    "isNewUser": false
}
```

## Player State Endpoints

### GET /game/player-state

Retrieves the current player's game state.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
    "success": true,
    "data": {
        "userId": "user_id",
        "position": {
            "x": 400,
            "y": 300,
            "scene": "main"
        },
        "financial": {
            "rupees": 25000,
            "totalWealth": 25000,
            "bankBalance": 0,
            "stockPortfolioValue": 0
        },
        "inventory": {
            "items": [],
            "capacity": 20
        },
        "progress": {
            "level": 1,
            "experience": 0,
            "unlockedBuildings": ["bank", "stockmarket"],
            "completedTutorials": []
        },
        "settings": {
            "soundEnabled": true,
            "musicEnabled": true,
            "autoSave": true
        },
        "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
}
```

### PUT /game/player-state

Updates the player's game state.

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Any valid player state fields to update

**Response**:
```json
{
    "success": true,
    "message": "Player state updated"
}
```

### PUT /game/player-state/rupees

Updates player's rupee balance.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "rupees": 1000,
    "operation": "add"
}
```

**Operations**: `"set"`, `"add"`, `"subtract"`

**Response**:
```json
{
    "success": true,
    "data": {
        "rupees": 26000
    }
}
```

## Banking Endpoints

### GET /game/bank-account

Retrieves the player's bank account information.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
    "success": true,
    "data": {
        "userId": "user_id",
        "balance": 0,
        "transactions": [],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
}
```

### POST /game/bank-account/deposit

Deposits rupees into the bank account.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "amount": 5000
}
```

**Response**:
```json
{
    "success": true,
    "message": "Successfully deposited ₹5000",
    "transaction": {
        "id": "transaction_id",
        "type": "deposit",
        "amount": 5000,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "description": "Deposit of ₹5000"
    }
}
```

### POST /game/bank-account/withdraw

Withdraws rupees from the bank account.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "amount": 2000
}
```

**Response**:
```json
{
    "success": true,
    "message": "Successfully withdrew ₹2000",
    "transaction": {
        "id": "transaction_id",
        "type": "withdrawal",
        "amount": 2000,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "description": "Withdrawal of ₹2000"
    }
}
```

## Fixed Deposit Endpoints

### GET /game/fixed-deposits

Retrieves all fixed deposits for the player.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
    "success": true,
    "data": [
        {
            "userId": "user_id",
            "accountId": "account_id",
            "amount": 10000,
            "interestRate": 7.5,
            "startDate": "2024-01-01T00:00:00.000Z",
            "duration": 90,
            "maturityDate": "2024-04-01T00:00:00.000Z",
            "matured": false,
            "status": "active",
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

### POST /game/fixed-deposits

Creates a new fixed deposit.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "amount": 10000,
    "duration": 90
}
```

**Response**:
```json
{
    "success": true,
    "message": "Fixed deposit created successfully",
    "data": {
        "userId": "user_id",
        "amount": 10000,
        "interestRate": 7.5,
        "duration": 90,
        "status": "active"
    }
}
```

### POST /game/fixed-deposits/:id/claim

Claims a matured fixed deposit.

**Headers**: `Authorization: Bearer <token>`

**Parameters**: `id` - Fixed deposit ID

**Response**:
```json
{
    "success": true,
    "message": "Fixed deposit claimed successfully",
    "data": {
        "principal": 10000,
        "interest": 1875,
        "total": 11875
    }
}
```

## Stock Portfolio Endpoints

### GET /game/stock-portfolio

Retrieves the player's stock portfolio.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
    "success": true,
    "data": {
        "userId": "user_id",
        "holdings": [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "quantity": 10,
                "averagePrice": 150.00,
                "currentPrice": 155.00,
                "totalValue": 1550.00,
                "gainLoss": 50.00,
                "gainLossPercentage": 3.33,
                "purchaseDate": "2024-01-01T00:00:00.000Z"
            }
        ],
        "totalValue": 1550.00,
        "totalInvested": 1500.00,
        "totalGainLoss": 50.00,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
}
```

### GET /game/stock-transactions

Retrieves stock transaction history.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
    "success": true,
    "data": [
        {
            "userId": "user_id",
            "stockId": "AAPL",
            "stockName": "Apple Inc.",
            "type": "buy",
            "price": 150.00,
            "quantity": 10,
            "total": 1500.00,
            "timestamp": "2024-01-01T00:00:00.000Z",
            "portfolioId": "portfolio_id"
        }
    ]
}
```

### POST /game/stock-portfolio/buy

Purchases stock shares.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "stockId": "AAPL",
    "stockName": "Apple Inc.",
    "quantity": 10,
    "price": 150.00
}
```

**Response**:
```json
{
    "success": true,
    "message": "Successfully purchased 10 shares of Apple Inc.",
    "data": {
        "transaction": {
            "stockId": "AAPL",
            "type": "buy",
            "quantity": 10,
            "price": 150.00,
            "total": 1500.00
        },
        "totalCost": 1500.00,
        "holding": {
            "symbol": "AAPL",
            "quantity": 10,
            "averagePrice": 150.00
        }
    }
}
```

### POST /game/stock-portfolio/sell

Sells stock shares.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
    "stockId": "AAPL",
    "quantity": 5,
    "price": 155.00
}
```

**Response**:
```json
{
    "success": true,
    "message": "Successfully sold 5 shares of AAPL",
    "data": {
        "transaction": {
            "stockId": "AAPL",
            "type": "sell",
            "quantity": 5,
            "price": 155.00,
            "total": 775.00
        },
        "saleValue": 775.00,
        "profit": 25.00
    }
}
```

## General API Endpoints

### GET /api/health

Health check endpoint.

**Response**:
```json
{
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/game/status

Game server status.

**Response**:
```json
{
    "status": "Game server running",
    "players": 0
}
```

### GET /api/debug/collections

Debug endpoint for database collection information (development only).

**Response**:
```json
{
    "database": "dhaniverse",
    "collections": {
        "users": {
            "count": 150,
            "samples": [...]
        },
        "playerStates": { "count": 120 },
        "bankAccounts": { "count": 100 }
    }
}
```

## Error Handling

### Standard Error Response Format

```json
{
    "error": "Error message",
    "message": "Detailed error description"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created (new resource)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error
- `503`: Service Unavailable (database connection issues)

### Authentication Errors

- Missing Authorization header
- Invalid JWT token format
- Expired JWT token
- User not found

### Validation Errors

- Missing required fields
- Invalid data types
- Out of range values
- Insufficient balance for operations

## Rate Limiting

The server implements rate limiting for:
- Authentication endpoints: 10 requests per minute per IP
- Banking operations: 30 requests per minute per user
- Stock trading: 60 requests per minute per user

## Database Schema

### User Document
```typescript
interface UserDocument {
    _id: ObjectId;
    email: string;
    passwordHash: string;
    gameUsername: string;
    createdAt: Date;
    googleId?: string;
    lastUpdated?: Date;
}
```

### Player State Document
```typescript
interface PlayerStateDocument {
    userId: string;
    position: {
        x: number;
        y: number;
        scene: string;
    };
    financial: {
        rupees: number;
        totalWealth: number;
        bankBalance: number;
        stockPortfolioValue: number;
    };
    inventory: {
        items: any[];
        capacity: number;
    };
    progress: {
        level: number;
        experience: number;
        unlockedBuildings: string[];
        completedTutorials: string[];
    };
    settings: {
        soundEnabled: boolean;
        musicEnabled: boolean;
        autoSave: boolean;
    };
    lastUpdated: Date;
}
```

## Environment Configuration

Required environment variables:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/dhaniverse

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=8000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Integration Examples

### JavaScript/Fetch Example

```javascript
// Login
const loginResponse = await fetch('/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
    })
});

const { token } = await loginResponse.json();

// Get player state
const playerResponse = await fetch('/game/player-state', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const playerData = await playerResponse.json();
```

### Error Handling Example

```javascript
try {
    const response = await fetch('/game/bank-account/deposit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: 5000 })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }

    const result = await response.json();
    console.log('Deposit successful:', result);
} catch (error) {
    console.error('Deposit failed:', error.message);
}
```