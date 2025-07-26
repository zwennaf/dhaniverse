import React, { useState, useEffect, useRef } from "react";
import { WalletManager, WalletStatus } from "../../../services/WalletManager";
import { ICPActorService } from "../../../services/ICPActorService";
import { NetworkHealthMonitor } from "../../../services/ICPErrorHandler";
import { balanceManager } from "../../../services/BalanceManager";

interface GameHUDProps {
    rupees?: number;
    username?: string;
    walletManager?: WalletManager;
    icpService?: ICPActorService;
}

interface ConnectedPlayer {
    id: string;
    username: string;
    joinedAt: number;
}

const GameHUD: React.FC<GameHUDProps> = ({
    rupees = 25000,
    walletManager,
    icpService,
}) => {
    const [currentRupees, setCurrentRupees] = useState(rupees);
    const [chatMessages, setChatMessages] = useState<
        { id: string; username: string; message: string }[]
    >([]);
    const [chatInput, setChatInput] = useState("");
    // Always show chat window, but control focus state - start unfocused
    const [isChatFocused, setIsChatFocused] = useState(false);

    // Player connection tracking
    const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>(
        []
    );
    const [onlineCount, setOnlineCount] = useState(0);

    // Blockchain status
    const [walletStatus, setWalletStatus] = useState<WalletStatus>({
        connected: false,
    });
    const [networkHealthy, setNetworkHealthy] = useState(true);

    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const messagesRef = useRef<HTMLDivElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    // Ensure initial state is correct
    useEffect(() => {
        // Make sure typing is disabled initially
        window.dispatchEvent(new Event("typing-end"));
    }, []);

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
        setCurrentRupees(currentBalance.cash);

        // Subscribe to balance changes
        const unsubscribe = balanceManager.onBalanceChange((balance) => {
            setCurrentRupees(balance.cash);
        });

        // Also listen for legacy rupee updates for backward compatibility
        const handleRupeeUpdate = (e: CustomEvent) => {
            if (e.detail?.rupees !== undefined) {
                balanceManager.updateCash(e.detail.rupees);
            }
        };

        window.addEventListener("rupee-update" as any, handleRupeeUpdate);
        
        return () => {
            unsubscribe();
            window.removeEventListener("rupee-update" as any, handleRupeeUpdate);
        };
    }, []);

    // Listen for player connection events
    useEffect(() => {
        const handlePlayerJoined = (e: any) => {
            const { player } = e.detail;
            if (player && player.username) {
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
                        },
                    ];
                });

                // Add a system message to chat when someone joins
                setChatMessages((prev) => {
                    const joinMessage = {
                        id: `join-${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2, 9)}`,
                        username: "System",
                        message: `${player.username} joined the game`,
                    };
                    const newMessages = [...prev, joinMessage];
                    return newMessages.length > 50
                        ? newMessages.slice(-50)
                        : newMessages;
                });
            }
        };

        const handlePlayerDisconnect = (e: any) => {
            const { id, username } = e.detail;

            // Remove player from connected list
            setConnectedPlayers((prev) => prev.filter((p) => p.id !== id));

            // Add a system message to chat when someone leaves
            if (username) {
                setChatMessages((prev) => {
                    const leaveMessage = {
                        id: `leave-${Date.now()}-${Math.random()
                            .toString(36)
                            .substring(2, 9)}`,
                        username: "System",
                        message: `${username} left the game`,
                    };
                    const newMessages = [...prev, leaveMessage];
                    return newMessages.length > 50
                        ? newMessages.slice(-50)
                        : newMessages;
                });
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
                    }))
                );
            }
        };

        window.addEventListener("playerJoined" as any, handlePlayerJoined);
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
            window.removeEventListener(
                "playerJoined" as any,
                handlePlayerJoined
            );
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

            setChatMessages((prev) => {
                // Keep only the last 50 messages to prevent memory issues
                const newMessages = [
                    ...prev,
                    { id: messageId, username, message },
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

    // Auto-scroll chat messages
    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [chatMessages]);

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
            "w",
            "a",
            "s",
            "d",
            "e",
            "W",
            "A",
            "S",
            "D",
            "E",
            " ",
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

            // Send message
            window.dispatchEvent(
                new CustomEvent("send-chat", {
                    detail: { message: chatInput.trim() },
                })
            );

            // Clear input and keep focus
            setChatInput("");
            setTimeout(() => chatInputRef.current?.focus(), 0);
        }
    };

    return (
        <div className="absolute top-2 left-2 w-full h-full pointer-events-none z-[1000] font-['Tickerbit',Arial,sans-serif]">
            {/* Top right status area */}
            <div className="absolute top-5 right-5 flex flex-col items-end space-y-2">
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

                {/* Rupee counter */}
                <div className="p-2 px-3 rounded-lg flex items-center text-[#FFD700] text-shadow-lg text-2xl font-bold">
                    <span className="mr-1.5 text-3xl">₹</span>
                    <span>{currentRupees}</span>
                    {walletStatus.connected && (
                        <div
                            className="ml-2 w-3 h-3 bg-blue-400 rounded-full"
                            title="Blockchain verified"
                        ></div>
                    )}
                </div>
            </div>

            {/* Player connection display */}
            <div className="absolute bottom-[45vh] left-5 w-[28ch] pointer-events-none">
                {/* Online count */}
                <div className="mb-2 text-white/80 text-sm font-['Tickerbit',Arial,sans-serif] tracking-wider">
                    <span className="text-dhani-green">●</span> {onlineCount}{" "}
                    online
                </div>

                {/* Connected players list */}
                {connectedPlayers.length > 0 && (
                    <div className="space-y-1 max-h-[15vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {connectedPlayers.slice(-8).map((player) => (
                            <div
                                key={player.id}
                                className="text-white/70 text-sm font-['Tickerbit',Arial,sans-serif] tracking-wider flex items-center animate-fade-in"
                            >
                                <span className="text-dhani-green mr-2">▸</span>
                                <span className="text-white">
                                    {player.username}
                                </span>
                                <span className="text-white/40 ml-2 text-xs">
                                    joined
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat window - always visible */}
            <div
                ref={chatContainerRef}
                className={`absolute bottom-0 left-0 w-[28ch] max-h-[40vh] flex flex-col bg-black/70 rounded-tr-lg p-2 text-[14px] text-white pointer-events-auto backdrop-blur-sm border border-white/10 transition-all duration-300 ${
                    isChatFocused
                        ? "opacity-100 border-dhani-green/30 shadow-lg shadow-dhani-green/10"
                        : "opacity-75"
                }`}
            >
                {/* Chat messages area */}
                <div
                    className="h-[20vh] overflow-y-auto mb-2 break-words scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
                    ref={messagesRef}
                >
                    {chatMessages.length === 0 ? (
                        <div className="text-white/50 italic text-sm font-['Tickerbit',Arial,sans-serif] tracking-wider p-2">
                            No messages yet. Press / to chat.
                        </div>
                    ) : (
                        chatMessages.map((msg, idx) => (
                            <div
                                key={idx}
                                className="mb-1.5 leading-[1.3] px-1"
                            >
                                <div className="flex items-start space-x-2">
                                    <span
                                        className={`text-sm font-['Tickerbit',Arial,sans-serif] tracking-wider flex-shrink-0 ${
                                            msg.username === "System"
                                                ? "text-yellow-100 italic"
                                                : "text-dhani-green"
                                        }`}
                                    >
                                        {msg.username === "System"
                                            ? ""
                                            : `${msg.username}:`}
                                    </span>
                                    <span
                                        className={`text-sm font-['Tickerbit',Arial,sans-serif] tracking-wider break-words ${
                                            msg.username === "System"
                                                ? "text-cyan-100 italic"
                                                : "text-white"
                                        }`}
                                    >
                                        {msg.message}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Chat input */}
                <div className="relative">
                    <input
                        ref={chatInputRef}
                        className={`w-full px-3 py-2 border rounded-md bg-black/40 text-sm text-white outline-none placeholder-white/50 font-['Tickerbit',Arial,sans-serif] tracking-wider transition-all duration-200 ${
                            isChatFocused
                                ? "border-dhani-green/50 bg-black/60 shadow-sm shadow-dhani-green/20"
                                : "border-white/20 hover:border-white/30"
                        }`}
                        type="text"
                        placeholder={
                            isChatFocused
                                ? "Type a message..."
                                : "Press / to chat"
                        }
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={handleChatFocus}
                        onBlur={handleChatBlur}
                        onKeyDown={handleChatKeyDown}
                    />
                    {isChatFocused && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/40 text-xs font-['Tickerbit',Arial,sans-serif]">
                            Enter
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameHUD;
