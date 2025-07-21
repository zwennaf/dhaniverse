import { 
    ConnectionState, 
    ConnectionError, 
    ConnectionQuality,
    ConnectionStateChangeEvent,
    ConnectionStateChangeCallback
} from './ConnectionTypes';

/**
 * Manages WebSocket connection state and provides a centralized system
 * for tracking and responding to connection state changes.
 */
export class ConnectionStateManager {
    private currentState: ConnectionState = ConnectionState.DISCONNECTED;
    private connectionQuality: ConnectionQuality = ConnectionQuality.GOOD;
    private lastConnected: Date | null = null;
    private reconnectAttempts: number = 0;
    private connectionId: string | null = null;
    private latency: number = 0;
    private stateChangeCallbacks: ConnectionStateChangeCallback[] = [];
    private lastError: ConnectionError | null = null;
    private lastErrorMessage: string | null = null;
    
    /**
     * Creates a new ConnectionStateManager
     */
    constructor() {
        // Initialize with disconnected state
        this.setState(ConnectionState.DISCONNECTED);
    }
    
    /**
     * Gets the current connection state
     */
    public getState(): ConnectionState {
        return this.currentState;
    }
    
    /**
     * Sets the connection state and triggers state change callbacks
     * @param newState The new connection state
     * @param error Optional error that caused the state change
     * @param errorMessage Optional error message
     */
    public setState(newState: ConnectionState, error?: ConnectionError, errorMessage?: string): void {
        // Don't trigger events if state hasn't changed
        if (newState === this.currentState) {
            return;
        }
        
        const previousState = this.currentState;
        this.currentState = newState;
        
        // Update tracking properties based on state
        if (newState === ConnectionState.CONNECTED) {
            this.lastConnected = new Date();
            this.reconnectAttempts = 0;
            this.lastError = null;
            this.lastErrorMessage = null;
        } else if (newState === ConnectionState.RECONNECTING) {
            this.reconnectAttempts++;
        } else if (newState === ConnectionState.FAILED) {
            this.lastError = error || null;
            this.lastErrorMessage = errorMessage || null;
        }
        
        // Create state change event
        const event: ConnectionStateChangeEvent = {
            previousState,
            currentState: newState,
            timestamp: Date.now(),
            connectionId: this.connectionId || undefined,
            error,
            errorMessage
        };
        
        // Notify all registered callbacks
        this.notifyStateChangeCallbacks(event);
        
        console.log(`Connection state changed: ${previousState} -> ${newState}${error ? ` (Error: ${error})` : ''}`);
    }
    
    /**
     * Registers a callback to be notified when connection state changes
     * @param callback The callback function to register
     * @returns A function that can be called to unregister the callback
     */
    public onStateChange(callback: ConnectionStateChangeCallback): () => void {
        this.stateChangeCallbacks.push(callback);
        
        // Return a function that can be used to unregister this callback
        return () => {
            this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
        };
    }
    
    /**
     * Notifies all registered callbacks about a state change
     * @param event The state change event
     */
    private notifyStateChangeCallbacks(event: ConnectionStateChangeEvent): void {
        // Make a copy of the callbacks array to avoid issues if callbacks modify the array
        const callbacks = [...this.stateChangeCallbacks];
        
        // Notify all callbacks
        callbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in connection state change callback:', error);
            }
        });
    }
    
    /**
     * Sets the connection quality
     * @param quality The new connection quality
     */
    public setConnectionQuality(quality: ConnectionQuality): void {
        this.connectionQuality = quality;
    }
    
    /**
     * Gets the current connection quality
     */
    public getConnectionQuality(): ConnectionQuality {
        return this.connectionQuality;
    }
    
    /**
     * Sets the connection ID
     * @param id The connection ID
     */
    public setConnectionId(id: string): void {
        this.connectionId = id;
    }
    
    /**
     * Gets the connection ID
     */
    public getConnectionId(): string | null {
        return this.connectionId;
    }
    
    /**
     * Sets the connection latency in milliseconds
     * @param latency The latency in milliseconds
     */
    public setLatency(latency: number): void {
        this.latency = latency;
    }
    
    /**
     * Gets the connection latency in milliseconds
     */
    public getLatency(): number {
        return this.latency;
    }
    
    /**
     * Gets the number of reconnection attempts
     */
    public getReconnectAttempts(): number {
        return this.reconnectAttempts;
    }
    
    /**
     * Resets the reconnection attempts counter
     */
    public resetReconnectAttempts(): void {
        this.reconnectAttempts = 0;
    }
    
    /**
     * Gets the timestamp of the last successful connection
     */
    public getLastConnectedTime(): Date | null {
        return this.lastConnected;
    }
    
    /**
     * Gets the last error that occurred
     */
    public getLastError(): ConnectionError | null {
        return this.lastError;
    }
    
    /**
     * Gets the last error message
     */
    public getLastErrorMessage(): string | null {
        return this.lastErrorMessage;
    }
    
    /**
     * Checks if the connection is in a connected state
     */
    public isConnected(): boolean {
        return this.currentState === ConnectionState.CONNECTED;
    }
    
    /**
     * Checks if the connection is in a connecting or reconnecting state
     */
    public isConnecting(): boolean {
        return this.currentState === ConnectionState.CONNECTING || 
               this.currentState === ConnectionState.RECONNECTING;
    }
    
    /**
     * Checks if the connection has failed
     */
    public hasFailed(): boolean {
        return this.currentState === ConnectionState.FAILED;
    }
    
    /**
     * Checks if the connection is in offline mode
     */
    public isOffline(): boolean {
        return this.currentState === ConnectionState.OFFLINE;
    }
    
    /**
     * Resets the connection state manager to its initial state
     */
    public reset(): void {
        this.currentState = ConnectionState.DISCONNECTED;
        this.connectionQuality = ConnectionQuality.GOOD;
        this.lastConnected = null;
        this.reconnectAttempts = 0;
        this.connectionId = null;
        this.latency = 0;
        this.lastError = null;
        this.lastErrorMessage = null;
    }
}