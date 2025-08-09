import React, { useState, useEffect } from 'react';
import { useVoiceChat } from '../../hooks/useVoiceChat';
import { VoiceParticipant } from '../../../services/VoiceChatService';

interface VoiceChatProps {
    roomName: string;
    participantName: string;
    serverUrl?: string;
    className?: string;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({
    roomName,
    participantName,
    serverUrl = 'wss://dhaniverse.livekit.cloud', // Replace with your LiveKit server URL
    className = ''
}) => {
    const [showParticipants, setShowParticipants] = useState(false);
    const [voiceIndicators, setVoiceIndicators] = useState<Map<string, boolean>>(new Map());

    const {
        voiceState,
        isInitialized,
        error,
        initialize,
        connect,
        disconnect,
        startSpeaking,
        stopSpeaking,
        toggleListening,
        toggleDeaf,
        isConnected,
        isSpeaking,
        isListening,
        isDeaf,
        participants
    } = useVoiceChat({
        serverUrl,
        roomName,
        participantName,
        autoConnect: false
    });

    // Initialize voice chat when component mounts
    useEffect(() => {
        if (!isInitialized) {
            initialize({
                serverUrl,
                apiKey: import.meta.env.VITE_LIVEKIT_API_KEY || 'dev-key',
                apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET || 'dev-secret',
                roomName,
                participantName
            });
        }
    }, [isInitialized, initialize, serverUrl, roomName, participantName]);

    // Listen for voice-related events from the game
    useEffect(() => {
        const handleVoiceSpeakingChange = (event: CustomEvent) => {
            const { identity, isSpeaking: speaking } = event.detail;
            setVoiceIndicators(prev => new Map(prev.set(identity, speaking)));
        };

        window.addEventListener('voice-participant-speaking-change', handleVoiceSpeakingChange as EventListener);
        
        return () => {
            window.removeEventListener('voice-participant-speaking-change', handleVoiceSpeakingChange as EventListener);
        };
    }, []);

    // Handle connection toggle
    const handleConnectionToggle = async () => {
        if (isConnected) {
            await disconnect();
        } else {
            await connect();
        }
    };

    // Handle speaking toggle
    const handleSpeakingToggle = async () => {
        if (isSpeaking) {
            await stopSpeaking();
        } else {
            await startSpeaking();
        }
    };

    // Get voice status icon
    const getVoiceStatusIcon = () => {
        if (isDeaf) return '🔇';
        if (!isListening) return '🔕';
        if (isSpeaking) return '🎤';
        if (isConnected) return '🔊';
        return '❌';
    };

    // Get voice status text
    const getVoiceStatusText = () => {
        if (isDeaf) return 'Deaf';
        if (!isListening) return 'Muted';
        if (isSpeaking) return 'Speaking';
        if (isConnected) return 'Listening';
        return 'Disconnected';
    };

    // Get connection status color
    const getStatusColor = () => {
        if (isDeaf) return 'text-red-400';
        if (!isListening) return 'text-yellow-400';
        if (isSpeaking) return 'text-green-400';
        if (isConnected) return 'text-blue-400';
        return 'text-gray-400';
    };

    // Render participant list
    const renderParticipants = () => {
        if (!showParticipants || participants.length === 0) return null;

        return (
            <div className="absolute top-full right-0 mt-2 bg-black/80 rounded-lg p-3 backdrop-blur min-w-[200px] z-50">
                <div className="text-white text-sm font-bold mb-2">Voice Chat ({participants.length})</div>
                <div className="space-y-1">
                    {participants.map((participant: VoiceParticipant) => (
                        <div 
                            key={participant.identity}
                            className="flex items-center space-x-2 text-sm"
                        >
                            <div className={`w-2 h-2 rounded-full ${
                                participant.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                            }`} />
                            <span className={`${participant.isLocal ? 'text-dhani-green' : 'text-white'}`}>
                                {participant.name} {participant.isLocal ? '(You)' : ''}
                            </span>
                            {participant.isSpeaking && (
                                <div className="text-green-400 text-xs">🎤</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={`relative ${className}`}>
            {/* Voice status indicator */}
            <div className="flex items-center space-x-2">
                {/* Connection status */}
                <div 
                    className={`flex items-center space-x-1 bg-black/60 rounded-lg px-2 py-1 cursor-pointer hover:bg-black/80 transition-colors ${getStatusColor()}`}
                    onClick={() => setShowParticipants(!showParticipants)}
                    title={`Voice: ${getVoiceStatusText()}`}
                >
                    <span className="text-sm">{getVoiceStatusIcon()}</span>
                    <span className="text-xs">{participants.length}</span>
                </div>

                {/* Voice controls */}
                <div className="flex items-center space-x-1">
                    {/* Connect/Disconnect button */}
                    <button
                        onClick={handleConnectionToggle}
                        disabled={!isInitialized}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                            isConnected 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isConnected ? 'Disconnect from voice' : 'Connect to voice'}
                    >
                        {isConnected ? '🔗' : '🔌'}
                    </button>

                    {/* Speak button */}
                    <button
                        onClick={handleSpeakingToggle}
                        disabled={!isConnected || isDeaf}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                            isSpeaking 
                                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isSpeaking ? 'Stop speaking' : 'Start speaking'}
                    >
                        🎤
                    </button>

                    {/* Listen toggle button */}
                    <button
                        onClick={toggleListening}
                        disabled={!isConnected || isDeaf}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                            isListening 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isListening ? 'Mute others' : 'Unmute others'}
                    >
                        {isListening ? '🔊' : '🔕'}
                    </button>

                    {/* Deaf toggle button */}
                    <button
                        onClick={toggleDeaf}
                        disabled={!isInitialized}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                            isDeaf 
                                ? 'bg-red-600 hover:bg-red-700 text-white' 
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isDeaf ? 'Enable voice chat' : 'Disable voice chat'}
                    >
                        {isDeaf ? '🔇' : '👂'}
                    </button>
                </div>
            </div>

            {/* Participants list */}
            {renderParticipants()}

            {/* Error display */}
            {error && (
                <div className="absolute top-full left-0 mt-2 bg-red-600/90 text-white text-xs rounded-lg px-3 py-2 backdrop-blur max-w-[300px]">
                    Voice Error: {error}
                </div>
            )}

            {/* Connection status text */}
            {isInitialized && (
                <div className="absolute top-full left-0 mt-1 text-xs text-white/60">
                    {getVoiceStatusText()}
                </div>
            )}
        </div>
    );
};
