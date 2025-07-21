/**
 * Connection state types for WebSocket reliability
 */

/**
 * Represents the current state of a WebSocket connection
 */
export enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting', 
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    FAILED = 'failed',
    OFFLINE = 'offline'
}

/**
 * Represents a connection quality assessment
 */
export enum ConnectionQuality {
    EXCELLENT = 'excellent',
    GOOD = 'good',
    POOR = 'poor',
    UNSTABLE = 'unstable'
}

/**
 * Represents different types of connection errors
 */
export enum ConnectionError {
    NETWORK_UNAVAILABLE = 'network_unavailable',
    SERVER_UNREACHABLE = 'server_unreachable', 
    AUTHENTICATION_FAILED = 'authentication_failed',
    SESSION_EXPIRED = 'session_expired',
    DUPLICATE_CONNECTION = 'duplicate_connection',
    CONNECTION_TIMEOUT = 'connection_timeout'
}

/**
 * Configuration for connection retry behavior
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 10,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true
};

/**
 * Represents the result of a connection attempt
 */
export interface ConnectionResult {
    success: boolean;
    state: ConnectionState;
    error?: ConnectionError;
    errorMessage?: string;
    connectionId?: string;
}

/**
 * Represents a connection state change event
 */
export interface ConnectionStateChangeEvent {
    previousState: ConnectionState;
    currentState: ConnectionState;
    timestamp: number;
    connectionId?: string;
    error?: ConnectionError;
    errorMessage?: string;
}

/**
 * Type for connection state change callback functions
 */
export type ConnectionStateChangeCallback = (event: ConnectionStateChangeEvent) => void;