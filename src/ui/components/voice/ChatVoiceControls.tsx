import React, { useEffect } from 'react';
import { useVoiceChat } from '../../hooks/useVoiceChat';

interface ChatVoiceControlsProps {
  roomName: string;
  // participantName actually should be the stable player id
  participantName: string;
  serverUrl?: string;
  className?: string;
}

const ChatVoiceControls: React.FC<ChatVoiceControlsProps> = ({
  roomName,
  participantName, // playerId expected
  serverUrl = import.meta.env.VITE_LIVEKIT_SERVER_URL || 'ws://localhost:7880',
  className = ''
}) => {
  const {
    isInitialized,
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
    error
  } = useVoiceChat({ serverUrl, roomName, participantName, autoConnect: false });

  useEffect(() => {
    if (!isInitialized) {
      initialize({
        serverUrl,
        apiKey: import.meta.env.VITE_LIVEKIT_API_KEY || 'dev-key',
        apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET || 'dev-secret',
        roomName,
        participantName // pass playerId as identity
      });
    }
  }, [isInitialized, initialize, serverUrl, roomName, participantName]);

  const onToggleConnection = async () => {
    if (isConnected) await disconnect();
    else await connect();
  };

  const onToggleMic = async () => {
    if (!isConnected || isDeaf) return;
    if (isSpeaking) await stopSpeaking();
    else await startSpeaking();
  };

  const onToggleListen = () => {
    if (!isConnected || isDeaf) return;
    toggleListening();
  };

  const onToggleDeaf = async () => {
    await toggleDeaf();
  };

  return (
    <div className={`w-full flex items-center justify-between gap-1 ${className}`}>
      {/* Connection */}
      <button
        onClick={onToggleConnection}
        disabled={!isInitialized}
        className={`px-2 py-1 text-xs rounded-md border transition-colors select-none focus:outline-none focus:ring-1 focus:ring-white/50 ${
          isConnected ? 'bg-green-600 hover:bg-green-700 border-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isConnected ? 'Disconnect from voice' : 'Connect to voice'}
      >
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>

      {/* Mic */}
      <button
        onClick={onToggleMic}
        disabled={!isConnected || isDeaf}
        className={`px-2 py-1 text-xs rounded-md border transition-colors select-none focus:outline-none focus:ring-1 focus:ring-white/50 ${
          isSpeaking ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white' : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isSpeaking ? 'Turn mic off' : 'Turn mic on'}
      >
        Mic
      </button>

      {/* Listen */}
      <button
        onClick={onToggleListen}
        disabled={!isConnected || isDeaf}
        className={`px-2 py-1 text-xs rounded-md border transition-colors select-none focus:outline-none focus:ring-1 focus:ring-white/50 ${
          isListening ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white' : 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isListening ? 'Mute others' : 'Unmute others'}
      >
        {isListening ? 'Listen' : 'Muted'}
      </button>

      {/* Deaf */}
      <button
        onClick={onToggleDeaf}
        disabled={!isInitialized}
        className={`px-2 py-1 text-xs rounded-md border transition-colors select-none focus:outline-none focus:ring-1 focus:ring-white/50 ${
          isDeaf ? 'bg-red-700 hover:bg-red-800 border-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isDeaf ? 'Disable deaf mode' : 'Enable deaf mode'}
      >
        Deaf
      </button>

      {/* Error (compact) */}
      {error && (
        <div className="ml-2 text-[10px] text-red-300 truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatVoiceControls;
