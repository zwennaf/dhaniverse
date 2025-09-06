import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { banCheckService, BanCheckResponse } from '../../services/BanCheckService';
import GamePage from './GamePage';
import BannedPage from './BannedPage';

/**
 * Protected Game Route with Ban Checking
 * This component wraps the GamePage and checks for ban status before allowing access
 */
const ProtectedGameRoute: React.FC = () => {
  const { isSignedIn, isLoaded, user } = useAuth();
  const navigate = useNavigate();
  const [banStatus, setBanStatus] = useState<BanCheckResponse | null>(null);
  const [isCheckingBan, setIsCheckingBan] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    // Check ban status
    const checkBanStatus = async () => {
      setIsCheckingBan(true);
      try {
        const banInfo = await banCheckService.checkCurrentUserBan();
        setBanStatus(banInfo);
        
        if (banInfo.banned) {
          banCheckService.handleBanDetected(banInfo);
        }
      } catch (error) {
        console.error('Failed to check ban status:', error);
        // On error, allow access (fail open)
        setBanStatus({ banned: false });
      } finally {
        setIsCheckingBan(false);
      }
    };

    checkBanStatus();
  }, [isSignedIn, isLoaded, navigate, user]);

  // Listen for real-time ban events
  useEffect(() => {
    const handleBanEvent = (event: CustomEvent) => {
      const banInfo = event.detail;
      console.log('ProtectedGameRoute: Ban event received', banInfo);
      setBanStatus(banInfo);
      banCheckService.handleBanDetected(banInfo);
    };

    window.addEventListener('user-banned', handleBanEvent as EventListener);
    
    return () => {
      window.removeEventListener('user-banned', handleBanEvent as EventListener);
    };
  }, []);

  // Start/stop periodic ban checking based on game access
  useEffect(() => {
    if (!banStatus?.banned && !isCheckingBan && isSignedIn) {
      // Start periodic ban checking when game is accessible
      import('../../main').then(({ startPeriodicBanCheck }) => {
        startPeriodicBanCheck();
      }).catch(console.error);
    }

    return () => {
      // Stop periodic ban checking when component unmounts
      import('../../main').then(({ stopPeriodicBanCheck }) => {
        stopPeriodicBanCheck();
      }).catch(console.error);
    };
  }, [banStatus?.banned, isCheckingBan, isSignedIn]);

  // Loading state
  if (!isLoaded || isCheckingBan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <div className="font-vcr">Checking access permissions...</div>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return null; // Will redirect in useEffect
  }

  // User is banned
  if (banStatus?.banned) {
    return (
      <BannedPage
        reason={banStatus.reason}
        banType={banStatus.banType}
        expiresAt={banStatus.expiresAt}
      />
    );
  }

  // User is allowed to access the game
  return <GamePage />;
};

export default ProtectedGameRoute;
