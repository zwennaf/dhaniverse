import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useVoiceChat } from '../../hooks/useVoiceChat';

interface VoiceChatProps {
    participantName: string;
    roomName?: string;
    serverUrl?: string;
    enabled?: boolean;
    className?: string; // extra wrapper classes if needed
}

/**
 * VoiceChat HUD control used inside the chat bar: headphone always shown, mic appears after first successful connect.
 * Right-click (context menu) on headphone disconnects entirely and hides mic again.
 */
export const VoiceChat: React.FC<VoiceChatProps> = ({
    participantName,
    roomName = 'dhaniverse-main',
    serverUrl = (import.meta as any).env?.VITE_LIVEKIT_SERVER_URL || 'wss://voice.dhaniverse.in',
    enabled = true,
    className = ''
}) => {
    const {
        initialize,
        connect,
        disconnect,
        startSpeaking,
        stopSpeaking,
        toggleDeaf,
        isConnected,
        isSpeaking,
        isDeaf,
        isInitialized,
        isListening,
    connectionState,
    listAudioInputDevices,
    setInputDevice,
    preferredDeviceId,
    // output helpers
    listAudioOutputDevices,
    setOutputDevice,
    preferredOutputDeviceId
    } = useVoiceChat({
        serverUrl,
        roomName,
        participantName,
        autoConnect: false
    });

    const [controlsVisible, setControlsVisible] = useState(false); // show mic after connect
    const [connecting, setConnecting] = useState(false);
    const [showMicMenu, setShowMicMenu] = useState(false);
    const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
    const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
    const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
    const [actionStatus, setActionStatus] = useState<string | null>(null);
    const statusTimeoutRef = useRef<number | null>(null);
    const [micMenuFlipX, setMicMenuFlipX] = useState(false);
    const [micMenuFlipY, setMicMenuFlipY] = useState(false);
    const [speakerMenuFlipX, setSpeakerMenuFlipX] = useState(false);
    const [speakerMenuFlipY, setSpeakerMenuFlipY] = useState(false);
    const micAnchorRef = useRef<HTMLButtonElement | null>(null);
    const speakerAnchorRef = useRef<HTMLButtonElement | null>(null);
    const micMenuRef = useRef<HTMLDivElement | null>(null);
    const speakerMenuRef = useRef<HTMLDivElement | null>(null);

    // Load devices when menu opens
    useEffect(() => {
        if (showMicMenu) listAudioInputDevices().then(setMicDevices);
    }, [showMicMenu, listAudioInputDevices]);

    useEffect(() => {
        if (showSpeakerMenu && listAudioOutputDevices) listAudioOutputDevices().then(setSpeakerDevices);
    }, [showSpeakerMenu, listAudioOutputDevices]);

    // Initialize early
    useEffect(() => {
        if (enabled && !isInitialized) {
            initialize({
                serverUrl,
                apiKey: (import.meta as any).env?.VITE_LIVEKIT_API_KEY || 'dev-key',
                apiSecret: (import.meta as any).env?.VITE_LIVEKIT_API_SECRET || 'dev-secret',
                roomName,
                participantName
            }).catch(err => console.error('[Voice] init failed', err));
        }
    }, [enabled, isInitialized, initialize, serverUrl, roomName, participantName]);

    const handleHeadphoneClick = async () => {
        if (!enabled) return;
        try {
            if (!isInitialized) {
                setActionStatus('Initializing voice…');
                await initialize({
                    serverUrl,
                        apiKey: (import.meta as any).env?.VITE_LIVEKIT_API_KEY || 'dev-key',
                        apiSecret: (import.meta as any).env?.VITE_LIVEKIT_API_SECRET || 'dev-secret',
                        roomName,
                        participantName
                });
            }
            if (!isConnected) {
                if (connecting) return;
                setConnecting(true);
                setActionStatus('Connecting to voice…');
                try {
                    await connect();
                    setControlsVisible(true);
                    if (isSpeaking) await stopSpeaking(); // ensure not auto-publishing
                    setActionStatus('Connected (muted)');
                } finally {
                    setTimeout(() => setConnecting(false), 250);
                }
                // Clear status after short delay
                if (statusTimeoutRef.current) window.clearTimeout(statusTimeoutRef.current);
                statusTimeoutRef.current = window.setTimeout(() => setActionStatus(null), 1800);
                return; // skip deafen toggle this click
            }
            if (!isDeaf) {
                // going to deafen, stop speaking first
                setActionStatus('Deafening (leaving audio)…');
                if (isSpeaking) await stopSpeaking();
            }
            await toggleDeaf();
            setActionStatus(isDeaf ? 'Rejoining voice…' : 'Deafened');
            if (statusTimeoutRef.current) window.clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = window.setTimeout(() => setActionStatus(null), 1600);
        } catch (e) {
            console.error('[Voice] headphone action failed', e);
            setActionStatus('Voice action failed');
            if (statusTimeoutRef.current) window.clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = window.setTimeout(() => setActionStatus(null), 2500);
        }
    };

    const handleHeadphoneContextMenu = async (e: React.MouseEvent) => {
        e.preventDefault();
        // Toggle device menu on right click; shift+right-click forces disconnect
        if (e.shiftKey) {
            if (isConnected) {
                try { await disconnect(); } catch (err) { console.error(err); } finally {
                    setControlsVisible(false);
                    setConnecting(false);
                }
            }
            return;
        }
        // Open speaker (output) menu
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const menuEstimatedWidth = 220;
        const menuEstimatedHeight = 260;
        const padding = 8;
        const willOverflowRight = rect.right + menuEstimatedWidth + padding > window.innerWidth;
        const willOverflowBottom = rect.top + menuEstimatedHeight + padding > window.innerHeight;
        setSpeakerMenuFlipX(willOverflowRight);
        setSpeakerMenuFlipY(willOverflowBottom);
        setShowSpeakerMenu(v => !v);
        setShowMicMenu(false);
    };

    const handleMicContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const menuEstimatedWidth = 220;
        const menuEstimatedHeight = 260;
        const padding = 8;
        const willOverflowRight = rect.right + menuEstimatedWidth + padding > window.innerWidth;
        const willOverflowBottom = rect.top + menuEstimatedHeight + padding > window.innerHeight;
        setMicMenuFlipX(willOverflowRight);
        setMicMenuFlipY(willOverflowBottom);
        setShowMicMenu(v => !v);
        setShowSpeakerMenu(false);
    };

    const handleMicClick = async () => {
        if (connecting || !isConnected) return;
        try {
            if (isSpeaking) {
                setActionStatus('Muting mic…');
                await stopSpeaking();
                setActionStatus('Mic muted');
            } else {
                if (isDeaf) await toggleDeaf();
                setActionStatus('Publishing mic…');
                await startSpeaking();
                setActionStatus('Live');
            }
            if (statusTimeoutRef.current) window.clearTimeout(statusTimeoutRef.current);
            statusTimeoutRef.current = window.setTimeout(() => setActionStatus(null), 1500);
        } catch (err) { console.error('[Voice] mic action failed', err); }
    };

    // Close on outside click / escape
    const handleGlobalClick = useCallback((e: MouseEvent) => {
        if (!showMicMenu && !showSpeakerMenu) return;
        const t = e.target as Node;
        const insideMic = micMenuRef.current?.contains(t) || micAnchorRef.current?.contains(t);
        const insideSpeaker = speakerMenuRef.current?.contains(t) || speakerAnchorRef.current?.contains(t);
        if (!insideMic) setShowMicMenu(false);
        if (!insideSpeaker) setShowSpeakerMenu(false);
    }, [showMicMenu, showSpeakerMenu]);

    const handleGlobalKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setShowMicMenu(false);
            setShowSpeakerMenu(false);
        }
    }, []);

    useEffect(() => {
        if (showMicMenu || showSpeakerMenu) {
            window.addEventListener('mousedown', handleGlobalClick, true);
            window.addEventListener('keydown', handleGlobalKey, true);
        } else {
            window.removeEventListener('mousedown', handleGlobalClick, true);
            window.removeEventListener('keydown', handleGlobalKey, true);
        }
        return () => {
            window.removeEventListener('mousedown', handleGlobalClick, true);
            window.removeEventListener('keydown', handleGlobalKey, true);
        };
    }, [showMicMenu, showSpeakerMenu, handleGlobalClick, handleGlobalKey]);

    return (
        <div className={`relative flex flex-row gap-2 select-none items-center ${className}`}>
                {/* Persistent status area (prevents layout shift) */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-auto pointer-events-none flex justify-center">
                    <div
                        className={`px-2 py-0.5 rounded bg-black/80 text-white text-[11px] shadow transition-opacity duration-300 whitespace-nowrap ${actionStatus ? 'opacity-100' : 'opacity-0'}`}
                        style={{ fontFamily: 'VCR OSD Mono, monospace', minHeight: '16px' }}
                        aria-hidden={!actionStatus}
                    >
                        {actionStatus || ' '}
                    </div>
                </div>
                <div className="sr-only" aria-live="polite">{actionStatus}</div>
                {controlsVisible && isConnected && (
                    <button
                        type="button"
                        className={`relative w-11 h-11 rounded-full bg-black/80 flex items-center justify-center shadow-lg transition-colors ${connecting ? 'opacity-50 cursor-wait' : ''}`}
                    aria-label={isSpeaking ? 'Mute microphone' : 'Unmute microphone'}
                    title={isSpeaking ? 'Mute microphone' : 'Unmute (auto undeafen)'}
                    disabled={connecting || !isConnected}
                    onClick={handleMicClick}
                    onContextMenu={handleMicContextMenu}
                    style={{ outline: 'none' }}
                    ref={micAnchorRef}
                >
                        <svg viewBox="0 0 24 24" className="w-7 h-7 scale-[2]" aria-hidden>
                        <path d="M12 15.5a3.5 3.5 0 003.5-3.5V6a3.5 3.5 0 10-7 0v6a3.5 3.5 0 003.5 3.5z" fill={isSpeaking ? '#16f065' : '#ffffff'} />
                        <path d="M5 11a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.92V22h3.25a1 1 0 110 2H7.75a1 1 0 110-2H11v-4.08A7 7 0 015 11z" fill={isSpeaking ? '#16f065' : '#ffffff'} />
                    </svg>
                        {isSpeaking ? (
                            <span className="absolute inset-0 rounded-full ring-3 ring-green-500 animate-pulse" aria-hidden />
                        ) : (
                            <span className="absolute inset-0 rounded-full ring-3 ring-red-500/80" aria-hidden />
                        )}
                </button>
            )}
            <button
                type="button"
                    className={`w-10 h-10 rounded-full bg-black/90 flex items-center justify-center shadow-lg transition-colors ${!enabled ? 'opacity-40 cursor-not-allowed' : isDeaf ? 'ring-1 ring-red-500' : ''}`}
                aria-label={!isConnected ? (connecting ? 'Connecting...' : 'Connect to Voice') : isDeaf ? 'Undeafen (Hear & Speak)' : 'Deafen (Silence All)'}
                title={!isConnected ? (connecting ? 'Currently connecting…' : 'Left-click: Connect & stay muted. Right-click: Speaker devices.') : isDeaf ? 'Click to undeafen (rejoin audio)' : 'Click to deafen (leave audio)'}
                onClick={handleHeadphoneClick}
                onContextMenu={handleHeadphoneContextMenu}
                disabled={!enabled || connecting}
                style={{ outline: 'none' }}
                ref={speakerAnchorRef}
            >
                <svg
                    className="w-7 h-7 scale-[4]"  
                    viewBox="0 0 19 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M9.77218 3.30326C6.50045 3.30326 3.84819 5.95553 3.84819 9.22726H6.06968C6.88762 9.22726 7.55068 9.8903 7.55068 10.7083V14.4108C7.55068 15.2287 6.88762 15.8918 6.06968 15.8918H3.84819C3.03025 15.8918 2.36719 15.2287 2.36719 14.4108V9.22726C2.36719 5.13759 5.68251 1.82227 9.77218 1.82227C13.8618 1.82227 17.1772 5.13759 17.1772 9.22726V14.4108C17.1772 15.2287 16.5141 15.8918 15.6962 15.8918H13.4747C12.6567 15.8918 11.9937 15.2287 11.9937 14.4108V10.7083C11.9937 9.8903 12.6567 9.22726 13.4747 9.22726H15.6962C15.6962 5.95553 13.0439 3.30326 9.77218 3.30326ZM3.84819 10.7083V14.4108H6.06968V10.7083H3.84819ZM13.4747 10.7083V14.4108H15.6962V10.7083H13.4747Z"
                        fill={!enabled ? '#555' : !isConnected ? '#ffffff' : isDeaf ? '#ef4444' : '#ffffff'}
                    />
                    {isDeaf && <line x1="3" y1="16" x2="16" y2="3" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />}
                </svg>
            </button>
                              {showMicMenu && (
                                <div
                                  ref={micMenuRef}
                                  className={`absolute ${micMenuFlipX ? 'right-full mr-2' : 'left-full ml-2'} ${micMenuFlipY ? 'bottom-0' : 'top-0'} w-52 bg-black/90 border border-white/10 rounded-lg p-2 z-[3100] backdrop-blur-sm shadow-xl`}
                                  style={{ maxHeight: '70vh', overflow: 'hidden' }}
                                >
                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-white/70 font-semibold">Microphones</span>
                        <button onClick={() => setShowMicMenu(false)} className="text-xs text-white/40 hover:text-white">✕</button>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                                        {micDevices.length === 0 && (
                            <div className="text-[11px] text-white/40">No devices</div>
                        )}
                                        {micDevices.map(d => {
                            const active = preferredDeviceId ? d.deviceId === preferredDeviceId : false;
                            return (
                                <button
                                    key={d.deviceId || d.label}
                                    onClick={async () => {
                                        await setInputDevice(d.deviceId);
                                                        setShowMicMenu(false);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded text-[11px] leading-tight transition-colors ${active ? 'bg-green-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white/80'}`}
                                    title={d.label || 'Microphone'}
                                >
                                    <span className="truncate inline-block max-w-full">{d.label || 'Microphone'}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-2 border-t border-white/10 pt-2 flex items-center justify-between">
                        <button
                            onClick={async () => { try { setActionStatus('Connecting to voice…'); await connect(); setControlsVisible(true); setActionStatus('Connected (muted)'); if (statusTimeoutRef.current) window.clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = window.setTimeout(() => setActionStatus(null), 1700);} catch { setActionStatus('Connect failed'); } }}
                            disabled={isConnected || connecting}
                            className={`text-[11px] px-2 py-1 rounded ${isConnected ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-green-600/80 hover:bg-green-600 text-white'}`}
                        >Connect</button>
                        <button
                            onClick={async () => { try { setActionStatus('Disconnecting…'); await disconnect(); setControlsVisible(false); setActionStatus('Disconnected'); if (statusTimeoutRef.current) window.clearTimeout(statusTimeoutRef.current); statusTimeoutRef.current = window.setTimeout(() => setActionStatus(null), 1500);} catch { setActionStatus('Disconnect failed'); } }}
                            disabled={!isConnected}
                            className={`text-[11px] px-2 py-1 rounded ${!isConnected ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-red-600/80 hover:bg-red-600 text-white'}`}
                        >Disconnect</button>
                    </div>
                    <div className="mt-2 text-[10px] text-white/30 flex justify-between">
                        <span>{isSpeaking ? 'TX' : 'RX'}</span>
                        <span>{connectionState}</span>
                    </div>
                </div>
              )}
                              {showSpeakerMenu && (
                                <div
                                  ref={speakerMenuRef}
                                  className={`absolute ${speakerMenuFlipX ? 'right-full mr-2' : 'left-full ml-2'} ${speakerMenuFlipY ? 'bottom-0' : 'top-0'} w-52 bg-black/90 border border-white/10 rounded-lg p-2 z-[3090] backdrop-blur-sm shadow-xl`}
                                  style={{ maxHeight: '70vh', overflow: 'hidden' }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-white/70 font-semibold">Speakers</span>
                                        <button onClick={() => setShowSpeakerMenu(false)} className="text-xs text-white/40 hover:text-white">✕</button>
                                    </div>
                                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/20">
                                        {speakerDevices.length === 0 && (
                                            <div className="text-[11px] text-white/40">No devices</div>
                                        )}
                                        {speakerDevices.map(d => {
                                            const active = preferredOutputDeviceId ? d.deviceId === preferredOutputDeviceId : false;
                                            return (
                                                <button
                                                    key={d.deviceId || d.label}
                                                    onClick={async () => {
                                                        await setOutputDevice?.(d.deviceId);
                                                        setShowSpeakerMenu(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1 rounded text-[11px] leading-tight transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white/80'}`}
                                                    title={d.label || 'Speaker'}
                                                >
                                                    <span className="truncate inline-block max-w-full">{d.label || 'Speaker'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-2 text-[10px] text-white/30 flex justify-between">
                                        <span>{isListening ? 'LISTENING' : 'MUTED'}</span>
                                        <span>{connectionState}</span>
                                    </div>
                                </div>
                              )}
        </div>
    );
};

export default VoiceChat;
