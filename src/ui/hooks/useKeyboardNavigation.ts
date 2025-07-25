import { useEffect, useCallback, useRef } from 'react';

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  onSpace?: () => void;
  enabled?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onSpace,
    enabled = true
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
        case 'Tab':
          onTab?.(event.shiftKey);
          break;
        case ' ':
          event.preventDefault();
          onSpace?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab, onSpace]);
};

// Focus management utilities
export const useFocusManagement = () => {
  const focusableSelectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const getFocusableElements = useCallback((container: HTMLElement) => {
    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, [focusableSelectors]);

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [getFocusableElements]);

  const restoreFocus = useCallback((element: HTMLElement | null) => {
    element?.focus();
  }, []);

  return {
    getFocusableElements,
    trapFocus,
    restoreFocus
  };
};

// Roving tabindex for lists and grids
export const useRovingTabIndex = <T extends HTMLElement>(
  items: T[],
  orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical'
) => {
  const activeIndexRef = useRef(0);

  const setActiveIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      // Remove tabindex from all items
      items.forEach((item, i) => {
        item.setAttribute('tabindex', i === index ? '0' : '-1');
      });
      
      activeIndexRef.current = index;
      items[index]?.focus();
    }
  }, [items]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const currentIndex = activeIndexRef.current;
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      setActiveIndex(newIndex);
    }
  }, [items, orientation, setActiveIndex]);

  useEffect(() => {
    // Initialize first item as focusable
    if (items.length > 0) {
      setActiveIndex(0);
    }
  }, [items, setActiveIndex]);

  useEffect(() => {
    items.forEach(item => {
      item.addEventListener('keydown', handleKeyDown);
    });

    return () => {
      items.forEach(item => {
        item.removeEventListener('keydown', handleKeyDown);
      });
    };
  }, [items, handleKeyDown]);

  return { setActiveIndex, activeIndex: activeIndexRef.current };
};

// Skip links functionality
export const useSkipLinks = () => {
  const skipToContent = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const createSkipLink = useCallback((targetId: string, label: string) => {
    return {
      href: `#${targetId}`,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        skipToContent(targetId);
      },
      children: label
    };
  }, [skipToContent]);

  return { skipToContent, createSkipLink };
};

// Announce to screen readers
export const useScreenReaderAnnouncements = () => {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcement container if it doesn't exist
    if (!announceRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.id = 'screen-reader-announcements';
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }

    return () => {
      if (announceRef.current && document.body.contains(announceRef.current)) {
        document.body.removeChild(announceRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce };
};

// Keyboard shortcuts
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = [
        event.ctrlKey && 'ctrl',
        event.altKey && 'alt',
        event.shiftKey && 'shift',
        event.metaKey && 'meta',
        event.key.toLowerCase()
      ].filter(Boolean).join('+');

      const handler = shortcuts[key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};