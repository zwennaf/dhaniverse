import React from 'react';

// Small helper to detect desktop vs mobile. Intentionally conservative.
const isDesktop = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  // Treat tablets as mobile for this message
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

const DesktopWarning: React.FC = () => {
  if (isDesktop()) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#111',
        padding: 24,
        borderRadius: 12,
        maxWidth: 520,
        width: '90%',
        color: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{color: '#FFC700', marginBottom: 12}}>Desktop Recommended</h2>
        <p style={{marginBottom: 12}}>
          The Dhaniverse game is optimized for desktop browsers. For the best
          experience, open this page on a laptop or desktop computer.
        </p>
        <div style={{fontSize: 40}}>🖥️</div>
      </div>
    </div>
  );
};

export default DesktopWarning;
