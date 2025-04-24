import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { startGame, stopGame } from '../../game/game';
import PixelButton from './atoms/PixelButton';

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
    // Get in-game username from Clerk metadata
    const gameUsername = user?.unsafeMetadata?.gameUsername;
    if (!gameUsername) {
      navigate('/profile');
      return;
    }
    // All good: start game
    document.body.classList.add('game-active');
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) gameContainer.style.display = 'block';
    setIsLoading(false);
    setTimeout(() => startGame(gameUsername as string), 100);
    return () => {
      stopGame();
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.style.display = 'none';
        gameContainer.innerHTML = '';
      }
      const hudContainer = document.getElementById('hud-container');
      if (hudContainer) {
        hudContainer.style.display = 'none';
        hudContainer.innerHTML = '';
      }
      document.body.classList.remove('game-active');
    };
  }, [isLoaded, isSignedIn, user, navigate]);
   
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