import React, { useState, useEffect, useRef } from "react";
import BankingDashboard from "./BankingDashboard";
import {
    StatusIndicator,
    LoadingState,
} from "../feedback/StatusIndicators";
import { AccessibleButton } from "../accessibility/AccessibleComponents";

const BankingUI: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [playerRupees, setPlayerRupees] = useState(0);
    const [bankAccount, setBankAccount] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<
        "connecting" | "connected" | "error"
    >("connecting");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<
        "success" | "error" | "info"
    >("info");
    // Keep track of the rupees at opening time to calculate the difference later
    const initialRupeesRef = useRef(0);
    
    // Log bank account for debugging (prevents unused variable warning)
    useEffect(() => {
        if (bankAccount) {
            console.log("Bank account data:", bankAccount);
        }
    }, [bankAccount]);

    useEffect(() => {
        // Listen for the custom event from the game to open the banking UI
        const handleOpenBankingUI = async (event: Event) => {
            const customEvent = event as CustomEvent;
            console.log(
                "Banking UI received open event with rupees:",
                customEvent.detail.playerRupees
            );

            setIsLoading(true);
            setConnectionStatus("connecting");
            setMessage("Initializing banking system...");
            setMessageType("info");

            try {
                // Simulate connection delay for better UX
                await new Promise((resolve) => setTimeout(resolve, 800));

                // Store the initial rupees value when banking UI opens
                initialRupeesRef.current = customEvent.detail.playerRupees;

                // Get player rupees from the event
                setPlayerRupees(customEvent.detail.playerRupees);

                // Store bank account data if provided
                if (customEvent.detail.bankAccount) {
                    setBankAccount(customEvent.detail.bankAccount);
                }

                setConnectionStatus("connected");
                setMessage("Banking system connected successfully!");
                setMessageType("success");

                // Show the banking UI
                setIsOpen(true);

                // Add the active class to the container to enable pointer events
                const container = document.getElementById(
                    "banking-ui-container"
                );
                if (container) {
                    container.classList.add("active");
                    console.log("Banking UI activated");
                }

                // Clear success message after a delay
                setTimeout(() => setMessage(""), 2000);
            } catch (error) {
                console.error("Failed to initialize banking UI:", error);
                setConnectionStatus("error");
                setMessage(
                    "Failed to connect to banking system. Please try again."
                );
                setMessageType("error");
            } finally {
                setIsLoading(false);
            }
        };

        // Listen for rupee updates from the game while banking UI is open
        const handleRupeeUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.rupees !== undefined) {
                console.log(
                    "Banking UI received rupee update:",
                    customEvent.detail.rupees
                );
                const previousRupees = playerRupees;
                const newRupees = customEvent.detail.rupees;

                setPlayerRupees(newRupees);

                if (isOpen) {
                    initialRupeesRef.current = newRupees;

                    // Show balance change notification
                    if (previousRupees !== newRupees && previousRupees > 0) {
                        const difference = newRupees - previousRupees;
                        if (difference !== 0) {
                            setMessage(
                                difference > 0
                                    ? `Balance increased by ₹${difference.toLocaleString()}!`
                                    : `Balance decreased by ₹${Math.abs(
                                          difference
                                      ).toLocaleString()}`
                            );
                            setMessageType(difference > 0 ? "success" : "info");
                            setTimeout(() => setMessage(""), 3000);
                        }
                    }
                }
            }
        };

        // Add event listeners
        window.addEventListener(
            "openBankingUI",
            handleOpenBankingUI as EventListener
        );
        window.addEventListener(
            "rupee-update",
            handleRupeeUpdate as EventListener
        );

        // Clean up event listeners when the component unmounts
        return () => {
            window.removeEventListener(
                "openBankingUI",
                handleOpenBankingUI as EventListener
            );
            window.removeEventListener(
                "rupee-update",
                handleRupeeUpdate as EventListener
            );
        };
    }, [isOpen]);

    // Close the banking UI with enhanced feedback
    const handleClose = () => {
        setMessage("Closing banking system...");
        setMessageType("info");
        setIsLoading(true);

        // Simulate closing delay for better UX
        setTimeout(() => {
            setIsOpen(false);
            setIsLoading(false);
            setMessage("");
            setConnectionStatus("connecting");

            // Remove the active class from the container
            const container = document.getElementById("banking-ui-container");
            if (container) {
                container.classList.remove("active");
            }

            // Notify any game components that may need to know the banking UI was closed
            window.dispatchEvent(new CustomEvent("closeBankingUI"));
        }, 500);
    };

    // Render nothing if the banking UI is closed and not loading
    if (!isOpen && !isLoading) return null;

    // Show loading screen during initialization
    if (isLoading && !isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
                <div
                    className="bg-white/5 border-2 border-dhani-gold p-8 max-w-md w-full mx-4 animate-scale-in"
                    style={{ imageRendering: "pixelated" }}
                >
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4 animate-bounce">🏦</div>
                        <div className="text-dhani-gold font-vcr font-bold text-xl tracking-wider">
                            DHANIVERSE BANKING
                        </div>
                        <LoadingState
                            message={
                                connectionStatus === "connecting"
                                    ? "Connecting to Banking System"
                                    : "Initializing Services"
                            }
                            size="lg"
                        />
                        <div className="flex items-center justify-center space-x-3">
                            <StatusIndicator
                                type={
                                    connectionStatus === "connected"
                                        ? "success"
                                        : connectionStatus === "error"
                                        ? "error"
                                        : "loading"
                                }
                                size="md"
                            />
                            <span className="text-white font-vcr text-sm tracking-wider">
                                {connectionStatus === "connected"
                                    ? "CONNECTED"
                                    : connectionStatus === "error"
                                    ? "CONNECTION FAILED"
                                    : "CONNECTING..."}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state if connection failed
    if (connectionStatus === "error" && !isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
                <div
                    className="bg-red-500/20 border-2 border-red-500 p-8 max-w-md w-full mx-4 animate-bounce-in"
                    style={{ imageRendering: "pixelated" }}
                >
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">⚠️</div>
                        <div className="text-red-400 font-vcr font-bold text-xl tracking-wider">
                            CONNECTION FAILED
                        </div>
                        <div className="text-red-300 font-vcr text-sm">
                            {message || "Unable to connect to banking system"}
                        </div>
                        <AccessibleButton
                            onClick={() => {
                                setConnectionStatus("connecting");
                                setMessage("");
                                // Retry connection logic could go here
                            }}
                            variant="danger"
                            size="lg"
                            className="w-full animate-pixel-glow"
                        >
                            <span className="mr-2">🔄</span>
                            RETRY CONNECTION
                        </AccessibleButton>
                    </div>
                </div>
            </div>
        );
    }

    // Main banking UI with enhanced wrapper
    return (
        <div className="fixed inset-0 z-40 animate-fade-in">
            {/* Enhanced backdrop with gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/95 via-gray-900/90 to-black/95" />

            {/* Connection status overlay */}
            <div className="absolute top-4 right-4 z-50">
                <div
                    className="bg-black/80 border-2 border-dhani-gold p-3 animate-slide-in-right"
                    style={{ imageRendering: "pixelated" }}
                >
                    <div className="flex items-center space-x-3">
                        <StatusIndicator type="success" size="sm" />
                        <div className="font-vcr text-xs">
                            <div className="text-dhani-gold font-bold tracking-wider">
                                BANKING SYSTEM
                            </div>
                            <div className="text-white">ONLINE & SECURE</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance indicator */}
            <div className="absolute top-4 left-4 z-50">
                <div
                    className="bg-dhani-gold/20 border-2 border-dhani-gold p-3 animate-slide-in-left"
                    style={{ imageRendering: "pixelated" }}
                >
                    <div className="flex items-center space-x-3">
                        <span className="text-2xl">💰</span>
                        <div className="font-vcr">
                            <div className="text-dhani-gold text-xs font-bold tracking-wider">
                                WALLET BALANCE
                            </div>
                            <div className="text-white font-bold text-lg">
                                ₹{playerRupees.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message notification */}
            {message && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
                    <div
                        className={`
            p-4 border-2 font-vcr max-w-md
            ${
                messageType === "success"
                    ? "bg-dhani-green/20 border-dhani-green text-dhani-green"
                    : messageType === "error"
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-blue-500/20 border-blue-500 text-blue-400"
            }
          `}
                        style={{ imageRendering: "pixelated" }}
                    >
                        <div className="flex items-center space-x-3">
                            <StatusIndicator
                                type={
                                    messageType === "success"
                                        ? "success"
                                        : messageType === "error"
                                        ? "error"
                                        : "info"
                                }
                                size="md"
                            />
                            <div className="text-sm font-bold tracking-wider">
                                {message}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main banking dashboard with enhanced styling */}
            <div className="relative z-30 h-full animate-scale-in">
                <BankingDashboard
                    onClose={handleClose}
                    playerRupees={playerRupees}
                    initialRupees={initialRupeesRef.current}
                />
            </div>

            {/* Loading overlay for closing */}
            {isLoading && isOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
                    <div
                        className="bg-white/5 border-2 border-dhani-gold p-6 animate-pulse"
                        style={{ imageRendering: "pixelated" }}
                    >
                        <LoadingState message="Processing..." size="lg" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankingUI;
