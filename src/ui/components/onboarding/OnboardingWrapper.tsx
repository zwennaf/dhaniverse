import React, { useState, useEffect, useRef, useMemo } from 'react';
import { resolveAsset } from '../../utils/assetCache';
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
    text: "Here's your game interface! Check the minimap to navigate around, use the chat option with voice chat to communicate with other players, and keep an eye on your cash indicator showing your current balance.",
    character: "M.A.Y.A"
  },
  {
    id: 4,
    text: "Meet the Central Bank of Dhaniverse! Here you can deposit your money safely, earn interest through fixed deposits, and manage your financial portfolio. Your money grows while you play!",
    character: "M.A.Y.A"
  },
  {
    id: 5,
    text: "ATMs can be found at most places in Dhaniverse world - there are 8 ATMs currently on this map! Withdraw money instantly, check balances, transfer funds between accounts, and access your financial portfolio from any location.",
    character: "M.A.Y.A"
  },
  {
    id: 6,
    text: "Welcome to the Stock Market! Trade shares, analyze market trends, and build your investment portfolio. Watch your investments grow as you make smart trading decisions in real-time!",
    character: "M.A.Y.A"
  },
  {
    id: 7,
    text: "Thank you so much! Now meet me at my house to continue your journey in Dhaniverse.",
    character: "M.A.Y.A"
  }
];

// Transition timing
const TRANSITION_MS = 150;

const OnboardingWrapper: React.FC<OnboardingWrapperProps> = ({ onContinueToGame }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const mountedRef = useRef(true);

  const currentSlideData = ONBOARDING_SLIDES[currentSlide];

  // Now last slide (index 6) also has a showcase
  const hasShowcase = useMemo(() => [1,2,3,4,5,6].includes(currentSlide), [currentSlide]);
  const backgroundUrl = useMemo(() => {
    if (currentSlide === 0) return '/game/first-tutorial/w1.png';
    if (currentSlide === 2) return '/game/first-tutorial/w3.png';
    if (currentSlide === 4) return '/game/first-tutorial/w4.png';
    if (currentSlide === 6) return '/game/first-tutorial/w1.png'; // override to w1.png per request
    return '/game/first-tutorial/w1-dull.png';
  }, [currentSlide]);

  // Showcase images including new final slide image
  const showcaseImages = useMemo<Record<number,string>>(() => ({
    1:'/game/first-tutorial/controls.png',
    2:'/game/first-tutorial/gui-intro.png',
    3:'/game/first-tutorial/bank-intro.png',
    4:'/game/first-tutorial/atm-intro.png',
    5:'/game/first-tutorial/stock-intro.png',
    6:'/game/first-tutorial/maya-waiting.png'
  }), []);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'onboarding-wrapper-styles';
    styleEl.innerHTML = `
      @keyframes floaty-move { 0%{transform:translateY(0)}50%{transform:translateY(-12px)}100%{transform:translateY(0)} }
      .onboard-float { animation: floaty-move 3.5s ease-in-out infinite; will-change: transform; }
      .fade-layer { transition: opacity ${TRANSITION_MS}ms ease; }
      .showcase-fade { opacity:0; transition: opacity 300ms ease; }
      .showcase-fade.show { opacity:1; }
    `;
    document.head.appendChild(styleEl);
    const t = setTimeout(() => mountedRef.current && setIsInitialLoad(false), 200);
    return () => { mountedRef.current = false; clearTimeout(t); styleEl.remove(); };
  }, []);

  const advanceOrFinish = (next: number) => {
    if (next >= ONBOARDING_SLIDES.length) { onContinueToGame(); return; }
    setCurrentSlide(next);
  };

  const handleAdvance = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      if (!mountedRef.current) return;
      advanceOrFinish(currentSlide + 1);
      setTimeout(() => mountedRef.current && setIsTransitioning(false), 80);
    }, TRANSITION_MS);
  };

  return (
    <div className="fixed inset-0 z-50 select-none" onClick={handleAdvance}>
  <div className="absolute inset-0" style={{ background: `url('${resolveAsset(backgroundUrl)}') center / cover no-repeat` }} />
      <div className="relative flex flex-col h-full w-full">
        <div className="w-full flex justify-center pt-4 pointer-events-none" style={{ zIndex: 5 }}>
          <p className="text-black text-lg drop-shadow font-mono bg-white/60 px-4 py-1 rounded">Press [Space] to Speed Up • Click to Continue</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className={`flex ${hasShowcase ? 'justify-between' : 'justify-center'} items-center w-full max-w-[1600px] px-16 gap-12`}>
            <div className={`flex justify-center ${hasShowcase ? 'basis-1/2' : 'basis-full'} relative`}>
              {currentSlide === 0 && (<img src={resolveAsset('/game/first-tutorial/d1.png')} alt="Maya" className="onboard-float" style={{ maxWidth:600, width:'100%', height:'auto', pointerEvents:'none' }} />)}
              {currentSlide === 1 && (<img src={resolveAsset('/game/first-tutorial/d2.png')} alt="D2" className="onboard-float" style={{ maxWidth:480, width:'100%', height:'auto', pointerEvents:'none' }} />)}
              {currentSlide === 2 && (<img src={resolveAsset('/game/first-tutorial/d3.png')} alt="D3" className="onboard-float" style={{ maxWidth:480, width:'100%', height:'auto', pointerEvents:'none' }} />)}
              {currentSlide === 3 && (<img src={resolveAsset('/game/first-tutorial/d2.png')} alt="D2" className="onboard-float" style={{ maxWidth:520, width:'100%', height:'auto', pointerEvents:'none' }} />)}
              {currentSlide === 4 && (<img src={resolveAsset('/game/first-tutorial/d4.png')} alt="D3" className="onboard-float" style={{ maxWidth:520, width:'100%', height:'auto', pointerEvents:'none' }} />)}
              {currentSlide === 5 && (<img src={resolveAsset('/game/first-tutorial/d2.png')} alt="D2" className="onboard-float" style={{ maxWidth:520, width:'100%', height:'auto', pointerEvents:'none' }} />)}
              {currentSlide === 6 && (<img src={resolveAsset('/game/first-tutorial/d1.png')} alt="Maya" className="onboard-float" style={{ maxWidth:600, width:'100%', height:'auto', pointerEvents:'none' }} />)}
            </div>
            {hasShowcase && (
              <div className="flex justify-end items-center basis-1/2 h-full">
                <div className="relative w-full max-w-[760px] h-[660px] bg-transparent overflow-hidden flex items-center justify-center">
                  {[1,2,3,4,5,6].map(idx => (
                    <img
                      key={idx}
                      src={resolveAsset(showcaseImages[idx])}
                      alt={idx === 6 ? 'Maya Waiting' : 'Showcase'}
                      className={`absolute inset-0 object-contain p-2 showcase-fade ${currentSlide === idx ? 'show' : ''}`}
                      style={{ pointerEvents:'none' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-full flex justify-center pb-2" style={{ zIndex: 20 }}>
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
            allowSpaceAdvance={true}
          />
        </div>
      </div>
      <div className="absolute inset-0 bg-black fade-layer" style={{ zIndex:40, opacity: isTransitioning ? 1 : 0, pointerEvents: isTransitioning ? 'auto':'none' }} />
      <div className="absolute inset-0 bg-black fade-layer" style={{ zIndex:50, opacity: isInitialLoad ? 1 : 0, pointerEvents: isInitialLoad ? 'auto':'none' }} />
    </div>
  );
};

export default OnboardingWrapper;
