import React, { useRef, useLayoutEffect, useState } from "react";
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useMotionValue,
    useVelocity,
    useAnimationFrame,
} from "motion/react";
import TestimonialCard from "./TestimonialCard";
import { User } from "lucide-react";

interface Testimonial {
    quote: string;
    author: string;
}

interface VelocityMapping {
    input: [number, number];
    output: [number, number];
}

interface ScrollVelocityTestimonialsProps {
    testimonials: Testimonial[];
    baseVelocity?: number;
    scrollContainerRef?: React.RefObject<HTMLElement>;
    className?: string;
    damping?: number;
    stiffness?: number;
    numCopies?: number;
    velocityMapping?: VelocityMapping;
    parallaxClassName?: string;
    scrollerClassName?: string;
    parallaxStyle?: React.CSSProperties;
    scrollerStyle?: React.CSSProperties;
}

function useElementWidth<T extends HTMLElement>(
    ref: React.RefObject<T | null>
): number {
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        function updateWidth() {
            if (ref.current) {
                setWidth(ref.current.offsetWidth);
            }
        }
        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, [ref]);

    return width;
}

const ScrollVelocityTestimonials: React.FC<ScrollVelocityTestimonialsProps> = ({
    testimonials,
    baseVelocity = -50,
    scrollContainerRef,
    className = "",
    damping = 50,
    stiffness = 400,
    numCopies = 4,
    velocityMapping = { input: [0, 1000], output: [0, 5] },
    parallaxClassName = "",
    scrollerClassName = "",
    parallaxStyle,
    scrollerStyle,
}) => {
    const baseX = useMotionValue(0);
    const scrollOptions = scrollContainerRef
        ? { container: scrollContainerRef }
        : {};
    const { scrollY } = useScroll(scrollOptions);
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, {
        damping,
        stiffness,
    });

    const velocityFactor = useTransform(
        smoothVelocity,
        velocityMapping.input,
        velocityMapping.output,
        { clamp: false }
    );

    const copyRef = useRef<HTMLDivElement>(null);
    const copyWidth = useElementWidth(copyRef);

    function wrap(min: number, max: number, v: number): number {
        const range = max - min;
        const mod = (((v - min) % range) + range) % range;
        return mod + min;
    }

    const x = useTransform(baseX, (v) => {
        if (copyWidth === 0) return "0px";
        return `${wrap(-copyWidth, 0, v)}px`;
    });

    const directionFactor = useRef<number>(1);

    useAnimationFrame((t, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

        if (velocityFactor.get() < 0) {
            directionFactor.current = -1;
        } else if (velocityFactor.get() > 0) {
            directionFactor.current = 1;
        }

        moveBy += directionFactor.current * moveBy * velocityFactor.get();
        baseX.set(baseX.get() + moveBy);
    });

    // Create multiple copies of testimonials
    const testimonialSets = [];
    for (let i = 0; i < numCopies; i++) {
        testimonialSets.push(
            <div
                key={i}
                ref={i === 0 ? copyRef : null}
                className="flex gap-3 flex-shrink-0 mr-3"
            >
                {testimonials.map((testimonial, index) => (
                    <div
                        key={`${i}-${index}`}
                        className="flex-shrink-0 h-[225px] w-[450px] bg-[url('/UI/cta.svg')] bg-center bg-no-repeat bg-contain 
                     cursor-pointer transition-all duration-300 hover:brightness-110 hover:drop-shadow-lg"
                    >
                        <TestimonialCard
                            quote={testimonial.quote}
                            author={testimonial.author}
                            userIcon={
                                <User className="w-8 h-8 text-dhani-text" />
                            }
                            className="p-6 text-wrap h-full"
                        />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            className={`${parallaxClassName} relative overflow-hidden w-full ${className}`}
            style={parallaxStyle}
        >
            <motion.div
                className={`${scrollerClassName} flex whitespace-nowrap`}
                style={{ x, ...scrollerStyle }}
            >
                {testimonialSets}
            </motion.div>
        </div>
    );
};

export default ScrollVelocityTestimonials;
