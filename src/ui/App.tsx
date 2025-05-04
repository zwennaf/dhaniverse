import React from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';

import LandingPage from './components/LandingPage';
import GamePage from './components/GamePage';
import CustomSignIn from './components/auth/CustomSignIn';
import CustomSignUp from './components/auth/CustomSignUp';
import Profile from './components/auth/Profile';
import { nav } from 'node_modules/framer-motion/dist/m';

const ClerkWithRoutes = () => {
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!PUBLISHABLE_KEY) throw new Error('Missing Publishable Key');
  const navigate = useNavigate();
  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary: 'bg-dhani-gold hover:bg-dhani-gold/80 text-white',
          socialButtonsBlockButton: 'bg-dhani-dark border border-dhani-gold/30 text-dhani-text'
        }
      }}
    >
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in/*" element={<CustomSignIn />} />
        <Route path="/sign-up/*" element={<CustomSignUp />} />
        {/* Profile route for setting in-game username */}
        <Route
          path="/profile"
          element={
            <>
              <SignedIn>
                <Profile />
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        />
        {/* Protected game route */}
        <Route
          path="/game"
          element={
            <>
              <SignedIn>
                <GamePage />
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ClerkProvider>
  );
};

const App: React.FC = () => {
  return <ClerkWithRoutes />;
};

export default App;