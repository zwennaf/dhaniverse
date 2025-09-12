// LocationTracker.tsx - single, minimal, canonical implementation
import React, { useMemo, useRef, useEffect } from 'react';

type Vec2 = { x: number; y: number };

interface LocationTrackerProps {
  targetPosition: Vec2;
  playerPosition: Vec2;
  cameraPosition?: Vec2;
  screenSize?: { width: number; height: number };
  enabled: boolean;
  targetImage?: string;
  targetName?: string;
}

const MARGIN = 48;
const AVATAR_SIZE = 56;
const ORBIT_RADIUS = 36;
const HYSTERESIS = 10;
const PRIVACY_OFFSET = 28;
const HIDE_RADIUS = 80;
const HEAD_OFFSET = 12; // pixels above the avatar center to position the locator

const pointOnPerimeter = (angleRad: number, w: number, h: number, margin: number) => {
  const cx = w / 2;
  const cy = h / 2;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);

  const minX = margin + AVATAR_SIZE / 2;
  const maxX = w - margin - AVATAR_SIZE / 2;
  const minY = margin + AVATAR_SIZE / 2;
  const maxY = h - margin - AVATAR_SIZE / 2;

  const candidates: { x: number; y: number; t: number }[] = [];
  if (Math.abs(dx) > 1e-6) {
    const t1 = (minX - cx) / dx;
    const y1 = cy + dy * t1;
    if (t1 > 0 && y1 >= minY && y1 <= maxY) candidates.push({ x: minX, y: y1, t: t1 });
    const t2 = (maxX - cx) / dx;
    const y2 = cy + dy * t2;
    if (t2 > 0 && y2 >= minY && y2 <= maxY) candidates.push({ x: maxX, y: y2, t: t2 });
  }
  if (Math.abs(dy) > 1e-6) {
    const t3 = (minY - cy) / dy;
    const x3 = cx + dx * t3;
    if (t3 > 0 && x3 >= minX && x3 <= maxX) candidates.push({ x: x3, y: minY, t: t3 });
    const t4 = (maxY - cy) / dy;
    const x4 = cx + dx * t4;
    if (t4 > 0 && x4 >= minX && x4 <= maxX) candidates.push({ x: x4, y: maxY, t: t4 });
  }
  if (candidates.length === 0) return { left: Math.max(margin, Math.min(w - margin - AVATAR_SIZE, cx - AVATAR_SIZE / 2)), top: Math.max(margin, Math.min(h - margin - AVATAR_SIZE, cy - AVATAR_SIZE / 2)) };
  candidates.sort((a, b) => a.t - b.t);
  const hit = candidates[0];
  return { left: Math.max(margin, Math.min(w - margin - AVATAR_SIZE, hit.x - AVATAR_SIZE / 2)), top: Math.max(margin, Math.min(h - margin - AVATAR_SIZE, hit.y - AVATAR_SIZE / 2)) };
};

const LocationTracker: React.FC<LocationTrackerProps> = ({
  targetPosition,
  playerPosition,
  cameraPosition,
  screenSize = { width: typeof window !== 'undefined' ? window.innerWidth : 800, height: typeof window !== 'undefined' ? window.innerHeight : 600 },
  enabled,
  targetImage = '/characters/maya-preview.png',
  targetName,
}) => {
  const dx = targetPosition.x - playerPosition.x;
  const dy = targetPosition.y - playerPosition.y;
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = (angleRad * 180) / Math.PI;

  const pos = pointOnPerimeter(angleRad, screenSize.width, screenSize.height, MARGIN);
  const isOnScreenRef = useRef(false);

  let nearOnHead = false;
  let isOnScreen = false;
  let screenPos = { left: pos.left, top: pos.top };
  let showArrow = true;

  if (cameraPosition) {
    const sx = (targetPosition.x - cameraPosition.x) + screenSize.width / 2;
    const sy = (targetPosition.y - cameraPosition.y) + screenSize.height / 2;
    const insideNow = sx >= HYSTERESIS && sx <= screenSize.width - HYSTERESIS && sy >= HYSTERESIS && sy <= screenSize.height - HYSTERESIS;
    const prevInside = Boolean(isOnScreenRef.current);
    isOnScreen = insideNow || (prevInside && sx >= -HYSTERESIS && sx <= screenSize.width + HYSTERESIS && sy >= -HYSTERESIS && sy <= screenSize.height + HYSTERESIS);
    if (isOnScreen) {
      // Target is on-screen: show the avatar at a privacy-pushed position but hide the orbiting arrow
      showArrow = false;
      const clampedX = Math.max(MARGIN + AVATAR_SIZE / 2, Math.min(screenSize.width - MARGIN - AVATAR_SIZE / 2, sx));
      const clampedY = Math.max(MARGIN + AVATAR_SIZE / 2, Math.min(screenSize.height - MARGIN - AVATAR_SIZE / 2, sy));
      const distLeft = clampedX - (MARGIN + AVATAR_SIZE / 2);
      const distRight = (screenSize.width - MARGIN - AVATAR_SIZE / 2) - clampedX;
      const distTop = clampedY - (MARGIN + AVATAR_SIZE / 2);
      const distBottom = (screenSize.height - MARGIN - AVATAR_SIZE / 2) - clampedY;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);
      let pushedX = clampedX;
      let pushedY = clampedY;
      if (minDist === distLeft) pushedX = Math.max(MARGIN + AVATAR_SIZE / 2, clampedX - PRIVACY_OFFSET);
      else if (minDist === distRight) pushedX = Math.min(screenSize.width - MARGIN - AVATAR_SIZE / 2, clampedX + PRIVACY_OFFSET);
      else if (minDist === distTop) pushedY = Math.max(MARGIN + AVATAR_SIZE / 2, clampedY - PRIVACY_OFFSET);
      else pushedY = Math.min(screenSize.height - MARGIN - AVATAR_SIZE / 2, clampedY + PRIVACY_OFFSET);
  screenPos = { left: Math.round(pushedX - AVATAR_SIZE / 2), top: Math.round(pushedY - AVATAR_SIZE / 2) };
      try {
        const px = (playerPosition.x - cameraPosition.x) + screenSize.width / 2;
        const py = (playerPosition.y - cameraPosition.y) + screenSize.height / 2;
        const dist = Math.hypot(sx - px, sy - py);
        if (dist < HIDE_RADIUS) {
          // Player is close to the target on-screen: show locator on their head
          nearOnHead = true;
          showArrow = false;
        }
      } catch (e) {
        // ignore
      }
    }
    isOnScreenRef.current = isOnScreen;
  }

  // If player is close to the target in world space, enable head mode even when off-screen
  const worldDist = Math.hypot(dx, dy);
  if (worldDist < HIDE_RADIUS) {
    nearOnHead = true;
    showArrow = false;
  }

  // Compute final screenPos for nearOnHead (above target) or normal positions
  if (nearOnHead && cameraPosition) {
    const sx = (targetPosition.x - cameraPosition.x) + screenSize.width / 2;
    const sy = (targetPosition.y - cameraPosition.y) + screenSize.height / 2;
    // place above the target's head, keeping within margins
    const headX = Math.max(MARGIN + AVATAR_SIZE / 2, Math.min(screenSize.width - MARGIN - AVATAR_SIZE / 2, sx));
    const headY = Math.max(MARGIN + AVATAR_SIZE / 2, Math.min(screenSize.height - MARGIN - AVATAR_SIZE / 2, sy - (AVATAR_SIZE / 2 + HEAD_OFFSET)));
    screenPos = { left: Math.round(headX - AVATAR_SIZE / 2), top: Math.round(headY - AVATAR_SIZE / 2) };
  }

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      el.style.transform = `translate3d(${Math.round(screenPos.left)}px, ${Math.round(screenPos.top)}px, 0)`;
      if (!showArrow) el.querySelector('.tracker-arrow')?.setAttribute('data-hidden', '1');
      else el.querySelector('.tracker-arrow')?.removeAttribute('data-hidden');
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [screenPos.left, screenPos.top, isOnScreen]);

  const arrowStyle = useMemo(() => ({ transform: `translate(-50%, -50%) rotate(${angleDeg}deg) translateX(${ORBIT_RADIUS}px)`, transition: 'transform 120ms linear' }), [angleDeg]);

  if (!enabled) return null;
  if (false) return null; // preserved placeholder (no unconditional hide)

  return (
    <div
      ref={containerRef}
      className="fixed pointer-events-none z-[2000]"
      style={{
        transform: `translate3d(${Math.round(screenPos.left)}px, ${Math.round(screenPos.top)}px, 0)`,
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        willChange: 'transform',
        transition: 'transform 120ms linear',
      }}
    >
      <div style={{ position: 'relative', width: AVATAR_SIZE, height: AVATAR_SIZE }}>
        <img
          src={targetImage}
          alt={targetName || 'tracked'}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.85)', boxShadow: '0 6px 18px rgba(0,0,0,0.45)', objectFit: 'cover', background: '#000' }}
        />
        {showArrow && (
          <div className="tracker-arrow" aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transformOrigin: '50% 50%', pointerEvents: 'none', ...arrowStyle, transition: 'opacity 120ms linear' }}>
            <div style={{ transform: 'translate(-50%, -50%)' }}>
              <svg width="22" height="44" viewBox="0 0 22 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 21.8947L0.105255 0L12.7462 21.8947L0.105255 43.7895L22 21.8947Z" fill="#FFEEBE" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(LocationTracker);
