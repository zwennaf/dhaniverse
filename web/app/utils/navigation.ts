// URL configuration for different environments
// This handles routing between web client (landing) and game client

const isClient = typeof window !== 'undefined';
const hostname = isClient ? window.location.hostname : '';
const port = isClient ? window.location.port : '';

// Environment detection
const isDevelopment = isClient && (hostname === 'localhost' || hostname === '127.0.0.1');
const isProduction = !isDevelopment;

// Allow runtime overrides via env vars (useful in CI/containers)
const OVERRIDES = {
  web: process.env.NEXT_PUBLIC_WEB_URL,
  game: process.env.NEXT_PUBLIC_GAME_URL,
  api: process.env.NEXT_PUBLIC_API_BASE_URL,
};

// Base URLs for different environments (fallbacks)
const URLS = {
  development: {
    web: OVERRIDES.web || `http://localhost:3000`,           // Landing page (Next.js)
    game: OVERRIDES.game || `http://localhost:5173`,        // Game client (Vite)
    // Keep empty so callers must use getApiUrl which applies proxy rules
    api: OVERRIDES.api || '',
  },
  production: {
    web: OVERRIDES.web || 'https://dhaniverse.in',
    game: OVERRIDES.game || 'https://game.dhaniverse.in',
    api: OVERRIDES.api || 'https://api.dhaniverse.in',
  },
};

const currentEnv = isDevelopment ? 'development' : 'production';
const urls = URLS[currentEnv];

// (helpers defined earlier)

// Navigation utilities
export const navigationUrls = {
  // Auth pages (handled by game client)
  signIn: `${urls.game}/sign-in`,
  signUp: `${urls.game}/sign-up`, 
  // Profile should point to the game client in production, but use the dev game server in development.
  profile: (() => {
    // If an explicit override is set, use that
    if (OVERRIDES.game) return `${OVERRIDES.game.replace(/\/$/, '')}/profile`;
    // If running on the game dev server already, use a relative path
    if (isClient && (hostname === 'localhost' && port === '5173')) return '/profile';
    return `${urls.game}/profile`;
  })(),
  
  // Game (on game domain, but route to /play)
  game: `${urls.game}/play`,
  
  // Landing page sections
  home: `${urls.web}/`,
  features: `${urls.web}/#features`,
  testimonials: `${urls.web}/#testimonials`,
  
  // API endpoints
  api: {
    session: '',
    signout: '',
    auth: '',
  },
};

// Helper functions for cross-domain navigation
export const getGameUrl = () => navigationUrls.game;
export const getSignInUrl = () => navigationUrls.signIn;
export const getSignUpUrl = () => navigationUrls.signUp;
export const getProfileUrl = () => navigationUrls.profile;
export const getHomeUrl = () => navigationUrls.home;
export const getApiUrl = (endpoint: string) => {
  // If running on the Next.js web client, route auth endpoints through the relative proxy so cookies are forwarded.
  if (isClient && isOnWebDomain() && endpoint.startsWith('/auth')) {
    return `/api${endpoint}`; // e.g. /api/auth/session
  }
  return `${urls.api}${endpoint}`;
};

// Fill navigationUrls.api with resolved endpoints after getApiUrl is available
navigationUrls.api.session = getApiUrl('/auth/session');
navigationUrls.api.signout = getApiUrl('/auth/signout');
navigationUrls.api.auth = getApiUrl('/auth');

// Navigation functions for external links (cross-domain)
export const navigateToGame = () => {
  if (isClient) {
    window.location.href = getGameUrl();
  }
};

export const navigateToSignIn = () => {
  if (isClient) {
    window.location.href = getSignInUrl();
  }
};

export const navigateToSignUp = () => {
  if (isClient) {
    window.location.href = getSignUpUrl();
  }
};

export const navigateToProfile = () => {
  if (isClient) {
    window.location.href = getProfileUrl();
  }
};

export const navigateToHome = () => {
  if (isClient) {
    window.location.href = getHomeUrl();
  }
};

// Check if current URL is on the game domain
export const isOnGameDomain = () => {
  if (!isClient) return false;
  const currentUrl = window.location.origin;
  return currentUrl === urls.game;
};

// Check if current URL is on the web domain  
export const isOnWebDomain = () => {
  if (!isClient) return false;
  const currentUrl = window.location.origin;
  return currentUrl === urls.web;
};

// Route handlers for the game client
export const handleGameClientRouting = () => {
  if (!isClient || !isOnGameDomain()) return;
  
  const path = window.location.pathname;
  
  // Game client routes
  switch (path) {
    case '/sign-in':
    case '/sign-up':
    case '/profile':
      // Redirect auth pages to web domain
      window.location.href = `${urls.web}${path}`;
      break;
    case '/':
      // Root path redirects to landing page
      window.location.href = urls.web;
      break;
    case '/play':
      // This is the correct route for the game - do nothing
      break;
    default:
      // Unknown routes redirect to landing page
      window.location.href = urls.web;
      break;
  }
};

// Route handlers for the web client
export const handleWebClientRouting = () => {
  if (!isClient || !isOnWebDomain()) return;
  
  const path = window.location.pathname;
  
  // Web client routes
  switch (path) {
    case '/play':
    case '/game':
      // Game routes redirect to game domain
      window.location.href = navigationUrls.game;
      break;
    case '/':
    case '/sign-in':
    case '/sign-up':
    case '/profile':
      // These are valid web routes - do nothing
      break;
    default:
      // Unknown routes stay on web domain (404 will be handled by Next.js)
      break;
  }
};

// Initialize routing system (call this in both clients)
export const initializeRouting = () => {
  if (isOnGameDomain()) {
    handleGameClientRouting();
  } else if (isOnWebDomain()) {
    handleWebClientRouting();
  }
};

// For debugging
export const getCurrentEnvironment = () => ({
  isDevelopment,
  isProduction,
  hostname,
  port,
  currentEnv,
  urls,
  isOnGameDomain: isOnGameDomain(),
  isOnWebDomain: isOnWebDomain(),
});