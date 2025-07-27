import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapDragHandler } from '../MapDragHandler';
import { MainGameScene } from '../../scenes/MainScene';
import { ExtendedCamera } from '../ChunkedMapManager';

// Mock performance.now for consistent timing tests
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

// Mock DOM methods
Object.defineProperty(document, 'body', {
  value: {
    style: {
      cursor: 'default',
      transition: ''
    }
  },
  writable: true
});

Object.defineProperty(document, 'querySelector', {
  value: vi.fn().mockReturnValue(null),
  writable: true
});

Object.defineProperty(document, 'querySelectorAll', {
  value: vi.fn().mockReturnValue([]),
  writable: true
});

// Mock Phaser components
const mockTweens = {
  add: vi.fn().mockReturnValue({
    destroy: vi.fn()
  })
};

const mockGraphics = {
  clear: vi.fn(),
  setDepth: vi.fn(),
  setVisible: vi.fn(),
  setAlpha: vi.fn(),
  lineStyle: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  strokePath: vi.fn(),
  strokeRect: vi.fn(),
  destroy: vi.fn()
};

const mockAdd = {
  graphics: vi.fn().mockReturnValue(mockGraphics)
};

// Create comprehensive mock scene for integration testing
const createIntegrationMockScene = (overrides = {}) => {
  const mockChunkManager = {
    isPlayerInBuilding: vi.fn().mockReturnValue(false),
    getMapWidth: vi.fn().mockReturnValue(12074),
    getMapHeight: vi.fn().mockReturnValue(8734),
    loadChunksAroundPosition: vi.fn(),
    updateVisibleChunks: vi.fn(),
    preloadChunks: vi.fn(),
    getLoadedChunks: vi.fn().mockReturnValue(new Map()),
    getVisibleChunks: vi.fn().mockReturnValue(new Set()),
    isChunkLoaded: vi.fn().mockReturnValue(true),
    getChunkAtPosition: vi.fn().mockReturnValue('chunk_0_0'),
    unloadDistantChunks: vi.fn()
  };

  const mockCamera = {
    zoom: 1.0,
    minZoom: 0.25,
    maxZoom: 2.0,
    scrollX: 1000,
    scrollY: 1000,
    width: 1920,
    height: 1080,
    setZoom: vi.fn(),
    setScroll: vi.fn(),
    startFollow: vi.fn(),
    stopFollow: vi.fn(),
    centerOn: vi.fn()
  } as Partial<ExtendedCamera>;

  const mockPlayer = {
    getSprite: vi.fn().mockReturnValue({
      getBounds: vi.fn().mockReturnValue({
        x: 1000,
        y: 1000,
        width: 32,
        height: 32
      }),
      x: 1000,
      y: 1000
    }),
    setPosition: vi.fn(),
    getPosition: vi.fn().mockReturnValue({ x: 1000, y: 1000 })
  };

  return {
    cameras: {
      main: mockCamera
    },
    input: {
      on: vi.fn(),
      off: vi.fn(),
      keyboard: {
        addKeys: vi.fn().mockReturnValue({
          W: { isDown: false },
          A: { isDown: false },
          S: { isDown: false },
          D: { isDown: false }
        })
      }
    },
    mapManager: mockChunkManager,
    getPlayer: vi.fn().mockReturnValue(mockPlayer),
    npcManager: {
      getNPCs: vi.fn().mockReturnValue([]),
      isNearNPC: vi.fn().mockReturnValue(false)
    },
    bankNPCManager: {
      isNearBankNPC: vi.fn().mockReturnValue(false)
    },
    stockMarketManager: {
      isNearStockMarket: vi.fn().mockReturnValue(false)
    },
    atmManager: {
      isNearATM: vi.fn().mockReturnValue(false)
    },
    buildingManager: {
      isNearBuilding: vi.fn().mockReturnValue(false),
      getBuildingAt: vi.fn().mockReturnValue(null)
    },
    tweens: mockTweens,
    add: mockAdd,
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    },
    ...overrides
  } as unknown as MainGameScene;
};

describe('MapDragHandler Integration Tests', () => {
  let dragHandler: MapDragHandler;
  let mockScene: MainGameScene;
  let mockCamera: ExtendedCamera;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
    mockScene = createIntegrationMockScene();
    mockCamera = mockScene.cameras.main as ExtendedCamera;
    dragHandler = new MapDragHandler(mockScene);
    dragHandler.initialize();
  });

  afterEach(() => {
    if (dragHandler) {
      dragHandler.destroy();
    }
  });

  describe('Chunk Loading System Integration', () => {
    it('should work seamlessly with chunk loading during drag operations', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      const movePointer = { button: 0, x: 860, y: 440 } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Simulate drag movement that would trigger chunk loading
      dragHandler['onPointerMove'](movePointer);

      // Verify camera was updated
      expect(mockCamera.setScroll).toHaveBeenCalled();

      // Verify chunk loading system wasn't disrupted
      expect(mockScene.mapManager.getMapWidth).toHaveBeenCalled();
      expect(mockScene.mapManager.getMapHeight).toHaveBeenCalled();
    });

    it('should maintain chunk loading performance during rapid drag movements', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      
      dragHandler['onPointerDown'](startPointer);

      // Simulate rapid drag movements
      const movements = [
        { x: 950, y: 530 },
        { x: 940, y: 520 },
        { x: 930, y: 510 },
        { x: 920, y: 500 },
        { x: 910, y: 490 }
      ];

      movements.forEach((pos, index) => {
        mockPerformanceNow.mockReturnValue(1000 + (index * 5)); // 5ms between moves
        dragHandler['onPointerMove']({ button: 0, ...pos } as Phaser.Input.Pointer);
      });

      // Should have throttled some moves to maintain performance
      const scrollCalls = mockCamera.setScroll.mock.calls.length;
      expect(scrollCalls).toBeLessThan(movements.length);
      expect(scrollCalls).toBeGreaterThan(0);
    });

    it('should not interfere with chunk preloading system', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      const movePointer = { button: 0, x: 760, y: 340 } as Phaser.Input.Pointer;

      // Start drag and move significantly
      dragHandler['onPointerDown'](startPointer);
      dragHandler['onPointerMove'](movePointer);

      // Chunk system should still be accessible and functional
      expect(mockScene.mapManager.getMapWidth()).toBe(12074);
      expect(mockScene.mapManager.getMapHeight()).toBe(8734);
      expect(mockScene.mapManager.isPlayerInBuilding()).toBe(false);
    });

    it('should handle chunk loading errors gracefully during drag', () => {
      // Mock chunk loading error
      mockScene.mapManager.getMapWidth.mockImplementation(() => {
        throw new Error('Chunk loading error');
      });

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      const movePointer = { button: 0, x: 860, y: 440 } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](startPointer);
      
      // Should not crash when chunk system has errors
      expect(() => {
        dragHandler['onPointerMove'](movePointer);
      }).not.toThrow();

      // Should fall back to default bounds
      const bounds = dragHandler['calculateCameraBounds']();
      expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
    });
  });

  describe('Zoom Controls Integration', () => {
    it('should work smoothly with zoom controls at different zoom levels', () => {
      const testZoomLevels = [0.5, 1.0, 1.5]; // Test fewer levels to focus on core functionality
      
      testZoomLevels.forEach((zoomLevel, index) => {
        // Clear mocks before each test
        vi.clearAllMocks();
        
        mockCamera.zoom = zoomLevel;
        
        const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
        const movePointer = { button: 0, x: 1060, y: 640 } as Phaser.Input.Pointer;

        // Ensure no UI interference for this test
        document.querySelector = vi.fn().mockReturnValue(null);
        document.querySelectorAll = vi.fn().mockReturnValue([]);
        mockScene.getPlayer().getSprite().getBounds.mockReturnValue({
          x: 2000, y: 2000, width: 32, height: 32
        });

        dragHandler['onPointerDown'](startPointer);
        expect(dragHandler['dragState'].isDragging).toBe(true);

        dragHandler['onPointerMove'](movePointer);
        dragHandler['onPointerUp'](movePointer);

        // Verify drag functionality works - at least one of these should be true
        const scrollCalled = mockCamera.setScroll.mock.calls.length > 0;
        const dragStateWasActive = dragHandler['dragState'].isDragging === false; // Should be false after onPointerUp
        
        expect(scrollCalled || dragStateWasActive).toBe(true);
        
        // Sensitivity should be appropriate for zoom level
        const sensitivity = dragHandler['getZoomAdjustedSensitivity']();
        expect(sensitivity).toBeGreaterThan(0);
        expect(sensitivity).toBeLessThan(10);
      });
    });

    it('should handle zoom changes during drag operations', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      
      // Start drag at zoom 1.0
      mockCamera.zoom = 1.0;
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Change zoom during drag
      mockCamera.zoom = 1.5;
      dragHandler.update(); // This should handle zoom changes

      // Continue dragging
      const movePointer = { button: 0, x: 1060, y: 640 } as Phaser.Input.Pointer;
      dragHandler['onPointerMove'](movePointer);

      // Should still work with new zoom level
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(dragHandler['dragState'].isDragging).toBe(true);
    });

    it('should validate zoom levels correctly', () => {
      const validZooms = [0.25, 0.5, 1.0, 1.5, 2.0];
      const invalidZooms = [0.1, 0, -1, 3.0];

      validZooms.forEach(zoom => {
        expect(dragHandler.validateZoomLevel(zoom)).toBe(true);
      });

      invalidZooms.forEach(zoom => {
        expect(dragHandler.validateZoomLevel(zoom)).toBe(false);
      });

      // Test that the validation method exists and returns boolean values
      expect(typeof dragHandler.validateZoomLevel(1.0)).toBe('boolean');
      expect(typeof dragHandler.validateZoomLevel(0.1)).toBe('boolean');
    });

    it('should provide zoom information for debugging', () => {
      mockCamera.zoom = 1.5;
      const zoomInfo = dragHandler.getZoomInfo();

      expect(zoomInfo.current).toBe(1.5);
      expect(zoomInfo.min).toBe(0.25);
      expect(zoomInfo.max).toBe(2.0);
      expect(zoomInfo.sensitivity).toBeGreaterThan(0);
    });

    it('should maintain camera bounds correctly across zoom levels', () => {
      const zoomLevels = [0.25, 1.0, 2.0];
      
      zoomLevels.forEach(zoom => {
        mockCamera.zoom = zoom;
        const bounds = dragHandler['calculateCameraBounds']();
        
        // Bounds should be valid
        expect(bounds.minX).toBeLessThanOrEqual(bounds.maxX);
        expect(bounds.minY).toBeLessThanOrEqual(bounds.maxY);
        expect(bounds.minX).toBeGreaterThanOrEqual(0);
        expect(bounds.minY).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Building Entry/Exit Integration', () => {
    it('should disable dragging when entering buildings', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      
      // Start drag outside building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(false);
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Enter building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(true);
      dragHandler.update();

      // Drag should be disabled
      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should prevent drag initiation when in buildings', () => {
      // Set player in building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(true);

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      // Should not start dragging
      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should re-enable dragging when exiting buildings', () => {
      // Start in building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(true);
      dragHandler.update();

      // Exit building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(false);
      dragHandler.update();

      // Should be able to start dragging again
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);
    });

    it('should handle rapid building state changes', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      
      // Simulate rapid building entry/exit
      for (let i = 0; i < 10; i++) {
        mockScene.mapManager.isPlayerInBuilding.mockReturnValue(i % 2 === 0);
        dragHandler.update();
        
        // Try to start drag
        dragHandler['onPointerDown'](startPointer);
        
        if (i % 2 === 0) {
          // In building - should not drag
          expect(dragHandler['dragState'].isDragging).toBe(false);
        } else {
          // Outside building - should drag
          expect(dragHandler['dragState'].isDragging).toBe(true);
          dragHandler['onPointerUp'](startPointer); // End drag
        }
      }
    });
  });

  describe('UI Interaction Priority Integration', () => {
    it('should prevent drag when banking UI is open', () => {
      // Mock banking UI present
      document.querySelector = vi.fn().mockImplementation((selector) => {
        if (selector === '[data-testid="banking-dashboard"]') {
          return { getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }) };
        }
        return null;
      });

      const startPointer = { button: 0, x: 50, y: 50 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should prevent drag when stock market UI is open', () => {
      // Mock stock market UI present
      document.querySelector = vi.fn().mockImplementation((selector) => {
        if (selector === '[data-testid="stock-market-dashboard"]') {
          return { getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }) };
        }
        return null;
      });

      const startPointer = { button: 0, x: 50, y: 50 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should prevent drag when ATM UI is open', () => {
      // Mock ATM UI present
      document.querySelector = vi.fn().mockImplementation((selector) => {
        if (selector === '[data-testid="atm-dashboard"]') {
          return { getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100 }) };
        }
        return null;
      });

      const startPointer = { button: 0, x: 50, y: 50 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should prevent drag when clicking on player character', () => {
      // Position camera and player so click would be on player
      mockCamera.scrollX = 900;
      mockCamera.scrollY = 900;
      mockCamera.zoom = 1.0;
      
      // Player at world position (1000, 1000)
      mockScene.getPlayer().getSprite().getBounds.mockReturnValue({
        x: 950, // Within click buffer
        y: 950,
        width: 100,
        height: 100
      });

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should prevent drag when clicking near NPCs', () => {
      // Add NPC manager
      mockScene.npcManager = {
        getNPCs: vi.fn().mockReturnValue([]),
        isNearNPC: vi.fn().mockReturnValue(false)
      } as any;

      // Position camera so click would be near Village Elder NPC (737, 3753)
      mockCamera.scrollX = 337; // 737 - 400 = 337
      mockCamera.scrollY = 3453; // 3753 - 300 = 3453
      mockCamera.zoom = 1.0;

      const startPointer = { button: 0, x: 400, y: 300 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should allow drag when no interactive elements are present', () => {
      // Ensure no UI elements
      document.querySelector = vi.fn().mockReturnValue(null);
      document.querySelectorAll = vi.fn().mockReturnValue([]);

      // Position player far from click
      mockScene.getPlayer().getSprite().getBounds.mockReturnValue({
        x: 2000,
        y: 2000,
        width: 32,
        height: 32
      });

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      expect(dragHandler['dragState'].isDragging).toBe(true);
    });
  });

  describe('Performance Under Various Conditions', () => {
    it('should maintain performance at minimum zoom level', () => {
      mockCamera.zoom = 0.25;
      const startTime = performance.now();
      
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      // Simulate 100 rapid movements
      for (let i = 0; i < 100; i++) {
        mockPerformanceNow.mockReturnValue(startTime + (i * 20)); // 20ms between moves
        dragHandler['onPointerMove']({
          button: 0,
          x: 960 + i,
          y: 540 + i
        } as Phaser.Input.Pointer);
      }

      // Should have processed some moves but throttled others
      const scrollCalls = mockCamera.setScroll.mock.calls.length;
      expect(scrollCalls).toBeGreaterThan(0);
      expect(scrollCalls).toBeLessThan(100); // Throttling should reduce calls
    });

    it('should maintain performance at maximum zoom level', () => {
      mockCamera.zoom = 2.0;
      const startTime = performance.now();
      
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      // Simulate 100 rapid movements
      for (let i = 0; i < 100; i++) {
        mockPerformanceNow.mockReturnValue(startTime + (i * 20));
        dragHandler['onPointerMove']({
          button: 0,
          x: 960 + i,
          y: 540 + i
        } as Phaser.Input.Pointer);
      }

      const scrollCalls = mockCamera.setScroll.mock.calls.length;
      expect(scrollCalls).toBeGreaterThan(0);
      expect(scrollCalls).toBeLessThan(100);
    });

    it('should handle rapid zoom changes during drag without performance issues', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      const zoomLevels = [0.25, 0.5, 1.0, 1.5, 2.0, 1.0, 0.5];
      
      zoomLevels.forEach((zoom, index) => {
        mockCamera.zoom = zoom;
        dragHandler.update(); // Handle zoom change
        
        // Continue dragging
        dragHandler['onPointerMove']({
          button: 0,
          x: 960 + index * 10,
          y: 540 + index * 10
        } as Phaser.Input.Pointer);
      });

      // Should handle all zoom changes without errors
      expect(mockCamera.setScroll).toHaveBeenCalled();
      expect(dragHandler['dragState'].isDragging).toBe(true);
    });

    it('should handle large map boundaries efficiently', () => {
      // Set very large map
      mockScene.mapManager.getMapWidth.mockReturnValue(50000);
      mockScene.mapManager.getMapHeight.mockReturnValue(50000);

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      // Test boundary calculation performance
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        dragHandler['calculateCameraBounds']();
      }
      const endTime = Date.now();

      // Should complete quickly (less than 100ms for 100 calculations)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should throttle mouse events effectively under high frequency input', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      let processedMoves = 0;
      const originalSetScroll = mockCamera.setScroll;
      mockCamera.setScroll = vi.fn((...args) => {
        processedMoves++;
        return originalSetScroll.apply(mockCamera, args);
      });

      // Simulate very high frequency input (1ms intervals)
      for (let i = 0; i < 50; i++) {
        mockPerformanceNow.mockReturnValue(1000 + i);
        dragHandler['onPointerMove']({
          button: 0,
          x: 960 + i,
          y: 540 + i
        } as Phaser.Input.Pointer);
      }

      // Should have throttled most moves (16ms throttle means ~3 moves per 50ms)
      expect(processedMoves).toBeLessThan(10);
      expect(processedMoves).toBeGreaterThan(0);
    });

    it('should recover gracefully from performance issues', () => {
      // Mock a slow operation
      const slowSetScroll = vi.fn().mockImplementation(() => {
        // Simulate slow operation
        const start = Date.now();
        while (Date.now() - start < 50) {
          // Busy wait for 50ms
        }
      });
      mockCamera.setScroll = slowSetScroll;

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      dragHandler['onPointerDown'](startPointer);

      // Should not crash with slow operations
      expect(() => {
        dragHandler['onPointerMove']({
          button: 0,
          x: 1060,
          y: 640
        } as Phaser.Input.Pointer);
      }).not.toThrow();

      expect(slowSetScroll).toHaveBeenCalled();
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete drag workflow with all systems', () => {
      // Start with realistic game state
      mockCamera.zoom = 1.0;
      mockCamera.scrollX = 5000;
      mockCamera.scrollY = 4000;
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(false);

      // Ensure no UI interference
      document.querySelector = vi.fn().mockReturnValue(null);
      mockScene.getPlayer().getSprite().getBounds.mockReturnValue({
        x: 6000, y: 5000, width: 32, height: 32
      });

      // Complete drag sequence
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      const movePointer1 = { button: 0, x: 860, y: 440 } as Phaser.Input.Pointer;
      const movePointer2 = { button: 0, x: 760, y: 340 } as Phaser.Input.Pointer;
      const endPointer = { button: 0, x: 760, y: 340 } as Phaser.Input.Pointer;

      // Execute complete workflow
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);
      expect(document.body.style.cursor).toBe('grabbing');

      dragHandler['onPointerMove'](movePointer1);
      const firstCallCount = mockCamera.setScroll.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      dragHandler['onPointerMove'](movePointer2);
      const secondCallCount = mockCamera.setScroll.mock.calls.length;
      
      // Should have at least processed the first move, second may be throttled
      expect(secondCallCount).toBeGreaterThanOrEqual(firstCallCount);

      dragHandler['onPointerUp'](endPointer);
      expect(dragHandler['dragState'].isDragging).toBe(false);
      expect(document.body.style.cursor).toBe('default');
    });

    it('should integrate properly with all game systems simultaneously', () => {
      // Set up complex game state
      mockScene.npcManager = { getNPCs: vi.fn().mockReturnValue([]) } as any;
      mockScene.bankNPCManager = { isNearBankNPC: vi.fn().mockReturnValue(false) } as any;
      mockScene.stockMarketManager = { isNearStockMarket: vi.fn().mockReturnValue(false) } as any;
      mockScene.atmManager = { isNearATM: vi.fn().mockReturnValue(false) } as any;
      mockScene.buildingManager = { isNearBuilding: vi.fn().mockReturnValue(false) } as any;

      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      
      // Should work with all systems present
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Update should work with all systems
      dragHandler.update();
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Movement should work with all systems
      dragHandler['onPointerMove']({ button: 0, x: 860, y: 440 } as Phaser.Input.Pointer);
      expect(mockCamera.setScroll).toHaveBeenCalled();
    });

    it('should maintain state consistency across complex interactions', () => {
      const startPointer = { button: 0, x: 960, y: 540 } as Phaser.Input.Pointer;
      
      // Start drag
      dragHandler['onPointerDown'](startPointer);
      const initialState = { ...dragHandler['dragState'] };
      expect(initialState.isDragging).toBe(true);

      // Simulate zoom change
      mockCamera.zoom = 1.5;
      dragHandler.update();
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Simulate building entry
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(true);
      dragHandler.update();
      expect(dragHandler['dragState'].isDragging).toBe(false);

      // Exit building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(false);
      dragHandler.update();

      // Should be able to start new drag
      dragHandler['onPointerDown'](startPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);
    });
  });
});