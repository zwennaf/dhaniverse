# Dhaniverse WebSocket Server

This is the dedicated WebSocket server for the Dhaniverse game, built with Deno using the standard HTTP server.

## Features

- Real-time WebSocket communication for multiplayer gameplay
- Player position synchronization
- Chat message broadcasting
- JWT authentication
- Connection management with duplicate prevention
- Automatic inactive connection cleanup

## Getting Started

1. Copy the environment variables template:

    ```
    cp .env.example .env
    ```

2. Configure your environment variables in `.env`
   - Make sure the `JWT_SECRET` matches your authentication server's secret

3. Run the development server:
    ```
    deno task dev
    ```

4. For production:
    ```
    deno task start
    ```

## WebSocket Endpoints

- `/` - Main WebSocket connection endpoint
- `/health` - Health check endpoint
- `/info` - Information about the WebSocket server

## Environment Variables

| Variable                  | Description                                  | Default                   |
| ------------------------- | -------------------------------------------- | ------------------------- |
| PORT                      | Server port                                  | 8001                      |
| DENO_ENV                  | Environment (development/production)         | development               |
| SERVER_DOMAIN             | Server domain name                           | localhost                 |
| JWT_SECRET                | Secret for JWT tokens (must match auth server)| (auto-generated)         |
| ALLOWED_ORIGINS           | Comma-separated list of allowed CORS origins | (varies by environment)   |
| AUTH_SERVER_URL           | URL of the authentication server (dev)       | http://localhost:8000     |
| PRODUCTION_AUTH_SERVER_URL| URL of the authentication server (prod)      | https://api.dhaniverse.in |

## Deployment

This WebSocket server is designed to be deployed on Azure.

### Azure Deployment

1. Create an Azure Web App with Deno runtime
2. Configure environment variables in the Azure portal
3. Set up continuous deployment from your repository
4. Make sure to open the WebSocket port in your Azure configuration