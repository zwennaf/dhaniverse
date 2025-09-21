import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WalletManager, WalletStatus } from "../../../services/WalletManager";
import { ICPActorService } from "../../../services/ICPActorService";
import { NetworkHealthMonitor } from "../../../services/ICPErrorHandler";
import { balanceManager } from "../../../services/BalanceManager";
import { voiceCommandHandler } from "../../../services/VoiceCommandHandler";
import { useVoiceChat } from '../../hooks/useVoiceChat';
import VoiceChat from '../../components/voice/VoiceChat';
// ChatVoiceControls replaced by minimal inline mic/send UI in the HUD to match design
import LocationTracker from "./LocationTracker";
import { locationTrackerManager, TrackingTarget } from "../../../services/LocationTrackerManager";
import DialogueBox from '../common/DialogueBox';
import DialogueRenderer from '../common/DialogueRenderer';
import { dialogueManager } from '../../../services/DialogueManager';
import { getTaskManager } from '../../../game/tasks/TaskManager';
import { GameTask } from '../../../game/tasks/TaskTypes';
import AnimatedRupeeCounter from '../common/AnimatedRupeeCounter';
import { useUser } from '../../contexts/AuthContext';

const characters = [
  { id: 'C1', label: 'Soul', color: '#B2EEE6', preview: '/characters/C1-Preview.png', full: '/characters/C1.png' },
  { id: 'C2', label: 'Wheat', color: '#F4E4BC', preview: '/characters/C2-Preview.png', full: '/characters/C2.png' },
  { id: 'C3', label: 'Lavender', color: '#E6E6FA', preview: '/characters/C3-Preview.png', full: '/characters/C3.png' },
  { id: 'C4', label: 'Sea', color: '#87CEEB', preview: '/characters/C4-Preview.png', full: '/characters/C4.png' },
];

// Singleton helper function to get character color
const getCharacterColor = (characterIdentifier: string | null | undefined, fallbackName?: string): string => {
  if (characterIdentifier) {
    // Normalize the character ID (remove path, extension, -Preview suffix)
    const charId = String(characterIdentifier).replace(/^.*[\\/]/, '').replace(/\..*$/, '').replace(/-Preview$/i, '');
    const character = characters.find(c => c.id === charId);
    if (character) {
      return character.color;
    }
  }
  
  // Fallback to hash-based color if no character found
  if (fallbackName) {
    const hash = Array.from(fallbackName).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return characters[hash % characters.length].color;
  }
  
  // Final fallback
  return '#B2EEE6';
};

interface GameHUDProps {
    rupees?: number;
    username?: string;
    walletManager?: WalletManager;
    icpService?: ICPActorService;
    voiceEnabled?: boolean;
}

interface ConnectedPlayer {
    id: string;
    username: string;
    joinedAt: number;
}

interface NotificationItem {
    id: string;
    username: string;
    createdAt: number;
    action?: 'joined' | 'left';
}

const GameHUD: React.FC<GameHUDProps> = ({
    rupees = 0,
    username = "Player",
    walletManager,
    icpService,
    voiceEnabled = true,
}) => {
    const { user } = useUser();
    const [currentRupees, setCurrentRupees] = useState(rupees);
    const [previousRupees, setPreviousRupees] = useState(rupees);
    const [chatMessages, setChatMessages] = useState<
        { id: string; username: string; message: string; timestamp?: number; skin?: string; color?: string }[]
    >([]);
    const [chatInput, setChatInput] = useState("");
    // Always show chat window, but control focus state - start unfocused
    const [isChatFocused, setIsChatFocused] = useState(false);

    // Player connection tracking
    const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>(
        []
    );
    // Persistent join/leave notifications (appear above the online count)
    // Notifications persist until capacity is reached; older messages remain on top, new ones below.
    const [joinNotifications, setJoinNotifications] = useState<NotificationItem[]>([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [showOnlineTooltip, setShowOnlineTooltip] = useState(false);

    // Blockchain status
    const [walletStatus, setWalletStatus] = useState<WalletStatus>({
        connected: false,
    });
    const [networkHealthy, setNetworkHealthy] = useState(true);

    const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null);

    // Location tracker state
    const [trackingTargets, setTrackingTargets] = useState<TrackingTarget[]>([]);
    // Task system state
    const [activeTasks, setActiveTasks] = useState<GameTask[]>([]);
    const [showSmallAlertDialog, setShowSmallAlertDialog] = useState(false);
    const [smallAlertText, setSmallAlertText] = useState("");
    const [isDialogueActive, setIsDialogueActive] = useState(false);
    const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
    const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
    const [screenSize, setScreenSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    // Smooth render positions for other players to reduce jitter
    const renderPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
    const [, setRenderTick] = useState(0); // used to force re-render when smoothed positions update

    useEffect(() => {
        let raf = 0;
        let last = performance.now();

        const loop = (now: number) => {
            const dt = Math.max(0, (now - last) / 1000);
            last = now;
            const next = { ...renderPositionsRef.current };
            let changed = false;

            // smoothing factor - smaller = smoother/slower, larger = snappier
            const lerpFactor = 0.12;

            connectedPlayers.forEach((p: any) => {
                const id = p.id;
                const targetX = typeof p.x === 'number' ? p.x : 0;
                const targetY = typeof p.y === 'number' ? p.y : 0;
                const cur = next[id] ?? { x: targetX, y: targetY };

                const nx = cur.x + (targetX - cur.x) * lerpFactor;
                const ny = cur.y + (targetY - cur.y) * lerpFactor;

                if (!next[id] || Math.abs(nx - cur.x) > 0.001 || Math.abs(ny - cur.y) > 0.001) {
                    changed = true;
                }

                next[id] = { x: nx, y: ny };
            });

            // Remove stale entries
            Object.keys(next).forEach((id) => {
                if (!connectedPlayers.find((p) => p.id === id)) {
                    delete next[id];
                    changed = true;
                }
            });

            if (changed) {
                renderPositionsRef.current = next;
                setRenderTick((t) => t + 1);
            }

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [connectedPlayers]);

    // Minimap / world dimensions (original asset size)
    const WORLD_WIDTH = 12094;
    const WORLD_HEIGHT = 8744;
    // Minimap container size - make it bigger and circular
    const MINIMAP_CONTAINER_PX = 200; // Increased from 128 to 200px
    
    // Calculate reasonable zoom scale
    // Base scale to fit entire world in container (decide whether width or height limits)
    const baseScaleX = MINIMAP_CONTAINER_PX / WORLD_WIDTH;
    const baseScaleY = MINIMAP_CONTAINER_PX / WORLD_HEIGHT;
    const fitByWidth = baseScaleX <= baseScaleY; // true if width is limiting
    const baseFitScale = Math.min(baseScaleX, baseScaleY);

    // Apply zoom multiplier (configurable)
    const zoomMultiplier = 3.0; // 3x zoom from base fit
    const minimapScale = baseFitScale * zoomMultiplier;

    // Actual pixel size of the zoomed map
    const scaledMapWidth = Math.round(WORLD_WIDTH * minimapScale);
    const scaledMapHeight = Math.round(WORLD_HEIGHT * minimapScale);

    // Debug logging removed to avoid console spam in production

    // Compute desired translation so player's world pos sits at container center
    const desiredTranslateX = MINIMAP_CONTAINER_PX / 2 - (playerPosition.x * minimapScale);
    const desiredTranslateY = MINIMAP_CONTAINER_PX / 2 - (playerPosition.y * minimapScale);

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    // When the scaled map is smaller than the container, center it; otherwise clamp so no empty gaps
    const translateX = scaledMapWidth <= MINIMAP_CONTAINER_PX
        ? (MINIMAP_CONTAINER_PX - scaledMapWidth) / 2
        : clamp(desiredTranslateX, MINIMAP_CONTAINER_PX - scaledMapWidth, 0);

    const translateY = scaledMapHeight <= MINIMAP_CONTAINER_PX
        ? (MINIMAP_CONTAINER_PX - scaledMapHeight) / 2
        : clamp(desiredTranslateY, MINIMAP_CONTAINER_PX - scaledMapHeight, 0);

    // Convert world coords -> local minimap coords (uses final translate + scale)
    const worldToLocal = (wx: number, wy: number) => ({
        x: wx * minimapScale + translateX,
        y: wy * minimapScale + translateY,
    });

    // Debug: Log actual zoom percentage (can remove later)
    // console.log(`Minimap zoom: ${(minimapScale * 100).toFixed(1)}% of original image size`);

    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const messagesRef = useRef<HTMLDivElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    // Minimal voice state for command handler initialization only (component handles UI)
    const { isInitialized: voiceInitialized } = useVoiceChat({
        serverUrl: (import.meta as any).env?.VITE_LIVEKIT_SERVER_URL || 'wss://voice.dhaniverse.in',
        roomName: 'dhaniverse-main',
        participantName: selfPlayerId || username,
        autoConnect: false
    });

    // Ensure initial state is correct
    useEffect(() => {
        // Make sure typing is disabled initially
        window.dispatchEvent(new Event("typing-end"));

        const onSelfConnected = (e: any) => {
            const { id } = e.detail || {};
            if (id) setSelfPlayerId(id);
        };
        window.addEventListener("playerSelfConnected" as any, onSelfConnected);

        return () => {
            window.removeEventListener(
                "playerSelfConnected" as any,
                onSelfConnected
            );
        };
    }, []);

    // Initialize voice command handler if voice is enabled
    useEffect(() => {
        if (voiceEnabled && selfPlayerId) {
            voiceCommandHandler
                .initialize("dhaniverse-main", selfPlayerId)
                .catch(console.error);
        }
    }, [voiceEnabled, selfPlayerId]);

    // Initialize blockchain status monitoring
    useEffect(() => {
        if (walletManager) {
            // Listen for wallet status changes
            walletManager.onConnectionChange((status) => {
                setWalletStatus(status);
            });

            // Set initial status
            setWalletStatus(walletManager.getConnectionStatus());
        }

        // Monitor network health
        const healthStatus = NetworkHealthMonitor.getHealthStatus();
        setNetworkHealthy(healthStatus.overallHealthy);

        // Check health periodically
        const healthCheckInterval = setInterval(() => {
            const status = NetworkHealthMonitor.getHealthStatus();
            setNetworkHealthy(status.overallHealthy);
        }, 10000); // Check every 10 seconds

        return () => {
            clearInterval(healthCheckInterval);
        };
    }, [walletManager]);

    // Listen for balance updates from balance manager
    useEffect(() => {
        // Set initial balance from balance manager
        const currentBalance = balanceManager.getBalance();
        setPreviousRupees(currentRupees);
        setCurrentRupees(currentBalance.cash);

        // Subscribe to balance changes
        const unsubscribe = balanceManager.onBalanceChange((balance) => {
            setPreviousRupees(currentRupees);
            setCurrentRupees(balance.cash);
        });

        // Legacy rupee updates - REMOVED to prevent infinite loop
        // The balance manager should be the single source of truth

        return () => {
            unsubscribe();
            // Removed legacy event listener cleanup

            // Cleanup voice command handler if voice was enabled
            if (voiceEnabled) {
                voiceCommandHandler.destroy();
            }
        };
    }, []);

    // Listen for player connection events
    useEffect(() => {
        console.log('[GameHUD] mounting - registering player connection listeners');
        // Read any existing snapshot provided by WebSocketManager (in case it fired before HUD mounted)
            try {
            const snapPlayers = (window as any).__ws_players;
            if (Array.isArray(snapPlayers)) {
                setConnectedPlayers(
                    snapPlayers.map((p: any) => ({ id: p.id, username: p.username, joinedAt: Date.now(), x: p.x, y: p.y, skin: p.skin }))
                );
            }
            const snapCount = (window as any).__ws_onlineCount;
            if (typeof snapCount === 'number') setOnlineCount(snapCount);
        } catch (e) {
            // ignore
        }
        const handlePlayerJoined = (e: any) => {
            const { player } = e.detail;
            if (player && player.username) {
                console.log('[GameHUD] playerJoined event received:', player);
                setConnectedPlayers((prev) => {
                    // Remove any existing entry with same id or username to avoid duplicates
                    const filtered = prev.filter(
                        (p) =>
                            p.id !== player.id && p.username !== player.username
                    );
                    return [
                        ...filtered,
                        {
                            id: player.id,
                            username: player.username,
                            joinedAt: Date.now(),
                            x: player.x,
                            y: player.y,
                            skin: player.skin,
                        },
                    ];
                });

                // Join notification handled via small transient UI above the online count

                // Show a small transient join notification above the online SVG
                const notifId = `jn-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 9)}`;
                const MAX_VISIBLE = 4;

                // Append new notification at bottom. Let the container handle overflow and fading at the top.
                setJoinNotifications((prev) => {
                    const newNotif: NotificationItem = { id: notifId, username: player.username, createdAt: Date.now(), action: 'joined' };
                    const appended = [...prev, newNotif];
                    // Trim to a reasonable history length to avoid unbounded growth
                    return appended.length > 50 ? appended.slice(-50) : appended;
                });

                console.log('[GameHUD] join notification added:', notifId, player.username);
            }
        };

        const handlePlayerDisconnect = (e: any) => {
            const { id, username } = e.detail;

            // Remove player from connected list
            setConnectedPlayers((prev) => prev.filter((p) => p.id !== id));

            // Show transient leave notification above the online SVG (do not add to chat)
            if (username) {
                console.log('[GameHUD] playerDisconnect event received:', { id, username });
                const notifId = `ln-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 9)}`;
                // Append leave notification at bottom; container will show the last few.
                setJoinNotifications((prev) => {
                    const newNotif: NotificationItem = { id: notifId, username, createdAt: Date.now(), action: 'left' };
                    const appended = [...prev, newNotif];
                    return appended.length > 50 ? appended.slice(-50) : appended;
                });

                console.log('[GameHUD] leave notification added:', notifId, username);
            }
        };

        const handleOnlineUsersCount = (e: any) => {
            const { count } = e.detail;
            setOnlineCount(count);
        };

        const handleExistingPlayers = (e: any) => {
            const { players } = e.detail;
            if (Array.isArray(players)) {
                setConnectedPlayers(
                    players.map((player) => ({
                        id: player.id,
                        username: player.username,
                        joinedAt: Date.now(),
                        x: player.x,
                        y: player.y,
                        skin: player.skin,
                    }))
                );
            }
        };

        const handlePlayerUpdate = (e: any) => {
            const { player } = e.detail || {};
            if (!player || !player.id) return;

            setConnectedPlayers((prev) => {
                const exists = prev.find((p) => p.id === player.id);
                if (exists) {
                    return prev.map((p) => (p.id === player.id ? { ...p, x: player.x, y: player.y, skin: player.skin } : p));
                }
                // If it's a new player, add them
                return [...prev, { id: player.id, username: player.username, joinedAt: Date.now(), x: player.x, y: player.y, skin: player.skin }];
            });
        };

        window.addEventListener("playerJoined" as any, handlePlayerJoined);
        window.addEventListener("playerUpdate" as any, handlePlayerUpdate);
        window.addEventListener(
            "playerDisconnect" as any,
            handlePlayerDisconnect
        );
        window.addEventListener(
            "onlineUsersCount" as any,
            handleOnlineUsersCount
        );
        window.addEventListener(
            "existingPlayers" as any,
            handleExistingPlayers
        );

        return () => {
            console.log('[GameHUD] unmounting - removing player connection listeners');
            window.removeEventListener(
                "playerJoined" as any,
                handlePlayerJoined
            );
            window.removeEventListener("playerUpdate" as any, handlePlayerUpdate);
            window.removeEventListener(
                "playerDisconnect" as any,
                handlePlayerDisconnect
            );
            window.removeEventListener(
                "onlineUsersCount" as any,
                handleOnlineUsersCount
            );
            window.removeEventListener(
                "existingPlayers" as any,
                handleExistingPlayers
            );
        };
    }, []);

    // Listen for incoming chat messages
    useEffect(() => {
        // Track message IDs to prevent duplicates
        const processedMessageIds = new Set<string>();

        const handleChat = (e: any) => {
            console.log("Received chat message:", e.detail);
            const { id, username, message } = e.detail;
            // server may send senderId separately
            const senderId = e.detail.senderId || e.detail.id;
            let skin = e.detail.skin;

            // Prefer our local selected character for our own messages (more reliable)
            if (!skin && senderId && selfPlayerId && senderId === selfPlayerId) {
                skin = user?.selectedCharacter;
            }

            if (!message) {
                console.warn(
                    "Received chat message with no content:",
                    e.detail
                );
                return;
            }

            // Generate a unique ID if none provided
            const messageId =
                id ||
                `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            // Skip if we've already processed this message
            if (processedMessageIds.has(messageId)) {
                console.log("Skipping duplicate message:", messageId);
                return;
            }

            // Add to processed set
            processedMessageIds.add(messageId);

            // If set gets too large, remove oldest entries
            if (processedMessageIds.size > 100) {
                const iterator = processedMessageIds.values();
                const firstValue = iterator.next().value;
                if (firstValue) {
                    processedMessageIds.delete(firstValue);
                }
            }

            // Normalize skin string: strip path, extension and '-Preview' suffix
            const raw = (skin || 'C1');
            const skinId = String(raw).replace(/^.*[\\/]/, '').replace(/\..*$/, '').replace(/-Preview$/i, '');
            const characterColor = getCharacterColor(skinId, username);

            setChatMessages((prev) => {
                const newMessages = [
                    ...prev,
                    { id: messageId, username, message, timestamp: Date.now(), skin: skinId, color: characterColor },
                ];
                if (newMessages.length > 50) {
                    return newMessages.slice(-50);
                }
                return newMessages;
            });
        };

        window.addEventListener("chat-message" as any, handleChat);
        return () =>
            window.removeEventListener("chat-message" as any, handleChat);
    }, []);

    // Listen for location tracker updates
    useEffect(() => {
        // Subscribe to tracking targets changes
        const unsubscribe = locationTrackerManager.subscribe(() => {
            setTrackingTargets(locationTrackerManager.getEnabledTargets());
        });

        // Set initial targets
        setTrackingTargets(locationTrackerManager.getEnabledTargets());

        // Listen for game position updates
        const handlePlayerPositionUpdate = (e: any) => {
            const { x, y } = e.detail;
            setPlayerPosition({ x, y });
        };

        const handleCameraPositionUpdate = (e: any) => {
            const { x, y } = e.detail;
            setCameraPosition({ x, y });
        };

        // Listen for window resize
        const handleResize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener(
            "player-position-update" as any,
            handlePlayerPositionUpdate
        );
        window.addEventListener(
            "camera-position-update" as any,
            handleCameraPositionUpdate
        );
        window.addEventListener("resize", handleResize);

        return () => {
            unsubscribe();
            window.removeEventListener(
                "player-position-update" as any,
                handlePlayerPositionUpdate
            );
            window.removeEventListener(
                "camera-position-update" as any,
                handleCameraPositionUpdate
            );
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    // Task manager integration
    useEffect(() => {
        const updateActive = () => setActiveTasks(getTaskManager().getActiveTasks());
        const added = () => updateActive();
        const updated = () => updateActive();
        const removed = () => updateActive();
        window.addEventListener('task-added' as any, added);
        window.addEventListener('task-updated' as any, updated);
        window.addEventListener('task-removed' as any, removed);
        // initial
        updateActive();
        return () => {
            window.removeEventListener('task-added' as any, added);
            window.removeEventListener('task-updated' as any, updated);
            window.removeEventListener('task-removed' as any, removed);
        };
    }, []);

    // Track dialogue state from singleton
    useEffect(() => {
        const unsubscribe = dialogueManager.subscribe((dialogue) => {
            setIsDialogueActive(dialogue !== null);
        });
        return unsubscribe;
    }, []);

    // Listen for legacy onboarding completion event to create first task
    useEffect(() => {
        const assignFirstTaskHandler = () => {
            // Create initial task if none exists (include completed check)
            if (!getTaskManager().getTasks().some(t => t.id === 'meet-maya')) {
                getTaskManager().addTask({
                    id: 'meet-maya',
                    title: 'Meet Maya',
                    description: 'Proceed to Maya\'s home. Follow the tracker to initiate your journey.',
                    active: true,
                    completed: false
                });
            }
        };

        const handlePlayerNearMaya = (e: any) => {
            // hide small alerts when player reaches Maya
            setShowSmallAlertDialog(false);
        };

        // Listen for progression state changes to update objectives dynamically
        const handleProgressionUpdate = async () => {
            try {
                const { progressionManager } = await import('../../../services/ProgressionManager');
                const state = progressionManager.getState();
                updateObjectivesBasedOnProgression(state);
            } catch (e) {
                console.warn('Failed to get progression state for objective update:', e);
            }
        };

        // Function to update objectives based on current progression state
        const updateObjectivesBasedOnProgression = (state: any) => {
            const tm = getTaskManager();
            const activeTasks = tm.getActiveTasks();

            // Remove completed or outdated tasks
            const tasksToRemove: string[] = [];
            
                        // Ensure only one primary Maya onboarding task is active at a time (inline safeguard until QuestController exists)
                        const mayaOrder = [
                            'meet-maya',
                            'follow-maya-to-bank',
                            'claim-joining-bonus',
                            'enter-bank-speak-manager',
                            'return-to-maya-stock-market',
                            'explore-dhani-stocks'
                        ];
                        const currentMayaTasks = activeTasks.filter(t => mayaOrder.includes(t.id));
                        if (currentMayaTasks.length > 1) {
                            const desired = currentMayaTasks.reduce((acc, t) => (mayaOrder.indexOf(t.id) > mayaOrder.indexOf(acc.id) ? t : acc), currentMayaTasks[0]);
                            currentMayaTasks.forEach(t => {
                                if (t.id !== desired.id) {
                                    tm.completeTask(t.id);
                                    setTimeout(() => tm.removeTask(t.id), 400);
                                }
                            });
                        }

            // 1. Initial state: Show "Meet Maya" objective
            if (!state.hasMetMaya && !activeTasks.some(t => t.id === 'meet-maya')) {
                tm.addTask({
                    id: 'meet-maya',
                    title: 'Meet Maya',
                    description: 'Proceed to Maya\'s home. Follow the tracker to initiate your journey.',
                    active: true,
                    completed: false
                });
            }

            // 2. After meeting Maya: Show "Follow Maya to Central Bank"
            if (state.hasMetMaya && !state.hasFollowedMaya && !activeTasks.some(t => t.id === 'follow-maya-to-bank')) {
                // Remove meet maya task if still present
                if (activeTasks.some(t => t.id === 'meet-maya')) {
                    tasksToRemove.push('meet-maya');
                }
                
                tm.addTask({
                    id: 'follow-maya-to-bank',
                    title: 'Follow Maya',
                    description: 'Follow Maya to reach the Central Bank',
                    active: true,
                    completed: false
                });
            }

            // 3. After reaching bank: Show "Claim your joining bonus"
            if (state.hasFollowedMaya && !state.hasClaimedMoney && !activeTasks.some(t => t.id === 'claim-joining-bonus')) {
                // Remove follow maya task if still present
                if (activeTasks.some(t => t.id === 'follow-maya-to-bank')) {
                    tasksToRemove.push('follow-maya-to-bank');
                }
                
                tm.addTask({
                    id: 'claim-joining-bonus',
                    title: 'Claim Joining Bonus',
                    description: 'Claim your joining bonus from Maya',
                    active: true,
                    completed: false
                });
            }

            // 4. After claiming money: Show "Go inside the bank and interact with bank manager"
            if (state.hasClaimedMoney && !state.bankOnboardingComplete && !activeTasks.some(t => t.id === 'enter-bank-speak-manager')) {
                // Remove claim bonus task if still present
                if (activeTasks.some(t => t.id === 'claim-joining-bonus')) {
                    tasksToRemove.push('claim-joining-bonus');
                }
                
                tm.addTask({
                    id: 'enter-bank-speak-manager',
                    title: 'Enter Bank',
                    description: 'Go inside the bank and interact with the bank manager',
                    active: true,
                    completed: false
                });
            }

            // 5. After bank onboarding: Show "Go back to Maya and follow her to stock market"
            if (state.bankOnboardingComplete && !state.stockMarketOnboardingComplete && !activeTasks.some(t => t.id === 'return-to-maya-stock-market')) {
                // Remove bank task if still present
                if (activeTasks.some(t => t.id === 'enter-bank-speak-manager')) {
                    tasksToRemove.push('enter-bank-speak-manager');
                }
                
                tm.addTask({
                    id: 'return-to-maya-stock-market',
                    title: 'Return to Maya',
                    description: 'Go back to Maya and follow her to the Dhaniverse Stock Market',
                    active: true,
                    completed: false
                });
            }

            // 6. After reaching stock market: Show "Go inside and explore Dhani stocks"
            if (state.stockMarketOnboardingComplete && !activeTasks.some(t => t.id === 'explore-dhani-stocks')) {
                // Clean up ALL Maya onboarding tasks when stock market is reached
                const mayaOnboardingTaskIds = [
                    'meet-maya',
                    'follow-maya-to-bank',
                    'claim-joining-bonus',
                    'enter-bank-speak-manager',
                    'return-to-maya-stock-market'
                ];
                
                mayaOnboardingTaskIds.forEach(taskId => {
                    if (activeTasks.some(t => t.id === taskId)) {
                        tasksToRemove.push(taskId);
                    }
                });
                
                tm.addTask({
                    id: 'explore-dhani-stocks',
                    title: 'Explore Stock Market',
                    description: 'Go inside and explore Dhani stocks',
                    active: true,
                    completed: false
                });
                
                // Auto-complete Maya onboarding after some time if player is exploring the stock market
                setTimeout(() => {
                    const exploreTask = tm.getActiveTasks().find(t => t.id === 'explore-dhani-stocks');
                    if (exploreTask) {
                        // Check if stock market UI is active (player is already exploring)
                        const stockMarketContainer = document.getElementById('stock-market-ui-container');
                        if (stockMarketContainer && stockMarketContainer.classList.contains('active')) {
                            console.log("GameHUD: Auto-completing Maya onboarding - player is exploring stock market");
                            tm.completeTask('explore-dhani-stocks');
                            setTimeout(() => tm.removeTask('explore-dhani-stocks'), 1000);
                        }
                    }
                }, 5000); // Check after 5 seconds
            }

            // Clean up outdated tasks
            tasksToRemove.forEach(taskId => {
                tm.completeTask(taskId);
                setTimeout(() => tm.removeTask(taskId), 1000);
            });

                        // Final cleanup: once player is truly free (stock market reached & explore task completed or claimed money & bank onboarding complete), remove all trackers & tasks
                        const freed = state.stockMarketOnboardingComplete && state.bankOnboardingComplete;
                        if (freed) {
                            const leftover = tm.getActiveTasks().filter(t => ['meet-maya','follow-maya-to-bank','claim-joining-bonus','enter-bank-speak-manager','return-to-maya-stock-market','explore-dhani-stocks'].includes(t.id));
                            leftover.forEach(t => {
                                tm.completeTask(t.id);
                                setTimeout(() => tm.removeTask(t.id), 300);
                            });
                            // Disable Maya tracker
                            locationTrackerManager.setTargetEnabled('maya', false);
                        }
        };

        // Set up periodic progression checking
        const progressionCheckInterval = setInterval(handleProgressionUpdate, 2000);

        // Initial progression check
        handleProgressionUpdate();

        window.addEventListener(
            "assign-first-task" as any,
            assignFirstTaskHandler
        );
        window.addEventListener(
            "player-near-maya" as any,
            handlePlayerNearMaya
        );

        // Generic dialogue events (from game systems like Maya)
        const showDialogueHandler = (e: any) => {
            const d = e.detail || {};
            console.debug("GameHUD: show-dialogue event received", d);
            
            // Use singleton DialogueManager
            dialogueManager.showDialogue({
                text: d.text || "",
                characterName: d.characterName || "Maya",
                showBackdrop: d.showBackdrop || false,
                allowSpaceAdvance: d.allowAdvance !== false
            }, {
                onAdvance: () => {
                    dialogueManager.closeDialogue();
                    window.dispatchEvent(new CustomEvent("dialogue-advance"));
                },
                onComplete: () => {
                    dialogueManager.closeDialogue();
                    window.dispatchEvent(new CustomEvent("dialogue-complete"));
                }
            });
        };

        const showTemporaryHandler = (e: any) => {
            const d = e.detail || {};
            const text = d.text || "";
            const duration = d.durationMs || 1500;
            setSmallAlertText(text);
            setShowSmallAlertDialog(true);
            window.setTimeout(() => setShowSmallAlertDialog(false), duration);
        };

        const closeDialogueHandler = () => {
            dialogueManager.closeDialogue();
        };

        window.addEventListener("show-dialogue" as any, showDialogueHandler);
        window.addEventListener(
            "show-temporary-dialog" as any,
            showTemporaryHandler
        );
        window.addEventListener("close-dialogue" as any, closeDialogueHandler);

        return () => {
            // Clean up progression check interval
            clearInterval(progressionCheckInterval);
            
            window.removeEventListener(
                "assign-first-task" as any,
                assignFirstTaskHandler
            );
            window.removeEventListener(
                "player-near-maya" as any,
                handlePlayerNearMaya
            );
            window.removeEventListener(
                "show-dialogue" as any,
                showDialogueHandler
            );
            window.removeEventListener(
                "show-temporary-dialog" as any,
                showTemporaryHandler
            );
            window.removeEventListener(
                "close-dialogue" as any,
                closeDialogueHandler
            );
        };
    }, []);

    // If GamePage set a pending flag before HUD mounted, ensure first task present
    useEffect(() => {
        if ((window as any).__assignFirstTaskPending) {
            if (!getTaskManager().getTasks().some(t => t.id === 'meet-maya')) {
                getTaskManager().addTask({
                    id: 'meet-maya',
                    title: 'Meet Maya',
                    description: 'Proceed to Maya\'s home. Follow the tracker to initiate your journey.',
                    active: true,
                    completed: false
                });
            }
            (window as any).__assignFirstTaskPending = false;
        }
    }, []);

    // Auto-scroll chat messages (only if user is near bottom)
    useEffect(() => {
        const el = messagesRef.current;
        if (!el) return;
        
        // Check if user is near the bottom before auto-scrolling
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNearBottom = distanceFromBottom < 120;
        
        // Only auto-scroll if user is already near the bottom
        if (isNearBottom) {
            try {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            } catch {
                // Fallback for older browsers
                el.scrollTop = el.scrollHeight;
            }
        }
    }, [chatMessages]);

    // Scroll to bottom on initial load
    useEffect(() => {
        const el = messagesRef.current;
        if (el && chatMessages.length > 0) {
            // Scroll to bottom without animation on initial load
            el.scrollTop = el.scrollHeight;
        }
    }, []);

    // Handle clicks outside the chat to unfocus it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Only check if chat is currently focused
            if (
                isChatFocused &&
                chatContainerRef.current &&
                chatInputRef.current
            ) {
                // Check if the click was outside the chat container
                if (!chatContainerRef.current.contains(event.target as Node)) {
                    setIsChatFocused(false);
                    chatInputRef.current.blur();
                    window.dispatchEvent(new Event("typing-end"));
                }
            }
        };

        // Add click listener to the document
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isChatFocused]);

    // Handle keyboard events - MUCH simpler approach
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle keys when not typing in other inputs
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Open chat with "/"
            if (e.key === "/" && !isChatFocused) {
                e.preventDefault();
                setIsChatFocused(true);

                setTimeout(() => {
                    if (chatInputRef.current) {
                        chatInputRef.current.focus();
                        setChatInput(""); // Clear any "/" that might appear
                    }
                }, 0);
                return;
            }

            // Close chat with Escape (only if we're typing)
            if (e.key === "Escape" && isChatFocused) {
                e.preventDefault();
                setIsChatFocused(false);

                if (chatInputRef.current) {
                    chatInputRef.current.blur();
                }
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isChatFocused]);

    // Handle chat input focus/blur
    const handleChatFocus = () => {
        console.log("Chat input focused - sending typing-start");
        setIsChatFocused(true);
        // Send typing-start ONLY when the input is actually focused
        window.dispatchEvent(new Event("typing-start"));
    };

    const handleChatBlur = () => {
        console.log("Chat input blurred - sending typing-end");
        setIsChatFocused(false);
        // Send typing-end when the input loses focus
        window.dispatchEvent(new Event("typing-end"));
    };

    // Handle chat input key events
    const handleChatKeyDown = (e: React.KeyboardEvent) => {
        // Explicitly handle WASD, E, and Space keys to ensure they can be typed in chat
        const gameControlKeys = [
            "w","a","s","d","e","t","W","A","S","D","E","T"," "
        ];
        if (gameControlKeys.includes(e.key)) {
            // Stop propagation to prevent the game from handling these keys
            e.stopPropagation();
            // Don't prevent default so the key can be typed in the input
            return;
        }

        // Handle special keys
        if (e.key === "Escape") {
            e.preventDefault();
            setIsChatFocused(false);
            chatInputRef.current?.blur();
        }

        if (e.key === "Enter" && chatInput.trim()) {
            e.preventDefault();

            const message = chatInput.trim();

            // Always send as a regular chat message (slash commands removed)
            window.dispatchEvent(
                new CustomEvent("send-chat", {
                    detail: { message },
                })
            );

            // Clear input and keep focus
            setChatInput("");
            setTimeout(() => chatInputRef.current?.focus(), 0);
        }
    };

    // Add system message to chat
    const addSystemMessage = (message: string) => {
        setChatMessages((prev) => {
            const systemMessage = {
                id: `system-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 9)}`,
                username: "System",
                message,
                timestamp: Date.now(),
            };
            const newMessages = [...prev, systemMessage];
            return newMessages.length > 50
                ? newMessages.slice(-50)
                : newMessages;
        });
    };

    // Mark task complete helper (future use)
    const completeTask = (id: string) => {
        getTaskManager().completeTask(id);
    };

    return (
        <div className="absolute top-2 left-2 w-full h-full z-[1000] font-['Tickerbit',Arial,sans-serif] select-none">
            {/* Inline animation styles for join notifications (small localized CSS) */}
            <style>{`
                @keyframes joinEnter {
                    0% { transform: translateY(8px); opacity: 0; }
                    60% { transform: translateY(2px); opacity: 1; }
                    100% { transform: translateY(0px); opacity: 1; }
                }
                .join-notif {
                    animation: joinEnter 420ms cubic-bezier(.2,.8,.2,1) both;
                    will-change: transform, opacity;
                }
            `}</style>

            {/* Minimap - Top Left */}
            <div className="absolute top-5 left-5 z-[1001]">
                <div 
                    className="bg-black/70 border border-white/20 backdrop-blur-sm overflow-hidden"
                    style={{
                        width: `${MINIMAP_CONTAINER_PX}px`,
                        height: `${MINIMAP_CONTAINER_PX}px`,
                        borderRadius: '50%', // Circular minimap
                    }}
                >
                    {/* Actual map background with proper scaling */}
                    <div className="w-full h-full relative overflow-hidden">
                        <img
                            src="/maps/minimap.png"
                            alt="Game Map"
                            className="absolute top-0 left-0"
                            
                            onError={(e) => console.error('Minimap image failed to load:', e)}
                            style={{
                                // Set only one dimension to preserve aspect ratio depending on fit axis
                                ...(fitByWidth ? { width: `${MINIMAP_CONTAINER_PX * zoomMultiplier}px` } : { height: `${MINIMAP_CONTAINER_PX * zoomMultiplier}px` }),
                                transform: `translate(${translateX}px, ${translateY}px) scale(${minimapScale / (fitByWidth ? baseScaleX : baseScaleY)})`,
                                transformOrigin: 'top left',
                                transition: 'transform 0.1s ease-out',
                                imageRendering: 'pixelated',
                            }}
                        />

                        {/* Player position indicator (moves when map is clamped) */}
                        {(() => {
                            const markerSize = 12; // px (bigger, matches previous w-3 h-3)
                            const localSelf = worldToLocal(playerPosition.x, playerPosition.y);

                            // Clamp marker inside circular container (radius - marker half)
                            const radius = MINIMAP_CONTAINER_PX / 2;
                            const cx = radius;
                            const cy = radius;
                            const dx = localSelf.x - cx;
                            const dy = localSelf.y - cy;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            const maxDist = radius - markerSize / 2 - 2; // padding

                            let markerX = localSelf.x;
                            let markerY = localSelf.y;

                            if (dist > maxDist) {
                                const ratio = maxDist / dist;
                                markerX = cx + dx * ratio;
                                markerY = cy + dy * ratio;
                            }

                            return (
                                <div
                                    className="absolute rounded-full z-10"
                                    style={{
                                        width: `${markerSize}px`,
                                        height: `${markerSize}px`,
                                        left: `${markerX}px`,
                                        top: `${markerY}px`,
                                        transform: 'translate(-50%, -50%)',
                                        backgroundColor: getCharacterColor(user?.selectedCharacter, username),
                                        border: '2px solid rgba(255,255,255,0.95)',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 0 6px rgba(255,255,255,0.08)',
                                    }}
                                    title="Your position"
                                />
                            );
                        })()}

                        {/* Other players */}
                        {connectedPlayers.slice(0, 8).map((player, index) => {
                            // Use smoothed render positions when available
                            const rp = renderPositionsRef.current[player.id];
                            const px = rp ? rp.x : (player as any).x || 0;
                            const py = rp ? rp.y : (player as any).y || 0;
                            // Use the worldToLocal helper to get proper positioning
                            const localPos = worldToLocal(px, py);

                            // Only show if within minimap bounds (inside container)
                            if (localPos.x >= 0 && localPos.x <= MINIMAP_CONTAINER_PX && localPos.y >= 0 && localPos.y <= MINIMAP_CONTAINER_PX) {
                                return (
                                    <div
                                        key={player.id}
                                        className="absolute w-2 h-2 bg-blue-400 rounded-full border border-white/50 transform -translate-x-1/2 -translate-y-1/2 z-10"
                                        style={{
                                            left: `${localPos.x}px`,
                                            top: `${localPos.y}px`,
                                        }}
                                        title={`${player.username} (nearby)`}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Minimap border and label */}
                        <div className="text-center translate-y-6 text-xs text-white/90 font-['Tickerbit',Arial,sans-serif] select-none px-1 rounded z-30">
                            MAP
                        </div>

                        {/* Coordinates display */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-white font-['Tickerbit',Arial,sans-serif] select-none bg-black/50 px-1 rounded z-30">
                            {Math.round(playerPosition.x)}, {Math.round(playerPosition.y)}
                        </div>
                    </div>
                </div>
                {/* Overlay placed outside the clipped container to avoid flicker */}
                {/* <img
                    src="/maps/minimap-border.png"
                    alt="Minimap Border"
                    className="pointer-events-none absolute top-0 left-0"
                    style={{
                        width: `${MINIMAP_CONTAINER_PX + 55}px`,
                        aspectRatio: '1 / 1',
                        scale: 1.05,
                        zIndex: 1010,
                        transform: 'translate(0, 0)'
                    }}
                /> */}
            </div>

            {/* Top right status area */}
            <div className="absolute top-5 right-9 flex flex-col items-end space-y-2" style={{ lineHeight: 1 }}>
                {/* Blockchain status indicator */}
                {walletManager && (
                    <div className="flex items-center space-x-2 bg-black/60 rounded-lg px-3 py-1 backdrop-blur">
                        <div
                            className={`w-2 h-2 rounded-full ${
                                walletStatus.connected
                                    ? "bg-green-400"
                                    : "bg-gray-400"
                            }`}
                        ></div>
                        <span className="text-xs text-white">
                            {walletStatus.connected ? "Blockchain" : "Local"}
                        </span>
                        {!networkHealthy && (
                            <div
                                className="w-2 h-2 rounded-full bg-yellow-400"
                                title="Network issues detected"
                            ></div>
                        )}
                    </div>
                )}

                {/* Animated Rupee counter */}
                <AnimatedRupeeCounter 
                    value={currentRupees}
                    previousValue={previousRupees}
                    showTransaction={true}
                />

                {walletStatus.connected && (
                    <div
                        className="ml-2 w-3 h-3 bg-blue-400 rounded-full z-10"
                        title="Blockchain verified"
                    ></div>
                )}
            </div>

            {/* Player connection display (moved to bottom-right, uses SVG background) */}
            <div className="absolute bottom-5 right-9 z-[1100]">
                {/* Fixed notification stack (reliable visibility above UI) */}
                <div className="fixed right-8 bottom-20 z-[2000] pointer-events-none">
                    {/* Accessibility: announce join/leave notifications to screen readers */}
                    <div className="sr-only" aria-live="polite" aria-atomic="true">
                        {joinNotifications.map(n => `${n.username} ${n.action === 'left' ? 'left' : 'joined'}`).join(', ')}
                    </div>

                    {/* Container with fixed height; top edge softly fades older items using CSS mask */}
                    <div style={{ width: 220, maxHeight: 110, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingTop: 6, pointerEvents: 'none', WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 25%)', maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 25%)' }}>
                        {joinNotifications.slice(-4).map((n) => (
                            <div
                                key={n.id}
                                className={`join-notif text-white text-sm text-right font-['Tickerbit',Arial,sans-serif]`}
                                style={{ background: 'transparent', padding: 0, opacity: 0, transform: 'translateY(6px)', transition: 'opacity 420ms cubic-bezier(.2,.8,.2,1), transform 420ms cubic-bezier(.2,.8,.2,1)' }}
                                aria-hidden
                                // apply a tiny delay so newer items animate after render
                                onAnimationStart={() => { /* noop - preserved for future hooks */ }}
                            >
                                {n.username} {n.action === 'left' ? 'left' : 'joined'}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative w-[120px] h-auto">
                    <img src="/UI/game/onlinecount.svg" alt="Online count" className="block w-full h-full" style={{ display: 'block' }} />

                    <div className="absolute inset-0 flex items-center justify-center z-[200]">
                        <div
                            className="absolute inset-0 z-[4000] pointer-events-auto"
                            onMouseEnter={() => setShowOnlineTooltip(true)}
                            onMouseLeave={() => setShowOnlineTooltip(false)}
                            onClick={() => setShowOnlineTooltip((s) => !s)}
                            onContextMenu={(e) => { e.preventDefault(); setShowOnlineTooltip(true); }}
                            onFocus={() => {
                                setShowOnlineTooltip(true);
                                if (connectedPlayers.length === 0 && typeof onlineCount === 'number' && onlineCount >= 1) {
                                    window.dispatchEvent(new CustomEvent('requestExistingPlayers'));
                                }
                            }}
                            onBlur={() => setShowOnlineTooltip(false)}
                            role="button"
                            aria-haspopup="listbox"
                            aria-expanded={showOnlineTooltip}
                            aria-label="Show online players"
                            tabIndex={0}
                        />

                        <div className="relative">
                            <div
                                className="inline-flex items-center gap-3 px-3 rounded-2xl cursor-default min-w-0"
                                onMouseEnter={() => setShowOnlineTooltip(true)}
                                onMouseLeave={() => setShowOnlineTooltip(false)}
                            >
                                <span className="w-2 h-2 rounded-full bg-green-400" aria-hidden />
                                <div className="inline-flex items-center gap-2 max-w-[240px] overflow-hidden min-w-0">
                                    {connectedPlayers && connectedPlayers.length > 0 ? (
                                        <div className="inline-flex items-center gap-2 truncate min-w-0">
                                            {connectedPlayers.slice(-6).map((p) => {
                                                const skinId = (p as any).skin || (p as any).selectedCharacter || null;
                                                const color = getCharacterColor(skinId, p.username);
                                                const isLocal = user && (user.gameUsername as string) === p.username;
                                                return <span key={p.id} className="text-sm font-['Tickerbit',Arial,sans-serif] truncate" style={{ color }} aria-hidden>{p.username}{isLocal ? ' (you)' : ''}</span>;
                                            })}
                                            {connectedPlayers.length > 6 && <span className="text-xs text-white/70">+{connectedPlayers.length - 6}</span>}
                                        </div>
                                    ) : (
                                        (typeof onlineCount === 'number' && onlineCount >= 1) ? (
                                            <span className="text-sm font-['Tickerbit',Arial,sans-serif] truncate text-white">{onlineCount} online</span>
                                        ) : null
                                    )}
                                </div>
                            </div>

                            <div className={`absolute right-0 bottom-full mb-4 w-56 text-center max-h-40 overflow-auto bg-black/85 text-sm rounded-xl p-2 shadow-lg transition-opacity duration-150 ${showOnlineTooltip ? 'opacity-100 pointer-events-auto z-[3000]' : 'opacity-0 pointer-events-none z-[200]' }`}>
                                {connectedPlayers && connectedPlayers.length > 0 ? (
                                    <ul className="space-y-1">
                                        {connectedPlayers.slice().reverse().map((p) => {
                                            const skinId = (p as any).skin || (p as any).selectedCharacter || null;
                                            const color = getCharacterColor(skinId, p.username);
                                            const isLocal = user && (user.gameUsername as string) === p.username;
                                            return <li key={p.id} className="truncate" style={{ color }} aria-hidden>{p.username}{isLocal ? ' (you)' : ''}</li>;
                                        })}
                                    </ul>
                                ) : (
                                    (typeof onlineCount === 'number' && onlineCount >= 1) ? (
                                        <div className="text-sm" aria-hidden>
                                            {(() => {
                                                const displayName = (user && (user.gameUsername as string)) || username || 'You';
                                                const color = getCharacterColor(user?.selectedCharacter, displayName);
                                                return <span style={{ color }}>{displayName} (you)</span>;
                                            })()}
                                        </div>
                                    ) : null
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat window - always visible */}
            <div
                ref={chatContainerRef}
                className={`absolute bottom-2 -left-0 w-[40ch] max-h-[45vh] flex flex-col p-2 text-[14px] pointer-events-auto transition-all duration-300 ${isChatFocused ? "opacity-100" : "opacity-95"}`}
            >
                {/* Chat messages area */}
                <div
                    className="h-[36vh] relative overflow-y-auto break-words scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent scroll-smooth pr-1"
                    ref={messagesRef}
                    style={{
                        scrollbarGutter: 'stable both-edges' as any,
                        WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 8%, #000 18%, #000 100%)',
                        maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 8%, #000 18%, #000 100%)'
                    }}
                >
                    <div className="flex flex-col h-full">
                        <div style={{ flex: 1 }} />
                        <AnimatePresence initial={false}>
                            {chatMessages.map((msg) => (
                                <motion.div
                                        key={msg.id}
                                        layout="position"
                                        initial={{ opacity: 0, y: 20, scale: 0.985 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.99 }}
                                        transition={{
                                            y: { type: 'spring', stiffness: 520, damping: 34 },
                                            scale: { type: 'spring', stiffness: 360, damping: 28 },
                                            opacity: { duration: 0.08 }
                                        }}
                                        className="flex items-end gap-3 mb-2 will-change-transform w-full"
                                    >
                                    {/* avatar */}
                                    <div className="w-8 h-8 rounded-full  flex-shrink-0">
                                        <div
                                            className="w-8 h-8 rounded-full backdrop-blur-sm bg-cover border-2 border-black shadow-sm"
                                            style={{
                                                backgroundImage: `url('/characters/${(msg.skin || 'C1')}-Preview.png')`,
                                                backgroundPosition: 'center -25px',
                                                backgroundSize: '400%',
                                                backgroundColor: msg.color || '#B2EEE6',
                                            }}
                                        />
                                    </div>
                                    {/* bubble */}
                                    <div className="relative">
                                        <div className="bg-black/75 text-white rounded-2xl px-4 py-3 border border-black/30 backdrop-blur-sm shadow-md">
                                            <div className="flex items-start justify-between gap-2">
                        <div 
                                                    className="text-[12px] font-['Tickerbit',Arial,sans-serif]"
                                                    style={{
                                                        color: msg.color || '#B2EEE6'
                                                    }}
                                                >
                                                    {msg.username}
                                                </div>
                                                <div className="text-[11px] text-white/80 ml-2 flex-shrink-0">
                                                    {msg.timestamp
                                                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                        : ''}
                                                </div>
                                            </div>
                                            <div
                                                className="mt-2 text-white text-sm leading-[1.25] font-['Tickerbit',Arial,sans-serif] whitespace-pre-wrap break-words break-all"
                                                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                                            >
                                                {msg.message}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Voice headphone + mic controls extracted to component */}
                <div className="flex items-center m-2 gap-2">
                    <VoiceChat
                        participantName={selfPlayerId || username}
                        roomName="dhaniverse-main"
                        enabled={voiceEnabled}
                    />
                    <div className="relative flex-1">
                        <input
                            ref={chatInputRef}
                            className={`w-full pr-14 pl-5  h-10 rounded-full bg-black text-white text-sm placeholder-white/50 font-['Tickerbit',Arial,sans-serif] tracking-wider ${isChatFocused ? '' : 'opacity-95'}`}
                            style={{ outline: 'none', boxShadow: 'none' }}
                            type="text"
                            placeholder={isChatFocused ? 'Type a message...' : 'Press / to chat'}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onFocus={handleChatFocus}
                            onBlur={handleChatBlur}
                            onKeyDown={handleChatKeyDown}
                        />
                        <button
                            onClick={() => {
                                const message = chatInput.trim();
                                if (!message) return;
                                window.dispatchEvent(new CustomEvent('send-chat', { detail: { message } }));
                                setChatInput('');
                                setTimeout(() => chatInputRef.current?.focus(), 0);
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 scale-[0.9] rounded-full bg-[#F1CD36] flex items-center justify-center border-2 outline-none focus:outline-none"
                            aria-label="Send message"
                            style={{ outline: 'none', boxShadow: 'none' }}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="w-6 h-6 fill-black scale-[18] ml-0.5"
                                aria-hidden
                            >
                                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Tasks Banner */}
                        {activeTasks.length > 0 && !isDialogueActive && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col space-y-2 z-[1002] pointer-events-none w-full max-w-3xl px-4">
                                {activeTasks.slice(0,3).map(task => (
                                    <div key={task.id} className="relative w-full pointer-events-auto">
                                        {/* SVG Objective Box Background - Stretchable */}
                                        <img
                                            src="/UI/game/objective-box.svg"
                                            alt="Objective Box"
                                            className="w-full h-auto min-w-fit"
                                            style={{
                                                minHeight: '50px',
                                                maxHeight: '60px',
                                                objectFit: 'fill'
                                            }}
                                        />
                                        
                                        {/* Objective Content - Forced Single Line */}
                                        <div className="absolute inset-0 flex items-center px-6 overflow-hidden select-none">
                                            <div className="flex items-center space-x-3 mx-auto min-w-0">
                                                <span 
                                                    className="font-bold uppercase text-sm whitespace-nowrap flex-shrink-0"
                                                    style={{ 
                                                        color: '#F0C33A',
                                                        fontFamily: 'VCR OSD Mono, monospace',
                                                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                                                    }}
                                                >
                                                    Objective:
                                                </span>
                                                <p 
                                                    className="text-sm leading-snug flex-1 min-w-0 truncate whitespace-nowrap overflow-hidden"
                                                    style={{ 
                                                        color: '#FFF5DA',
                                                        fontFamily: 'VCR OSD Mono, monospace',
                                                        fontWeight: '600',
                                                        textShadow: '1px 1px 1px rgba(0,0,0,0.3)'
                                                    }}
                                                >
                                                    {task.description}
                                                </p>
                                                {task.completed && (
                                                    <span 
                                                        className="text-green-400 text-xs font-bold whitespace-nowrap flex-shrink-0"
                                                        style={{ fontFamily: 'VCR OSD Mono, monospace' }}
                                                    >
                                                        ✓ COMPLETED
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

            {/* Small alert/dialog for stray reminders (small, top-center) */}
            <DialogueBox
                text={smallAlertText}
                isVisible={showSmallAlertDialog}
                position={"top-center"}
                small={true}
                showProgressIndicator={false}
                showContinueHint={false}
            />

            {/* Location Trackers */}
            {trackingTargets.map((target) => (
                <LocationTracker
                    key={target.id}
                    targetPosition={target.position}
                    playerPosition={playerPosition}
                    cameraPosition={cameraPosition}
                    screenSize={screenSize}
                    enabled={target.enabled}
                    targetName={target.name}
                    targetImage={target.image}
                />
            ))}

            {/* Global Dialogue Renderer - Singleton dialogue system */}
            <DialogueRenderer />
        </div>
    );
};

export default GameHUD;
