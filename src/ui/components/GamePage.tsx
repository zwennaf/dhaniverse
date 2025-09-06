import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/AuthContext';
import { startGame, stopGame } from '../../game/game';
import SEO from './SEO';
// Onboarding wrapper intentionally not imported – we currently always skip slides.
import { playerStateApi } from '../../utils/api';
import BankOnboardingUI from './banking/onboarding/BankOnboardingUI';
import Loader from './loader/Loader';
import { locationTrackerManager } from '../../services/LocationTrackerManager';
// Tutorial gating now relies solely on backend player state (hasCompletedTutorial) instead of static config

const GamePage: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);
  // Onboarding disabled (we always skip). Kept state placeholder in case we re-enable quickly.
  const [showOnboarding] = useState(false);
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
        setHasCompletedTutorial(completed);
        (window as any).__tutorialCompleted = completed;

        // Always show loader briefly for consistent experience
        setShowLoader(true);
        // Regardless of completion we skip showing the onboarding UI.
        setTimeout(() => {
          setIsLoading(false);
          if (!gameStartedRef.current && user?.gameUsername) {
            startGameFlow(user.gameUsername);
            gameStartedRef.current = true;
          }
        }, 700);
      } catch (e) {
        console.error('GamePage: Failed to fetch player state, defaulting to showing onboarding', e);
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
    console.log("GamePage: Loader completed (skipping onboarding)");
    setShowLoader(false);
    setIsLoading(false);
    // If backend had not marked completion, mark it now silently so slides never appear later.
    if (!hasCompletedTutorial) {
      (async () => {
        try {
          await playerStateApi.update({ hasCompletedTutorial: true });
          setHasCompletedTutorial(true);
          (window as any).__tutorialCompleted = true;
          console.log('GamePage: Forced tutorial completion to skip onboarding');
        } catch (e) {
          console.warn('GamePage: Failed to force-complete tutorial (continuing anyway)', e);
        }
      })();
    }
    if (user?.gameUsername && !gameStartedRef.current) {
      startGameFlow(user.gameUsername);
      gameStartedRef.current = true;
    }
  };

  const handleContinueToGame = async () => {
    console.log("GamePage: User clicked continue to game");
    
    try {
      await playerStateApi.update({ hasCompletedTutorial: true });
      setHasCompletedTutorial(true);
      (window as any).__tutorialCompleted = true;
      console.log('GamePage: Tutorial marked complete in backend');
    } catch (e) {
      console.error('GamePage: Failed to persist tutorial completion, proceeding anyway', e);
    }
    // Hide onboarding and start game
    if (user?.gameUsername && !gameStartedRef.current) {
      startGameFlow(user.gameUsername);
      gameStartedRef.current = true;
    }
    // Assign first task only for brand new players
    (window as any).__assignFirstTaskPending = true;
    setTimeout(() => window.dispatchEvent(new CustomEvent('assign-first-task')), 400);
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
  // Onboarding wrapper suppressed.
   
  // The game will be rendered by Phaser in the game-container div
  return (
    <div className="game-page">
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