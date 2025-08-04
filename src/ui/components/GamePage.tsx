import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/AuthContext';
import { startGame, stopGame } from '../../game/game';
import PixelButton from './atoms/PixelButton';
import SEO from './SEO';

const GamePage: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(true);
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
    
    console.log("GamePage useEffect: Starting game for", gameUsername);
    
    // All good: start game
    document.body.classList.add('game-active');
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.style.display = 'block';
    setIsLoading(false);
    
    // Start game with a slight delay
    const gameStartTimeout = setTimeout(() => {
      console.log("GamePage: Calling startGame");
      const selectedCharacter = user?.selectedCharacter || 'C2';
      startGame(gameUsername as string, selectedCharacter);
    }, 100);

    return () => {
      console.log("GamePage: Cleanup - stopping game");
      clearTimeout(gameStartTimeout);
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
  }, [isLoaded, isSignedIn, user?.gameUsername, user?.selectedCharacter, navigate]); // More specific dependency
   
  if (isLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Loading game...</h1>
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
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