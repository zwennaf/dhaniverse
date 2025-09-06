import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PixelButton from "../atoms/PixelButton";
import SEO from "../SEO";

const MagicLinkVerification = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { verifyMagicLink, isLoaded } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState("");
    const [isNewUser, setIsNewUser] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (!token) {
            setStatus('error');
            setMessage('Invalid magic link. No token provided.');
            return;
        }

        // Verify the magic link
        const verify = async () => {
            try {
                const result = await verifyMagicLink(token);
                
                if (result.success) {
                    setStatus('success');
                    setMessage(result.message || 'Successfully signed in!');
                    setIsNewUser(result.isNewUser || false);
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        if (result.isNewUser) {
                            navigate('/profile', { replace: true });
                        } else {
                            navigate('/game', { replace: true });
                        }
                    }, 2000);
                } else {
                    setStatus('error');
                    
                    // Check if this is a ban - redirect to banned page
                    if (result.error === 'BANNED') {
                        navigate('/banned', { replace: true });
                        return;
                    }
                    
                    setMessage(result.error || 'Failed to verify magic link');
                }
            } catch (error) {
                setStatus('error');
                setMessage('An unexpected error occurred');
                console.error('Magic link verification error:', error);
            }
        };

        if (isLoaded) {
            verify();
        }
    }, [searchParams, verifyMagicLink, navigate, isLoaded]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <div className="text-white mb-4">Loading authentication...</div>
                <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <SEO
                title="Verifying Magic Link - Dhaniverse"
                description="Verifying your secure magic link to sign you into Dhaniverse"
                url="https://dhaniverse.in/auth/magic"
                noIndex={true}
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

            <div className="bg-black/70 p-8 rounded-lg w-full max-w-md space-y-6 z-10 text-center">
                <h1 className="text-3xl font-tickerbit tracking-widest text-dhani-text mb-4">
                    <span className="text-dhani-gold pixel-glow">
                        Dhaniverse
                    </span>
                </h1>

                {status === 'loading' && (
                    <div className="space-y-4">
                        <div className="text-4xl mb-4">🔐</div>
                        <h2 className="text-xl font-tickerbit text-dhani-text">
                            Verifying Magic Link
                        </h2>
                        <p className="text-dhani-text/80 text-sm font-robert">
                            Please wait while we securely sign you in...
                        </p>
                        <div className="w-12 h-12 border-t-4 border-dhani-gold border-solid rounded-full animate-spin mx-auto"></div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="text-4xl mb-4">✅</div>
                        <h2 className="text-xl font-tickerbit text-green-400">
                            {isNewUser ? 'Welcome to Dhaniverse!' : 'Welcome Back!'}
                        </h2>
                        <p className="text-dhani-text/80 text-sm font-robert">
                            {message}
                        </p>
                        {isNewUser ? (
                            <p className="text-dhani-text/60 text-xs font-robert">
                                Redirecting you to complete your profile...
                            </p>
                        ) : (
                            <p className="text-dhani-text/60 text-xs font-robert">
                                Redirecting you to the game...
                            </p>
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="text-4xl mb-4">❌</div>
                        <h2 className="text-xl font-tickerbit text-red-400">
                            Verification Failed
                        </h2>
                        <p className="text-dhani-text/80 text-sm font-robert">
                            {message}
                        </p>
                        <div className="space-y-2">
                            <PixelButton
                                onClick={() => navigate('/sign-in')}
                                className="w-full"
                            >
                                Try Again
                            </PixelButton>
                            <p className="text-dhani-text/60 text-xs font-robert">
                                Request a new magic link from the sign-in page
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MagicLinkVerification;
