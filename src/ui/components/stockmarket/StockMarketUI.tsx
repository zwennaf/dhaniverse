import React, { useState, useEffect } from "react";
import StockMarketDashboard from "./StockMarketDashboard.tsx";
import { balanceManager } from "../../../services/BalanceManager";
import { stockMarketDataService } from "../../../services/StockMarketDataService";
import { stockMarketPreloader } from "../../../services/StockMarketPreloader";
import type { UIStock } from "../../../services/StockMarketDataService";
import { getTaskManager } from "../../../game/tasks/TaskManager";

const StockMarketUI: React.FC = () => {
    console.log("🎮 StockMarketUI component mounted/re-rendered");
    
    const [isOpen, setIsOpen] = useState(false);
    const [playerRupees, setPlayerRupees] = useState(0);
    const [stocks, setStocks] = useState<UIStock[]>([]);
    const [mayaOnboardingCompleted, setMayaOnboardingCompleted] = useState(false);
    const [isLoadingStocks, setIsLoadingStocks] = useState(false);

    // Load preloaded data immediately on mount
    useEffect(() => {
        console.log("🚀 [MOUNT] StockMarketUI mounted, checking for preloaded data...");
        const preloadedData = stockMarketPreloader.getPreloadedData();
        if (preloadedData?.allStocks && preloadedData.allStocks.length > 0) {
            console.log(`✅ [MOUNT] Found preloaded data: ${preloadedData.allStocks.length} stocks`);
            setStocks(preloadedData.allStocks);
            setIsLoadingStocks(false);
        } else {
            console.log("⏳ [MOUNT] No preloaded data yet, will load when opened");
        }
    }, []); // Only run once on mount

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

    // Load market data - CHECK PRELOADED DATA FIRST for instant display
    // Data was preloaded during game initialization, so this should be instant
    useEffect(() => {
        if (!isOpen) return;
        
        // Skip if already loaded
        if (stocks.length > 0 && !isLoadingStocks) {
            console.log("✅ Using cached market data:", stocks.length, "items");
            return;
        }

        const loadCompleteMarketData = async () => {
            // 🚀 INSTANT CHECK: Don't set loading=true if data is already preloaded
            const preloadedData = stockMarketPreloader.getPreloadedData();
            
            if (preloadedData && preloadedData.allStocks.length > 0) {
                // DATA IS ALREADY LOADED! Display instantly WITHOUT loading state
                console.log(`⚡ [INSTANT] Using preloaded stock market data!`);
                console.log(`   - ${preloadedData.cryptocurrencies.length} cryptocurrencies`);
                console.log(`   - ${preloadedData.stocks.length} stocks`);
                console.log(`   - Total: ${preloadedData.allStocks.length} assets ready INSTANTLY`);
                
                setStocks(preloadedData.allStocks);
                setIsLoadingStocks(false); // Ensure loading is false
                return; // Done! No need to fetch
            }
            
            // Only set loading=true if we need to fetch
            setIsLoadingStocks(true);

            // Fallback: If preload failed or wasn't ready, fetch now
            console.log("⚠️ [FALLBACK] Preloaded data not available, fetching now...");
            try {
                const [cryptoData, stockData] = await Promise.all([
                    stockMarketDataService.getCryptocurrencies(),
                    stockMarketDataService.getStocks()
                ]);
                
                const allStocks = [...cryptoData.stocks, ...stockData.stocks];
                
                if (allStocks.length > 0) {
                    setStocks(allStocks);
                    console.log(`✅ [FALLBACK] Loaded ${cryptoData.stocks.length} crypto + ${stockData.stocks.length} stocks`);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

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
