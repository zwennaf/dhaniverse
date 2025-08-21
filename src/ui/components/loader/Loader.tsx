import React, { useState, useEffect } from 'react';
import { NumberCounter } from '../common';

interface LoaderProps {
  onLoadingComplete: () => void;
}

const Loader: React.FC<LoaderProps> = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Initializing...');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTip, setCurrentTip] = useState('');

  const loadingSteps = [
    { progress: 10, status: 'Loading Game Assets...' },
    { progress: 25, status: 'Loading Map Data...' },
    { progress: 45, status: 'Loading Buildings...' },
    { progress: 65, status: 'Loading Characters...' },
    { progress: 80, status: 'Connecting to Server...' },
    { progress: 95, status: 'Finalizing...' },
    { progress: 100, status: 'Ready!' }
  ];

  const tips = [
    "TIP: Explore the stock market to multiply your dhani",
    "TIP: Visit the bank to secure your investments",
    "TIP: Complete daily quests for bonus rewards",
    "TIP: Trade with other players to build your empire",
    "TIP: Check the leaderboards to see top players",
    "TIP: Upgrade your character for better performance",
    "TIP: Join guilds to team up with other players",
    "TIP: Watch market trends for the best trading opportunities",
    "TIP: Use the map to discover hidden locations",
    "TIP: Save regularly to protect your progress"
  ];

  useEffect(() => {
    // Set random tip on component mount
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setCurrentTip(randomTip);

    let currentProgress = 0;
    let stepIndex = 0;
    let animationFrame: number;
    
    const updateProgress = () => {
      // Calculate speed based on current progress (slower as it approaches 95)
      let speed;
      if (currentProgress < 60) {
        speed = 0.8; // Fast initial speed
      } else if (currentProgress < 80) {
        speed = 0.4; // Medium speed
      } else if (currentProgress < 95) {
        speed = 0.15; // Slow down significantly
      } else {
        speed = 0.05; // Very slow crawl to 100
      }
      
      currentProgress += speed;
      
      // Update status messages at certain thresholds
      if (currentProgress >= 10 && stepIndex === 0) {
        setCurrentStatus('Loading Game Assets...');
        stepIndex = 1;
      } else if (currentProgress >= 25 && stepIndex === 1) {
        setCurrentStatus('Loading Map Data...');
        stepIndex = 2;
      } else if (currentProgress >= 45 && stepIndex === 2) {
        setCurrentStatus('Loading Buildings...');
        stepIndex = 3;
      } else if (currentProgress >= 65 && stepIndex === 3) {
        setCurrentStatus('Loading Characters...');
        stepIndex = 4;
      } else if (currentProgress >= 80 && stepIndex === 4) {
        setCurrentStatus('Connecting to Server...');
        stepIndex = 5;
      } else if (currentProgress >= 95 && stepIndex === 5) {
        setCurrentStatus('Finalizing...');
        stepIndex = 6;
      } else if (currentProgress >= 100) {
        setCurrentStatus('Ready!');
        currentProgress = 100;
        setProgress(100);
        setTimeout(() => {
          setShowWelcome(true);
        }, 500);
        return;
      }
      
      setProgress(Math.floor(currentProgress));
      animationFrame = requestAnimationFrame(updateProgress);
    };
    
    // Start the continuous animation
    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [onLoadingComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isComplete ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundImage: "url('/UI/game/loaderbg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Subtle dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full text-white px-8">
        <div className={`flex flex-col h-full transition-opacity duration-300 ${showWelcome ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* Random Tip at the top */}
          <div className="flex-none pt-16 text-center">
            <p 
              className="text-lg text-orange-200 tracking-wide max-w-lg mx-auto"
              style={{ 
                fontFamily: 'VCR OSD Mono, monospace',
                textShadow: '0 0 10px rgba(255,165,0,0.3)'
              }}
            >
              {currentTip}
            </p>
          </div>

          {/* Centered progress percentage */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h1 
                className="text-7xl font-bold text-white tracking-wider mb-4"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                  textShadow: '0 0 15px rgba(255,255,255,0.5), 0 0 30px rgba(255,255,255,0.3)',
                  filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))'
                }}
              >
                <NumberCounter 
                  value={progress} 
                  duration={0.1}
                />%
              </h1>
              <p 
                className="text-base text-gray-300 tracking-widest uppercase"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                  letterSpacing: '0.3em'
                }}
              >
                LOADED
              </p>
            </div>
          </div>

          {/* Loading status and progress bar at bottom */}
          <div className="flex-none pb-16 flex flex-col items-center space-y-6">
            {/* Loading status */}
            <p 
              className="text-base text-blue-200 tracking-wide text-center"
              style={{ 
                fontFamily: 'VCR OSD Mono, monospace',
                transition: 'all 0.8s ease-out'
              }}
            >
              {currentStatus}
            </p>
            
            {/* Progress bar */}
            <div className="w-96 relative">
              <div className="h-0.5 bg-gray-700 bg-opacity-50 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                  }}
                />
              </div>
              {/* Progress bar glow */}
              <div 
                className="absolute top-0 h-0.5 rounded-full transition-all duration-1000 ease-out opacity-30"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #ffffff 0%, transparent 100%)',
                  filter: 'blur(2px)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Welcome Screen */}
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${
          showWelcome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Spacer for top */}
          <div className="flex-1"></div>
          
          {/* Centered welcome content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-8">
              <h1 
                className="text-5xl font-bold text-white tracking-wider"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                  textShadow: '0 0 15px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4)',
                  filter: 'drop-shadow(0 0 25px rgba(255,255,255,0.5))'
                }}
              >
                Welcome to Dhaniverse
              </h1>
              
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto opacity-60" />
            </div>
          </div>
          
          {/* Bottom content */}
          <div className="flex-1 flex items-end justify-center pb-16">
            <p 
              className="text-lg text-gray-300 tracking-wide opacity-80"
              style={{ fontFamily: 'VCR OSD Mono, monospace' }}
            >
              Click anywhere to continue
            </p>
          </div>
        </div>
      </div>
      
      {/* Click to continue overlay */}
      {showWelcome && (
        <div 
          className="absolute inset-0 cursor-pointer z-20"
          onClick={() => {
            setIsComplete(true);
            setTimeout(() => {
              onLoadingComplete();
            }, 300); // Reduced from 1000ms to 300ms
          }}
        />
      )}
    </div>
  );
};

export default Loader;
