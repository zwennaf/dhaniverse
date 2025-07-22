# Dhaniverse Server

This is the backend server for the Dhaniverse game, built with Deno and Oak v17.1.5.

## Features

-   RESTful API endpoints for game data
-   WebSocket support for real-time gameplay on the same port
-   JWT authentication
-   MongoDB integration

## Getting Started

1. Copy the environment variables template:

    ```
    cp .env.example .env
    ```

2. Configure your environment variables in `.env`

3. Run the development server:
    ```
    deno task dev
    ```

## WebSocket Integration

The WebSocket server is integrated directly into the main server on the `/ws` endpoint. This simplifies the architecture and eliminates the need for a separate WebSocket server.

### WebSocket Endpoints

-   `/ws` - Main WebSocket connection endpoint
-   `/ws/info` - Information about the WebSocket server
-   `/ws/health` - Health check endpoint

### WebSocket Client Example

```javascript
// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:8000/ws');

// Optional: Add authentication token
const ws = new WebSocket('ws://localhost:8000/ws?token=your-jwt-token');

// Event handlers
ws.onopen = () => console.log('Connected to WebSocket server');
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data));
ws.onclose = () => console.log('Disconnected from WebSocket server');
ws.onerror = (error) => console.error('WebSocket error:', error);

// Send a message
ws.send(JSON.stringify({ 
  type: 'join', 
  username: 'Player1' 
}));
```

### Authentication

WebSockets support authentication via:

1. URL parameter: `?token=your-jwt-token`
2. Cookie: `authToken=your-jwt-token`

## API Documentation

The server provides the following main routes:

-   `/api/*` - API endpoints
-   `/auth/*` - Authentication endpoints
-   `/game/*` - Game-specific endpoints
-   `/ws/*` - WebSocket endpoints

## Environment Variables

| Variable        | Description                                  | Default                   |
| --------------- | -------------------------------------------- | ------------------------- |
| PORT            | Server port                                  | 8000                      |
| DENO_ENV        | Environment (development/production)         | development               |
| SERVER_DOMAIN   | Server domain                                | localhost                 |
| JWT_SECRET      | Secret for JWT tokens                        | (auto-generated)          |
| MONGODB_URI     | MongoDB connection string                    | mongodb://localhost:27017 |
| DB_NAME         | MongoDB database name                        | dhaniverse                |
| ALLOWED_ORIGINS | Comma-separated list of allowed CORS origins | (varies by environment)   |