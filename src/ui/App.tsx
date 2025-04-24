import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import LandingPage from './components/LandingPage';
import GamePage from './components/GamePage';
import CustomSignIn from './components/auth/CustomSignIn';
import CustomSignUp from './components/auth/CustomSignUp';
import Profile from './components/auth/Profile';

const App: React.FC = () => {
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!PUBLISHABLE_KEY) throw new Error('Missing Publishable Key');
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<CustomSignIn />} />
        <Route path="/sign-up" element={<CustomSignUp />} />
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

export default App;