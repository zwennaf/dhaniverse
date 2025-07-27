// Test setup file for vitest
import { vi } from 'vitest';

// Mock DOM methods that might not be available in jsdom
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn((cb) => setTimeout(cb, 16)),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn(),
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock Phaser Math utilities
global.Phaser = {
  Math: {
    Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
    Distance: {
      Between: (x1: number, y1: number, x2: number, y2: number) => 
        Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
      BetweenPoints: (a: any, b: any) => 
        Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2),
      BetweenPointsSquared: (a: any, b: any) => 
        (b.x - a.x) ** 2 + (b.y - a.y) ** 2,
      Chebyshev: (x1: number, y1: number, x2: number, y2: number) => 
        Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)),
      Power: (x1: number, y1: number, x2: number, y2: number, pow: number) => 
        Math.pow(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), pow),
      Snake: (x1: number, y1: number, x2: number, y2: number) => 
        Math.abs(x2 - x1) + Math.abs(y2 - y1),
      Squared: (x1: number, y1: number, x2: number, y2: number) => 
        (x2 - x1) ** 2 + (y2 - y1) ** 2
    }
  }
};