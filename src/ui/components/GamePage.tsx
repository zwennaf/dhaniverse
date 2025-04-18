import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startGame, stopGame } from '../../game/game';

const GamePage: React.FC = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Add game-active class to body to prevent scrolling
    document.body.classList.add('game-active');
    
    // Only use localStorage for the username, don't rely on URL parameters
    const storedUsername = localStorage.getItem('dhaniverse_username');
    
    if (storedUsername) {
      setUsername(storedUsername);
      setIsLoading(false);
      
      // Show the game container
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.style.display = 'block';
      }
      
      // Need a slight delay for the DOM to update before starting the game
      setTimeout(() => {
        // Initialize the game with the username
        startGame(storedUsername);
      }, 100);
    } else {
      // If no username is found, redirect to the landing page
      navigate('/');
    }
    
    return () => {
      // Stop the Phaser game instance
      stopGame();
      // Hide and clear the game container
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.style.display = 'none';
        gameContainer.innerHTML = ''; // Remove old canvas
      }
      // Hide React HUD
      const hudContainer = document.getElementById('hud-container');
      if (hudContainer) {
        hudContainer.style.display = 'none';
        hudContainer.innerHTML = ''; // Clear old HUD content
      }
      // Remove game-active class when leaving the game page
      document.body.classList.remove('game-active');
    };
  }, [navigate]);
  
  if (isLoading) {
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
      {/* Game will be rendered in the game-container div by Phaser */}
      {!username && (
        <div className="flex items-center justify-center h-screen bg-black text-white">
          <div className="text-center">
            <h1 className="text-2xl mb-4">Redirecting to login...</h1>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;