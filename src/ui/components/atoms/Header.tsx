import React, { useEffect, useRef, useState } from 'react';
import PixelButton from './PixelButton';
import { cn } from '../lib/utils';
import CoinIcon from '../icons/CoinIcon';
import { Link } from 'react-router-dom';
import { useUser, useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  className?: string;
  enableIntroAnimation?: boolean; // enables the intro logo animation
  onAnimationComplete?: () => void; // callback when animation finishes
}

const Header = ({ className, enableIntroAnimation = false, onAnimationComplete }: HeaderProps) => {
  const { isSignedIn } = useUser();
  const { signOut } = useAuth();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState(false);
  const [initialTransform, setInitialTransform] = useState<{x:number; y:number; scale:number}>({x:0,y:0,scale:1});
  const [animDone, setAnimDone] = useState(!enableIntroAnimation);
  const [startMorph, setStartMorph] = useState(false);
  
  // Animation timing constants (optimized for responsiveness)
  const HOLD_MS = 500; // ms to hold logo at center
  const MOVE_MS = 600; // ms to morph to header
  const HEADER_REVEAL_MS = 0; // ms for header to fully appear

  // Setup morphing animation after DOM content loads
  useEffect(() => {
    if (!enableIntroAnimation) return;

    const handleContentLoaded = () => {
      // Start measuring after content loads
      setTimeout(() => {
        const measure = () => {
          if (!logoRef.current) return;
          const rect = logoRef.current.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const cx = vw / 2;
          const cy = vh / 2;
          const targetX = rect.left + rect.width / 2;
          const targetY = rect.top + rect.height / 2;
          // Scale to fit nicely on screen
          const desiredW = vw * 0.7;
          const desiredH = vh * 0.4;
          const scaleW = desiredW / rect.width;
          const scaleH = desiredH / rect.height;
          const initialScale = Math.max(2, Math.min(scaleW, scaleH));
          // Calculate offset from center to final position
          const x = targetX - cx;
          const y = targetY - cy;
          setInitialTransform({ x, y, scale: initialScale });
          setMeasured(true);
        };
        requestAnimationFrame(measure);
        window.addEventListener('resize', measure);
      }, 100);
    };

    // Check if content is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      handleContentLoaded();
    } else {
      document.addEventListener('DOMContentLoaded', handleContentLoaded);
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', handleContentLoaded);
      window.removeEventListener('resize', () => {});
    };
  }, [enableIntroAnimation]);

  // Complete animation sequence
  useEffect(() => {
    if (!enableIntroAnimation || animDone || !measured) return;
    const total = HOLD_MS + MOVE_MS + HEADER_REVEAL_MS;
    const timer = setTimeout(() => {
      setAnimDone(true);
      onAnimationComplete?.();
    }, total);
    return () => clearTimeout(timer);
  }, [enableIntroAnimation, measured, animDone, onAnimationComplete]);

  // Ensure the morph animation reliably starts even if `measured` is true at mount.
  // Toggling `startMorph` after a frame forces the motion component to pick up the
  // transition and prevents the animation from appearing already finished on load.
  useEffect(() => {
    if (!measured) return;
    setStartMorph(false);
    const raf = requestAnimationFrame(() => setStartMorph(true));
    return () => cancelAnimationFrame(raf);
  }, [measured]);

  // Actions reveal timing
  const actionsVariants: Record<string, any> = {
    hidden: { opacity: 1, filter: 'blur(6px)' },
    show: {
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.4,
        ease: 'linear',
        delay: 0.2
      }
    }
  };
  
  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const actionsShouldShow = animDone || !enableIntroAnimation;

  return (
    <>
      {/* Logo overlay that morphs from center - only after content loads */}
      {enableIntroAnimation && !animDone && (
        <motion.div
          className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          {/* Always render a centered logo so it's visible immediately. Once measured becomes true
              the animate prop will change and the morphing animation will run. */}
          <motion.div
            className="flex gap-4 items-center"
            // always start fully opaque to avoid an initial fade
            style={{ opacity: 1, willChange: 'transform, opacity' }}
            initial={{
              // start from the enlarged centered state
              scale: 3,
              x: 0,
              y: 0,
              opacity: 1
            }}
            // use startMorph to reliably trigger the transition
            animate={startMorph ? {
              scale: 1,
              x: initialTransform.x,
              y: initialTransform.y,
              opacity: 1
            } : {
              scale: 3,
              x: 0,
              y: 0,
              opacity: 1
            }}
            transition={{
              delay: startMorph ? HOLD_MS/1000 : 0,
              duration: startMorph ? MOVE_MS/1000 : 0,
              ease: [0.16, 1, 0.3, 1],
              type: 'tween'
            }}
            aria-hidden={animDone}
          >
            <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
            <span className="font-vcr text-dhani-text text-2xl sm:text-3xl lg:text-4xl">Dhaniverse</span>
          </motion.div>
        </motion.div>
      )}

      <header
        ref={headerRef}
        className={cn(
          "max-w-screen-xl flex items-center justify-between py-4 px-4 backdrop-blur-sm nav-corners transition-all duration-500",
          // Only hide the header when the morph is about to run (measured) so we don't
          // prematurely fade it out on DOMContentLoaded and cause a fade in later.
          (!animDone && enableIntroAnimation && measured) ? "bg-transparent border-transparent opacity-0" : "bg-dhani-navbg border-dhani-navbg opacity-100",
          className
        )}
      >
        {/* Logo always visible initially */}
        <div
          ref={logoRef}
          // keep header logo visible while the centered logo sits on screen; hide it only when
          // we're about to run the morph (measured = true) so the two don't overlap.
          className={(!animDone && enableIntroAnimation && measured) ? "invisible" : "visible"}
        >
          <Link to="/" data-brand-anchor className="flex gap-4 items-center">
            <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
            <span className="font-vcr text-dhani-text text-2xl sm:text-3xl lg:text-4xl">Dhaniverse</span>
          </Link>
        </div>

        {/* Actions */}
        {enableIntroAnimation ? (
          <motion.div
            variants={actionsVariants}
            initial={actionsShouldShow ? 'show' : 'hidden'}
            animate={actionsShouldShow ? 'show' : 'hidden'}
          >
            {isSignedIn ? (
              <div className="flex gap-3">
                <Link to="/game">
                  <PixelButton size='lg' className="hover:bg-dhani-gold/50">Play Now</PixelButton>
                </Link>
                <PixelButton variant="signout" className="hover:bg-red-400/70" onClick={handleSignOut}>Sign Out</PixelButton>
              </div>
            ) : (
              <Link to="/sign-in">
                <PixelButton size='lg' className="hover:bg-dhani-gold/50">Sign In</PixelButton>
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            {isSignedIn ? (
              <div className="flex gap-3">
                <Link to="/game">
                  <PixelButton size='lg' className="hover:bg-dhani-gold/50">Play Now</PixelButton>
                </Link>
                <PixelButton variant="signout" className="hover:bg-red-400/70" onClick={handleSignOut}>Sign Out</PixelButton>
              </div>
            ) : (
              <Link to="/sign-in">
                <PixelButton size='lg' className="hover:bg-dhani-gold/50">Sign In</PixelButton>
              </Link>
            )}
          </>
        )}
      </header>
    </>
  );
};

export default Header;
