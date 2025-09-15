import React, { useRef, useEffect, useState, PropsWithChildren } from 'react';
import { motion } from 'motion/react';

// Simple IntersectionObserver hook (inspired by patterns from reactbits.dev/docs)
function useInView<T extends HTMLElement>(options: IntersectionObserverInit = { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.2 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        setInView(true);
        observer.unobserve(entry.target);
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [options, inView]);

  return { ref, inView } as const;
}

interface RevealOnScrollProps extends PropsWithChildren {
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'span';
  offsetY?: number;
}

const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  className = '',
  delay = 0,
  as = 'div',
  offsetY = 40,
}) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  // Map allowed tags to motion components
  const tagMap: Record<string, any> = {
    div: motion.div,
    section: motion.section || motion.div,
    article: (motion as any).article || motion.div,
    span: motion.span || motion.div,
  };
  const MotionTag = tagMap[as] || motion.div;
  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: 'blur(18px)', scale: 0.96, y: offsetY }}
      animate={inView ? { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </MotionTag>
  );
};

export default RevealOnScroll;
