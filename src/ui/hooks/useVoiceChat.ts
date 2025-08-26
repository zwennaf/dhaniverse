import { useState, useEffect, useCallback } from 'react';
import { voiceChatService, VoiceState, VoiceChatConfig } from '../../services/VoiceChatService';

export interface UseVoiceChatOptions {
    serverUrl?: string;
    roomName?: string;
    participantName?: string;
    apiKey?: string;
    apiSecret?: string;
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
    const lastConfigRef = (typeof window !== 'undefined') ? (window as any).__voice_last_cfg_ref || { current: null as VoiceChatConfig | null } : { current: null as VoiceChatConfig | null };
    if (typeof window !== 'undefined' && !(window as any).__voice_last_cfg_ref) {
        (window as any).__voice_last_cfg_ref = lastConfigRef;
    }
    const initPromiseRef = (typeof window !== 'undefined') ? (window as any).__voice_init_prom_ref || { current: null as Promise<void> | null } : { current: null as Promise<void> | null };
    if (typeof window !== 'undefined' && !(window as any).__voice_init_prom_ref) {
        (window as any).__voice_init_prom_ref = initPromiseRef;
    }

    // Initialize voice chat service
    const initialize = useCallback(async (config: VoiceChatConfig) => {
        try {
            setError(null);
            await voiceChatService.initialize(config);
            setIsInitialized(true);
            lastConfigRef.current = config;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize voice chat';
            setError(errorMessage);
            console.error('Voice chat initialization error:', err);
        }
    }, []);

    // Internal ensure initialization helper (idempotent)
    const ensureInitialized = useCallback(async () => {
        if (isInitialized) return;
        if (initPromiseRef.current) {
            await initPromiseRef.current; // wait on in-flight init
            return;
        }
        // Build config from last known or options
        const cfg: VoiceChatConfig | null = lastConfigRef.current || ((options.serverUrl && options.roomName && options.participantName) ? {
            serverUrl: options.serverUrl!,
            apiKey: options.apiKey || 'dev-key',
            apiSecret: options.apiSecret || 'dev-secret',
            roomName: options.roomName!,
            participantName: options.participantName!
        } : null);
        if (!cfg) {
            setError('Voice chat config missing');
            return;
        }
        initPromiseRef.current = (async () => {
            await initialize(cfg);
        })();
        try {
            await initPromiseRef.current;
        } finally {
            initPromiseRef.current = null;
        }
    }, [initialize, isInitialized, options.apiKey, options.apiSecret, options.participantName, options.roomName, options.serverUrl, lastConfigRef, initPromiseRef]);

    // Connect to voice chat
    const connect = useCallback(async () => {
        try {
            if (!isInitialized) {
                await ensureInitialized();
            }
            if (!isInitialized && !lastConfigRef.current) return; // initialization failed
            setError(null);
            await voiceChatService.connect();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect to voice chat';
            setError(errorMessage);
            console.error('Voice chat connection error:', err);
        }
    }, [isInitialized, ensureInitialized, lastConfigRef]);

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
    connectionState: voiceState.connectionState,
    // internal util (optional export for advanced usage)
    ensureInitialized,
    // device helpers
    listAudioInputDevices: voiceChatService.listAudioInputDevices.bind(voiceChatService),
    setInputDevice: voiceChatService.setInputDevice.bind(voiceChatService),
    preferredDeviceId: voiceChatService.getPreferredInputDevice(),
    // output device helpers
    listAudioOutputDevices: voiceChatService.listAudioOutputDevices.bind(voiceChatService),
    setOutputDevice: voiceChatService.setOutputDevice.bind(voiceChatService),
    preferredOutputDeviceId: voiceChatService.getPreferredOutputDevice()
    };
};
