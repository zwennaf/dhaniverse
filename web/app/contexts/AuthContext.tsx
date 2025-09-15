import React, { createContext, useContext, useState } from "react";

interface User {
    id?: string;
    name?: string;
    email?: string;
}

interface AuthContextValue {
    user: User | null;
    signInWithGoogle: () => Promise<void>;
    signInWithInternetIdentity: () => Promise<void>;
    sendMagicLink: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(null);

    const signInWithGoogle = async () => {
        setUser({ id: "1", name: "Demo User", email: "demo@example.com" });
    };

    const signInWithInternetIdentity = async () => {
        setUser({ id: "2", name: "II User", email: "ii@example.com" });
    };

    const sendMagicLink = async (email: string) => {
        // noop for now
    };

    const signOut = async () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, signInWithGoogle, signInWithInternetIdentity, sendMagicLink, signOut }}
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
