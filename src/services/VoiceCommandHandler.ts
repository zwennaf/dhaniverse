import { voiceChatService } from '../services/VoiceChatService';

export class VoiceCommandHandler {
    private static instance: VoiceCommandHandler;
    private isInitialized = false;
    private currentRoom: string | null = null;
    private participantId: string | null = null;

    private constructor() {
        this.setupEventListeners();
    }

    public static getInstance(): VoiceCommandHandler {
        if (!VoiceCommandHandler.instance) {
            VoiceCommandHandler.instance = new VoiceCommandHandler();
        }
        return VoiceCommandHandler.instance;
    }

    private setupEventListeners(): void {
        // Voice is now controlled via UI buttons; no chat command listener.
        
        // Listen for player join/leave events to manage voice chat
        window.addEventListener('playerJoined', ((event: Event) => {
            this.handlePlayerJoined(event as CustomEvent);
        }) as EventListener);
        
        window.addEventListener('playerDisconnect', ((event: Event) => {
            this.handlePlayerDisconnect(event as CustomEvent);
        }) as EventListener);
        
        // Listen for voice state changes to notify other players
        if (voiceChatService) {
            voiceChatService.onStateChange(this.handleVoiceStateChange.bind(this));
        }
    }

    public async initialize(roomName: string, participantId: string): Promise<void> {
        if (this.isInitialized) return;

        this.currentRoom = roomName;
        this.participantId = participantId;

        try {
            // Do not initialize the VoiceChatService here; the UI (VoiceChat component) handles it.
            this.isInitialized = true;
            console.log('Voice command handler initialized (metadata only)');
        } catch (error) {
            console.error('Failed to initialize voice command handler:', error);
        }
    }

    private handlePlayerJoined(event: CustomEvent): void {
        const { player } = event.detail;
        if (player?.id || player?.username) {
            // Notify voice participants about new player (include id if available)
            window.dispatchEvent(new CustomEvent('voice-player-joined', {
                detail: { 
                    playerId: player.id,
                    playerName: player.username,
                    currentRoom: this.currentRoom 
                }
            }));
        }
    }

    private handlePlayerDisconnect(event: CustomEvent): void {
        const { id, username } = event.detail || {};
        if (id || username) {
            // Notify voice participants about player leaving (include id if available)
            window.dispatchEvent(new CustomEvent('voice-player-left', {
                detail: { 
                    playerId: id,
                    playerName: username,
                    currentRoom: this.currentRoom 
                }
            }));
        }
    }

    private handleVoiceStateChange(voiceState: any): void {
        // Dispatch voice state changes for UI updates
        window.dispatchEvent(new CustomEvent('voice-state-change', {
            detail: voiceState
        }));

        // Send voice indicators to other players via WebSocket
        if (this.participantId) {
            this.broadcastVoiceIndicator(voiceState);
        }
    }

    private broadcastVoiceStatus(type: string, status: boolean): void {
        // Send voice status to WebSocket for other players to see
        window.dispatchEvent(new CustomEvent('send-voice-status', {
            detail: {
                participant: this.participantId,
                // Keep legacy field for compatibility
                participantId: this.participantId,
                type,
                status,
                timestamp: Date.now()
            }
        }));
    }

    private broadcastVoiceIndicator(voiceState: any): void {
        // Send real-time voice indicators (speaking status, etc.)
        const localParticipant = voiceState.participants.find((p: any) => p.isLocal);
        
        if (localParticipant) {
            window.dispatchEvent(new CustomEvent('send-voice-indicator', {
                detail: {
                    participant: this.participantId,
                    // Keep legacy field for compatibility
                    participantId: this.participantId,
                    isSpeaking: localParticipant.isSpeaking,
                    isListening: voiceState.isListening,
                    isDeaf: voiceState.isDeaf,
                    audioLevel: localParticipant.audioLevel || 0
                }
            }));
        }
    }

    private dispatchVoiceError(message: string): void {
        window.dispatchEvent(new CustomEvent('voice-error', {
            detail: { message }
        }));
    }

    public async connectToVoice(): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Voice command handler not initialized');
        }

        if (!voiceChatService.isConnected()) {
            await voiceChatService.connect();
        }
    }

    public async disconnectFromVoice(): Promise<void> {
        if (voiceChatService.isConnected()) {
            await voiceChatService.disconnect();
        }
    }

    public getVoiceState() {
        return voiceChatService.getVoiceState();
    }

    public isVoiceConnected(): boolean {
        return voiceChatService.isConnected();
    }

    public destroy(): void {
        voiceChatService.destroy();
        this.isInitialized = false;
        this.currentRoom = null;
        this.participantId = null;
    }
}

// Export singleton instance
export const voiceCommandHandler = VoiceCommandHandler.getInstance();
