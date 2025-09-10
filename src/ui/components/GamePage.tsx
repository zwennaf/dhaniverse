import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/AuthContext';
import { startGame, stopGame } from '../../game/game';
import SEO from './SEO';
import DesktopWarning from './DesktopWarning';
import OnboardingWrapper from './onboarding/OnboardingWrapper';
import { playerStateApi } from '../../utils/api';
import BankOnboardingUI from './banking/onboarding/BankOnboardingUI';
import Loader from './loader/Loader';
import { locationTrackerManager } from '../../services/LocationTrackerManager';
// Tutorial gating now relies solely on backend player state (hasCompletedTutorial) instead of static config

const GamePage: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  // Ref to avoid duplicate tracker activation
  const trackerActivatedRef = useRef(false);
  const gameStartedRef = useRef(false);
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

    // Check player tutorial status from backend
    const checkTutorialStatus = async () => {
      try {
        console.log("GamePage: Fetching player state for tutorial status...");
        const resp = await playerStateApi.get();
        const completed = !!resp?.data?.hasCompletedTutorial;
        console.log("GamePage: Tutorial completion status:", completed, "Raw value:", resp?.data?.hasCompletedTutorial);
        setHasCompletedTutorial(completed);
        (window as any).__tutorialCompleted = completed;

        // Always show loader briefly for consistent experience
        setShowLoader(true);
      } catch (e) {
        console.error('GamePage: Failed to fetch player state, defaulting to showing onboarding for safety', e);
        // If we can't check tutorial status, assume new user and show onboarding
        setHasCompletedTutorial(false);
        setShowLoader(true);
      }
    };
    checkTutorialStatus();
  }, [isLoaded, isSignedIn, user?.gameUsername, navigate]);

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
    console.log("GamePage: Loader completed, hasCompletedTutorial:", hasCompletedTutorial);
    setShowLoader(false);
    setIsLoading(false);
    
    // Check if user has completed tutorial - if not, they need onboarding slides
    if (!hasCompletedTutorial) {
      console.log('GamePage: New user detected - showing onboarding slides');
      setShowOnboarding(true);
    } else {
      console.log('GamePage: Returning user - skipping onboarding');
      if (user?.gameUsername && !gameStartedRef.current) {
        startGameFlow(user.gameUsername);
        gameStartedRef.current = true;
      }
    }
  };

  const handleContinueToGame = async () => {
    console.log("GamePage: User completed onboarding slides, starting game");
    
    // Don't mark tutorial as completed here - let Maya's guidance complete the tutorial
    // The onboarding slides are just an introduction, the actual tutorial is Maya's guidance
    
    // Hide onboarding and start game
    setShowOnboarding(false);
    if (user?.gameUsername && !gameStartedRef.current) {
      startGameFlow(user.gameUsername);
      gameStartedRef.current = true;
    }
    
    // Assign first task for new players to guide them to Maya
    (window as any).__assignFirstTaskPending = true;
    setTimeout(() => {
      console.log('GamePage: Assigning first task for new player after onboarding');
      window.dispatchEvent(new CustomEvent('assign-first-task'));
    }, 1000); // Give game time to load
  };

  // Helper to enable Maya tracker once Maya target exists in manager
  // Removed auto-enabling logic; tracker is now user-controlled (e.g., via key press/debug toggle).



  // Extra safeguard: attempt tracker each time this component becomes focused (e.g., after reloads/navigation back)
  useEffect(() => {
    // Only listen for external requests to remove the tracker; we no longer auto-enable on visibility.
    const handleRemoveMayaTracker = () => {
      console.log("GamePage: Removing Maya tracker (external event)");
      locationTrackerManager.setTargetEnabled('maya', false);
      trackerActivatedRef.current = false;
    };
    window.addEventListener('remove-maya-tracker', handleRemoveMayaTracker);
    return () => window.removeEventListener('remove-maya-tracker', handleRemoveMayaTracker);
  }, []);

  // Cleanup effect
  useEffect(() => {
    const handleBanned = (e: any) => {
      console.log("GamePage: User banned event received", e.detail);
      // Don't navigate here anymore - let ProtectedGameRoute handle it
      // The ProtectedGameRoute will detect the ban status and show BannedPage
    };
    window.addEventListener('user-banned', handleBanned);
    // Track if we've been unmounted due to navigation vs React remounting
    let hasNavigatedAway = false;
    
    const handleBeforeUnload = () => {
      hasNavigatedAway = true;
    };
    
    const handlePopState = () => {
      hasNavigatedAway = true;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      // Remove event listeners first
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      
      // Check if we're actually navigating away from /game
      const currentPath = window.location.pathname;
      const shouldCleanup = hasNavigatedAway || currentPath !== '/game';
      
      console.log("GamePage: Cleanup triggered. pathname=", currentPath, "hasNavigatedAway=", hasNavigatedAway, "willStop=", shouldCleanup);
      
      // Only stop game and clear containers if we're actually leaving the game
      if (shouldCleanup) {
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
          while (hudContainer.firstChild) hudContainer.removeChild(hudContainer.firstChild);
        }
        
        document.body.classList.remove('game-active');
      } else {
        console.warn('GamePage: Prevented cleanup during React remount - keeping game state');
      }
    };
  return () => { window.removeEventListener('user-banned', handleBanned); };
  }, []);
   
  // Show custom loader for first-time players or during initial loading
  if (showLoader || (isLoading || !isLoaded)) {
    return <Loader onLoadingComplete={handleLoaderComplete} />;
  }

  // Show onboarding for first-time players (only if tutorial not completed)
  if (showOnboarding) {
    return <OnboardingWrapper onContinueToGame={handleContinueToGame} />;
  }
   
  // The game will be rendered by Phaser in the game-container div
  return (
    <div className="game-page">
  {/* Show desktop-only warning overlay on /game for non-desktop devices */}
  <DesktopWarning />
      <SEO 
        title="Play Dhaniverse Game - Financial RPG | Learn Money Management Online"
        description="Play Dhaniverse, the immersive 2D RPG that teaches real financial skills. Explore buildings, trade stocks, manage budgets, and level up your money knowledge through interactive gameplay."
        keywords="play dhaniverse, dhaniverse game online, dhaniverse RPG, financial RPG game, money management game online, stock trading game, budgeting game online, financial education RPG, investing game online, personal finance simulator, financial literacy game online, money RPG online, financial simulation game, stock market simulator, budget management game, financial planning game online, investment trading game, money skills RPG, financial learning game, money skills RPG, financial learning game, gamified finance online, interactive finance game, financial education simulator, money management RPG, financial game play online"
        url="https://dhaniverse.in/game"
        type="game"
        image="https://dhaniverse.in/og-image.jpg"
      />
      
      {/* Bank Onboarding UI */}
      <BankOnboardingUI />
      
      {/* Return button hidden during active gameplay - players should stay in game */}
    </div>
  );
};

export default GamePage;