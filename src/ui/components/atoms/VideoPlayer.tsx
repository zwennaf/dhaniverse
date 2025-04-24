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
                "relative w-full max-w-6xl mx-auto",
                className
            )}
        >
             
            {!isPlaying ? (
                <div className='relative z-[5]'>
                    <img
                        src={thumbnailSrc}
                        alt="Video thumbnail"
                        className="w-full h-auto z-100"
                    />
                    <button
                        onClick={handlePlay}
                        className="absolute  hover:border-x-dhani-gold hover:border-y-transparent top-1/2 left-1/2 transform bg-transparent -translate-x-1/2 -translate-y-1/2"
                        aria-label="Play video"
                    >
                        <img src="/UI/videoplay.png" className="size-32 " />
                    </button>
                    {/* here add a green blur behind the video element */}
                    <button
                        onClick={handlePlay}
                        className="w-[95%] m-auto hover:border-transparent bg-transparent cursor-pointer -translate-y-12"
                    >
                        <img src="/UI/videotimeline.png" alt="" />
                    </button>
                </div>
            ) : (
                <div className="relative z-[5] w-full pt-[56.25%] pixel-corners overflow-hidden">
                    <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={videoSrc ? videoSrc : "about:blank"}
                        title="Video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            )}
            <div className="absolute lg:w-[980px] lg:h-[700px] md:w-[980px] md:h-[700px] w-[500px] h-[300px] bg-[#8fcb8f70] md:blur-[150px] sm:blur-[100px] blur-[50px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] animate-[blobPulse_5s_ease-in-out_infinite]"></div> 
        </div>
    );
};

export default VideoPlayer;
