import React, { useState, useEffect, useRef } from 'react';
import './GameHUD.css';

// Define props interface for type safety
interface GameHUDProps {
  rupees?: number;
}

const GameHUD: React.FC<GameHUDProps> = ({ rupees = 25000 }) => {
  // State can be added here for dynamic HUD elements
  const [currentRupees, setCurrentRupees] = useState(rupees);
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
    <div className="game-hud">
      {/* Top right corner for rupee count */}
      <div className="rupee-counter">
        <span className="rupee-symbol">₹</span>
        <span className="rupee-value">{currentRupees}</span>
      </div>
      
      {/* Chat container, shown only when active */}
      {chatActive && (
        <div
          className={`chat-container clickable backdrop-blur-sm transition-opacity duration-300 ${chatDimmed ? 'opacity-50' : 'opacity-100'}`}
          onClick={(e) => { e.stopPropagation(); setChatDimmed(false); }}
        >
          <div className="chat-messages break-words overflow-hidden" ref={messagesRef}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="chat-message">
                <div className="inline-block font-bold text-dhani-green italic font-tickerbit text-xl">{msg.username}:</div>
                <span className='font-thin'> {msg.message} </span>
              </div>
            ))}
          </div>
          <input
            id="hud-chat-input"
            ref={chatInputRef}
            autoFocus
            className="chat-input"
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onFocus={() => {
              window.dispatchEvent(new Event('typing-start'));
              isTypingRef.current = true;
              // Reset dimming when focusing input
              setChatDimmed(false);
              
              // Clear any existing timeout when focused
              if (fadeTimeoutRef.current !== null) {
                clearTimeout(fadeTimeoutRef.current);
                fadeTimeoutRef.current = null;
              }
            }}
            onBlur={() => {
              isTypingRef.current = false;
              // Do not auto-close; chat remains dimmed
            }}
            onKeyDown={e => {
              // Stop propagation to prevent game from receiving key events
              e.stopPropagation();
              if (e.key === 'Escape') {
                // Dim chat on ESC, do not close
                setChatDimmed(true);
                chatInputRef.current?.blur();
                isTypingRef.current = false;
                window.dispatchEvent(new Event('typing-end'));
                if (fadeTimeoutRef.current !== null) {
                  clearTimeout(fadeTimeoutRef.current);
                  fadeTimeoutRef.current = null;
                }
              }
              
              // Handle special keys
              if (e.key === 'Enter') {
                e.preventDefault();
                if (chatInput.trim()) {
                  window.dispatchEvent(new CustomEvent('send-chat', { 
                    detail: { message: chatInput.trim() } 
                  }));
                  setChatInput('');
                  
                  // Focus the input again to keep typing
                  setTimeout(() => {
                    chatInputRef.current?.focus();
                  }, 10);
                }
              }
            }}
          />
        </div>
      )}
      
      {/* You can add more HUD elements here */}
    </div>
  );
};

export default GameHUD;