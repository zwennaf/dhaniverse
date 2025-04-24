import React, { useState, useEffect, useRef } from 'react';
// Removing CSS import as we're using Tailwind classes directly

// Define props interface for type safety
interface GameHUDProps {
  rupees?: number;
  username?: string; 
}

const GameHUD: React.FC<GameHUDProps> = ({ rupees = 25000, username = 'Player' }) => {
  // State can be added here for dynamic HUD elements
  const [currentRupees, setCurrentRupees] = useState(rupees);
  const [currentUsername, setCurrentUsername] = useState(username); // Store current player's username
  // Chat feature state
  const [chatMessages, setChatMessages] = useState<{ id: string; username: string; message: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatActive, setChatActive] = useState(false);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  // Add a ref to track if user is actively typing
  const isTypingRef = useRef<boolean>(false);
  // Track whether chat window is dimmed
  const [chatDimmed, setChatDimmed] = useState(false);
  // Add a ref to track if we're currently sending a message
  const sendingMessageRef = useRef<boolean>(false);

  // Listen for events from the game engine (Phaser)
  useEffect(() => {
    // Update rupees when props change
    setCurrentRupees(rupees);

    // Example of how to listen for custom events from Phaser
    const handleRupeeUpdate = (e: CustomEvent) => {
      setCurrentRupees(e.detail.rupees);
    };

    // Add event listener
    window.addEventListener('rupee-update' as any, handleRupeeUpdate);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('rupee-update' as any, handleRupeeUpdate);
    };
  }, [rupees]);

  // Listen for incoming chat messages
  useEffect(() => {
    const handleChat = (e: any) => {
      const { id, username, message } = e.detail;
      setChatMessages(prev => [...prev, { id, username, message }]);
      setChatActive(true);
      setChatDimmed(true);  // open chat in dimmed mode when a message arrives
      // No auto-close timeout, chat stays open until Escape
    };
    window.addEventListener('chat-message' as any, handleChat);
    return () => window.removeEventListener('chat-message' as any, handleChat);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Focus chat input when '/' is pressed
  useEffect(() => {
    const handleSlash = (e: KeyboardEvent) => {
      if (e.key === '/') {
        e.preventDefault();
        e.stopPropagation();
        // If chat is open but dimmed, undim and refocus
        if (chatActive && chatDimmed) {
          setChatDimmed(false);
          window.dispatchEvent(new Event('typing-start'));
          setTimeout(() => chatInputRef.current?.focus(), 10);
          return;
        }
        // If chat not active, open and focus
        if (!chatActive) {
          setChatDimmed(false);
          setChatActive(true);
          window.dispatchEvent(new Event('typing-start'));
          setTimeout(() => chatInputRef.current?.focus(), 10);
          if (fadeTimeoutRef.current !== null) clearTimeout(fadeTimeoutRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleSlash);
    return () => window.removeEventListener('keydown', handleSlash);
  }, [chatActive, chatDimmed]);

  // Close chat on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatActive) {
        // Stop propagation to prevent other handlers from processing this
        e.stopPropagation();
        // Dim chat window instead of closing
        setChatDimmed(true);
        chatInputRef.current?.blur();
        isTypingRef.current = false;
        window.dispatchEvent(new Event('typing-end'));
        
        // Clear any existing timeout
        if (fadeTimeoutRef.current !== null) {
          clearTimeout(fadeTimeoutRef.current);
          fadeTimeoutRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [chatActive]);

  // Ensure input focus on activation and track typing state
  useEffect(() => {
    if (chatActive) {
      // Use a small timeout to ensure the input is in the DOM
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 10);
    } else {
      isTypingRef.current = false;
    }
  }, [chatActive]);

  // Block Phaser from receiving keyboard events when chat is active and not dimmed
  useEffect(() => {
    const preventGameKeysWhenChatting = (e: KeyboardEvent) => {
      // Only block when chat is visible and not dimmed
      if (chatActive && !chatDimmed) {
        // Allow all keys when input is focused
        if (document.activeElement === chatInputRef.current) {
          return;
        }
        // Block movement keys
        if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    };
    // capture listener to run before Phaser
    window.addEventListener('keydown', preventGameKeysWhenChatting, true);
    window.addEventListener('keyup', preventGameKeysWhenChatting, true);
    return () => {
      window.removeEventListener('keydown', preventGameKeysWhenChatting, true);
      window.removeEventListener('keyup', preventGameKeysWhenChatting, true);
    };
  }, [chatActive, chatDimmed]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1000] font-['Pixeloid',Arial,sans-serif]">
      {/* Top right corner for rupee count */}
      <div className="absolute top-5 right-5 p-2 px-3 rounded-lg flex items-center text-[#FFD700] text-shadow-lg text-2xl font-bold">
        <span className="mr-1.5 text-3xl">₹</span>
        <span>{currentRupees}</span>
      </div>
      
      {/* Chat container with styling matching original CSS exactly */}
      <div
        className={`absolute bottom-5 left-5 w-[28ch] max-h-[40vh] flex flex-col bg-black/60 rounded-lg p-1.5 text-[14px] text-white pointer-events-auto backdrop-blur transition-all duration-300 ease-in-out ${
          chatActive
            ? (chatDimmed ? 'opacity-50 scale-x-100' : 'opacity-100 scale-x-100')
            : 'opacity-0 scale-x-0 pointer-events-none'
        }`}
        onClick={e => { e.stopPropagation(); setChatDimmed(false); }}
      >
        <div className="flex-1 overflow-y-auto mb-1 break-words max-w-fit" ref={messagesRef}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className="mb-0.5 leading-[1.2]">
              <div className="text-dhani-green text-lg tracking-tighter inline-block">{msg.username}:</div>
              <span className="tracking-wider"> {msg.message} </span>
            </div>
          ))}
        </div>
        <input
          id="hud-chat-input"
          ref={chatInputRef}
          autoFocus={false}
          className="w-full px-1.5 py-1 border-none rounded bg-white/10 text-[14px] text-white outline-none placeholder-white/60"
          type="text"
          placeholder="Type a message..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onFocus={() => {
            window.dispatchEvent(new Event('typing-start'));
            isTypingRef.current = true;
            setChatDimmed(false);
            if (fadeTimeoutRef.current !== null) {
              clearTimeout(fadeTimeoutRef.current);
              fadeTimeoutRef.current = null;
            }
          }}
          onBlur={() => {
            isTypingRef.current = false;
            setChatDimmed(true);
            // Only dim on blur if we're not sending a message
            if (!sendingMessageRef.current) {
              // Don't dim when blur is caused by sending a message
            }
            // Reset the sending message flag
            sendingMessageRef.current = false;
          }}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              setChatDimmed(true);
              chatInputRef.current?.blur();
              isTypingRef.current = false;
              window.dispatchEvent(new Event('typing-end'));
              if (fadeTimeoutRef.current !== null) {
                clearTimeout(fadeTimeoutRef.current);
                fadeTimeoutRef.current = null;
              }
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (chatInput.trim()) {
                try {
                  // First ensure we're not dimmed
                  setChatDimmed(false);
                  
                  // Set the sending message flag to prevent future dimming
                  sendingMessageRef.current = true;
                  
                  // Send the message
                  window.dispatchEvent(new CustomEvent('send-chat', { 
                    detail: { message: chatInput.trim() } 
                  }));
                  
                  // Clear input and ensure opacity stays at 100%
                  setChatInput('');
                  
                  // Keep focus and prevent dimming in a more reliable way
                  requestAnimationFrame(() => {
                    setChatDimmed(false);
                    chatInputRef.current?.focus();
                    
                    // Set a backup timeout to ensure dimming stays off
                    setTimeout(() => {
                      setChatDimmed(false);
                      sendingMessageRef.current = false;
                    }, 100);
                  });
                } catch (err) {
                  console.error("Error in Enter key handler:", err);
                }
              }
            }
          }}
        />
      </div>
      {/* End chat container */}
    </div>
  );
};

export default GameHUD;