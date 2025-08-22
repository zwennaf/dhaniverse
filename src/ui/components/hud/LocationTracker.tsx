import React, { useState, useEffect, useRef } from 'react';

interface LocationTrackerProps {
    targetPosition: { x: number; y: number };
    playerPosition: { x: number; y: number };
    cameraPosition: { x: number; y: number };
    screenSize: { width: number; height: number };
    enabled: boolean;
    targetName: string;
    targetImage?: string;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({
    targetPosition,
    playerPosition,
    cameraPosition,
    screenSize,
    enabled,
    targetName,
    targetImage = '/characters/maya-preview.png'
}) => {
    const [arrowPosition, setArrowPosition] = useState({ x: 0, y: 0, angle: 0 });
    const [isTargetVisible, setIsTargetVisible] = useState(false);
    const [animationState, setAnimationState] = useState<'hidden' | 'photo-appearing' | 'arrow-appearing' | 'visible' | 'fading'>('hidden');
    const initialSequenceStartedRef = useRef(false);
    const arrowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!enabled) return;

        // Calculate if target is visible on screen
        const screenLeft = cameraPosition.x - screenSize.width / 2;
        const screenRight = cameraPosition.x + screenSize.width / 2;
        const screenTop = cameraPosition.y - screenSize.height / 2;
        const screenBottom = cameraPosition.y + screenSize.height / 2;

        const targetVisible =
            targetPosition.x >= screenLeft &&
            targetPosition.x <= screenRight &&
            targetPosition.y >= screenTop &&
            targetPosition.y <= screenBottom;

        // Debug logging to trace tracker logic
        if (!(window as any).__locationTrackerDebugSilenced) {
            // Throttle logs slightly
            if ((arrowRef.current as any)?.__lastLogTime === undefined || Date.now() - (arrowRef.current as any).__lastLogTime > 1000) {
                (arrowRef.current as any).__lastLogTime = Date.now();
                console.log(`[LocationTracker:${targetName}] vis=${targetVisible} anim=${animationState} isTargetVisibleState=${isTargetVisible}`,
                    { targetPosition, playerPosition, cameraPosition, screenSize });
            }
        }

        // Initial mount: start animation sequence if target starts off-screen
        if (!targetVisible && animationState === 'hidden' && !initialSequenceStartedRef.current) {
            initialSequenceStartedRef.current = true;
            setAnimationState('photo-appearing');
            setTimeout(() => setAnimationState('arrow-appearing'), 200);
            setTimeout(() => setAnimationState('visible'), 500);
            setIsTargetVisible(false);
        }

        // Handle subsequent visibility changes with staggered animation
        if (targetVisible !== isTargetVisible) {
            if (!targetVisible) {
                // Target just left the screen
                setAnimationState('photo-appearing');
                setTimeout(() => setAnimationState('arrow-appearing'), 200);
                setTimeout(() => setAnimationState('visible'), 500);
                setIsTargetVisible(false);
            } else {
                // Target entered the screen
                setAnimationState('fading');
                setTimeout(() => {
                    setIsTargetVisible(true);
                    setAnimationState('hidden');
                }, 300);
            }
        }

        if (!targetVisible) {
            // Calculate direction from player to target
            const deltaX = targetPosition.x - playerPosition.x;
            const deltaY = targetPosition.y - playerPosition.y;
            const angle = Math.atan2(deltaY, deltaX);
            const angleDegrees = angle * (180 / Math.PI);
            const arrowDistance = 100; // Distance from screen edge
            const centerX = screenSize.width / 2;
            const centerY = screenSize.height / 2;
            let arrowX = centerX + Math.cos(angle) * (Math.min(screenSize.width, screenSize.height) / 2 - arrowDistance);
            let arrowY = centerY + Math.sin(angle) * (Math.min(screenSize.width, screenSize.height) / 2 - arrowDistance);
            const margin = 80;
            arrowX = Math.max(margin, Math.min(screenSize.width - margin, arrowX));
            arrowY = Math.max(margin, Math.min(screenSize.height - margin, arrowY));
            setArrowPosition({ x: arrowX, y: arrowY, angle: angleDegrees });
        }
    }, [targetPosition, playerPosition, cameraPosition, screenSize, enabled, isTargetVisible, animationState, targetName]);

    if (!enabled || isTargetVisible) {
        return null;
    }

    // Get animation classes based on state
    const getPhotoClasses = () => {
        switch (animationState) {
            case 'hidden': return 'opacity-0 scale-0';
            case 'photo-appearing': return 'opacity-100 scale-110';
            case 'arrow-appearing': return 'opacity-100 scale-100';
            case 'visible': return 'opacity-100 scale-100';
            case 'fading': return 'opacity-0 scale-95';
            default: return 'opacity-0 scale-0';
        }
    };

    const getArrowClasses = () => {
        switch (animationState) {
            case 'hidden': return 'opacity-0 translate-x-[-100%] scale-0';
            case 'photo-appearing': return 'opacity-0 translate-x-[-100%] scale-0';
            case 'arrow-appearing': return 'opacity-100 translate-x-0 scale-110';
            case 'visible': return 'opacity-100 translate-x-0 scale-100';
            case 'fading': return 'opacity-0 translate-x-[20px] scale-95';
            default: return 'opacity-0 translate-x-[-100%] scale-0';
        }
    };

    const getTextClasses = () => {
        switch (animationState) {
            case 'hidden': return 'opacity-0 translate-x-[-120%] scale-0';
            case 'photo-appearing': return 'opacity-0 translate-x-[-120%] scale-0';
            case 'arrow-appearing': return 'opacity-100 translate-x-0 scale-110';
            case 'visible': return 'opacity-100 translate-x-0 scale-100';
            case 'fading': return 'opacity-0 translate-x-[30px] scale-95';
            default: return 'opacity-0 translate-x-[-120%] scale-0';
        }
    };

    return (
        <div
            ref={arrowRef}
            className="fixed pointer-events-none z-[1001]"
            style={{
                left: `${arrowPosition.x}px`,
                top: `${arrowPosition.y}px`,
                transform: `translate(-50%, -50%) rotate(${arrowPosition.angle}deg)`,
                transition: 'left 0.3s ease-out, top 0.3s ease-out',
            }}
        >
            {/* Arrow container */}
            <div className="relative flex items-center">
                {/* Target image - Counter-rotated to stay upright with bouncy appear animation */}
                <div 
                    className={`relative transition-all duration-300 ease-out ${getPhotoClasses()}`}
                    style={{
                        transform: `rotate(${-arrowPosition.angle}deg)`,
                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy effect
                    }}
                >
                    <img
                        src={targetImage}
                        alt={targetName}
                        className="w-12 h-12 rounded-full border-2 border-white/80 shadow-lg bg-black/20 object-cover"
                        onError={(e) => {
                            // Fallback if image doesn't exist
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    {/* Pulsing effect */}
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-white/60 animate-ping"></div>
                </div>
                
                {/* Arrow SVG - Slides out from image */}
                <div className={`ml-2 transition-all duration-200 delay-150 ${getArrowClasses()}`}
                     style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    <svg
                        width="40"
                        height="20"
                        viewBox="0 0 40 20"
                        className="drop-shadow-lg"
                    >
                        {/* Arrow shaft */}
                        <rect
                            x="0"
                            y="8"
                            width="30"
                            height="4"
                            fill="white"
                            className="opacity-90"
                        />
                        {/* Arrow head */}
                        <polygon
                            points="30,2 40,10 30,18"
                            fill="white"
                            className="opacity-90"
                        />
                        {/* Arrow outline for better visibility */}
                        <rect
                            x="0"
                            y="8"
                            width="30"
                            height="4"
                            fill="none"
                            stroke="#333"
                            strokeWidth="0.5"
                        />
                        <polygon
                            points="30,2 40,10 30,18"
                            fill="none"
                            stroke="#333"
                            strokeWidth="0.5"
                        />
                    </svg>
                </div>
                
                {/* Target name - Smart flipping and mirroring, slides out from image */}
                <div 
                    className={`ml-2 bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/30 font-['Tickerbit',Arial,sans-serif] tracking-wider shadow-lg transition-all duration-200 delay-200 ${getTextClasses()}`}
                    style={{
                        transform: `${Math.abs(arrowPosition.angle) > 90 && Math.abs(arrowPosition.angle) < 270 ? 'scaleY(-1) scaleX(-1)' : 'none'}`,
                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy effect
                    }}
                >
                    {targetName}
                </div>
            </div>
        </div>
    );
};

export default LocationTracker;
