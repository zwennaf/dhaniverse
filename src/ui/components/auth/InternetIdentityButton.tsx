import React, { useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import PixelButton from "../atoms/PixelButton";

interface InternetIdentityButtonProps {
    onSuccess: (identity: any) => void;
    onError: (error: string) => void;
    disabled?: boolean;
}

const InternetIdentityButton: React.FC<InternetIdentityButtonProps> = ({
    onSuccess,
    onError,
    disabled = false,
}) => {
    const [loading, setLoading] = useState(false);

    const handleInternetIdentitySignIn = async () => {
        setLoading(true);
        
        try {
            // Create auth client
            const authClient = await AuthClient.create();
            
            // Check if already authenticated
            if (await authClient.isAuthenticated()) {
                const identity = authClient.getIdentity();
                onSuccess(identity);
                setLoading(false);
                return;
            }

            // Start the login process with better error handling
            await new Promise<void>((resolve, reject) => {
                authClient.login({
                    // Use the Internet Identity URL
                    identityProvider: "https://identity.ic0.app/#authorize",
                    // Maximum session time (8 hours)
                    maxTimeToLive: BigInt(8 * 60 * 60 * 1000 * 1000 * 1000),
                    // Window options for better UX
                    windowOpenerFeatures: "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100",
                    onSuccess: () => {
                        try {
                            const identity = authClient.getIdentity();
                            if (identity.getPrincipal().isAnonymous()) {
                                onError("Authentication failed: Anonymous principal received");
                                reject(new Error("Anonymous principal"));
                                return;
                            }
                            onSuccess(identity);
                            resolve();
                        } catch (err) {
                            console.error("Error getting identity:", err);
                            onError("Failed to get identity after login");
                            reject(err);
                        }
                    },
                    onError: (error) => {
                        console.error("Internet Identity login error:", error);
                        if (error && typeof error === 'string' && error.includes('UserInterrupt')) {
                            onError("Sign in was cancelled");
                        } else {
                            onError("Failed to sign in with Internet Identity");
                        }
                        reject(error);
                    },
                });
            });
        } catch (error) {
            console.error("Internet Identity setup error:", error);
            onError("Failed to initialize Internet Identity");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PixelButton
            type="button"
            onClick={handleInternetIdentitySignIn}
            disabled={disabled || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-2 border-blue-500 hover:border-purple-500 transition-all duration-200"
        >
            <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">🌐</span>
                <span className="font-tickerbit">
                    {loading ? "Connecting..." : "Sign in with Internet Identity"}
                </span>
            </div>
        </PixelButton>
    );
};

export default InternetIdentityButton;
