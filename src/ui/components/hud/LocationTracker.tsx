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

        setIsTargetVisible(targetVisible);

        if (!targetVisible) {
            // Calculate direction from player to target
            const deltaX = targetPosition.x - playerPosition.x;
            const deltaY = targetPosition.y - playerPosition.y;
            
            // Calculate angle in radians
            const angle = Math.atan2(deltaY, deltaX);
            
            // Convert to degrees for CSS transform
            const angleDegrees = angle * (180 / Math.PI);
            
            // Calculate arrow position on screen edge
            const arrowDistance = 100; // Distance from screen edge
            const centerX = screenSize.width / 2;
            const centerY = screenSize.height / 2;
            
            // Calculate position on screen edge
            let arrowX = centerX + Math.cos(angle) * (Math.min(screenSize.width, screenSize.height) / 2 - arrowDistance);
            let arrowY = centerY + Math.sin(angle) * (Math.min(screenSize.width, screenSize.height) / 2 - arrowDistance);
            
            // Clamp to screen bounds with margin
            const margin = 80;
            arrowX = Math.max(margin, Math.min(screenSize.width - margin, arrowX));
            arrowY = Math.max(margin, Math.min(screenSize.height - margin, arrowY));
            
            setArrowPosition({ x: arrowX, y: arrowY, angle: angleDegrees });
        }
    }, [targetPosition, playerPosition, cameraPosition, screenSize, enabled]);

    if (!enabled || isTargetVisible) {
        return null;
    }

    return (
        <div
            ref={arrowRef}
            className="fixed pointer-events-none z-[1001] transition-all duration-300 ease-out"
            style={{
                left: `${arrowPosition.x}px`,
                top: `${arrowPosition.y}px`,
                transform: `translate(-50%, -50%) rotate(${arrowPosition.angle}deg)`,
            }}
        >
            {/* Arrow container */}
            <div className="relative flex items-center">
                {/* Target image */}
                <div className="relative">
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
                
                {/* Arrow SVG */}
                <div className="ml-2">
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
                
                {/* Target name */}
                <div className="ml-2 bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/30 font-['Tickerbit',Arial,sans-serif] tracking-wider shadow-lg">
                    {targetName}
                </div>
            </div>
        </div>
    );
};

export default LocationTracker;
