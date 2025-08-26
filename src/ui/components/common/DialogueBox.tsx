import React, { useState, useEffect, useRef } from 'react';

// Backdrop fade-in animation (scoped once)
const backdropStyleId = 'dialogue-backdrop-fade-style';
if (typeof document !== 'undefined' && !document.getElementById(backdropStyleId)) {
  const styleEl = document.createElement('style');
  styleEl.id = backdropStyleId;
  styleEl.textContent = `@keyframes dialogueBackdropFadeIn {0% {opacity: 0; transform: scale(1.02);} 100% {opacity: 1; transform: scale(1);}} @keyframes dialogueBackdropFadeOut {0% {opacity:1; transform: scale(1);} 100% {opacity:0; transform: scale(1.02);} } .backdrop-fade-in {animation: dialogueBackdropFadeIn 220ms ease-out forwards;} .backdrop-fade-out {animation: dialogueBackdropFadeOut 180ms ease-in forwards;}`;
  document.head.appendChild(styleEl);
}

interface DialogueOption {
  id: string;
  text: string;
  action?: () => void;
}

interface DialogueBoxProps {
  text: string;
  characterName?: string;
  isVisible: boolean;
  title?: string; // optional heading shown above the text
  onComplete?: () => void;
  onAdvance?: () => void;
  // Positioning override: 'bottom' (default) or 'top-center'
  position?: 'bottom' | 'top-center';
  // Small alert variant for brief center-top alerts
  small?: boolean;
  // Got it button removed per latest requirements
  showProgressIndicator?: boolean;
  currentSlide?: number;
  totalSlides?: number;
  showContinueHint?: boolean;
  baseTypingSpeed?: number;
  fastTypingSpeed?: number;
  allowSpaceAdvance?: boolean; // New prop to control space advancement
  compact?: boolean; // when true, use the older/smaller layout used for task dialogs
  showBackdrop?: boolean; // Add backdrop for important dialogues like onboarding
  // New props for input and options
  requiresTextInput?: boolean;
  textInputPlaceholder?: string;
  onTextInput?: (text: string) => void;
  options?: DialogueOption[];
  onOptionSelect?: (optionId: string) => void;
  showOptions?: boolean;
  keyboardInputEnabled?: boolean; // Control whether typing input is captured
}

// Custom hook for typing animation
const useTypingAnimation = (
  text: string, 
  baseSpeed: number = 50, 
  fastSpeed: number = 10,
  allowSpaceAdvance: boolean = true
) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio once
  useEffect(() => {
    audioRef.current = new Audio('/sounds/blip.mp3');
    audioRef.current.volume = 0.2;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playBlip = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(console.error);
    }
  };

  const startTyping = (speed: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, speed);
  };

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    setIsFast(false);
    indexRef.current = 0;
    startTyping(baseSpeed);

    // Play audio for first slide and subsequent slides
    playBlip();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text]);

  useEffect(() => {
    if (!isComplete) {
      const newSpeed = isFast ? fastSpeed : baseSpeed;
      startTyping(newSpeed);
    }
  }, [isFast, isComplete, fastSpeed, baseSpeed]);

  const speedUp = () => setIsFast(true);
  const slowDown = () => setIsFast(false);
  const complete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText(text);
    setIsComplete(true);
  };

  return { displayedText, isComplete, speedUp, slowDown, complete };
};

const DialogueBox: React.FC<DialogueBoxProps> = ({
  text,
  characterName,
  isVisible,
  onComplete,
  onAdvance,
  title,
  showProgressIndicator = false,
  currentSlide = 0,
  totalSlides = 1,
  showContinueHint = true,
  baseTypingSpeed = 50,
  fastTypingSpeed = 10,
  allowSpaceAdvance = true,
  position = 'bottom',
  small = false,
  compact = false,
  showBackdrop = true,
  // New props
  requiresTextInput = false,
  textInputPlaceholder = "Type your response...",
  onTextInput,
  options = [],
  onOptionSelect,
  showOptions = false,
  keyboardInputEnabled = true
}) => {
  const [lastActionTime, setLastActionTime] = useState(0);
  // Mount control for exit animation
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;
    if (isVisible) {
      setShouldRender(true);
      setExiting(false);
    } else if (shouldRender) {
      // trigger exit animation
      setExiting(true);
      timeout = setTimeout(() => {
        setShouldRender(false);
        setExiting(false);
      }, 190); // a bit longer than fade-out to ensure completion
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [isVisible, shouldRender]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [textInputValue, setTextInputValue] = useState('');
  const [isTextInputFocused, setIsTextInputFocused] = useState(false);
  const mountedRef = useRef(true);
  const textInputRef = useRef<HTMLInputElement>(null);
  const ACTION_COOLDOWN = 150;

  const { displayedText, isComplete, speedUp, slowDown, complete } = useTypingAnimation(
    text,
    baseTypingSpeed,
    fastTypingSpeed,
    allowSpaceAdvance
  );

  // Prevent repeated "Got it" clicks from re-triggering dialogs
  // removed gotItClicked state

  // Reset the gotItClicked guard whenever the dialog content or visibility changes
  // removed gotItClicked reset

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Auto-focus text input when it becomes visible
  useEffect(() => {
    if (requiresTextInput && isVisible && isComplete && textInputRef.current) {
      setTimeout(() => {
        textInputRef.current?.focus();
        setIsTextInputFocused(true);
      }, 100);
    }
  }, [requiresTextInput, isVisible, isComplete]);

  // Reset selected option index when options change
  useEffect(() => {
    setSelectedOptionIndex(0);
  }, [options]);

  // Handle keyboard events
  useEffect(() => {
    if (!isVisible) return;

    let keyHeldDown = false;
    let speedUpTimeout: NodeJS.Timeout | null = null;

  const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if input is focused (for text input)
      if (isTextInputFocused && requiresTextInput) {
        // Allow normal typing in text input, but handle special keys
        if (event.key === 'Escape') {
          event.preventDefault();
          setIsTextInputFocused(false);
          textInputRef.current?.blur();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (textInputValue.trim()) {
            onTextInput?.(textInputValue.trim());
            setTextInputValue('');
            setIsTextInputFocused(false);
            textInputRef.current?.blur();
          }
        }
        return;
      }

      // Handle option selection
      if (showOptions && options.length > 0 && isComplete) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedOptionIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
          return;
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedOptionIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
          return;
        } else if (event.key === 'Enter') {
          event.preventDefault();
          const selectedOption = options[selectedOptionIndex];
          if (selectedOption) {
            onOptionSelect?.(selectedOption.id);
            selectedOption.action?.();
          }
          return;
        }
      }

      // Speed / advance handling (Space / Enter)
      if (event.key === 'Enter' || (allowSpaceAdvance && (event.key === ' ' || event.code === 'Space'))) {
        event.preventDefault();
        const now = Date.now();

        // If text not complete -> entering speed mode
        if (!isComplete) {
          if (!keyHeldDown) {
            keyHeldDown = true;
            speedUp();
          }
          return; // never advance while still typing
        }

        // Text is complete at this point
        // Block advancement while key is held (require key release + fresh press)
        if (keyHeldDown) return;

        // Mark key as held now
        keyHeldDown = true;

        // Don't advance if options or input are showing
        if (showOptions || requiresTextInput) return;

        if (now - lastActionTime >= ACTION_COOLDOWN) {
          setLastActionTime(now);
          onAdvance?.();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
        keyHeldDown = false;
        
        if (speedUpTimeout) { clearTimeout(speedUpTimeout); speedUpTimeout = null; }
        slowDown();
      }
    };

    // Only listen to keyboard events if keyboard input is enabled
    if (keyboardInputEnabled) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    
    return () => {
      if (keyboardInputEnabled) {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      }
      if (speedUpTimeout) clearTimeout(speedUpTimeout);
    };
  }, [isComplete, isVisible, lastActionTime, allowSpaceAdvance, onAdvance, 
      showOptions, options, selectedOptionIndex, onOptionSelect, 
      requiresTextInput, isTextInputFocused, textInputValue, onTextInput, keyboardInputEnabled,
      speedUp, slowDown, complete]);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastActionTime < ACTION_COOLDOWN) return;
    setLastActionTime(now);

    // Don't allow click to advance if showing options or text input
    if (showOptions || requiresTextInput) return;

    if (!isComplete) {
      complete();
    } else {
      onAdvance?.();
    }
  };

  const handleChatFocus = () => {
    setIsTextInputFocused(true);
    // Send typing-start event to disable game controls
    window.dispatchEvent(new Event("typing-start"));
  };

  const handleChatBlur = () => {
    setIsTextInputFocused(false);
    // Send typing-end event to re-enable game controls
    window.dispatchEvent(new Event("typing-end"));
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent) => {
    // Allow normal typing - stop propagation to prevent game handling
    const gameControlKeys = ["w", "a", "s", "d", "e", "W", "A", "S", "D", "E", " "];
    if (gameControlKeys.includes(e.key)) {
      e.stopPropagation();
      return;
    }

    // Handle special keys
    if (e.key === "Escape") {
      e.preventDefault();
      setIsTextInputFocused(false);
      textInputRef.current?.blur();
    }
  };

  useEffect(() => {
    if (isComplete) {
      onComplete?.();
    }
  }, [isComplete, onComplete]);

  if (!shouldRender) return null;

  // container positioning
  // Ensure the dialogue sits above other HUD elements (trackers, overlays).
  // Use a high z-index so dialog is always visible when mounted.
  const containerClass = position === 'top-center'
    ? 'absolute top-4 left-1/2 transform -translate-x-1/2 flex justify-center p-4 z-[1200]'
    : 'absolute bottom-0 left-0 right-0 flex justify-center p-4 z-[1200]';

  // size tweak for small alerts; make default dialog wider and taller to avoid overflow
  // compact restores the previous sizing used for task dialogs
  const maxWidthClass = small
    ? (compact ? 'max-w-md' : 'max-w-lg')
    : (compact ? 'max-w-3xl' : 'max-w-4xl');

  return (
    <>
      {/* Backdrop is now always shown */}
      <div 
        className={`fixed inset-0 z-[1100] ${exiting ? 'backdrop-fade-out' : 'backdrop-fade-in'}`}
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, transparent 66%, rgba(0, 0, 0, 0.5) 100%)'
        }}
      />

      <div className={`fixed inset-0 flex items-end justify-center pb-8 z-[1200] pointer-events-auto`}>
        <div className={`relative w-full ${maxWidthClass} ${showBackdrop ? 'px-4' : ''}`}>
        {/* SVG Dialogue Box */}
        <img
          src="/UI/game/dialogue-box.svg"
          alt="Dialogue Box"
          className="w-full h-auto"
          style={{
            // larger minimum to accommodate longer text without overflow.
            // compact uses older, smaller values to match previous look for Task1
            minHeight: small ? (compact ? '80px' : '96px') : (compact ? '180px' : '220px'),
            // allow larger max height for long messages
            maxHeight: small ? (compact ? '140px' : '180px') : (compact ? '300px' : '420px')
          }}
        />
        
        {/* Press [SPACE] to continue - always shown now */}
        <div className="flex justify-center mt-4">
          <p 
            className="text-white text-sm opacity-80 animate-pulse"
            style={{ 
              fontFamily: 'Tickerbit-regular, VCR OSD Mono, monospace',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            Press [SPACE] to continue
          </p>
        </div>
        
        {/* Title (for tasks) */}
        {title && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div 
              className="relative inline-block"
            >
              <span 
                className="absolute inset-0 flex items-center justify-center text-[#2B2621] text-sm font-bold"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                }}
              >
                {title}
              </span>
            </div>
          </div>
        )}

        {/* Character name tag with background (legacy placement) */}
        {characterName && !title && (
          <div className="absolute top-0 left-28">
            <div 
              className="relative inline-block"              
            >
              <span 
                className="absolute inset-0 flex items-center justify-center text-[#2B2621] text-base font-robert whitespace-nowrap"
                style={{ 
                  fontFamily: 'Tickerbit-regular, VCR OSD Mono, monospace',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                }}
              >
                {characterName}
              </span>
            </div>
          </div>
        )}

        {/* Dialogue text area */}
        <div className="absolute top-12 left-10 right-6 bottom-6 flex flex-col">
          <div 
            className="flex-1 px-4 py-4 rounded-lg cursor-pointer overflow-auto bg-transparent"
            style={{}}
            onClick={handleClick}
          >
            <div 
              style={{ 
                maxHeight: small ? (compact ? '100px' : '120px') : (compact ? '240px' : '300px'), 
                overflowY: 'auto',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // Internet Explorer 10+
              }}
              className="[&::-webkit-scrollbar]:hidden"
            >
              <p 
                className={`text-[#2B2621] text-lg leading-relaxed font-medium ${!isComplete ? 'typing-cursor' : ''}`}
                style={{ 
                  fontFamily: 'Tickerbit-regular, VCR OSD Mono, monospace',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
                dangerouslySetInnerHTML={{
                  __html: displayedText.replace(
                    /₹(\d+)/g,
                    '<span style="color: #22c55e; font-weight: bold;">₹$1</span>'
                  )
                }}
              />
            </div>
          </div>

          {/* Text Input Area */}
          {requiresTextInput && isComplete && (
            <div className="mt-4 px-4">
              <div className="text-xs text-[#2B2621]/70 text-center" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
                Please enter your response above
              </div>
            </div>
          )}

          {/* Options Area */}
          {showOptions && options.length > 0 && isComplete && (
            <div className="mt-4 px-4 space-y-2">
              {options.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onOptionSelect?.(option.id);
                    option.action?.();
                  }}
                  className={`w-full px-3 py-2 text-left rounded transition-colors ${
                    index === selectedOptionIndex
                      ? 'bg-black/20 border-2 border-black/60'
                      : 'bg-white/10 border border-black/30 hover:bg-white/20'
                  }`}
                  style={{ fontFamily: 'VCR OSD Mono, monospace' }}
                >
                  <span className="text-[#2B2621] font-medium">
                    {index === selectedOptionIndex ? '→ ' : '  '}
                    {option.text}
                  </span>
                </button>
              ))}
              <div className="text-xs text-[#2B2621]/70 mt-2" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
                Use ↑↓ arrows to select, Enter to choose
              </div>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        {showProgressIndicator && (
          <div className="absolute bottom-16 right-16">
            <div className="flex items-center space-x-2">
              {/* Slide dots */}
              <div className="flex space-x-1">
                {Array.from({ length: totalSlides }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentSlide ? 'bg-black' : 'bg-gray-500'
                    }`}
                  />
                ))}
              </div>
              
              {/* Text indicator */}
              <span 
                className="text-[#2B2621] text-xs ml-2"
                style={{ fontFamily: 'VCR OSD Mono, monospace' }}
              >
                {currentSlide + 1} / {totalSlides}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Text Input Popup - Center of screen */}
      {requiresTextInput && isComplete && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          
          {/* Input modal */}
          <div className="relative bg-gradient-to-br from-gray-900 to-black border border-dhani-gold/30 rounded-2xl shadow-2xl shadow-dhani-gold/20 p-8 max-w-md w-full mx-4 transform scale-100 animate-scale-in">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-dhani-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-dhani-gold">
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="14,2 14,8 20,8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="16"
                    y1="13"
                    x2="8"
                    y2="13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="16"
                    y1="17"
                    x2="8"
                    y2="17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Information Required</h2>
              <p className="text-gray-300 text-sm">
                {textInputPlaceholder || "Please provide the requested information"}
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="dialogueInput" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Response *
                </label>
                <div className="relative">
                  <input
                    id="dialogueInput"
                    ref={textInputRef}
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onFocus={handleChatFocus}
                    onBlur={handleChatBlur}
                    onKeyDown={handleTextInputKeyDown}
                    placeholder="Type your response here..."
                    className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-dhani-gold focus:ring-1 focus:ring-dhani-gold transition-colors"
                    autoFocus
                    maxLength={100}
                  />
                  
                  {/* Send button inside input */}
                  <button
                    onClick={() => {
                      if (textInputValue.trim()) {
                        onTextInput?.(textInputValue.trim());
                        setTextInputValue('');
                        setIsTextInputFocused(false);
                        textInputRef.current?.blur();
                      }
                    }}
                    disabled={!textInputValue.trim()}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      textInputValue.trim()
                        ? 'bg-dhani-gold hover:bg-dhani-gold/90 text-[#2B2621] hover:shadow-lg hover:shadow-dhani-gold/30'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label="Submit"
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
                
                {textInputValue.trim() && textInputValue.trim().length < 2 && (
                  <p className="text-red-400 text-xs mt-2">
                    Response must be at least 2 characters
                  </p>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    if (textInputValue.trim()) {
                      onTextInput?.(textInputValue.trim());
                      setTextInputValue('');
                      setIsTextInputFocused(false);
                      textInputRef.current?.blur();
                    }
                  }}
                  disabled={!textInputValue.trim() || textInputValue.trim().length < 2}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                    textInputValue.trim() && textInputValue.trim().length >= 2
                      ? 'bg-dhani-gold hover:bg-dhani-gold/90 text-[#2B2621] hover:shadow-lg hover:shadow-dhani-gold/30'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Response
                </button>
              </div>
            </div>

            {/* Security note */}
            <div className="mt-6 p-3 bg-dhani-gold/10 border border-dhani-gold/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-dhani-gold mt-0.5 flex-shrink-0">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-xs text-dhani-gold font-medium">Secure Input</p>
                  <p className="text-xs text-gray-300 mt-1">Press Enter or click Submit to continue</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default DialogueBox;
