import { useState, useEffect, useCallback } from 'react';
import { voiceChatService, VoiceState, VoiceChatConfig } from '../../services/VoiceChatService';

export interface UseVoiceChatOptions {
    serverUrl?: string;
    roomName?: string;
    participantName?: string;
    autoConnect?: boolean;
}

export const useVoiceChat = (options: UseVoiceChatOptions = {}) => {
    const [voiceState, setVoiceState] = useState<VoiceState>({
        isConnected: false,
        isSpeaking: false,
        isListening: true,
        isDeaf: false,
        participants: [],
        connectionState: 'disconnected' as any
    });
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize voice chat service
    const initialize = useCallback(async (config: VoiceChatConfig) => {
        try {
            setError(null);
            await voiceChatService.initialize(config);
            setIsInitialized(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize voice chat';
            setError(errorMessage);
            console.error('Voice chat initialization error:', err);
        }
    }, []);

    // Connect to voice chat
    const connect = useCallback(async () => {
        if (!isInitialized) {
            setError('Voice chat not initialized');
            return;
        }

        try {
            setError(null);
            await voiceChatService.connect();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect to voice chat';
            setError(errorMessage);
            console.error('Voice chat connection error:', err);
        }
    }, [isInitialized]);

    // Disconnect from voice chat
    const disconnect = useCallback(async () => {
        try {
            setError(null);
            await voiceChatService.disconnect();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from voice chat';
            setError(errorMessage);
            console.error('Voice chat disconnection error:', err);
        }
    }, []);

    // Start speaking (enable microphone)
    const startSpeaking = useCallback(async () => {
        try {
            setError(null);
            await voiceChatService.startSpeaking();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start speaking';
            setError(errorMessage);
            console.error('Voice chat speaking error:', err);
        }
    }, []);

    // Stop speaking (disable microphone)
    const stopSpeaking = useCallback(async () => {
        try {
            setError(null);
            await voiceChatService.stopSpeaking();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to stop speaking';
            setError(errorMessage);
            console.error('Voice chat stop speaking error:', err);
        }
    }, []);

    // Toggle listening mode
    const toggleListening = useCallback(() => {
        try {
            setError(null);
            voiceChatService.toggleListening();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to toggle listening';
            setError(errorMessage);
            console.error('Voice chat listening toggle error:', err);
        }
    }, []);

    // Toggle deaf mode
    const toggleDeaf = useCallback(async () => {
        try {
            setError(null);
            await voiceChatService.toggleDeaf();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to toggle deaf mode';
            setError(errorMessage);
            console.error('Voice chat deaf toggle error:', err);
        }
    }, []);

    // Subscribe to voice state changes
    useEffect(() => {
        const unsubscribe = voiceChatService.onStateChange((state: VoiceState) => {
            setVoiceState(state);
        });

        return unsubscribe;
    }, []);

    // Auto-connect if specified (after external initialize)
    useEffect(() => {
        if (isInitialized && options.autoConnect && !voiceState.isConnected) {
            connect();
        }
    }, [isInitialized, options.autoConnect, voiceState.isConnected, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            voiceChatService.destroy();
        };
    }, []);

    return {
        // State
        voiceState,
        isInitialized,
        error,
        
        // Connection methods
        initialize,
        connect,
        disconnect,
        
        // Voice control methods
        startSpeaking,
        stopSpeaking,
        toggleListening,
        toggleDeaf,
        
        // Convenience getters
        isConnected: voiceState.isConnected,
        isSpeaking: voiceState.isSpeaking,
        isListening: voiceState.isListening,
        isDeaf: voiceState.isDeaf,
        participants: voiceState.participants,
        connectionState: voiceState.connectionState
    };
};
