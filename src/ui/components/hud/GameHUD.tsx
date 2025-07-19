import React, { useState, useEffect, useRef } from "react";

interface GameHUDProps {
    rupees?: number;
    username?: string;
}

const GameHUD: React.FC<GameHUDProps> = ({ rupees = 25000 }) => {
    const [currentRupees, setCurrentRupees] = useState(rupees);
    const [chatMessages, setChatMessages] = useState<
        { id: string; username: string; message: string }[]
    >([]);
    const [chatInput, setChatInput] = useState("");
    // Always show chat window, but control focus state - start unfocused
    const [isChatFocused, setIsChatFocused] = useState(false);

    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const messagesRef = useRef<HTMLDivElement | null>(null);

    // Ensure initial state is correct
    useEffect(() => {
        // Make sure typing is disabled initially
        window.dispatchEvent(new Event("typing-end"));
    }, []);

    // Listen for rupee updates
    useEffect(() => {
        setCurrentRupees(rupees);

        const handleRupeeUpdate = (e: CustomEvent) => {
            setCurrentRupees(e.detail.rupees);
        };

        window.addEventListener("rupee-update" as any, handleRupeeUpdate);
        return () =>
            window.removeEventListener(
                "rupee-update" as any,
                handleRupeeUpdate
            );
    }, [rupees]);

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
        // Don't prevent default for WASD keys - let them work normally in the input
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
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1000] font-['Pixeloid',Arial,sans-serif]">
            {/* Rupee counter */}
            <div className="absolute top-5 right-5 p-2 px-3 rounded-lg flex items-center text-[#FFD700] text-shadow-lg text-2xl font-bold">
                <span className="mr-1.5 text-3xl">₹</span>
                <span>{currentRupees}</span>
            </div>

            {/* Chat window - always visible */}
            <div
                className={`absolute bottom-5 left-5 w-[28ch] max-h-[40vh] flex flex-col bg-black/60 rounded-lg p-1.5 text-[14px] text-white pointer-events-auto backdrop-blur transition-opacity duration-300 ${
                    isChatFocused ? "opacity-100" : "opacity-60"
                }`}
            >
                <div
                    className="h-[20vh] overflow-y-auto mb-1 break-words max-w-fit"
                    ref={messagesRef}
                >
                    {chatMessages.length === 0 ? (
                        <div className="text-gray-400 italic">
                            No messages yet. Press / to chat.
                        </div>
                    ) : (
                        chatMessages.map((msg, idx) => (
                            <div key={idx} className="mb-0.5 leading-[1.2]">
                                <span
                                    className={`text-lg tracking-tighter ${
                                        msg.username === "System"
                                            ? "text-blue-300"
                                            : "text-dhani-green"
                                    }`}
                                >
                                    {msg.username}:
                                </span>
                                <span className="tracking-wider">
                                    {" "}
                                    {msg.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <input
                    ref={chatInputRef}
                    className="w-full px-1.5 py-1 border-none rounded bg-white/10 text-[14px] text-white outline-none placeholder-white/60"
                    type="text"
                    placeholder={
                        isChatFocused ? "Type a message..." : "Press / to chat"
                    }
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onFocus={handleChatFocus}
                    onBlur={handleChatBlur}
                    onKeyDown={handleChatKeyDown}
                />
            </div>
        </div>
    );
};

export default GameHUD;
