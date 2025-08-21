import React, { useState, useEffect, useRef } from 'react';
import DialogueBox from '../common/DialogueBox';

interface OnboardingWrapperProps {
  onContinueToGame: () => void;
}

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
    text: "Let me teach you how to move around! Use W, A, S, D keys to move your character. Hold SHIFT to boost your speed and move faster.",
    character: "M.A.Y.A"
  },
  {
    id: 3,
    text: "Meet the Central Bank of Dhaniverse! Here you can deposit your money safely, earn interest through fixed deposits, and manage your financial portfolio. Your money grows while you play!",
    character: "M.A.Y.A"
  },
  {
    id: 4,
    text: "ATMs can be found at most places in Dhaniverse world - there are 8 ATMs currently on this map! Withdraw money instantly, check balances, transfer funds between accounts, and access your financial portfolio from any location.",
    character: "M.A.Y.A"
  },
  {
    id: 5,
    text: "Welcome to the Stock Market! Trade shares, analyze market trends, and build your investment portfolio. Watch your investments grow as you make smart trading decisions in real-time!",
    character: "M.A.Y.A"
  },
  {
    id: 6,
    text: "Thank you so much! Now meet me at my house to continue your journey in Dhaniverse.",
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const mountedRef = useRef(true);

  const currentSlideData = ONBOARDING_SLIDES[currentSlide];

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
    }, 200);

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
  };

  const handleAdvance = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);

    setTimeout(() => {
      if (!mountedRef.current) return;

      const next = currentSlide + 1;
      changeSlideOrFinish(next);

      setTimeout(() => {
        if (!mountedRef.current) return;
        setIsTransitioning(false);
      }, 80);
    }, TRANSITION_MS);
  };

  return (
    <div className="fixed inset-0 z-50 cursor-pointer select-none">
      {/* Blurred background layer */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url('${currentSlide === 0 ? '/game/first-tutorial/w1.png' : currentSlide === 5 ? '/game/first-tutorial/w2.png' : '/game/first-tutorial/w1-dull.png'}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1
        }}
      />
      
      {/* Main content layer (unblurred) */}
      <div 
        className="absolute inset-0"
        style={{ zIndex: 2 }}
      >
        {/* Character display - show different characters on different slides */}
        {currentSlide === 0 && (
          <img
            src="/game/first-tutorial/d1.png"
            alt="Maya"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-150px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {currentSlide === 1 && (
          <img
            src="/game/first-tutorial/d2.png"
            alt="Character D2"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '-100px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {/* Tutorial content showcase - positioned on the right for slides after first */}
        {currentSlide === 1 && (
          <div 
            className="absolute"
            style={{
              top: '15%',
              right: '8%',
              width: '45%',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            {/* Movement controls tutorial */}
            <img
              src="/game/first-tutorial/controls.png"
              alt="Movement Controls"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '600px'
              }}
            />
          </div>
        )}

        {/* Character D2 for slide 3 */}
        {currentSlide === 2 && (
          <img
            src="/game/first-tutorial/d2.png"
            alt="Character D2"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '-100px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {/* Character D3 for slide 4 */}
        {currentSlide === 3 && (
          <img
            src="/game/first-tutorial/d3.png"
            alt="Character D3"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '-100px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'calc(100% - 80px)'
            }}
          />
        )}

        {/* Character D2 for slide 4 (additional character) */}
        {currentSlide === 3 && (
          <img
            src="/game/first-tutorial/d2.png"
            alt="Character D2"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '75%',
              bottom: '-100px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {/* Character D2 for stock intro slide (slide 5) */}
        {currentSlide === 4 && (
          <img
            src="/game/first-tutorial/d2.png"
            alt="Character D2"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '-100px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {/* Maya character for final slide (slide 6) - same as slide 0 */}
        {currentSlide === 5 && (
          <img
            src="/game/first-tutorial/d1.png"
            alt="Maya"
            className="onboard-float"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '-150px',
              transform: 'translate(-50%, 0)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '60%',
              width: 'auto',
              height: 'auto'
            }}
          />
        )}

        {/* Bank introduction showcase for slide 3 */}
        {currentSlide === 2 && (
          <div 
            className="absolute"
            style={{
              top: '10%',
              right: '5%',
              width: '50%',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            {/* Bank introduction image */}
            <img
              src="/game/first-tutorial/bank-intro.png"
              alt="Central Bank Introduction"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '700px',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        )}

        {/* ATM introduction showcase for slide 4 */}
        {currentSlide === 3 && (
          <div 
            className="absolute"
            style={{
              top: '10%',
              right: '5%',
              width: '50%',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            {/* ATM introduction image */}
            <img
              src="/game/first-tutorial/atm-intro.png"
              alt="ATM Introduction"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '700px',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        )}

        {/* Stock Market introduction showcase for slide 5 */}
        {currentSlide === 4 && (
          <div 
            className="absolute"
            style={{
              top: '10%',
              right: '5%',
              width: '50%',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            {/* Stock Market introduction image */}
            <img
              src="/game/first-tutorial/stock-intro.png"
              alt="Stock Market Introduction"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '700px',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        )}

        {/* Instruction text at top */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-white text-center z-20">
          <p 
            className="text-lg opacity-90 drop-shadow-lg text-black"
            style={{ fontFamily: 'VCR OSD Mono, monospace' }}
          >
            Press [Space] to Speed Up • Press [Mouse Click] to Continue
          </p>
        </div>

        {/* DialogueBox Component */}
        <DialogueBox
          text={currentSlideData.text}
          characterName={currentSlideData.character}
          isVisible={true}
          onAdvance={handleAdvance}
          showProgressIndicator={true}
          currentSlide={currentSlide}
          totalSlides={ONBOARDING_SLIDES.length}
          showContinueHint={true}
          baseTypingSpeed={50}
          fastTypingSpeed={5}
          allowSpaceAdvance={false} // Disable space advancement for onboarding
        />

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
