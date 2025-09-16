// URL configuration for different environments 
// This handles routing between game client (Vite/Phaser) and web client (Next.js)

const isClient = typeof window !== 'undefined';
const hostname = isClient ? window.location.hostname : '';
const port = isClient ? window.location.port : '';

// Environment detection
const isDevelopment = isClient && (hostname === 'localhost' || hostname === '127.0.0.1');
const isProduction = !isDevelopment;

// Base URLs for different environments
const URLS = {
  development: {
    web: `http://localhost:3000`,           // Landing page (Next.js)
    game: `http://localhost:5173`,          // Game client (Vite)
    api: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  },
  production: {
    web: 'https://dhaniverse.in',           // Landing page
    game: 'https://game.dhaniverse.in',     // Game client  
    api: 'https://api.dhaniverse.in',       // API server
  },
};

const currentEnv = isDevelopment ? 'development' : 'production';
const urls = URLS[currentEnv];

// Helper functions
function getEnvironment(): 'development' | 'production' {
  return currentEnv;
}

function getUrls() {
  return urls;
}

function isGameDomain(): boolean {
  if (!isClient) return false;
  return hostname.includes('game.') || 
         (hostname === 'localhost' && port === '5173');
}

// Navigation utilities
export const navigationUrls = {
  // Auth pages (always on web/landing domain)
  signIn: `${urls.web}/sign-in`,
  signUp: `${urls.web}/sign-up`, 
  profile: `${urls.web}/profile`,
  
  // Game (on game domain, but route to /play)
  game: `${urls.game}/play`,
  
  // Landing page sections
  home: `${urls.web}/`,
  features: `${urls.web}/#features`,
  testimonials: `${urls.web}/#testimonials`,
  
  // API endpoints
  api: {
    session: `${urls.api}/session`,
    signout: `${urls.api}/signout`,
    auth: `${urls.api}/auth`,
  },
};

// Navigation functions that automatically handle cross-domain routing
export function navigateToHome(): void {
  if (!isClient) return;
  const targetUrl = `${urls.web}/`;
  console.log('[Navigation] Navigating to home:', targetUrl);
  window.location.href = targetUrl;
}

export function navigateToSignIn(): void {
  if (!isClient) return;
  const targetUrl = `${urls.web}/sign-in`;
  console.log('[Navigation] Navigating to sign-in:', targetUrl);
  window.location.href = targetUrl;
}

export function navigateToSignUp(): void {
  if (!isClient) return;
  const targetUrl = `${urls.web}/sign-up`;
  console.log('[Navigation] Navigating to sign-up:', targetUrl);
  window.location.href = targetUrl;
}

export function navigateToProfile(): void {
  if (!isClient) return;
  const targetUrl = `${urls.web}/profile`;
  console.log('[Navigation] Navigating to profile:', targetUrl);
  window.location.href = targetUrl;
}

export function navigateToGame(): void {
  if (!isClient) return;
  const targetUrl = `${urls.game}/play`;
  console.log('[Navigation] Navigating to game:', targetUrl);
  window.location.href = targetUrl;
}

// Route handling - determines what to do based on current path
export function initializeRouting(): void {
  if (!isClient) return;
  
  const currentPath = window.location.pathname;
  const currentDomain = isGameDomain();
  
  console.log('[Navigation] Current path:', currentPath);
  console.log('[Navigation] Is game domain:', currentDomain);
  console.log('[Navigation] Environment:', currentEnv);
  console.log('[Navigation] URLs:', urls);
  
  if (currentDomain) {
    // We're on the game client
    // Game client handles: /play, /sign-in, /sign-up, /profile, /auth/*, /banned, /admin
    const gameRoutes = ['/play', '/sign-in', '/sign-up', '/profile', '/game', '/banned', '/admin'];
    const isAuthRoute = currentPath.startsWith('/auth/');
    const isGameRoute = gameRoutes.includes(currentPath) || isAuthRoute;
    
    if (!isGameRoute && currentPath !== '/') {
      // Unknown routes redirect to web client
      const targetUrl = `${urls.web}${currentPath}`;
      console.log('[Navigation] Game client redirecting unknown route to web:', targetUrl);
      window.location.href = targetUrl;
    } else if (currentPath === '/') {
      // Root path redirects to web client landing page
      const targetUrl = `${urls.web}/`;
      console.log('[Navigation] Game client root redirecting to web:', targetUrl);
      window.location.href = targetUrl;
    }
    // All other routes stay on game client
  } else {
    // We're on the web client  
    if (currentPath === '/play') {
      // Web client should redirect /play to game client
      console.log('[Navigation] Web client redirecting /play to game');
      navigateToGame();
    }
    // All other routes (/, /sign-in, /sign-up, /profile) stay on web client
  }
}

// Handle route changes for single-page apps
export function handleRouteChange(newPath: string): void {
  if (!isClient) return;
  
  const currentDomain = isGameDomain();
  
  if (currentDomain && newPath !== '/play') {
    // Game client trying to navigate to non-game route
    const targetUrl = `${urls.web}${newPath}`;
    console.log('[Navigation] Game client route change redirecting:', targetUrl);
    window.location.href = targetUrl;
  } else if (!currentDomain && newPath === '/play') {
    // Web client trying to navigate to game
    console.log('[Navigation] Web client route change redirecting to game');
    navigateToGame();
  }
}

// Export for external use
export { getEnvironment, getUrls, isGameDomain };

// For debugging
if (isClient && currentEnv === 'development') {
  console.log('[Navigation] Debug info:', {
    hostname,
    port, 
    environment: currentEnv,
    isGameDomain: isGameDomain(),
    urls
  });
}