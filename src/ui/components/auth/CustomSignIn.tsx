import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PixelButton from "../atoms/PixelButton";
import GoogleSignInButton from "./GoogleSignInButton";
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

const CustomSignIn = () => {
    // Check for mobile immediately before any other logic
    if (isMobileDevice()) {
        return <MobileView />;
    }
    // Continue with the regular component logic for desktop users
    const navigate = useNavigate();
    const { signIn, signInWithGoogle, isLoaded } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    // Clear error and success messages on input change
    useEffect(() => {
        if (error) setError("");
        if (success) setSuccess("");
    }, [email, password]);

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

        const result = await signIn(email, password);

        if (result.success) {
            // Track successful sign in
            analytics.trackSignInSuccess('email', result.isNewUser);
            
            if (result.isNewUser && result.message) {
                setSuccess(result.message);
                // Give user a moment to see the success message before navigating
                setTimeout(() => {
                    navigate("/profile");
                }, 2000);
            } else {
                navigate("/profile");
            }
        } else {
            setError(result.error || "Sign in failed");
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
                    Continue your financial education journey. Access your
                    progress in India's first financial literacy RPG game.
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
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full bg-dhani-dark border border-dhani-text/30 rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50"
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full bg-dhani-dark border border-dhani-text/30 rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50"
                />
                <PixelButton
                    type="submit"
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? "Signing In..." : "Sign In / Create Account"}
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
                <div className="text-center space-y-2">
                    <p className="text-dhani-text/60 text-xs font-robert">
                        New to Dhaniverse? Just enter your email and password
                        above - we'll create your account automatically!
                    </p>
                    <p className="text-dhani-text/70 text-sm font-robert">
                        Or{" "}
                        <Link
                            to="/sign-up"
                            className="text-dhani-gold hover:underline hover:text-dhani-gold/80"
                        >
                            create account manually
                        </Link>
                    </p>
                </div>
            </form>
        </div>
    );
};

export default CustomSignIn;
