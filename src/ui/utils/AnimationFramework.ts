import React from 'react';

export interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export interface NumberTransitionConfig extends AnimationConfig {
  from: number;
  to: number;
  onUpdate: (value: number) => void;
  formatter?: (value: number) => string;
}

export class AnimationFramework {
  private static activeAnimations = new Map<string, Animation>();

  // Animate number transitions (for balance updates, etc.)
  static animateNumber(config: NumberTransitionConfig): Promise<void> {
    const {
      from,
      to,
      onUpdate,
      formatter = (val) => val.toString(),
      duration = 500,
      easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
      delay = 0
    } = config;

    return new Promise((resolve) => {
      const startTime = performance.now() + delay;
      const endTime = startTime + duration;
      const difference = to - from;

      const animate = (currentTime: number) => {
        if (currentTime < startTime) {
          requestAnimationFrame(animate);
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Apply easing function (simplified cubic-bezier)
        const easedProgress = this.applyEasing(progress, easing);
        const currentValue = from + (difference * easedProgress);
        
        onUpdate(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          onUpdate(to); // Ensure final value is exact
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  // Create staggered animations for lists
  static staggeredAnimation(
    elements: HTMLElement[],
    animationClass: string,
    staggerDelay: number = 100
  ): Promise<void[]> {
    return Promise.all(
      elements.map((element, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            element.classList.add(animationClass);
            
            // Listen for animation end
            const handleAnimationEnd = () => {
              element.removeEventListener('animationend', handleAnimationEnd);
              resolve();
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
          }, index * staggerDelay);
        });
      })
    );
  }

  // Smooth element transitions
  static transitionElement(
    element: HTMLElement,
    fromStyles: Partial<CSSStyleDeclaration>,
    toStyles: Partial<CSSStyleDeclaration>,
    config: AnimationConfig = {}
  ): Promise<void> {
    const {
      duration = 300,
      easing = 'ease-out',
      delay = 0
    } = config;

    return new Promise((resolve) => {
      // Apply initial styles
      Object.assign(element.style, fromStyles);
      
      // Force reflow
      element.offsetHeight;
      
      // Set transition
      element.style.transition = `all ${duration}ms ${easing} ${delay}ms`;
      
      // Apply final styles
      Object.assign(element.style, toStyles);
      
      // Clean up after animation
      const cleanup = () => {
        element.style.transition = '';
        element.removeEventListener('transitionend', cleanup);
        resolve();
      };
      
      element.addEventListener('transitionend', cleanup);
      
      // Fallback timeout
      setTimeout(cleanup, duration + delay + 50);
    });
  }

  // Pulse animation for status indicators
  static pulseElement(element: HTMLElement, intensity: number = 1): void {
    const animationId = `pulse-${Date.now()}`;
    
    // Cancel existing pulse animation
    if (this.activeAnimations.has(element.id || animationId)) {
      this.activeAnimations.get(element.id || animationId)?.cancel();
    }

    const keyframes = [
      { 
        transform: 'scale(1)', 
        filter: `drop-shadow(0 0 2px rgba(241, 205, 54, ${0.3 * intensity}))` 
      },
      { 
        transform: `scale(${1 + 0.05 * intensity})`, 
        filter: `drop-shadow(0 0 8px rgba(241, 205, 54, ${0.6 * intensity}))` 
      },
      { 
        transform: 'scale(1)', 
        filter: `drop-shadow(0 0 2px rgba(241, 205, 54, ${0.3 * intensity}))` 
      }
    ];

    const animation = element.animate(keyframes, {
      duration: 2000,
      iterations: Infinity,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)'
    });

    this.activeAnimations.set(element.id || animationId, animation);
  }

  // Stop pulse animation
  static stopPulse(element: HTMLElement): void {
    const animationId = element.id || `pulse-${element.tagName}`;
    const animation = this.activeAnimations.get(animationId);
    
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(animationId);
    }
  }

  // Shake animation for errors
  static shakeElement(element: HTMLElement): Promise<void> {
    const keyframes = [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(0)' }
    ];

    return new Promise((resolve) => {
      const animation = element.animate(keyframes, {
        duration: 500,
        easing: 'ease-in-out'
      });

      animation.addEventListener('finish', () => resolve());
    });
  }

  // Bounce animation for success states
  static bounceElement(element: HTMLElement): Promise<void> {
    const keyframes = [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ];

    return new Promise((resolve) => {
      const animation = element.animate(keyframes, {
        duration: 600,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      });

      animation.addEventListener('finish', () => resolve());
    });
  }

  // Slide in animation with direction
  static slideIn(
    element: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down' = 'left',
    distance: number = 20
  ): Promise<void> {
    const transforms = {
      left: `translateX(-${distance}px)`,
      right: `translateX(${distance}px)`,
      up: `translateY(-${distance}px)`,
      down: `translateY(${distance}px)`
    };

    const keyframes = [
      { 
        transform: transforms[direction], 
        opacity: '0' 
      },
      { 
        transform: 'translate(0)', 
        opacity: '1' 
      }
    ];

    return new Promise((resolve) => {
      const animation = element.animate(keyframes, {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      });

      animation.addEventListener('finish', () => resolve());
    });
  }

  // Helper function to apply easing
  private static applyEasing(progress: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'cubic-bezier(0.4, 0, 0.2, 1)':
      default:
        // Simplified cubic-bezier approximation
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    }
  }

  // Clean up all animations
  static cleanup(): void {
    this.activeAnimations.forEach(animation => animation.cancel());
    this.activeAnimations.clear();
  }
}

// React hook for number animations
export const useNumberAnimation = (
  targetValue: number,
  options: Partial<NumberTransitionConfig> = {}
) => {
  const [displayValue, setDisplayValue] = React.useState(targetValue);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (displayValue === targetValue) return;

    setIsAnimating(true);
    
    AnimationFramework.animateNumber({
      from: displayValue,
      to: targetValue,
      onUpdate: setDisplayValue,
      duration: 500,
      ...options
    }).then(() => {
      setIsAnimating(false);
    });
  }, [targetValue]);

  return { displayValue, isAnimating };
};

export default AnimationFramework;