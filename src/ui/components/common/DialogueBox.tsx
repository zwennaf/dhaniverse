
import React, { useState, useEffect, useRef } from 'react';

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
      startTyping(isFast ? fastSpeed : baseSpeed);
    }
  }, [isFast, isComplete]);

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
  allowSpaceAdvance = true
  ,
  position = 'bottom',
  small = false,
  compact = false,
  // removed props
}) => {
  const [lastActionTime, setLastActionTime] = useState(0);
  const mountedRef = useRef(true);
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

  // Handle keyboard events
  useEffect(() => {
    if (!isVisible) return;

    let keyHeldDown = false;
    let speedUpTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        
        const now = Date.now();
        if (now - lastActionTime < ACTION_COOLDOWN) return;

        if (!isComplete) {
          if (!keyHeldDown) {
            keyHeldDown = true;
            speedUp(); // speed up instantly on first press
          }
        } else {
          // If text is complete, only advance on a fresh key press
          if (!keyHeldDown) {
            keyHeldDown = true;
            setLastActionTime(now);
            onAdvance?.();
          }
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.code === 'Space') {
        keyHeldDown = false;
        
  if (speedUpTimeout) { clearTimeout(speedUpTimeout); speedUpTimeout = null; }
        slowDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (speedUpTimeout) clearTimeout(speedUpTimeout);
    };
  }, [isComplete, isVisible, lastActionTime, allowSpaceAdvance, onAdvance]);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastActionTime < ACTION_COOLDOWN) return;
    setLastActionTime(now);

  // Got it button removed; normal click behavior

    if (!isComplete) {
      complete();
    } else {
      onAdvance?.();
    }
  };

  useEffect(() => {
    if (isComplete) {
      onComplete?.();
    }
  }, [isComplete, onComplete]);

  if (!isVisible) return null;

  // container positioning
  const containerClass = position === 'top-center'
    ? 'absolute top-4 left-1/2 transform -translate-x-1/2 flex justify-center p-4 z-50'
    : 'absolute bottom-0 left-0 right-0 flex justify-center p-4 z-20';

  // size tweak for small alerts; make default dialog wider and taller to avoid overflow
  // compact restores the previous sizing used for task dialogs
  const maxWidthClass = small
    ? (compact ? 'max-w-md' : 'max-w-lg')
    : (compact ? 'max-w-5xl' : 'max-w-6xl');

  return (
    <div className={`${containerClass} pointer-events-auto`}>
      <div className={`relative w-full ${maxWidthClass}`}>
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
        
        {/* Title (for tasks) */}
        {title && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div 
              className="relative inline-block"
              style={{
                backgroundImage: 'url(/UI/game/name-rectangle.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minWidth: '140px',
                height: '36px'
              }}
            >
              <span 
                className="absolute inset-0 flex items-center justify-center text-black text-sm font-bold"
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
          <div className="absolute -top-6 left-8">
            <div 
              className="relative inline-block"
              style={{
                backgroundImage: 'url(/UI/game/name-rectangle.png)',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minWidth: '120px',
                height: '32px'
              }}
            >
              <span 
                className="absolute inset-0 flex items-center justify-center text-black text-sm font-bold"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                }}
              >
                {characterName}
              </span>
            </div>
          </div>
        )}

        {/* Dialogue text area */}
        <div className="absolute top-4 left-4 right-4 bottom-4 flex items-start">
          <div 
            className="w-full px-4 py-4 rounded-lg cursor-pointer overflow-auto bg-transparent"
            style={{}}
            onClick={handleClick}
          >
            <div style={{ maxHeight: small ? (compact ? '100px' : '120px') : (compact ? '260px' : '320px'), overflowY: 'auto' }}>
              <p 
                className={`text-black text-lg leading-relaxed font-medium ${!isComplete ? 'typing-cursor' : ''}`}
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                  textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {displayedText}
              </p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        {showProgressIndicator && (
          <div className="absolute bottom-8 right-12">
            <div className="flex items-center space-x-2">
              {/* Slide dots */}
              <div className="flex space-x-1">
                {Array.from({ length: totalSlides }, (_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentSlide ? 'bg-black' : 'bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              
              {/* Text indicator */}
              <span 
                className="text-black text-xs ml-2"
                style={{ fontFamily: 'VCR OSD Mono, monospace' }}
              >
                {currentSlide + 1} / {totalSlides}
              </span>
            </div>
          </div>
        )}

        {/* Click to continue hint */}
        {showContinueHint && (
          <div className="absolute bottom-8 left-8">
            <p 
              className="text-black text-xs opacity-70 animate-pulse"
              style={{ fontFamily: 'VCR OSD Mono, monospace' }}
            >
              Click to continue
            </p>
          </div>
        )}

  {/* Got it button removed */}
      </div>
    </div>
  );
};

export default DialogueBox;
