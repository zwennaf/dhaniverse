import React, { useState, useEffect, useRef } from "react";

interface GameHUDProps {
    rupees?: number;
    username?: string;
}

const GameHUD: React.FC<GameHUDProps> = ({
    rupees = 25000,
    username = "Player",
}) => {
    const [currentRupees, setCurrentRupees] = useState(rupees);
    const [chatMessages, setChatMessages] = useState<
        { id: string; username: string; message: string }[]
    >([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const chatInputRef = useRef<HTMLInputElement | null>(null);
    const messagesRef = useRef<HTMLDivElement | null>(null);

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
        const handleChat = (e: any) => {
            const { id, username, message } = e.detail;
            setChatMessages((prev) => [...prev, { id, username, message }]);
            setIsChatOpen(true);
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
            if (e.key === "/" && !isTyping) {
                e.preventDefault();
                setIsChatOpen(true);
                setIsTyping(true);
                window.dispatchEvent(new Event("typing-start"));

                setTimeout(() => {
                    if (chatInputRef.current) {
                        chatInputRef.current.focus();
                        setChatInput(""); // Clear any "/" that might appear
                    }
                }, 0);
                return;
            }

            // Close chat with Escape (only if we're typing)
            if (e.key === "Escape" && isTyping) {
                e.preventDefault();
                setIsTyping(false);
                window.dispatchEvent(new Event("typing-end"));

                if (chatInputRef.current) {
                    chatInputRef.current.blur();
                }
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isTyping]);

    // Handle chat input focus/blur
    const handleChatFocus = () => {
        setIsTyping(true);
        window.dispatchEvent(new Event("typing-start"));
    };

    const handleChatBlur = () => {
        setIsTyping(false);
        window.dispatchEvent(new Event("typing-end"));
    };

    // Handle chat input key events
    const handleChatKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            e.preventDefault();
            setIsTyping(false);
            window.dispatchEvent(new Event("typing-end"));
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

            {/* Chat window */}
            {isChatOpen && (
                <div className="absolute bottom-5 left-5 w-[28ch] max-h-[40vh] flex flex-col bg-black/60 rounded-lg p-1.5 text-[14px] text-white pointer-events-auto backdrop-blur">
                    <div
                        className="flex-1 overflow-y-auto mb-1 break-words max-w-fit"
                        ref={messagesRef}
                    >
                        {chatMessages.map((msg, idx) => (
                            <div key={idx} className="mb-0.5 leading-[1.2]">
                                <span className="text-dhani-green text-lg tracking-tighter">
                                    {msg.username}:
                                </span>
                                <span className="tracking-wider">
                                    {" "}
                                    {msg.message}
                                </span>
                            </div>
                        ))}
                    </div>

                    <input
                        ref={chatInputRef}
                        className="w-full px-1.5 py-1 border-none rounded bg-white/10 text-[14px] text-white outline-none placeholder-white/60"
                        type="text"
                        placeholder="Type a message..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onFocus={handleChatFocus}
                        onBlur={handleChatBlur}
                        onKeyDown={handleChatKeyDown}
                    />
                </div>
            )}
        </div>
    );
};

export default GameHUD;
