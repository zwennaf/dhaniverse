import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const navigate = useNavigate();

  const handleJoin = () => {
    if (username.trim().length >= 3) {
      setError('');
      // Store username in localStorage for persistence
      localStorage.setItem('dhaniverse_username', username.trim());
      
      // Store room code in localStorage if provided
      if (roomCode.trim()) {
        localStorage.setItem('dhaniverse_room_code', roomCode.trim());
      }
      
      // Navigate to the game page without username in URL
      navigate('/game');
    } else {
      setError('Username must be at least 3 characters long');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1 className="pixeloid">DHANIVERSE</h1>
        <p className="tagline">A Multiplayer Financial Learning Experience</p>
      </header>

      <section className="landing-content">
        {!showJoinForm ? (
          <div className="welcome-container">
            <div className="description">
              <h2>Welcome to Dhaniverse</h2>
              <p>Explore a virtual world where you can learn about financial concepts while having fun!</p>
              <ul className="features">
                <li>💰 Learn banking concepts</li>
                <li>📈 Trade in a simulated stock market</li>
                <li>🧑‍🤝‍🧑 Interact with other players in real-time</li>
                <li>🏦 Visit different buildings with financial institutions</li>
              </ul>
              <button 
                className="play-button pixeloid" 
                onClick={() => setShowJoinForm(true)}
              >
                Play Now
              </button>
            </div>
            <div className="screenshot-container">
              {/* You can add a screenshot of your game here */}
              <div className="game-preview">
                Game Preview
              </div>
            </div>
          </div>
        ) : (
          <div className="join-container pixeloid">
            <h2>Enter Dhaniverse</h2>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username" 
              maxLength={15}
              onKeyDown={handleKeyPress}
              autoFocus
              className="pixeloid"
            />
            <input 
              type="text" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Room Code (optional)" 
              maxLength={10}
              className="pixeloid mt-3"
            />
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button type="button" onClick={() => setShowJoinForm(false)} className="back-button">
                Back
              </button>
              <button type="submit" onClick={handleJoin} className="join-button">
                Join Game
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="landing-footer">
        <p>&copy; 2025 Dhaniverse - Learn Finance Through Play</p>
      </footer>
    </div>
  );
};

export default LandingPage;