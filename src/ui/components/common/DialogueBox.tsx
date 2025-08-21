import React, { useState, useEffect, useRef } from 'react';

interface DialogueBoxProps {
  text: string;
  characterName?: string;
  isVisible: boolean;
  onComplete?: () => void;
  onAdvance?: () => void;
  showProgressIndicator?: boolean;
  currentSlide?: number;
  totalSlides?: number;
  showContinueHint?: boolean;
  baseTypingSpeed?: number;
  fastTypingSpeed?: number;
  allowSpaceAdvance?: boolean; // New prop to control space advancement
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
  showProgressIndicator = false,
  currentSlide = 0,
  totalSlides = 1,
  showContinueHint = true,
  baseTypingSpeed = 50,
  fastTypingSpeed = 10,
  allowSpaceAdvance = true
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
          // If text is not complete, start speeding up (only on first press)
          if (!keyHeldDown) {
            keyHeldDown = true;
            speedUpTimeout = setTimeout(() => {
              speedUp();
            }, 50);
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
        
        if (speedUpTimeout) {
          clearTimeout(speedUpTimeout);
          speedUpTimeout = null;
        }
        
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

  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-center p-4 z-20">
      <div className="relative w-full max-w-5xl">
        {/* SVG Dialogue Box */}
        <img
          src="/UI/game/dialogue-box.svg"
          alt="Dialogue Box"
          className="w-full h-auto"
          style={{
            minHeight: '180px',
            maxHeight: '300px'
          }}
        />
        
        {/* Character name tag with background */}
        {characterName && (
          <div className="absolute -top-10 left-8">
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
        <div className="absolute top-12 left-8 right-8 bottom-8 flex items-start">
          <div 
            className="w-full pt-4 px-4 rounded-lg cursor-pointer"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}
            onClick={handleClick}
          >
            <p 
              className={`text-black text-lg leading-relaxed font-medium ${!isComplete ? 'typing-cursor' : ''}`}
              style={{ 
                fontFamily: 'VCR OSD Mono, monospace',
                textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                lineHeight: '1.6'
              }}
            >
              {displayedText}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        {showProgressIndicator && (
          <div className="absolute bottom-4 right-8">
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
          <div className="absolute bottom-4 left-8">
            <p 
              className="text-black text-xs opacity-70 animate-pulse"
              style={{ fontFamily: 'VCR OSD Mono, monospace' }}
            >
              Click to continue
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogueBox;
