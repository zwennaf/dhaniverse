import React, { useState, useEffect } from 'react';

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

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < loadingSteps.length) {
        const currentStep = loadingSteps[stepIndex];
        setProgress(currentStep.progress);
        setCurrentStatus(currentStep.status);
        
        if (currentStep.progress === 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setShowWelcome(true);
          }, 400); // Reduced from 800ms to 400ms
        }
        stepIndex++;
      }
    }, 600);

    return () => clearInterval(progressInterval);
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
      
      {/* Minimal particles overlay */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${3 + Math.random() * 2}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-8">
        <div className={`transition-opacity duration-300 ${showWelcome ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* Random Tip at the top */}
          <div className="mb-16 text-center">
            <p 
              className="text-lg text-orange-200 tracking-wide max-w-md mx-auto"
              style={{ 
                fontFamily: 'VCR OSD Mono, monospace',
                textShadow: '0 0 10px rgba(255,165,0,0.3)'
              }}
            >
              {currentTip}
            </p>
          </div>

          {/* Sophisticated central loader */}
          <div className="mb-12 flex flex-col items-center space-y-8">
            
            {/* Progress percentage */}
            <div className="text-center">
              <h1 
                className="text-6xl font-bold text-white tracking-wider mb-2"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                  textShadow: '0 0 20px rgba(255,255,255,0.5)'
                }}
              >
                {progress}%
              </h1>
              <p 
                className="text-sm text-gray-300 tracking-widest uppercase"
                style={{ 
                  fontFamily: 'VCR OSD Mono, monospace',
                  letterSpacing: '0.2em'
                }}
              >
                LOADED
              </p>
            </div>

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
            
            {/* Sophisticated progress bar */}
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
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          showWelcome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className="text-center space-y-8">
            <h1 
              className="text-5xl font-bold text-white tracking-wider"
              style={{ 
                fontFamily: 'VCR OSD Mono, monospace',
                textShadow: '0 0 30px rgba(255,255,255,0.8)'
              }}
            >
              Welcome to Dhaniverse
            </h1>
            
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent mx-auto opacity-60" />
            
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
