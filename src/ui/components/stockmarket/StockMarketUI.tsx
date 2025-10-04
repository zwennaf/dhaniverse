import React, { useState, useEffect } from "react";
import StockMarketDashboard from "./StockMarketDashboard.tsx";
import { balanceManager } from "../../../services/BalanceManager";
import { stockMarketDataService } from "../../../services/StockMarketDataService";
import type { UIStock } from "../../../services/StockMarketDataService";
import { getTaskManager } from "../../../game/tasks/TaskManager";

const StockMarketUI: React.FC = () => {
    console.log("🎮 StockMarketUI component mounted/re-rendered");
    
    const [isOpen, setIsOpen] = useState(false);
    const [playerRupees, setPlayerRupees] = useState(0);
    const [stocks, setStocks] = useState<UIStock[]>([]);
    const [mayaOnboardingCompleted, setMayaOnboardingCompleted] = useState(false);
    const [isLoadingStocks, setIsLoadingStocks] = useState(false);

    // Subscribe to balance manager updates
    useEffect(() => {
        // Get initial balance from balance manager
        const currentBalance = balanceManager.getBalance();
        setPlayerRupees(currentBalance.cash);

        // Subscribe to balance changes
        const unsubscribe = balanceManager.onBalanceChange((balance) => {
            setPlayerRupees(balance.cash);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Load ALL stock market data in ONE CALL when UI opens
    useEffect(() => {
        if (!isOpen || isLoadingStocks) return;

        const loadCompleteMarketData = async () => {
            setIsLoadingStocks(true);
            console.log("📊 Loading complete market data in ONE CALL...");

            try {
                const marketData = await stockMarketDataService.getCompleteMarketData();
                
                if (marketData.success && marketData.stocks.length > 0) {
                    setStocks(marketData.stocks);
                    console.log(`✅ Loaded ${marketData.stocks.length} stocks in ONE CALL (source: ${marketData.source})`);
                } else {
                    console.error("❌ Failed to load market data");
                }
            } catch (error) {
                console.error("❌ Error loading market data:", error);
            } finally {
                setIsLoadingStocks(false);
            }
        };

        loadCompleteMarketData();
    }, [isOpen, isLoadingStocks]);

    useEffect(() => {
        // Listen for the custom event from the game to open the stock market UI
        const handleOpenStockMarketUI = (event: CustomEvent) => {
            console.log("📢 Stock Market UI received open event");
            console.log("   - Event detail:", event.detail);
            console.log("   - Current isOpen state:", isOpen);

            // Get player rupees from the event
            if (event.detail.playerRupees !== undefined) {
                console.log("   - Setting player rupees:", event.detail.playerRupees);
                setPlayerRupees(event.detail.playerRupees);
            }

            // Show the stock market UI
            console.log("   - Setting isOpen to TRUE");
            setIsOpen(true);

            // Complete Maya onboarding when stock market UI opens (only once)
            if (!mayaOnboardingCompleted) {
                completeMayaOnboardingOnStockMarketEntry();
            }

            // Add the active class to the container to enable pointer events
            const container = document.getElementById(
                "stock-market-ui-container"
            );
            console.log("   - Container element:", container ? "FOUND" : "NOT FOUND");
            if (container) {
                container.classList.add("active");
                console.log("   - ✅ Stock Market UI container activated with 'active' class");
                console.log("   - Container classes:", container.className);
            }
        };

    /**
     * Complete the final Maya onboarding objective when player enters stock market
     */
    const completeMayaOnboardingOnStockMarketEntry = () => {
        if (mayaOnboardingCompleted) {
            console.log("StockMarketUI: Maya onboarding already completed, skipping...");
            return;
        }
        
        const tm = getTaskManager();
        const activeTasks = tm.getActiveTasks();
        
        // Complete the final "explore-dhani-stocks" objective
        const exploreTask = activeTasks.find(t => t.id === 'explore-dhani-stocks');
        if (exploreTask) {
            console.log("StockMarketUI: Completing Maya onboarding - player has entered stock market");
            tm.completeTask('explore-dhani-stocks');
            
            // Mark Maya onboarding as completed to prevent future calls
            setMayaOnboardingCompleted(true);
            
            // Remove the task after a short delay
            setTimeout(() => {
                tm.removeTask('explore-dhani-stocks');
                console.log("StockMarketUI: Maya onboarding complete - all objectives cleared");
            }, 2000); // Give 2 seconds to show completion
        } else {
            // If the task doesn't exist, mark as completed anyway
            setMayaOnboardingCompleted(true);
            console.log("StockMarketUI: No explore-dhani-stocks task found, marking Maya onboarding as complete");
        }
    };

        // Listen for rupee updates from the game while stock market UI is open
        const handleRupeeUpdate = (event: CustomEvent) => {
            if (event.detail.rupees !== undefined) {
                console.log(
                    "Stock Market UI received rupee update:",
                    event.detail.rupees
                );
                setPlayerRupees(event.detail.rupees);
            }
        };

        // Add event listeners
        console.log("📡 Registering openStockMarketUI event listener");
        window.addEventListener(
            "openStockMarketUI",
            handleOpenStockMarketUI as EventListener
        );
        window.addEventListener(
            "rupee-update",
            handleRupeeUpdate as EventListener
        );

        console.log("✅ Event listeners registered successfully");

        // Clean up event listeners when the component unmounts
        return () => {
            console.log("🧹 Cleaning up StockMarketUI event listeners");
            window.removeEventListener(
                "openStockMarketUI",
                handleOpenStockMarketUI as EventListener
            );
            window.removeEventListener(
                "rupee-update",
                handleRupeeUpdate as EventListener
            );
        };
    }, []);

    // Close the stock market UI
    const handleClose = () => {
        setIsOpen(false);

        // Remove the active class from the container
        const container = document.getElementById("stock-market-ui-container");
        if (container) {
            container.classList.remove("active");
        }

        // Notify any game components that may need to know the stock market UI was closed
        window.dispatchEvent(new CustomEvent("closeStockMarketUI"));
    };

    // Close on Escape key when the stock market UI is open
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, handleClose]);

    // Render nothing if the stock market UI is closed
    if (!isOpen) {
        console.log("🚫 StockMarketUI: Not rendering (isOpen is false)");
        return null;
    }

    console.log("✅ StockMarketUI: Rendering StockMarketDashboard");
    console.log("   - playerRupees:", playerRupees);
    console.log("   - stocks count:", stocks.length);
    console.log("   - isLoadingStocks:", isLoadingStocks);

    // Otherwise, render the StockMarketDashboard
    return (
        <StockMarketDashboard
            onClose={handleClose}
            playerRupees={playerRupees}
            stocks={stocks}
            isLoadingStocks={isLoadingStocks}
        />
    );
};

export default StockMarketUI;
