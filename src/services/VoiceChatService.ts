import { 
    Room, 
    RoomEvent, 
    LocalTrack, 
    RemoteTrack, 
    Track, 
    ParticipantEvent,
    AudioTrack,
    ConnectionState,
    LocalAudioTrack,
    RemoteAudioTrack,
    Participant,
    TrackPublication,
    createLocalAudioTrack,
    RemoteParticipant
} from 'livekit-client';

export interface VoiceChatConfig {
    serverUrl: string;
    apiKey: string;
    apiSecret: string;
    roomName: string;
    participantName: string;
}

export interface VoiceState {
    isConnected: boolean;
    isSpeaking: boolean;
    isListening: boolean;
    isDeaf: boolean;
    participants: VoiceParticipant[];
    connectionState: ConnectionState;
}

export interface VoiceParticipant {
    identity: string;
    name: string;
    isSpeaking: boolean;
    audioLevel: number;
    isLocal: boolean;
}

export class VoiceChatService {
    private room: Room | null = null;
    private config: VoiceChatConfig | null = null;
    private voiceState: VoiceState = {
        isConnected: false,
        isSpeaking: false,
        isListening: true,
        isDeaf: false,
        participants: [],
        connectionState: ConnectionState.Disconnected
    };
    private listeners: ((state: VoiceState) => void)[] = [];
    private localAudioTrack: LocalAudioTrack | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private dataArray: Uint8Array | null = null;
    private animationFrame: number | null = null;

    constructor() {
        this.setupAudioContext();
    }

    private setupAudioContext(): void {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    // Subscribe to voice state changes
    public onStateChange(callback: (state: VoiceState) => void): () => void {
        this.listeners.push(callback);
        // Immediately call with current state
        callback(this.voiceState);
        
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.voiceState));
    }

    // Initialize voice chat with configuration
    public async initialize(config: VoiceChatConfig): Promise<void> {
        this.config = config;
        this.room = new Room({
            adaptiveStream: true,
            dynacast: true,
            videoCaptureDefaults: {
                resolution: { width: 0, height: 0 } // Audio only
            }
        });

        this.setupRoomEventListeners();
    }

    private setupRoomEventListeners(): void {
        if (!this.room) return;

        this.room.on(RoomEvent.Connected, this.handleRoomConnected.bind(this));
        this.room.on(RoomEvent.Disconnected, this.handleRoomDisconnected.bind(this));
        this.room.on(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
        this.room.on(RoomEvent.ParticipantDisconnected, this.handleParticipantDisconnected.bind(this));
        this.room.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.room.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
        this.room.on(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakersChanged.bind(this));
        this.room.on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChanged.bind(this));
    }

    // Generate access token (dev-only: client-side). In production, generate on your backend.
    private async generateToken(): Promise<string> {
        if (!this.config) throw new Error('Voice chat not initialized');
        if (!this.config.roomName || !this.config.participantName) {
            throw new Error('Missing room or participant for token');
        }

        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload: any = {
            iss: this.config.apiKey,
            sub: this.config.participantName,
            nbf: now - 10,
            iat: now,
            exp: now + 60 * 60, // 1 hour
            name: this.config.participantName,
            video: {
                roomJoin: true,
                room: this.config.roomName,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true
            }
        };

        const enc = new TextEncoder();
        const base64url = (input: ArrayBuffer | string) => {
            const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
            let str = '';
            for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
            return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        };

        const headerPart = base64url(JSON.stringify(header));
        const payloadPart = base64url(JSON.stringify(payload));
        const unsigned = `${headerPart}.${payloadPart}`;

        if (!(window.crypto && window.crypto.subtle)) {
            throw new Error('Web Crypto not available to sign JWT. Use a backend token endpoint.');
        }

        const key = await window.crypto.subtle.importKey(
            'raw',
            enc.encode(this.config.apiSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(unsigned));
        const sigPart = base64url(signature);
        return `${unsigned}.${sigPart}`;
    }

    // Connect to voice chat room
    public async connect(): Promise<void> {
        if (!this.room || !this.config) {
            throw new Error('Voice chat not initialized');
        }
        if (!this.config.serverUrl) {
            throw new Error('LiveKit server URL is not set');
        }
        if (!this.config.roomName || !this.config.participantName) {
            throw new Error('Room name or participant name is empty');
        }

        try {
            const token = await this.generateToken();
            await this.room.connect(this.config.serverUrl, token);
            
            this.voiceState.isConnected = true;
            this.voiceState.connectionState = ConnectionState.Connected;
            this.notifyListeners();
        } catch (error) {
            console.error('Failed to connect to voice chat:', error);
            throw error;
        }
    }

    // Disconnect from voice chat
    public async disconnect(): Promise<void> {
        if (this.room) {
            await this.room.disconnect();
        }
        
        if (this.localAudioTrack) {
            this.localAudioTrack.stop();
            this.localAudioTrack = null;
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.voiceState.isConnected = false;
        this.voiceState.isSpeaking = false;
        this.voiceState.participants = [];
        this.voiceState.connectionState = ConnectionState.Disconnected;
        this.notifyListeners();
    }

    // Start speaking (enable microphone)
    public async startSpeaking(): Promise<void> {
        if (!this.room || this.voiceState.isDeaf) return;

        try {
            if (!this.localAudioTrack) {
                this.localAudioTrack = await createLocalAudioTrack();
                this.setupVoiceActivityDetection();
            }

            await this.room.localParticipant.publishTrack(this.localAudioTrack);
            this.voiceState.isSpeaking = true;
            this.notifyListeners();

            // Dispatch event for game to know player is speaking
            window.dispatchEvent(new CustomEvent('voice-speaking-start', {
                detail: { participantName: this.config?.participantName }
            }));
        } catch (error) {
            console.error('Failed to start speaking:', error);
            throw error;
        }
    }

    // Stop speaking (disable microphone)
    public async stopSpeaking(): Promise<void> {
        if (!this.room || !this.localAudioTrack) return;

        try {
            await this.room.localParticipant.unpublishTrack(this.localAudioTrack);
            this.voiceState.isSpeaking = false;
            this.notifyListeners();

            // Dispatch event for game to know player stopped speaking
            window.dispatchEvent(new CustomEvent('voice-speaking-stop', {
                detail: { participantName: this.config?.participantName }
            }));
        } catch (error) {
            console.error('Failed to stop speaking:', error);
        }
    }

    // Toggle listening (mute/unmute other participants)
    public toggleListening(): void {
        this.voiceState.isListening = !this.voiceState.isListening;
        
        if (this.room) {
            this.room.remoteParticipants.forEach((participant: RemoteParticipant) => {
                participant.getTrackPublications().forEach(trackPub => {
                    if (trackPub.track && trackPub.track.kind === Track.Kind.Audio) {
                        const audioTrack = trackPub.track as RemoteAudioTrack;
                        audioTrack.setVolume(this.voiceState.isListening ? 1 : 0);
                    }
                });
            });
        }

        this.notifyListeners();

        // Dispatch event for UI feedback
        window.dispatchEvent(new CustomEvent('voice-listening-change', {
            detail: { isListening: this.voiceState.isListening }
        }));
    }

    // Toggle deaf mode (disconnect from voice entirely)
    public async toggleDeaf(): Promise<void> {
        this.voiceState.isDeaf = !this.voiceState.isDeaf;
        
        if (this.voiceState.isDeaf) {
            // Stop speaking and disconnect
            if (this.voiceState.isSpeaking) {
                await this.stopSpeaking();
            }
            await this.disconnect();
        } else {
            // Reconnect to voice chat
            if (this.config) {
                await this.connect();
            }
        }

        this.notifyListeners();

        // Dispatch event for UI feedback
        window.dispatchEvent(new CustomEvent('voice-deaf-change', {
            detail: { isDeaf: this.voiceState.isDeaf }
        }));
    }

    private setupVoiceActivityDetection(): void {
        if (!this.localAudioTrack || !this.audioContext) return;

        try {
            const mediaStream = this.localAudioTrack.mediaStream;
            if (!mediaStream) return;

            const source = this.audioContext.createMediaStreamSource(mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            source.connect(this.analyser);
            this.analyzeAudio();
        } catch (error) {
            console.warn('Failed to setup voice activity detection:', error);
        }
    }

    private analyzeAudio(): void {
        if (!this.analyser || !this.dataArray) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        
        // Update local participant speaking status
        const wasSpeaking = this.getCurrentParticipant()?.isSpeaking || false;
        const isSpeaking = average > 10; // Threshold for voice activity
        
        if (wasSpeaking !== isSpeaking) {
            this.updateParticipantSpeakingStatus(this.config?.participantName || '', isSpeaking, average);
        }

        this.animationFrame = requestAnimationFrame(() => this.analyzeAudio());
    }

    private updateParticipantSpeakingStatus(identity: string, isSpeaking: boolean, audioLevel: number): void {
        const participantIndex = this.voiceState.participants.findIndex(p => p.identity === identity);
        
        if (participantIndex >= 0) {
            this.voiceState.participants[participantIndex].isSpeaking = isSpeaking;
            this.voiceState.participants[participantIndex].audioLevel = audioLevel;
            this.notifyListeners();

            // Dispatch speaking change event
            window.dispatchEvent(new CustomEvent('voice-participant-speaking-change', {
                detail: { 
                    identity, 
                    isSpeaking, 
                    audioLevel,
                    isLocal: this.voiceState.participants[participantIndex].isLocal
                }
            }));
        }
    }

    private getCurrentParticipant(): VoiceParticipant | null {
        return this.voiceState.participants.find(p => p.isLocal) || null;
    }

    // Event handlers
    private handleRoomConnected(): void {
        console.log('Connected to voice chat room');
        this.voiceState.isConnected = true;
        this.voiceState.connectionState = ConnectionState.Connected;
        
        // Add local participant
        if (this.room?.localParticipant && this.config) {
            this.addParticipant(this.room.localParticipant, true);
        }
        
        this.notifyListeners();
    }

    private handleRoomDisconnected(): void {
        console.log('Disconnected from voice chat room');
        this.voiceState.isConnected = false;
        this.voiceState.participants = [];
        this.voiceState.connectionState = ConnectionState.Disconnected;
        this.notifyListeners();
    }

    private handleParticipantConnected(participant: Participant): void {
        console.log('Participant connected:', participant.identity);
        this.addParticipant(participant, false);
        this.notifyListeners();
    }

    private handleParticipantDisconnected(participant: Participant): void {
        console.log('Participant disconnected:', participant.identity);
        this.voiceState.participants = this.voiceState.participants.filter(
            p => p.identity !== participant.identity
        );
        this.notifyListeners();
    }

    private handleTrackSubscribed(track: RemoteTrack, publication: TrackPublication, participant: Participant): void {
        if (track.kind === Track.Kind.Audio) {
            const audioTrack = track as RemoteAudioTrack;
            audioTrack.setVolume(this.voiceState.isListening ? 1 : 0);
            
            // Attach to audio element for playback
            const audioElement = audioTrack.attach();
            document.body.appendChild(audioElement);
        }
    }

    private handleTrackUnsubscribed(track: RemoteTrack): void {
        if (track.kind === Track.Kind.Audio) {
            // Remove audio elements
            track.detach().forEach(element => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
        }
    }

    private handleActiveSpeakersChanged(speakers: Participant[]): void {
        // Update speaking status for all participants
        this.voiceState.participants.forEach(participant => {
            participant.isSpeaking = speakers.some(speaker => speaker.identity === participant.identity);
        });
        this.notifyListeners();
    }

    private handleConnectionStateChanged(state: ConnectionState): void {
        this.voiceState.connectionState = state;
        this.notifyListeners();
    }

    private addParticipant(participant: Participant, isLocal: boolean): void {
        const existingIndex = this.voiceState.participants.findIndex(p => p.identity === participant.identity);
        
        const voiceParticipant: VoiceParticipant = {
            identity: participant.identity,
            name: participant.name || participant.identity,
            isSpeaking: false,
            audioLevel: 0,
            isLocal
        };

        if (existingIndex >= 0) {
            this.voiceState.participants[existingIndex] = voiceParticipant;
        } else {
            this.voiceState.participants.push(voiceParticipant);
        }
    }

    // Getters
    public getVoiceState(): VoiceState {
        return { ...this.voiceState };
    }

    public isConnected(): boolean {
        return this.voiceState.isConnected;
    }

    public isSpeaking(): boolean {
        return this.voiceState.isSpeaking;
    }

    public isListening(): boolean {
        return this.voiceState.isListening;
    }

    public isDeaf(): boolean {
        return this.voiceState.isDeaf;
    }

    public getParticipants(): VoiceParticipant[] {
        return [...this.voiceState.participants];
    }

    // Cleanup
    public destroy(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.disconnect();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.listeners = [];
    }
}

// Singleton instance
export const voiceChatService = new VoiceChatService();
