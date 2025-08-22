import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/AuthContext';
import { startGame, stopGame } from '../../game/game';
import { playerStateApi } from '../../utils/api';
import PixelButton from './atoms/PixelButton';
import SEO from './SEO';
import OnboardingWrapper from './onboarding/OnboardingWrapper';
import Loader from './loader/Loader';
import { enableMayaTrackerOnGameStart, locationTrackerManager } from '../../services/LocationTrackerManager';

const GamePage: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false); // Set to false for local development to test onboarding
  // Ref to avoid duplicate tracker activation
  const trackerActivatedRef = useRef(false);
  const navigate = useNavigate();
   
  useEffect(() => {
    if (!isLoaded) return;
    
    // Redirect unauthenticated users
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }
    
    // Get in-game username from our auth system
    const gameUsername = user?.gameUsername;
    if (!gameUsername) {
      navigate('/profile');
      return;
    }

    // Check player tutorial status
    const checkTutorialStatus = async () => {
      try {
        console.log("GamePage: Checking tutorial status...");
        const playerState = await playerStateApi.get();
        const tutorialCompleted = playerState?.data?.hasCompletedTutorial ?? false;
        
        console.log("GamePage: Tutorial completed:", tutorialCompleted);
        setHasCompletedTutorial(tutorialCompleted);
        
        // Set window flag for GameHUD to check
        (window as any).__tutorialCompleted = tutorialCompleted;
        
        // For local development, force show onboarding when hasCompletedTutorial is false
        // This allows testing the onboarding flow
        const shouldShowOnboarding = !tutorialCompleted; // Show onboarding if tutorial not completed in backend
        console.log("GamePage: Should show onboarding:", shouldShowOnboarding);
        
        if (shouldShowOnboarding) {
          // Show loader first for new users
          setShowLoader(true);
        } else {
          // Returning users skip loader and onboarding
          setIsLoading(false);
          startGameFlow(gameUsername);
          // ALSO enable tracker for returning users if tutorial flag is false
          if (!tutorialCompleted) {
            console.log("GamePage: Enabling tracker for returning user with false tutorial flag");
            setTimeout(() => enableMayaTrackerOnGameStart(), 2000); // Use new centralized function
          }
        }
      } catch (error) {
        console.error("GamePage: Error checking tutorial status:", error);
        // Default to showing loader and onboarding on error for testing
        setShowLoader(true);
      }
    };

    checkTutorialStatus();
  }, [isLoaded, isSignedIn, user?.gameUsername, user?.selectedCharacter, navigate, hasCompletedTutorial]);

  const startGameFlow = (gameUsername: string) => {
    console.log("GamePage useEffect: Starting game for", gameUsername);
    
    // All good: start game
    document.body.classList.add('game-active');
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.style.display = 'block';
    
    // Start game with a slight delay
    const gameStartTimeout = setTimeout(() => {
      console.log("GamePage: Calling startGame");
      const selectedCharacter = user?.selectedCharacter || 'C1';
      startGame(gameUsername as string, selectedCharacter);
    }, 100);

    return () => {
      clearTimeout(gameStartTimeout);
    };
  };

  const handleLoaderComplete = () => {
    console.log("GamePage: Loader completed");
    setShowLoader(false);
    setIsLoading(false);
    
    // Check if user needs onboarding
    if (!hasCompletedTutorial) {
      console.log("GamePage: Showing onboarding for new user");
      setShowOnboarding(true);
    }
    // For returning users, the game will start automatically when isLoading becomes false
  };

  const handleContinueToGame = async () => {
    console.log("GamePage: User clicked continue to game");
    
    try {
      // Update the player state to mark tutorial as completed
      await playerStateApi.update({
        hasCompletedTutorial: false, // Keep as false as requested for testing
      });
      
      console.log("GamePage: Updated hasCompletedTutorial to false for testing");
      
      // Hide onboarding and start the game
      setShowOnboarding(false);
      
      if (user?.gameUsername) {
        startGameFlow(user.gameUsername);
      }
      // After game starts, if tutorial not completed, enable Maya tracking
      if (!hasCompletedTutorial) {
        setTimeout(() => enableMayaTrackerOnGameStart(), 2000); // Use new centralized function
      }
      // Inform the game/HUD that onboarding finished and first task should be assigned
      // Mark pending in case HUD hasn't mounted yet, then dispatch
      (window as any).__assignFirstTaskPending = true;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('assign-first-task'));
      }, 500);
    } catch (error) {
      console.error("GamePage: Error updating tutorial status:", error);
      // Continue to game anyway
      setShowOnboarding(false);
      if (user?.gameUsername) {
        startGameFlow(user.gameUsername);
      }
      if (!hasCompletedTutorial) {
        setTimeout(() => enableMayaTrackerOnGameStart(), 2000); // Use new centralized function
      }
      (window as any).__assignFirstTaskPending = true;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('assign-first-task'));
      }, 500);
    }
  };

  // Helper to enable Maya tracker once Maya target exists in manager
  const attemptEnableMayaTracker = () => {
    console.log("GamePage: attemptEnableMayaTracker called, trackerActivated:", trackerActivatedRef.current);
    
    // Estimated initial Maya spawn (keep synced with MayaNPCManager.x,y)
    const EST_MAYA_POS = { x: 7779, y: 3581 };

    const ensurePlaceholder = () => {
      if (!locationTrackerManager.getTarget('maya')) {
        console.log("GamePage: Creating Maya tracker placeholder");
        locationTrackerManager.addTarget({
          id: 'maya',
          name: 'Maya',
          position: EST_MAYA_POS,
          image: '/characters/maya-preview.png',
          enabled: true
        });
        trackerActivatedRef.current = true;
        return true;
      }
      return false;
    };

    const tryEnable = () => {
      const mayaTarget = locationTrackerManager.getTarget('maya');
      if (mayaTarget) {
        console.log("GamePage: Maya target found, enabled:", mayaTarget.enabled);
        if (!mayaTarget.enabled) {
          locationTrackerManager.setTargetEnabled('maya', true);
          console.log("GamePage: Enabled Maya tracker");
        }
        trackerActivatedRef.current = true;
        return true;
      }
      // create placeholder if still missing
      return ensurePlaceholder();
    };

    // Always try to enable, regardless of previous state when tutorial not completed
    if (!hasCompletedTutorial) {
      console.log("GamePage: Tutorial not completed, forcing tracker enable");
      trackerActivatedRef.current = false; // Reset to allow re-enabling
    }
    
    if (trackerActivatedRef.current && hasCompletedTutorial) {
      console.log("GamePage: Tracker already activated and tutorial completed, skipping");
      return;
    }

    // Immediate attempt
    if (tryEnable()) return;

    // Aggressive retries for reliability
    const retrySchedule = [50, 100, 200, 400, 800, 1200, 2000, 3000];
    retrySchedule.forEach(delay => {
      setTimeout(() => { 
        if (!trackerActivatedRef.current || !hasCompletedTutorial) {
          tryEnable(); 
        }
      }, delay);
    });

    // Safety long-poll as last resort
    let attempts = 0;
    const interval = setInterval(() => {
      if (trackerActivatedRef.current && hasCompletedTutorial) { 
        clearInterval(interval); 
        return; 
      }
      attempts++;
      if (tryEnable() || attempts > 60) { // ~12s max (60 * 200ms)
        clearInterval(interval);
      }
    }, 200);
  };



  // Extra safeguard: attempt tracker each time this component becomes focused (e.g., after reloads/navigation back)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !hasCompletedTutorial) {
        attemptEnableMayaTracker();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [hasCompletedTutorial]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      console.log("GamePage: Cleanup - stopping game");
      stopGame();
      
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.style.display = 'none';
        // Safely clear container contents
        while (gameContainer.firstChild) {
          gameContainer.removeChild(gameContainer.firstChild);
        }
      }
      
      const hudContainer = document.getElementById('hud-container');
      if (hudContainer) {
        hudContainer.style.display = 'none';
        // Safely clear container contents
        while (hudContainer.firstChild) {
          hudContainer.removeChild(hudContainer.firstChild);
        }
      }
      
      document.body.classList.remove('game-active');
    };
  }, []);
   
  // Show custom loader for first-time players or during initial loading
  if (showLoader || (isLoading || !isLoaded)) {
    return <Loader onLoadingComplete={handleLoaderComplete} />;
  }

  // Show onboarding for first-time players
  if (showOnboarding) {
    return <OnboardingWrapper onContinueToGame={handleContinueToGame} />;
  }
   
  // The game will be rendered by Phaser in the game-container div
  return (
    <div className="game-page">
      <SEO 
        title="Play Dhaniverse Game - Financial RPG | Learn Money Management Online"
        description="Play Dhaniverse, the immersive 2D RPG that teaches real financial skills. Explore buildings, trade stocks, manage budgets, and level up your money knowledge through interactive gameplay."
        keywords="play dhaniverse, dhaniverse game online, dhaniverse RPG, financial RPG game, money management game online, stock trading game, budgeting game online, financial education RPG, investing game online, personal finance simulator, financial literacy game online, money RPG online, financial simulation game, stock market simulator, budget management game, financial planning game online, investment trading game, money skills RPG, financial learning game, gamified finance online, interactive finance game, financial education simulator, money management RPG, financial game play online"
        url="https://dhaniverse.in/game"
        type="game"
        image="https://dhaniverse.in/og-image.jpg"
      />
      <div className="fixed top-4 left-4 z-50">
        <PixelButton 
          variant="outline" 
          onClick={() => navigate('/')} 
          className="bg-black/50 backdrop-blur-sm border-yellow-400/50 hover:bg-black/70"
        >
          Return to Home
        </PixelButton>
      </div>
    </div>
  );
};

export default GamePage;