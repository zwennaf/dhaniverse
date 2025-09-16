"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { crossDomainAuthService, DhaniverseUser, AuthResponse } from "../lib/CrossDomainAuthService";

interface AuthContextValue {
    user: DhaniverseUser | null;
    isLoaded: boolean;
    isSignedIn: boolean;
    signInWithGoogle: (googleToken: string, gameUsername?: string) => Promise<AuthResponse>;
    signInWithInternetIdentity: (identity: any, gameUsername?: string) => Promise<AuthResponse>;
    sendMagicLink: (email: string) => Promise<AuthResponse>;
    verifyMagicLink: (token: string, gameUsername?: string) => Promise<AuthResponse>;
    updateProfile: (gameUsername: string, selectedCharacter?: string) => Promise<AuthResponse>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<DhaniverseUser | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Initialize the auth service and listen for auth state changes
        const initAuth = async () => {
            await crossDomainAuthService.initialize();
            
            // Set up auth state listener
            const unsubscribe = crossDomainAuthService.onAuthStateChanged((user) => {
                setUser(user);
                setIsLoaded(true);
            });

            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        
        initAuth().then((unsub) => {
            unsubscribe = unsub;
        });

        // Cleanup listener on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const signInWithGoogle = async (googleToken: string, gameUsername?: string): Promise<AuthResponse> => {
        return await crossDomainAuthService.signInWithGoogle(googleToken, gameUsername);
    };

    const signInWithInternetIdentity = async (identity: any, gameUsername?: string): Promise<AuthResponse> => {
        return await crossDomainAuthService.signInWithInternetIdentity(identity, gameUsername);
    };

    const sendMagicLink = async (email: string): Promise<AuthResponse> => {
        return await crossDomainAuthService.sendMagicLink(email);
    };

    const verifyMagicLink = async (token: string, gameUsername?: string): Promise<AuthResponse> => {
        return await crossDomainAuthService.verifyMagicLink(token, gameUsername);
    };

    const updateProfile = async (gameUsername: string, selectedCharacter?: string): Promise<AuthResponse> => {
        return await crossDomainAuthService.updateProfile(gameUsername, selectedCharacter);
    };

    const signOut = async (): Promise<void> => {
        await crossDomainAuthService.signOut();
    };

    const refreshSession = async (): Promise<void> => {
        await crossDomainAuthService.refreshSession();
    };

    return (
        <AuthContext.Provider
            value={{ 
                user, 
                isLoaded,
                isSignedIn: !!user,
                signInWithGoogle, 
                signInWithInternetIdentity, 
                sendMagicLink,
                verifyMagicLink,
                updateProfile,
                signOut,
                refreshSession
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function useUser() {
    const ctx = useContext(AuthContext);
    if (!ctx) return null;
    return ctx.user;
}

export default AuthContext;
