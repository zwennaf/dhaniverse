import React, { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface VideoPlayerProps {
    thumbnailSrc: string;
    videoSrc?: string;
    className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ thumbnailSrc, videoSrc = "", className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showIframe, setShowIframe] = useState(false);
    const backButtonRef = useRef<HTMLButtonElement | null>(null);
    const videoFocusRef = useRef<HTMLDivElement | null>(null);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const openTimer = useRef<number | null>(null);
    const closeTimer = useRef<number | null>(null);

    const getEmbedUrl = (src: string) => {
        if (!src) return "about:blank";
        return src.includes("?") ? `${src}&autoplay=1&rel=0` : `${src}?autoplay=1&rel=0`;
    };

    useEffect(() => {
        // Lock scroll while modal is open
        const prev = document.body.style.overflow;
        if (isOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = prev;
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        if (isOpen) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (openTimer.current) window.clearTimeout(openTimer.current);
            if (closeTimer.current) window.clearTimeout(closeTimer.current);
        };
    }, []);

    const handleOpen = () => {
        setIsOpen(true);
        // delay mounting iframe to allow entrance animation to stay smooth
        openTimer.current = window.setTimeout(() => {
            setShowIframe(true);
            setIframeLoaded(false);
            // focus the video container focus target afterwards (top-right)
            setTimeout(() => videoFocusRef.current?.focus(), 80);
        }, 260);
    };

    const handleClose = () => {
        setIsOpen(false);
        // keep iframe briefly during exit then unmount to stop playback
        closeTimer.current = window.setTimeout(() => setShowIframe(false), 240);
    };

    const embedUrl = getEmbedUrl(videoSrc);

    return (
        <div className={cn("relative w-full max-w-6xl mx-auto", className)}>
            {/* Thumbnail */}
            <div className="relative w-full max-w-[1100px] mx-auto px-3 sm:px-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black/20">
                    <img src={thumbnailSrc} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" draggable={false} />

                    {/* subtle gradient for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-90" />

                    {/* Centered sleek glass play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.button
                            onClick={handleOpen}
                            aria-label="Open video"
                            className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center bg-white/6 backdrop-blur-sm shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] overflow-hidden"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        >
                            <span className="absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] mix-blend-overlay pointer-events-none" />
                            <svg viewBox="0 0 48 48" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 14L34 24L18 34V14Z" fill="currentColor" />
                            </svg>
                        </motion.button>
                    </div>

                    {/* Timeline overlay on thumbnail (liquid glass) */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-[88%] sm:w-[84%] md:w-[76%] lg:w-[64%]">
                        <div className="backdrop-blur-sm bg-white/6 rounded-xl overflow-hidden border border-white/6">
                            <button onClick={handleOpen} aria-label="Open video timeline" className="w-full p-2">
                                <img src="/UI/videotimeline.png" alt="Video timeline" className="w-full select-none pointer-events-none block" draggable={false} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }}
                    >
                        {/* backdrop */}
                        <motion.div
                                className="absolute inset-0 bg-black/25 backdrop-blur-sm z-30"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.28 }}
                            onClick={() => handleClose()}
                        />

                        {/* strong soft glow behind video when iframe is present or loaded */}
                        <motion.div
                            aria-hidden
                            className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: iframeLoaded ? 1 : (showIframe ? 0.9 : 0.35) }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                        >
                            {/* extra-large high-intensity white radial glow behind the player */}
                            <div
                                className="rounded-3xl"
                                style={{
                                    position: 'relative',
                                    width: '220%',
                                    maxWidth: '3000px',
                                    height: '120%',
                                    transform: 'translateY(0%)',
                                    filter: 'blur(220px)',
                                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.42), rgba(255,255,255,0.14) 30%, transparent 65%)',
                                    opacity: 1,
                                    mixBlendMode: 'screen',
                                }}
                            />
                        </motion.div>

                        {/* back button outside container (top-right) */}
                        <div className="absolute right-4 top-4 z-50">
                            <button
                                ref={backButtonRef}
                                onClick={handleClose}
                                aria-label="Close"
                                className="w-10 h-10 rounded-full bg-white/6 flex items-center justify-center"
                            >
                                {/* cross / X icon */}
                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        {/* modal content */}
                        <motion.div
                                className="relative max-w-5xl w-full mx-auto z-50"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.36, ease: "easeOut" }}
                        >
                            <div className="bg-black/30 backdrop-blur-md border border-white/6 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="relative aspect-video w-full">
                                    {showIframe ? (
                                        <iframe
                                            src={embedUrl}
                                            title="Dhaniverse video"
                                            className="w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            onLoad={() => setIframeLoaded(true)}
                                        />
                                    ) : (
                                        // keep a smooth placeholder while iframe is delayed
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-20 h-20 rounded-full bg-white/6 backdrop-blur-sm flex items-center justify-center">
                                                <svg viewBox="0 0 48 48" className="w-8 h-8 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M18 14L34 24L18 34V14Z" fill="currentColor" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Close buttons removed - using external back button */}
                                {/* small hidden focus target inside modal content so keyboard focus stays on video */}
                                <div className="sr-only">
                                    <div ref={videoFocusRef} tabIndex={0} />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VideoPlayer;
