import React, { useState, useEffect, useRef } from 'react';

interface OnboardingWrapperProps {
  onContinueToGame: () => void;
}

// Custom hook for typing animation
const useTypingAnimation = (text: string, baseSpeed: number = 50, fastSpeed: number = 10) => {
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

interface OnboardingSlide {
  id: number;
  text: string;
  character?: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    text: "Welcome to Dhaniverse! I'm Maya, your guide in this incredible world of finance and adventure.",
    character: "M.A.Y.A"
  },
  {
    id: 2,
    text: "In Dhaniverse, you'll learn about investing, trading, and building wealth while having fun in our virtual world.",
    character: "M.A.Y.A"
  },
  {
    id: 3,
    text: "You can explore different buildings, meet other players, and participate in various financial activities.",
    character: "M.A.Y.A"
  },
  {
    id: 4,
    text: "Ready to start your journey? Click to enter the world and begin your financial adventure!",
    character: "M.A.Y.A"
  }
];

// Transition timing - reduced for smoother experience
const TRANSITION_MS = 150; // Reduced from 250ms to 150ms

const OnboardingWrapper: React.FC<OnboardingWrapperProps> = ({
  onContinueToGame,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // For initial fade
  const [typingKey, setTypingKey] = useState(0); // Force typing animation reset
  const [lastActionTime, setLastActionTime] = useState(0);
  const mountedRef = useRef(true);

  const ACTION_COOLDOWN = 150; // ms cooldown between actions

  const currentSlideData = ONBOARDING_SLIDES[currentSlide];
  const { displayedText, isComplete, speedUp, slowDown, complete } = useTypingAnimation(
    currentSlideData.text, 
    50, // base speed in ms
    5   // fast speed in ms
  );

  useEffect(() => {
    // inject float keyframes and helper classes once
    const styleEl = document.createElement('style');
    styleEl.id = 'onboarding-wrapper-styles';
    styleEl.innerHTML = `
      @keyframes floaty-move {
        0% { transform: translate(-50%, 0px); }
        50% { transform: translate(-50%, -12px); }
        100% { transform: translate(-50%, 0px); }
      }
      .onboard-float {
        animation: floaty-move 3.5s ease-in-out infinite;
        will-change: transform;
      }
      .onboard-fade-overlay {
        transition: opacity ${TRANSITION_MS}ms ease;
      }
      .typing-cursor::after {
        content: '|';
        animation: blink 1s infinite;
        color: #333;
      }
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
    document.head.appendChild(styleEl);

    // Initial fade-in effect - reduced timing
    setTimeout(() => {
      if (mountedRef.current) {
        setIsInitialLoad(false);
      }
    }, 200); // Reduced from 800ms to 200ms for quicker fade-in

    return () => {
      mountedRef.current = false;
      const existing = document.getElementById('onboarding-wrapper-styles');
      if (existing) existing.remove();
    };
  }, []);

  const changeSlideOrFinish = (nextIndex: number) => {
    if (nextIndex >= ONBOARDING_SLIDES.length) {
      onContinueToGame();
      return;
    }
    setCurrentSlide(nextIndex);
    setTypingKey(prev => prev + 1); // Trigger typing animation reset
  };

  const startTransition = () => {
    if (isTransitioning) return; // guard
    
    const now = Date.now();
    if (now - lastActionTime < ACTION_COOLDOWN) return; // spam prevention
    setLastActionTime(now);
    
    // If typing is not complete, complete it instantly
    if (!isComplete) {
      complete();
      return;
    }
    
    // Otherwise proceed with slide transition
    setIsTransitioning(true);

    // wait for overlay to fade in, then change slide/finish
    setTimeout(() => {
      if (!mountedRef.current) return;

      const next = currentSlide + 1;
      changeSlideOrFinish(next);

      // short delay so users see the transition, then fade out
      setTimeout(() => {
        if (!mountedRef.current) return;
        setIsTransitioning(false);
      }, 80);
    }, TRANSITION_MS);
  };

  // Handle keyboard events
  useEffect(() => {
    let keyHeldDown = false;
    let speedUpTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.code === 'Space') {
        // Prevent default to avoid page scrolling with space
        event.preventDefault();
        
        // Ignore if key is already being held down (spam prevention)
        if (keyHeldDown) return;
        keyHeldDown = true;

        const now = Date.now();
        if (now - lastActionTime < ACTION_COOLDOWN) return;

        if (!isComplete) {
          // Small delay before speeding up to prevent accidental speed-ups
          speedUpTimeout = setTimeout(() => {
            speedUp();
          }, 50);
        } else {
          startTransition();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.code === 'Space') {
        keyHeldDown = false;
        
        // Cancel speed-up timeout if key released quickly
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
  }, [isComplete, isTransitioning, lastActionTime]);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastActionTime < ACTION_COOLDOWN) return; // spam prevention
    setLastActionTime(now);

    if (!isComplete) {
      complete();
    } else {
      startTransition();
    }
  };

  return (
    <div className="fixed inset-0 z-50 cursor-pointer select-none">
      {/* Blurred background layer */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/game/first-tutorial/w1.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(2px)',
          zIndex: 1
        }}
      />
      
      {/* Main content layer (unblurred) */}
      <div 
        className="absolute inset-0"
        onClick={handleClick}
        style={{ zIndex: 2 }}
      >
      {/* Floating character overlay (d1) */}
      <img
        src="/game/first-tutorial/d1.png"
        alt="Maya"
        className="onboard-float"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '-150px', // anchor from bottom so character sits above dialogue box
          transform: 'translate(-50%, 0)',
          pointerEvents: 'none',
          zIndex: 10,
          maxWidth: '60%',
          width: 'auto',
          height: 'auto'
        }}
      />

      {/* Instruction text at top */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-white text-center z-20">
        <p 
          className="text-lg opacity-90 drop-shadow-lg text-black"
          style={{ fontFamily: 'VCR OSD Mono, monospace' }}
        >
          Press [Space] to Fast Forward
        </p>
      </div>

      {/* Dialogue box at bottom */}
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
                {currentSlideData.character}
              </span>
            </div>
          </div>

          {/* Dialogue text area */}
          <div className="absolute top-12 left-8 right-8 bottom-8 flex items-start">
            <div 
              className="w-full pt-4 px-4 rounded-lg"
              style={{
                backdropFilter: 'blur(2px)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }}
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
          <div className="absolute bottom-4 right-8">
            <div className="flex items-center space-x-2">
              {/* Slide dots */}
              <div className="flex space-x-1">
                {ONBOARDING_SLIDES.map((_, index) => (
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
                {currentSlide + 1} / {ONBOARDING_SLIDES.length}
              </span>
            </div>
          </div>

          {/* Click to continue hint */}
          <div className="absolute bottom-4 left-8">
            <p 
              className="text-black text-xs opacity-70 animate-pulse"
              style={{ fontFamily: 'VCR OSD Mono, monospace' }}
            >
              {currentSlide === ONBOARDING_SLIDES.length - 1 ? 'Click to start game' : 'Click to continue'}
            </p>
          </div>
        </div>
      </div>

      {/* Black transition overlay */}
      <div
        className={`absolute inset-0 bg-black onboard-fade-overlay`}
        style={{
          zIndex: 40,
          opacity: isTransitioning ? 1 : 0,
          pointerEvents: isTransitioning ? 'auto' : 'none'
        }}
      />

      {/* Initial fade overlay */}
      <div
        className={`absolute inset-0 bg-black onboard-fade-overlay`}
        style={{
          zIndex: 50,
          opacity: isInitialLoad ? 1 : 0,
          pointerEvents: isInitialLoad ? 'auto' : 'none'
        }}
      />
      </div>
    </div>
  );
};

export default OnboardingWrapper;
