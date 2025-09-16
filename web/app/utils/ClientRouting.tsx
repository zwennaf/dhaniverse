'use client';

import { useEffect } from 'react';
import { initializeRouting } from './navigation';

// Client-side routing component to handle cross-domain navigation
export default function ClientRouting() {
  useEffect(() => {
    // Initialize routing system on client-side mount
    initializeRouting();
  }, []);

  // This component renders nothing, it just handles routing logic
  return null;
}