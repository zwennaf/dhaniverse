import React, { useEffect } from 'react';
import { navigateToHome } from '../../utils/navigation';

const LandingPage = () => {
  useEffect(() => {
    // Game client landing page should redirect to web client
    navigateToHome();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto mb-4"></div>
        <div>Redirecting to landing page...</div>
      </div>
    </div>
  );
};

export default LandingPage;