import React from "react";
import { useNavigate } from "react-router-dom";

// Simplified device detection function
const isMobileDevice = () => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  return false;
};

// Mobile view component
const MobileView = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 9999
  }}>
    <div style={{
      backgroundColor: '#282828',
      padding: '24px',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(255, 199, 0, 0.2)',
      textAlign: 'center',
      color: 'white'
    }}>
      <h1 style={{
        fontSize: '24px',
        color: '#FFC700',
        marginBottom: '16px',
        fontWeight: 'bold'
      }}>
        Desktop Only Experience
      </h1>
      <p style={{
        margin: '16px 0'
      }}>
        Dhaniverse is currently optimized for desktop computers only.
        Please visit us on a laptop or desktop computer for the best experience.
      </p>
      <div style={{
        width: '80px',
        height: '80px',
        margin: '20px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px'
      }}>
        <span style={{fontSize: '40px'}}>🖥️</span>
      </div>
      <p style={{
        fontSize: '14px',
        color: 'rgba(255,255,255,0.6)'
      }}>
        We're considering mobile support in future updates!
      </p>
    </div>
  </div>
);

const CustomSignUp: React.FC = () => {
  // Check for mobile immediately before any other logic
  if (isMobileDevice()) {
    return <MobileView />;
  }

  const navigate = useNavigate();

  // Redirect to sign-in page since we now use magic links for both sign-in and sign-up
  React.useEffect(() => {
    navigate('/sign-in', { replace: true });
  }, [navigate]);

  return null;
};

export default CustomSignUp;