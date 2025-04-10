import './style.css';
import { startGame } from './game/game.ts';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Setup join button event handler
  const joinButton = document.getElementById('join-button') as HTMLButtonElement;
  joinButton.addEventListener('click', () => {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const username = usernameInput.value.trim();
    
    if (username.length >= 3) {
      startGame(username);
    } else {
      alert('Username must be at least 3 characters long');
    }
  });
});
