import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import GamePage from './components/GamePage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;