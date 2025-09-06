import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BannedPage from './BannedPage';

interface BanInfo {
  reason: string;
  banType: string;
  expiresAt?: string;
}

/**
 * Wrapper component for BannedPage that reads ban information from sessionStorage
 * This component is used when users are redirected to /banned after authentication fails due to ban
 */
const BannedPageWrapper: React.FC = () => {
  const navigate = useNavigate();
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Read ban info from sessionStorage
      const storedBanInfo = sessionStorage.getItem('banInfo');
      if (storedBanInfo) {
        const parsedBanInfo = JSON.parse(storedBanInfo);
        setBanInfo(parsedBanInfo);
      } else {
        // No ban info found, user is not banned - redirect to home page
        console.log('No ban info found, user is not banned, redirecting to home');
        navigate('/', { replace: true });
        return;
      }
    } catch (error) {
      console.error('Failed to read ban info from sessionStorage:', error);
      // On error, redirect to home page (user is not banned)
      navigate('/', { replace: true });
      return;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Clear ban info from sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('banInfo');
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <div className="font-vcr">Loading ban information...</div>
        </div>
      </div>
    );
  }

  if (!banInfo) {
    // This shouldn't happen due to the redirect in useEffect, but just in case
    return null;
  }

  return (
    <BannedPage
      reason={banInfo.reason}
      banType={banInfo.banType}
      expiresAt={banInfo.expiresAt}
    />
  );
};

export default BannedPageWrapper;
