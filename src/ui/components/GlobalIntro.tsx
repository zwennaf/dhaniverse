import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import CoinIcon from './icons/CoinIcon';

/**
 * GlobalIntro renders a mandatory first-load animation.
 * It measures the header brand anchor and morphs a centered large logo into place.
 * Dispatches 'introAnimationComplete' when done.
 */
const HOLD_MS = 500;      // time logo holds centered before moving
const MOVE_MS = 600;      // duration of morph into header
const OVERLAY_FADE_MS = 650; // backdrop fade timing (slightly overlaps move)
const MIN_INITIAL_SCALE = 3; // enforce a minimum starting scale like original impl
const MOVE_START_EVENT = 'introAnimationMoveStart';
const COMPLETE_EVENT = 'introAnimationComplete';
const FINE_TUNE_X = 8; // px: subtle right shift to better align with header logo

const GlobalIntro: React.FC = () => {
  // Do not show the global intro on the in-game route
  if (typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/game') ||
    window.location.pathname.startsWith('/sign-in') ||
    window.location.pathname.startsWith('/sign-up') ||
    window.location.pathname.startsWith('/profile')
  )) {
    return null;
  }

  const [ready, setReady] = useState(false);          // measurement finished & target known
  const [start, setStart] = useState(false);          // entire sequence started (frame after ready)
  const [moveStarted, setMoveStarted] = useState(false); // movement phase begun (after hold)
  const [target, setTarget] = useState<{x:number;y:number;scale:number}>({x:0,y:0,scale:1});
  const [measuredSize, setMeasuredSize] = useState<{width:number;height:number,fontSize:string,fontFamily:string} | null>(null);
  const [finished, setFinished] = useState(false);    // unmount trigger
  const dispatchedRef = useRef(false);                // completion event guard
  const measuringRef = useRef(false);

  const measure = useCallback(() => {
    if (finished) return;
    const anchor = document.querySelector('[data-brand-anchor]') as HTMLElement | null;
    if (!anchor) return; // wait for next resize or initial loop
    const rect = anchor.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const vw = window.innerWidth; const vh = window.innerHeight;
    const cx = vw/2; const cy = vh/2;
  const targetX = rect.left + rect.width/2; const targetY = rect.top + rect.height/2;
    const desiredW = vw * 0.7; const desiredH = vh * 0.4;
    const scaleW = desiredW / rect.width; const scaleH = desiredH / rect.height;
  const initialScale = Math.max(MIN_INITIAL_SCALE, Math.min(scaleW, scaleH));
  // compute computed styles once to keep typography stable while animating
  const cs = window.getComputedStyle(anchor);
  const fontSize = cs.fontSize || '32px';
  const fontFamily = cs.fontFamily || '';

  const next = { x: targetX - cx + FINE_TUNE_X, y: targetY - cy, scale: initialScale };

  // Avoid tiny updates that cause extra renders/layout shifts
  const prev = target;
  const dx = Math.abs(prev.x - next.x);
  const dy = Math.abs(prev.y - next.y);
  const ds = Math.abs(prev.scale - next.scale);
  if (dx > 2 || dy > 2 || ds > 0.02 || measuredSize === null) {
    setTarget(next);
    setMeasuredSize({ width: rect.width, height: rect.height, fontSize, fontFamily });
  }
  }, [finished]);

  // Measure header brand anchor repeatedly until it exists & has size
  useEffect(() => {
    let attempts = 0;
    const MAX = 80; // allow a bit more time if fonts/layout shifting
    measuringRef.current = true;
    const start = () => {
      function loop() {
        measure();
        const anchor = document.querySelector('[data-brand-anchor]');
        // When we've captured measuredSize once, consider ready (stable)
        if (anchor && measuredSize) {
          setReady(true);
          measuringRef.current = false;
          return;
        }
        if (attempts++ < MAX) requestAnimationFrame(loop); else { setReady(true); measuringRef.current = false; }
      }
      requestAnimationFrame(loop);
    };
    if ((document as any).fonts?.status === 'loaded') start(); else (document as any).fonts?.ready.then(start).catch(start);
    return () => { measuringRef.current = false; };
  }, [measure, target.scale]);

  // Re-measure on resize until movement completes for responsiveness
  useEffect(() => {
    if (finished) return;
    const onResize = () => { if (!finished) measure(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, finished]);

  // Kick animation start after we are ready
  useEffect(() => {
    if (!ready) return;
    const raf = requestAnimationFrame(() => setStart(true));
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // Kick movement start after HOLD and dispatch move start event (for header fade-in)
  useEffect(() => {
    if (!start) return;
    const t = setTimeout(() => {
      // Re-measure right before movement to correct any late layout shifts
      measure();
      setMoveStarted(true);
      window.dispatchEvent(new Event(MOVE_START_EVENT));
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [start, measure]);

  // Completion dispatch
  useEffect(() => {
    if (!start) return;
    const total = HOLD_MS + MOVE_MS;
    const t = setTimeout(() => {
      if (dispatchedRef.current) return;
      dispatchedRef.current = true;
      window.dispatchEvent(new Event(COMPLETE_EVENT));
      setFinished(true); // trigger unmount + exit animation
    }, total + 40); // slight buffer
    return () => clearTimeout(t);
  }, [start]);

  return (
    <AnimatePresence>
      {!finished && (
        <>
          {/* Backdrop that fades out when movement begins for seamless reveal */}
          <motion.div
            className="fixed inset-0 z-[75] bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: moveStarted ? 0 : 1 }}
            transition={{ duration: OVERLAY_FADE_MS/1000, ease: [0.4,0.8,0.4,1] }}
            style={{ pointerEvents: 'none' }}
          />
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 1 }}
            animate={{ opacity: moveStarted ? 1 : 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45 } }}
          >
            <motion.div
              key={start ? 'anim' : 'hold'}
              className="flex gap-4 items-center"
              style={{ willChange: 'transform, opacity' }}
              initial={{ scale: ready ? target.scale : 3, x: 0, y: 0, opacity: 1 }}
              animate={start ? { scale: moveStarted ? 1 : target.scale, x: moveStarted ? target.x : 0, y: moveStarted ? target.y : 0, opacity: 1 } : { scale: ready ? target.scale : 3, x: 0, y: 0, opacity: 1 }}
              transition={start ? moveStarted ? { duration: MOVE_MS/1000, ease: [0.16,1,0.3,1] } : { duration: 0 } : { duration: 0 }}
            >
              <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
              {/* Match header exact typography classes to ensure identical final size */}
              <span className="font-vcr text-dhani-text text-2xl sm:text-3xl lg:text-4xl">Dhaniverse</span>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GlobalIntro;
