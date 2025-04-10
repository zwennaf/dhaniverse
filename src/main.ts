import './style.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui/App.tsx';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get join-screen container for React
  const joinScreen = document.getElementById('join-screen');
  
  // Render the React app in the join screen
  if (joinScreen) {
    const root = ReactDOM.createRoot(joinScreen);
    root.render(React.createElement(App));
  }
});
