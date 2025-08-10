import React from "react";
import TestimonialCard from "./TestimonialCard";
import { User } from "lucide-react";

interface Testimonial {
    quote: string;
    author: string;
}

interface MarqueeTestimonialsProps {
    testimonials: Testimonial[];
    direction?: "left" | "right";
    speed?: number;
}

const MarqueeTestimonials = ({
    testimonials,
    direction = "left",
    speed = 50,
}: MarqueeTestimonialsProps) => {
    return (
        <div className="w-full overflow-hidden">
            <div className={`flex ${direction === "right" ? "animate-marquee-reverse" : "animate-marquee"} hover:[animation-play-state:paused]`}>
                {/* First set */}
                {testimonials.map((testimonial, index) => (
                    <div
                        key={`first-${index}`}
                        className="flex-shrink-0 h-[225px] w-[450px] bg-[url('/UI/cta.svg')] bg-center bg-no-repeat bg-contain 
                                 cursor-pointer transition-all duration-300 hover:brightness-110 hover:drop-shadow-lg mr-3"
                    >
                        <TestimonialCard
                            quote={testimonial.quote}
                            author={testimonial.author}
                            userIcon={<User className="w-8 h-8 text-dhani-text" />}
                            className="p-6 text-wrap h-full"
                        />
                    </div>
                ))}
                
                {/* Second set - exact duplicate */}
                {testimonials.map((testimonial, index) => (
                    <div
                        key={`second-${index}`}
                        className="flex-shrink-0 h-[225px] w-[450px] bg-[url('/UI/cta.svg')] bg-center bg-no-repeat bg-contain 
                                 cursor-pointer transition-all duration-300 hover:brightness-110 hover:drop-shadow-lg mr-3"
                    >
                        <TestimonialCard
                            quote={testimonial.quote}
                            author={testimonial.author}
                            userIcon={<User className="w-8 h-8 text-dhani-text" />}
                            className="p-6 text-wrap h-full"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarqueeTestimonials;