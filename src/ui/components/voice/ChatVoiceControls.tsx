import React, { useEffect, useRef, useState } from 'react';
import { useVoiceChat } from '../../hooks/useVoiceChat';

interface ChatVoiceControlsProps {
  roomName: string;
  // participantName actually should be the stable player id
  participantName: string;
  serverUrl?: string;
  className?: string;
}

// Basic inline SVG icons (clean, license-free)
const Icon = {
  Phone: ({ className = '' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 fill-current ${className}`} aria-hidden>
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C11.85 21 3 12.15 3 2a1 1 0 011-1h3.49a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.2 2.2z"/>
    </svg>
  ),
  Mic: ({ muted = false, disabled = false }: { muted?: boolean; disabled?: boolean }) => (
    <svg
      viewBox="0 0 24 24"
      className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 fill-current ${disabled ? 'text-gray-400' : muted ? 'text-red-600' : 'text-black'}`}
      aria-hidden
    >
      <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z"/>
      <path d="M5 11a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.92V20h3a1 1 0 110 2H8a1 1 0 110-2h3v-2.08A7 7 0 015 11z"/>
      {muted && !disabled && (
        <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" className="stroke-current" />
      )}
    </svg>
  ),
  Deaf: ({ active = false }: { active?: boolean }) => (
    <svg
      viewBox="0 0 24 24"
      className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 fill-current ${active ? 'text-black' : 'text-black/70'}`}
      aria-hidden
    >
      <path d="M12 3a9 9 0 00-9 9v1a1 1 0 102 0v-1a7 7 0 1114 0v1a1 1 0 102 0v-1a9 9 0 00-9-9z"/>
      <path d="M7 15a2 2 0 00-2 2v1a3 3 0 003 3h1a2 2 0 002-2v-2a2 2 0 00-2-2H7zM17 15h-2a2 2 0 00-2 2v2a2 2 0 002 2h1a3 3 0 003-3v-1a2 2 0 00-2-2z"/>
      {active && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" className="stroke-current"/>}
    </svg>
  ),
};

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
    toggleDeaf,
    isConnected,
    isSpeaking,
    isDeaf,
    error
  } = useVoiceChat({ serverUrl, roomName, participantName, autoConnect: false });

  // Optimistic UI state mirrors
  const [uiConnected, setUiConnected] = useState(false);
  const [uiSpeaking, setUiSpeaking] = useState(false); // mic on = speaking
  const [uiDeaf, setUiDeaf] = useState(false);
  const busyRef = useRef(false);

  // Sync UI state whenever service state changes
  useEffect(() => {
    setUiConnected(isConnected);
  }, [isConnected]);
  useEffect(() => {
    setUiSpeaking(isSpeaking);
  }, [isSpeaking]);
  useEffect(() => {
    setUiDeaf(isDeaf);
  }, [isDeaf]);

  // Initialize service once
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

  const handleConnect = async () => {
    if (busyRef.current || uiConnected) return;
    setUiConnected(true); // optimistic
    busyRef.current = true;
    Promise.resolve(connect())
      .catch(() => {
        setUiConnected(false);
      })
      .finally(() => {
        busyRef.current = false;
      });
  };

  const handleDisconnect = async () => {
    if (busyRef.current || !uiConnected) return;
    const prevSpeaking = uiSpeaking;
    const prevDeaf = uiDeaf;
    setUiConnected(false); // optimistic hang up
    setUiSpeaking(false);
    setUiDeaf(false);
    busyRef.current = true;
    Promise.resolve(disconnect())
      .catch(() => {
        // revert if failed
        setUiConnected(true);
        setUiSpeaking(prevSpeaking);
        setUiDeaf(prevDeaf);
      })
      .finally(() => (busyRef.current = false));
  };

  const handleToggleMic = async () => {
    if (!uiConnected || busyRef.current) return;
    const disabled = uiDeaf;
    if (disabled) return; // tri-state: disabled when deaf
    const next = !uiSpeaking;
    setUiSpeaking(next); // optimistic
    busyRef.current = true;
    const p = next ? startSpeaking() : stopSpeaking();
    Promise.resolve(p)
      .catch(() => setUiSpeaking(!next))
      .finally(() => (busyRef.current = false));
  };

  const handleToggleDeaf = async () => {
    if (busyRef.current || !uiConnected) return;
    const next = !uiDeaf;
    setUiDeaf(next); // optimistic
    if (next) {
      // going deaf disables mic
      setUiSpeaking(false);
    }
    busyRef.current = true;
    Promise.resolve(toggleDeaf())
      .catch(() => {
        // revert
        setUiDeaf(!next);
      })
      .finally(() => (busyRef.current = false));
  };

  // Button styles
  const btnBase = 'inline-flex items-center justify-center rounded-md border transition-colors select-none focus:outline-none focus:ring-1';
  const btnNeutral = `${btnBase} border-gray-400 bg-white text-black focus:ring-black hover:bg-gray-100`;
  const btnGreen = `${btnBase} border-green-700 bg-green-600 text-white focus:ring-green-300 hover:bg-green-700`;
  const btnRed = `${btnBase} border-red-700 bg-red-600 text-white focus:ring-red-300 hover:bg-red-700`;
  const sizeCls = 'w-12 h-12 md:w-12 md:h-12 lg:w-14 lg:h-14';

  return (
    <div className={`w-full flex items-center justify-center gap-3 ${className}`}>
      {/* Disconnected: single green connect button centered */}
      {!uiConnected && (
        <button
          onClick={handleConnect}
          className={`${btnGreen} ${sizeCls}`}
          aria-label="Connect to voice"
          aria-pressed={false}
          title="Connect"
        >
          <Icon.Phone className="text-white" />
        </button>
      )}

      {/* Connected: show Mic, Deaf, Hangup (max 3 buttons) */}
      {uiConnected && (
        <>
          <button
            onClick={handleToggleMic}
            disabled={uiDeaf}
            className={`${btnNeutral} ${sizeCls} ${uiDeaf ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={uiSpeaking ? 'Mute microphone' : 'Unmute microphone'}
            aria-pressed={uiSpeaking}
            title={uiSpeaking ? 'Mic On' : uiDeaf ? 'Mic disabled (deafened)' : 'Mic Off'}
          >
            {/* Tri-state: unmuted=black, muted=red, deaf=disabled gray */}
            <Icon.Mic muted={!uiSpeaking} disabled={uiDeaf} />
          </button>

          <button
            onClick={handleToggleDeaf}
            className={`${btnNeutral} ${sizeCls}`}
            aria-label={uiDeaf ? 'Disable deaf mode' : 'Enable deaf mode'}
            aria-pressed={uiDeaf}
            title={uiDeaf ? 'Deafened' : 'Deafen'}
          >
            <Icon.Deaf active={uiDeaf} />
          </button>

          <button
            onClick={handleDisconnect}
            className={`${btnRed} ${sizeCls}`}
            aria-label="Disconnect from voice"
            aria-pressed={false}
            title="Hang up"
          >
            <Icon.Phone className="text-white" />
          </button>
        </>
      )}

      {/* Compact error */}
      {error && (
        <div className="min-w-0 flex-1 text-[10px] text-red-600 truncate text-center" title={error}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChatVoiceControls;
