# Requirements Document

## Introduction

This document outlines the requirements for ensuring proper communication between the frontend application, the main backend server (Deno Deploy), and the WebSocket server (Azure). The goal is to establish a reliable and secure communication flow between all components of the Dhaniverse application.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to ensure the frontend application can communicate with both the main backend server and the WebSocket server, so that users can experience a seamless application with real-time features.

#### Acceptance Criteria

1. WHEN the frontend application is started THEN it SHALL establish connections to both the main backend server and the WebSocket server.
2. WHEN the frontend application makes API requests THEN it SHALL use the appropriate URL based on the environment (development or production).
3. WHEN the frontend application needs real-time updates THEN it SHALL connect to the WebSocket server using the appropriate URL based on the environment.
4. WHEN the frontend application is deployed THEN it SHALL use the production URLs for both servers.

### Requirement 2

**User Story:** As a developer, I want to ensure the WebSocket server can validate authentication tokens with the main backend server, so that only authenticated users can access real-time features.

#### Acceptance Criteria

1. WHEN a user connects to the WebSocket server THEN the server SHALL validate the JWT token with the main backend server.
2. WHEN the WebSocket server is running in development mode THEN it SHALL use the development URL for the main backend server.
3. WHEN the WebSocket server is running in production mode THEN it SHALL use the production URL for the main backend server.
4. WHEN the JWT token is invalid THEN the WebSocket server SHALL reject the connection.
5. WHEN the JWT token is valid THEN the WebSocket server SHALL establish the connection and associate it with the authenticated user.

### Requirement 3

**User Story:** As a developer, I want to ensure the environment configuration is properly set up for both development and production, so that the application works correctly in all environments.

#### Acceptance Criteria

1. WHEN running in development mode THEN the application SHALL use local URLs for server communication.
2. WHEN running in production mode THEN the application SHALL use production URLs for server communication.
3. WHEN deploying to production THEN the application SHALL have all necessary environment variables configured.
4. WHEN the environment changes THEN the application SHALL automatically use the appropriate configuration.

### Requirement 4

**User Story:** As a developer, I want to ensure the deployment workflows are correctly configured, so that the application is deployed correctly to all platforms.

#### Acceptance Criteria

1. WHEN code is pushed to the main branch THEN the frontend application SHALL be deployed to Vercel.
2. WHEN code is pushed to the main branch THEN the main backend server SHALL be deployed to Deno Deploy.
3. WHEN code is pushed to the main branch AND it affects the WebSocket server THEN the WebSocket server SHALL be deployed to Azure.
4. WHEN any deployment fails THEN the developer SHALL be notified.