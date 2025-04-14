import React, { useState } from "react";
import { cn } from "../lib/utils";

interface VideoPlayerProps {
    thumbnailSrc: string;
    videoSrc?: string;
    className?: string;
}

const VideoPlayer = ({
    thumbnailSrc,
    videoSrc = "",
    className,
}: VideoPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = () => {
        setIsPlaying(true);
        // In a real implementation, you would play the video here
        console.log("Play video:", videoSrc);
    };

    return (
        <div
            className={cn(
                "relative w-full max-w-4xl mx-auto overflow-hidden",
                className
            )}
        >
            {!isPlaying ? (
                <div>
                    <img
                        src={thumbnailSrc}
                        alt="Video thumbnail"
                        className="w-full h-auto"
                    />
                    <button
                        onClick={handlePlay}
                        className="absolute top-1/2 left-1/2 transform bg-transparent -translate-x-1/2 -translate-y-1/2"
                        aria-label="Play video"
                    >
                        <img src="/UI/videoplay.png" className="size-16 " />
            </button>
            <button onClick={handlePlay} className="w-[95%] m-auto bg-transparent cursor-pointer -translate-y-8">
              <img src="/UI/videotimeline.png" alt="" />
            </button>
                </div>
            ) : (
                <div className="relative w-full pt-[56.25%] pixel-corners overflow-hidden">
                    <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={videoSrc ? videoSrc : "about:blank"}
                        title="Video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
