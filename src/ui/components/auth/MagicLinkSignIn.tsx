import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PixelButton from "../atoms/PixelButton";
import GoogleSignInButton from "./GoogleSignInButton";
import InternetIdentityButton from "./InternetIdentityButton";
import SEO from "../SEO";
import analytics from "../../../utils/analytics";

// Simplified device detection function
const isMobileDevice = () => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }
    return false;
};

// Mobile view component - completely separate from the authentication logic
const MobileView = () => (
    <div
        style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
        }}
    >
        <div
            style={{
                backgroundColor: "#282828",
                padding: "24px",
                borderRadius: "16px",
                width: "90%",
                maxWidth: "400px",
                boxShadow: "0 4px 12px rgba(255, 199, 0, 0.2)",
                textAlign: "center",
                color: "white",
            }}
        >
            <h1
                style={{
                    fontSize: "24px",
                    color: "#FFC700",
                    marginBottom: "16px",
                    fontWeight: "bold",
                }}
            >
                Desktop Only Experience
            </h1>
            <p
                style={{
                    margin: "16px 0",
                }}
            >
                Dhaniverse is currently optimized for desktop computers only.
                Please visit us on a laptop or desktop computer for the best
                experience.
            </p>
            <div
                style={{
                    width: "80px",
                    height: "80px",
                    margin: "20px auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#1a1a1a",
                    borderRadius: "8px",
                }}
            >
                <span style={{ fontSize: "40px" }}>🖥️</span>
            </div>
            <p
                style={{
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.6)",
                }}
            >
                We're considering mobile support in future updates!
            </p>
        </div>
    </div>
);

const MagicLinkSignIn = () => {
    // Check for mobile immediately before any other logic
    if (isMobileDevice()) {
        return <MobileView />;
    }

    const navigate = useNavigate();
    const { sendMagicLink, signInWithGoogle, signInWithInternetIdentity, isLoaded } = useAuth();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    // Clear error and success messages on input change
    useEffect(() => {
        if (error) setError("");
        if (success) setSuccess("");
    }, [email]);

    // Default loading screen with improved feedback
    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <div className="text-white mb-4">Loading authentication...</div>
                <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const result = await sendMagicLink(email);

        if (result.success) {
            setSuccess(result.message || "Magic link sent! Check your email to sign in.");
            setMagicLinkSent(true);
            // Track magic link sent (using existing analytics method)
            analytics.trackSignInIntent();
        } else {
            setError(result.error || "Failed to send magic link");
        }

        setLoading(false);
    };

    const handleGoogleSuccess = async (googleToken: string) => {
        setLoading(true);
        setError("");

        const result = await signInWithGoogle(googleToken);

        if (result.success) {
            // Track successful Google sign in
            analytics.trackSignInSuccess('google', result.isNewUser);
            
            // Navigate to profile - new users will be prompted to set username there
            navigate("/profile");
        } else {
            setError(result.error || "Google sign in failed");
        }

        setLoading(false);
    };

    const handleGoogleError = (error: string) => {
        setError(error);
    };

    const handleInternetIdentitySuccess = async (identity: any) => {
        setLoading(true);
        setError("");

        const result = await signInWithInternetIdentity(identity);

        if (result.success) {
            // Track successful Internet Identity sign in (using 'google' as placeholder)
            analytics.trackSignInSuccess('google', result.isNewUser);
            
            // Navigate to profile - new users will be prompted to set username there
            navigate("/profile");
        } else {
            setError(result.error || "Internet Identity sign in failed");
        }

        setLoading(false);
    };

    const handleInternetIdentityError = (error: string) => {
        setError(error);
    };

    const handleResendMagicLink = () => {
        setMagicLinkSent(false);
        setSuccess("");
        setError("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <SEO
                title="Sign In to Dhaniverse - Access Your Financial Learning Account"
                description="Sign in to your Dhaniverse account to continue learning finance through gaming. Access your progress in India's first financial literacy RPG game and improve your money management skills."
                keywords="dhaniverse sign in, dhaniverse login, financial education login, money management game login, financial literacy platform login, dhaniverse account access, financial game login, money RPG login, personal finance game login, investment game login"
                url="https://dhaniverse.in/sign-in"
                noIndex={false}
            />
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: `url('/UI/bg.png')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(8px)",
                }}
            />
            <form
                onSubmit={handleSubmit}
                className="bg-black/70 p-6 rounded-lg w-full max-w-lg space-y-4 z-10"
            >
                <h1 className="text-3xl font-tickerbit tracking-widest text-dhani-text text-center mb-4">
                    Sign In to{" "}
                    <span className="text-dhani-gold pixel-glow">
                        Dhaniverse
                    </span>
                </h1>

                <p className="text-center text-dhani-text/80 text-sm font-robert mb-6">
                    {magicLinkSent 
                        ? "Check your email for a magic link to sign in securely."
                        : "Continue your financial education journey. Choose your preferred sign-in method below."
                    }
                </p>

                {/* Enhanced error styling */}
                {error && (
                    <div className="text-red-400 text-sm font-tickerbit p-2 mb-2 border border-red-400 rounded bg-red-900/20">
                        ⚠️ {error}
                    </div>
                )}

                {/* Success message styling */}
                {success && (
                    <div className="text-green-400 text-sm font-tickerbit p-2 mb-2 border border-green-400 rounded bg-green-900/20">
                        ✅ {success}
                    </div>
                )}

                {!magicLinkSent ? (
                    <>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
                            required
                            className="w-full bg-dhani-dark border border-dhani-text/30 rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50"
                        />
                        
                        <PixelButton
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? "Sending Magic Link..." : "Send Magic Link"}
                        </PixelButton>

                        <div className="flex items-center justify-center my-4">
                            <div className="border-t border-dhani-gold/30 flex-grow" />
                            <span className="px-3 text-dhani-text/70 text-sm font-robert">
                                or
                            </span>
                            <div className="border-t border-dhani-gold/30 flex-grow" />
                        </div>

                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            disabled={loading}
                        />

                        <InternetIdentityButton
                            onSuccess={handleInternetIdentitySuccess}
                            onError={handleInternetIdentityError}
                            disabled={loading}
                        />

                        <div className="text-center space-y-2">
                            <p className="text-dhani-text/60 text-xs font-robert">
                                ✨ No passwords needed! We'll send you a secure magic link to sign in instantly.
                            </p>
                            <p className="text-dhani-text/60 text-xs font-robert">
                                🌐 Internet Identity provides anonymous, secure login powered by the Internet Computer.
                            </p>
                            <p className="text-dhani-text/60 text-xs font-robert">
                                New to Dhaniverse? Just choose any sign-in method above - we'll create your account automatically!
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="bg-dhani-gold/10 border border-dhani-gold/30 rounded-lg p-4">
                            <div className="text-4xl mb-2">📧</div>
                            <h3 className="text-lg font-tickerbit text-dhani-gold mb-2">
                                Check Your Email
                            </h3>
                            <p className="text-dhani-text/80 text-sm font-robert mb-3">
                                We've sent a magic link to:
                            </p>
                            <p className="text-dhani-gold font-mono text-sm break-all">
                                {email}
                            </p>
                        </div>

                        <div className="text-dhani-text/60 text-xs font-robert space-y-2">
                            <p>• Click the link in your email to sign in automatically</p>
                            <p>• The link will expire in 15 minutes for security</p>
                            <p>• Check your spam folder if you don't see it</p>
                        </div>

                        <PixelButton
                            type="button"
                            onClick={handleResendMagicLink}
                            className="w-full"
                            variant="outline"
                        >
                            Send Another Magic Link
                        </PixelButton>

                        <div className="flex items-center justify-center my-4">
                            <div className="border-t border-dhani-gold/30 flex-grow" />
                            <span className="px-3 text-dhani-text/70 text-sm font-robert">
                                or
                            </span>
                            <div className="border-t border-dhani-gold/30 flex-grow" />
                        </div>

                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            disabled={loading}
                        />

                        <InternetIdentityButton
                            onSuccess={handleInternetIdentitySuccess}
                            onError={handleInternetIdentityError}
                            disabled={loading}
                        />
                    </div>
                )}
            </form>
        </div>
    );
};

export default MagicLinkSignIn;
