import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LandingPage from './components/LandingPage';
import GamePage from './components/GamePage';
import CustomSignIn from './components/auth/CustomSignIn';
import CustomSignUp from './components/auth/CustomSignUp';
import MagicLinkVerification from './components/auth/MagicLinkVerification';
import Profile from './components/auth/Profile';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }
  
  return isSignedIn ? <>{children}</> : <Navigate to="/sign-in" replace />;
};

// Public Route component (redirect to profile if signed in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/sign-in" 
        element={
          <PublicRoute>
            <CustomSignIn />
          </PublicRoute>
        } 
      />
      <Route 
        path="/sign-up" 
        element={
          <PublicRoute>
            <CustomSignUp />
          </PublicRoute>
        } 
      />
      
      {/* Magic link verification route - accessible without authentication */}
      <Route path="/auth/magic" element={<MagicLinkVerification />} />
      
      {/* Protected routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;