import React, { useState, useRef, useEffect } from "react";
import AnimationFramework from "../../utils/AnimationFramework";

interface TabItem {
    id: string;
    name: string;
    icon: React.ComponentType<{
        size?: number;
        color?: string;
        className?: string;
    }>;
    badge?: number;
    disabled?: boolean;
    description?: string;
}

interface InnovativeTabNavigationProps {
    tabs: TabItem[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

const InnovativeTabNavigation: React.FC<InnovativeTabNavigationProps> = ({
    tabs,
    activeTab,
    onTabChange,
    className = "",
}) => {
    const [hoveredTab, setHoveredTab] = useState<string | null>(null);
    const [tabPositions, setTabPositions] = useState<{ [key: string]: number }>(
        {}
    );
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
    const indicatorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update tab positions for smooth indicator animation
    useEffect(() => {
        const positions: { [key: string]: number } = {};
        tabs.forEach((tab) => {
            const element = tabRefs.current[tab.id];
            if (element && containerRef.current) {
                const containerRect =
                    containerRef.current.getBoundingClientRect();
                const tabRect = element.getBoundingClientRect();
                positions[tab.id] = tabRect.left - containerRect.left;
            }
        });
        setTabPositions(positions);
    }, [tabs, activeTab]);

    // Animate indicator position
    useEffect(() => {
        if (indicatorRef.current && tabPositions[activeTab] !== undefined) {
            const activeElement = tabRefs.current[activeTab];
            if (activeElement) {
                AnimationFramework.transitionElement(
                    indicatorRef.current,
                    { left: `${tabPositions[activeTab]}px` },
                    {
                        left: `${tabPositions[activeTab]}px`,
                        width: `${activeElement.offsetWidth}px`,
                    },
                    { duration: 300, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
                );
            }
        }
    }, [activeTab, tabPositions]);

    const handleTabClick = (tab: TabItem) => {
        if (tab.disabled) return;

        const element = tabRefs.current[tab.id];
        if (element) {
            AnimationFramework.bounceElement(element);
        }

        onTabChange(tab.id);
    };

    const handleTabHover = (tabId: string) => {
        setHoveredTab(tabId);
        const element = tabRefs.current[tabId];
        if (element && tabId !== activeTab) {
            AnimationFramework.pulseElement(element, 0.5);
        }
    };

    const handleTabLeave = (tabId: string) => {
        setHoveredTab(null);
        const element = tabRefs.current[tabId];
        if (element) {
            AnimationFramework.stopPulse(element);
        }
    };

    return (
        <div
            className={`bg-black border-b-2 border-white/20 relative ${className}`}
        >
            <div
                ref={containerRef}
                className="flex overflow-x-auto pixelated-banking-scrollbar relative"
            >
                {/* Animated indicator */}
                <div
                    ref={indicatorRef}
                    className="absolute bottom-0 h-1 bg-dhani-gold transition-all duration-300 ease-out z-10"
                    style={{
                        left: tabPositions[activeTab] || 0,
                        width: tabRefs.current[activeTab]?.offsetWidth || 0,
                    }}
                />

                {tabs.map((tab, index) => {
                    const isActive = activeTab === tab.id;
                    const isHovered = hoveredTab === tab.id;
                    const IconComponent = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                tabRefs.current[tab.id] = el;
                            }}
                            onClick={() => handleTabClick(tab)}
                            onMouseEnter={() => handleTabHover(tab.id)}
                            onMouseLeave={() => handleTabLeave(tab.id)}
                            disabled={tab.disabled}
                            className={`
                flex items-center space-x-3 px-6 py-4 text-sm font-bold tracking-wider 
                border-b-4 whitespace-nowrap relative transition-all duration-300
                ${
                    isActive
                        ? "text-dhani-gold border-dhani-gold bg-dhani-gold/10"
                        : "text-white border-transparent hover:text-dhani-gold hover:bg-white/5"
                }
                ${
                    tab.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                }
                ${isHovered && !isActive ? "transform scale-105" : ""}
              `}
                            style={{
                                animationDelay: `${index * 50}ms`,
                            }}
                        >
                            {/* Tab icon with glow effect */}
                            <div
                                className={`pixelated-banking-icon ${
                                    isActive ? "pixelated-banking-glow" : ""
                                }`}
                            >
                                <IconComponent
                                    size={20}
                                    color={
                                        isActive
                                            ? "#F1CD36"
                                            : isHovered
                                            ? "#F1CD36"
                                            : "#FFFFFF"
                                    }
                                />
                            </div>

                            {/* Tab name */}
                            <span className="pixelated-banking-fade-in">
                                {tab.name.toUpperCase()}
                            </span>

                            {/* Badge indicator */}
                            {tab.badge && tab.badge > 0 && (
                                <div className="pixelated-banking-card bg-red-600 border-red-500 px-2 py-1 text-xs min-w-[20px] text-center">
                                    {tab.badge > 99 ? "99+" : tab.badge}
                                </div>
                            )}

                            {/* Hover tooltip */}
                            {isHovered && tab.description && (
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-20 pixelated-banking-fade-in">
                                    <div className="pixelated-banking-card bg-black border-dhani-gold p-2 text-xs whitespace-nowrap">
                                        {tab.description}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-dhani-gold" />
                                    </div>
                                </div>
                            )}

                            {/* Active tab indicator */}
                            {isActive && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-dhani-gold" />
                                    <div className="absolute top-1 left-1 right-1 bottom-1 border border-dhani-gold/30 pointer-events-none" />
                                </div>
                            )}
                        </button>
                    );
                })}

                {/* Scroll indicators */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none" />
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            </div>

            {/* Tab context bar */}
            <div className="px-6 py-2 bg-black/50 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="text-dhani-gold text-xs font-bold tracking-wider">
                        {tabs
                            .find((tab) => tab.id === activeTab)
                            ?.name.toUpperCase()}{" "}
                        SECTION
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-white/60">
                        <span>
                            {tabs.findIndex((tab) => tab.id === activeTab) + 1}{" "}
                            OF {tabs.length}
                        </span>

                        {/* Quick navigation dots */}
                        <div className="flex space-x-1">
                            {tabs.map((tab, index) => (
                                <button
                                    key={`dot-${tab.id}`}
                                    onClick={() => handleTabClick(tab)}
                                    className={`w-2 h-2 transition-all duration-200 ${
                                        tab.id === activeTab
                                            ? "bg-dhani-gold"
                                            : "bg-white/20 hover:bg-white/40"
                                    }`}
                                    disabled={tab.disabled}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InnovativeTabNavigation;
