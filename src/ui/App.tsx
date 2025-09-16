import React, { useEffect } from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { navigateToSignIn, navigateToSignUp, navigateToProfile, navigateToHome } from '../utils/navigation';

import LandingPage from './components/LandingPage';
import GamePage from './components/GamePage';
import ProtectedGameRoute from './components/ProtectedGameRoute';
import CustomSignIn from './components/auth/CustomSignIn';
import CustomSignUp from './components/auth/CustomSignUp';
import MagicLinkVerification from './components/auth/MagicLinkVerification';
import Profile from './components/auth/Profile';
import AdminPage from './admin/AdminPage';
import BannedPageWrapper from './components/BannedPageWrapper';

// Redirect component for cross-domain navigation
const CrossDomainRedirect: React.FC<{ to: string, navigateFn: () => void }> = ({ navigateFn }) => {
  useEffect(() => {
    navigateFn();
  }, [navigateFn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto mb-4"></div>
        <div>Redirecting...</div>
      </div>
    </div>
  );
};

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
  
  return isSignedIn ? <>{children}</> : <CrossDomainRedirect to="/sign-in" navigateFn={navigateToSignIn} />;
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
      {/* Root route redirects to landing page */}
      <Route path="/" element={<CrossDomainRedirect to="/" navigateFn={navigateToHome} />} />
      
      {/* Auth routes - Game client handles these */}
      <Route 
        path="/sign-in" 
        element={<PublicRoute><CustomSignIn /></PublicRoute>}
      />
      <Route 
        path="/sign-up" 
        element={<PublicRoute><CustomSignUp /></PublicRoute>}
      />
      <Route
        path="/profile"
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />
      
      {/* Main game route - this is what should be accessed */}
      <Route
        path="/play"
        element={<ProtectedGameRoute />}
      />
      
      {/* Legacy game route for backwards compatibility */}
      <Route
        path="/game"
        element={<ProtectedGameRoute />}
      />
      
      {/* Magic link verification route - accessible without authentication */}
      <Route path="/auth/magic" element={<MagicLinkVerification />} />
      
      {/* Banned page route - accessible without authentication */}
      <Route path="/banned" element={<BannedPageWrapper />} />
      
      {/* Admin route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      
      {/* Fallback: unknown routes redirect to landing page */}
      <Route path="*" element={<CrossDomainRedirect to="/" navigateFn={navigateToHome} />} />
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