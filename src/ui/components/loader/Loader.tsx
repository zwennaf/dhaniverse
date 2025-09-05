import React, { useState, useEffect, useRef } from 'react';
import { cacheAssets, resolveAsset } from '../../utils/assetCache';
import { initChunkCache, preloadAndCacheChunks } from '../../../game/cache/mapChunkCache.ts';
import { NumberCounter } from '../common';
import { playerStateApi } from '../../../utils/api';

interface LoaderProps {
  onLoadingComplete: () => void;
}

const Loader: React.FC<LoaderProps> = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Initializing...');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [shouldPreloadTutorial, setShouldPreloadTutorial] = useState(false);
  const [tutorialAssetsLoaded, setTutorialAssetsLoaded] = useState(false);
  const [mapChunksPreloaded, setMapChunksPreloaded] = useState(false);
  const tutorialAssetsLoadedRef = useRef(false);
  const mapChunksPreloadedRef = useRef(false);
  const [bgUrl, setBgUrl] = useState<string>('/UI/game/loaderbg.png');
  const [bgReady, setBgReady] = useState(false);
  const realChunkProgressRef = useRef(0); // 0..1 of chunks loaded (subset we care about)
  const forcedSlowIncrementRef = useRef(0);

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

  // Decide if tutorial should be shown by querying backend player state instead of localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await playerStateApi.get();
        if (cancelled) return;
        const needsTutorial = !resp?.data?.hasCompletedTutorial;
        setShouldPreloadTutorial(needsTutorial);
        if (!needsTutorial) {
          // Ensure flags remain consistent; no tutorial assets required
          tutorialAssetsLoadedRef.current = true;
          setTutorialAssetsLoaded(true);
        }
      } catch (e) {
        // Fallback: show tutorial if backend fails (better to educate than skip)
        if (!cancelled) setShouldPreloadTutorial(true);
      }
    })();

  const tutorialImages: string[] = [
      '/game/first-tutorial/w1.png',
      '/game/first-tutorial/w1-dull.png',
      '/game/first-tutorial/w2.png',
      '/game/first-tutorial/w3.png',
      '/game/first-tutorial/w4.png',
      '/game/first-tutorial/d1.png',
      '/game/first-tutorial/d2.png',
      '/game/first-tutorial/d3.png',
      '/game/first-tutorial/d4.png',
      '/game/first-tutorial/maya-waiting.png',
      '/game/first-tutorial/controls.png',
      '/game/first-tutorial/gui-intro.png',
      '/game/first-tutorial/bank-intro.png',
      '/game/first-tutorial/atm-intro.png',
      '/game/first-tutorial/stock-intro.png'
    ];
    if (shouldPreloadTutorial) {
      cacheAssets(tutorialImages).then(() => {
        if (cancelled) return;
        tutorialAssetsLoadedRef.current = true;
        setTutorialAssetsLoaded(true);
      }).catch(() => {});
    }

    // Always cache the loader background early (regardless of tutorial) so the
    // CSS background doesn't trigger a separate fetch and cause a visual flash.
    cacheAssets(['/UI/game/loaderbg.png']).then(() => {
      if (cancelled) return;
      const resolved = resolveAsset('/UI/game/loaderbg.png');
      setBgUrl(resolved);
      setBgReady(true);
    }).catch(() => {
      if (!cancelled) {
        // still mark ready so UI can render with the original url
        setBgReady(true);
      }
    });
    return () => { cancelled = true; };
  }, [shouldPreloadTutorial]);

  // Preload a small set of initial map chunks & metadata into localStorage cache
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const metaResp = await fetch('/maps/chunks/metadata.json');
        if (!metaResp.ok) throw new Error('metadata http ' + metaResp.status);
        const metadata = await metaResp.json();
        if (cancelled) return;
        initChunkCache(metadata.version ?? 1);

        // Predict initial player spawn at chunk (0,0). Preload radius 2.
        const radius = 2;
        const targets = metadata.chunks.filter((c: any) => c.x <= radius && c.y <= radius);
        // Keep cap small to respect storage limits
        const limitedTargets = targets.slice(0, 25).map((c: any) => ({ id: c.id, filename: c.filename }));
        await preloadAndCacheChunks('/maps/chunks', limitedTargets);
      } catch (e) {
        console.warn('Map chunk preloading skipped:', e);
      } finally {
        if (!cancelled) {
          mapChunksPreloadedRef.current = true;
          setMapChunksPreloaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Listen for real chunk load progress to unstick bar >45%
    const onChunkProgress = (e: any) => {
      const { loaded, total } = e.detail || {};
      if (typeof loaded === 'number' && typeof total === 'number' && total > 0) {
        // Only account for first 120 chunks (or total) to map to 45..80% range.
        const cap = Math.min(total, 120);
        const effectiveLoaded = Math.min(loaded, cap);
        realChunkProgressRef.current = effectiveLoaded / cap; // 0..1
      }
    };
    window.addEventListener('chunkLoadProgress', onChunkProgress as any);
    return () => window.removeEventListener('chunkLoadProgress', onChunkProgress as any);
  }, []);

  useEffect(() => {
    // Set random tip on component mount
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setCurrentTip(randomTip);

    let currentProgress = 0;
    let stepIndex = 0;
    let animationFrame: number;
    
    let fastForward = false;
    const handleAlreadyPreloaded = () => {
      // Trigger fast-forward if we haven't shown welcome yet
      if (!showWelcome) {
        fastForward = true;
      }
    };
    window.addEventListener('gameAssetsAlreadyPreloaded', handleAlreadyPreloaded);

    const updateProgress = () => {
      // Calculate speed based on current progress (slower as it approaches 95)
      let speed;
      if (fastForward) {
        // Aggressive speeds to catch up quickly
        if (currentProgress < 70) speed = 6;
        else if (currentProgress < 85) speed = 4;
        else if (currentProgress < 95) speed = 2.5;
        else speed = 1.5;
      } else {
        if (currentProgress < 60) {
          speed = 0.8; // Fast initial speed
        } else if (currentProgress < 80) {
          speed = 0.4; // Medium speed
        } else if (currentProgress < 95) {
          speed = 0.15; // Slow down significantly
        } else {
          speed = 0.05; // Very slow crawl to 100
        }
      }
      
      currentProgress += speed;

      // Integrate real chunk progress once we reach 30%
      if (!mapChunksPreloadedRef.current) {
        if (currentProgress >= 30) {
          // Map real chunk progress (0..1) into 35..55% band to show life
          const base = 35;
          const span = 20; // 35 to 55
          const realPortion = realChunkProgressRef.current * span;
          const target = base + realPortion;
          // Ensure forward motion in tiny increments if network is very slow
          if (target <= currentProgress) {
            forcedSlowIncrementRef.current += 0.03; // accumulate tiny fallback
          }
          const slowBonus = Math.min(forcedSlowIncrementRef.current, 8); // cap fallback influence
          currentProgress = Math.max(currentProgress, Math.min(target + slowBonus, 55));
          if (currentStatus !== 'Caching Map Chunks...') setCurrentStatus('Caching Map Chunks...');
        }
        // Hard stop at 55 until map chunk preload callback flips
        if (currentProgress > 55) currentProgress = 55;
      }

      // Gate finishing at 95% until tutorial assets (if required) are loaded
      if (shouldPreloadTutorial && !tutorialAssetsLoadedRef.current && currentProgress >= 95) {
        currentProgress = Math.min(currentProgress, 95);
      }
      
      // Update status messages at certain thresholds
      if (currentProgress >= 10 && stepIndex === 0) {
        setCurrentStatus('Loading Game Assets...');
        stepIndex = 1;
      } else if (currentProgress >= 25 && stepIndex === 1) {
        setCurrentStatus('Loading Map Data...');
        stepIndex = 2;
      } else if (currentProgress >= 45 && stepIndex === 2) {
        if (mapChunksPreloadedRef.current) {
          setCurrentStatus('Loading Buildings...');
          stepIndex = 3;
        }
      } else if (currentProgress >= 65 && stepIndex === 3) {
        setCurrentStatus('Loading Characters...');
        stepIndex = 4;
      } else if (currentProgress >= 80 && stepIndex === 4) {
        setCurrentStatus('Connecting to Server...');
        stepIndex = 5;
      } else if (currentProgress >= 95 && stepIndex === 5) {
        setCurrentStatus('Finalizing...');
        stepIndex = 6;
  } else if (currentProgress >= 100 && (!shouldPreloadTutorial || tutorialAssetsLoadedRef.current)) {
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
      window.removeEventListener('gameAssetsAlreadyPreloaded', handleAlreadyPreloaded);
    };
  }, [onLoadingComplete, shouldPreloadTutorial]);

  // Allow SPACE key to continue on welcome screen
  useEffect(() => {
    if (!showWelcome) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setIsComplete(true);
        setTimeout(async () => {
          try {
            // Mark tutorial complete in backend if it was shown
            if (shouldPreloadTutorial) {
              await playerStateApi.update({ hasCompletedTutorial: true });
            }
          } catch (e) {
            console.warn('Failed to persist tutorial completion:', e);
          }
          onLoadingComplete();
        }, 300);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showWelcome, onLoadingComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isComplete ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#000000', // fallback while background loads
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background image layer: kept as a separate absolutely positioned element so
          we can avoid the browser requesting the image before we've converted it to a
          blob URL in our cache. It fades in when bgReady is true. */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-700 ${bgReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{
          backgroundImage: `url('${bgUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
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
              Press SPACE to continue
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
            setTimeout(async () => {
              try {
                if (shouldPreloadTutorial) {
                  await playerStateApi.update({ hasCompletedTutorial: true });
                }
              } catch (e) {
                console.warn('Failed to persist tutorial completion:', e);
              }
              onLoadingComplete();
            }, 300); // Reduced from 1000ms to 300ms
          }}
        />
      )}
    </div>
  );
};

export default Loader;
