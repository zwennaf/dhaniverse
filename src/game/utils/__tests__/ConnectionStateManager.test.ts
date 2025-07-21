import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectionStateManager } from '../ConnectionStateManager';
import { 
    ConnectionState, 
    ConnectionError, 
    ConnectionQuality,
    ConnectionStateChangeEvent
} from '../ConnectionTypes';

describe('ConnectionStateManager', () => {
    let manager: ConnectionStateManager;
    
    beforeEach(() => {
        manager = new ConnectionStateManager();
    });
    
    it('should initialize with DISCONNECTED state', () => {
        expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
    });
    
    it('should update state correctly', () => {
        manager.setState(ConnectionState.CONNECTING);
        expect(manager.getState()).toBe(ConnectionState.CONNECTING);
        
        manager.setState(ConnectionState.CONNECTED);
        expect(manager.getState()).toBe(ConnectionState.CONNECTED);
    });
    
    it('should not trigger callbacks when setting the same state', () => {
        const callback = vi.fn();
        manager.onStateChange(callback);
        
        manager.setState(ConnectionState.DISCONNECTED); // Same as initial state
        expect(callback).not.toHaveBeenCalled();
    });
    
    it('should notify callbacks when state changes', () => {
        const callback = vi.fn();
        manager.onStateChange(callback);
        
        manager.setState(ConnectionState.CONNECTING);
        
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({
            previousState: ConnectionState.DISCONNECTED,
            currentState: ConnectionState.CONNECTING,
            timestamp: expect.any(Number)
        }));
    });
    
    it('should handle multiple callbacks', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        manager.onStateChange(callback1);
        manager.onStateChange(callback2);
        
        manager.setState(ConnectionState.CONNECTING);
        
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
    });
    
    it('should allow unregistering callbacks', () => {
        const callback = vi.fn();
        
        const unregister = manager.onStateChange(callback);
        manager.setState(ConnectionState.CONNECTING);
        expect(callback).toHaveBeenCalledTimes(1);
        
        unregister();
        manager.setState(ConnectionState.CONNECTED);
        expect(callback).toHaveBeenCalledTimes(1); // Still only called once
    });
    
    it('should track reconnection attempts', () => {
        expect(manager.getReconnectAttempts()).toBe(0);
        
        manager.setState(ConnectionState.RECONNECTING);
        expect(manager.getReconnectAttempts()).toBe(1);
        
        manager.setState(ConnectionState.RECONNECTING);
        expect(manager.getReconnectAttempts()).toBe(2);
        
        manager.setState(ConnectionState.CONNECTED);
        expect(manager.getReconnectAttempts()).toBe(0); // Reset on successful connection
    });
    
    it('should track connection quality', () => {
        expect(manager.getConnectionQuality()).toBe(ConnectionQuality.GOOD); // Default
        
        manager.setConnectionQuality(ConnectionQuality.POOR);
        expect(manager.getConnectionQuality()).toBe(ConnectionQuality.POOR);
        
        manager.setConnectionQuality(ConnectionQuality.EXCELLENT);
        expect(manager.getConnectionQuality()).toBe(ConnectionQuality.EXCELLENT);
    });
    
    it('should track connection ID', () => {
        expect(manager.getConnectionId()).toBeNull(); // Default
        
        manager.setConnectionId('conn-123');
        expect(manager.getConnectionId()).toBe('conn-123');
    });
    
    it('should track latency', () => {
        expect(manager.getLatency()).toBe(0); // Default
        
        manager.setLatency(150);
        expect(manager.getLatency()).toBe(150);
    });
    
    it('should track last connected time', () => {
        expect(manager.getLastConnectedTime()).toBeNull(); // Default
        
        manager.setState(ConnectionState.CONNECTED);
        expect(manager.getLastConnectedTime()).toBeInstanceOf(Date);
    });
    
    it('should track errors', () => {
        expect(manager.getLastError()).toBeNull(); // Default
        expect(manager.getLastErrorMessage()).toBeNull(); // Default
        
        manager.setState(ConnectionState.FAILED, ConnectionError.SERVER_UNREACHABLE, 'Server is down');
        expect(manager.getLastError()).toBe(ConnectionError.SERVER_UNREACHABLE);
        expect(manager.getLastErrorMessage()).toBe('Server is down');
        
        manager.setState(ConnectionState.CONNECTED);
        expect(manager.getLastError()).toBeNull(); // Reset on successful connection
        expect(manager.getLastErrorMessage()).toBeNull(); // Reset on successful connection
    });
    
    it('should provide helper methods for checking state', () => {
        manager.setState(ConnectionState.DISCONNECTED);
        expect(manager.isConnected()).toBe(false);
        expect(manager.isConnecting()).toBe(false);
        expect(manager.hasFailed()).toBe(false);
        expect(manager.isOffline()).toBe(false);
        
        manager.setState(ConnectionState.CONNECTING);
        expect(manager.isConnected()).toBe(false);
        expect(manager.isConnecting()).toBe(true);
        expect(manager.hasFailed()).toBe(false);
        expect(manager.isOffline()).toBe(false);
        
        manager.setState(ConnectionState.CONNECTED);
        expect(manager.isConnected()).toBe(true);
        expect(manager.isConnecting()).toBe(false);
        expect(manager.hasFailed()).toBe(false);
        expect(manager.isOffline()).toBe(false);
        
        manager.setState(ConnectionState.RECONNECTING);
        expect(manager.isConnected()).toBe(false);
        expect(manager.isConnecting()).toBe(true);
        expect(manager.hasFailed()).toBe(false);
        expect(manager.isOffline()).toBe(false);
        
        manager.setState(ConnectionState.FAILED);
        expect(manager.isConnected()).toBe(false);
        expect(manager.isConnecting()).toBe(false);
        expect(manager.hasFailed()).toBe(true);
        expect(manager.isOffline()).toBe(false);
        
        manager.setState(ConnectionState.OFFLINE);
        expect(manager.isConnected()).toBe(false);
        expect(manager.isConnecting()).toBe(false);
        expect(manager.hasFailed()).toBe(false);
        expect(manager.isOffline()).toBe(true);
    });
    
    it('should reset all properties', () => {
        manager.setState(ConnectionState.CONNECTED);
        manager.setConnectionId('conn-123');
        manager.setLatency(150);
        manager.setConnectionQuality(ConnectionQuality.EXCELLENT);
        
        manager.reset();
        
        expect(manager.getState()).toBe(ConnectionState.DISCONNECTED);
        expect(manager.getConnectionId()).toBeNull();
        expect(manager.getLatency()).toBe(0);
        expect(manager.getConnectionQuality()).toBe(ConnectionQuality.GOOD);
        expect(manager.getLastConnectedTime()).toBeNull();
        expect(manager.getReconnectAttempts()).toBe(0);
    });
    
    it('should handle state transitions with proper event data', () => {
        const events: ConnectionStateChangeEvent[] = [];
        manager.onStateChange(event => events.push(event));
        
        manager.setState(ConnectionState.CONNECTING);
        manager.setState(ConnectionState.CONNECTED);
        manager.setConnectionId('conn-123');
        manager.setState(ConnectionState.RECONNECTING);
        manager.setState(ConnectionState.FAILED, ConnectionError.SERVER_UNREACHABLE, 'Server unavailable');
        
        expect(events.length).toBe(4);
        
        expect(events[0].previousState).toBe(ConnectionState.DISCONNECTED);
        expect(events[0].currentState).toBe(ConnectionState.CONNECTING);
        
        expect(events[1].previousState).toBe(ConnectionState.CONNECTING);
        expect(events[1].currentState).toBe(ConnectionState.CONNECTED);
        
        expect(events[2].previousState).toBe(ConnectionState.CONNECTED);
        expect(events[2].currentState).toBe(ConnectionState.RECONNECTING);
        
        expect(events[3].previousState).toBe(ConnectionState.RECONNECTING);
        expect(events[3].currentState).toBe(ConnectionState.FAILED);
        expect(events[3].error).toBe(ConnectionError.SERVER_UNREACHABLE);
        expect(events[3].errorMessage).toBe('Server unavailable');
    });
});