import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MapDragHandler } from '../MapDragHandler';
import { MainGameScene } from '../../scenes/MainScene';
import { ExtendedCamera } from '../ChunkedMapManager';

// Mock DOM methods
const mockSetCursor = vi.fn();
const mockGetBoundingClientRect = vi.fn().mockReturnValue({
  left: 0,
  top: 0,
  right: 100,
  bottom: 100
});

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

// Create mock scene with all required properties
const createMockScene = (overrides = {}) => ({
  cameras: {
    main: {
      zoom: 1.0,
      minZoom: 0.25,
      maxZoom: 2.0,
      scrollX: 0,
      scrollY: 0,
      width: 800,
      height: 600,
      setZoom: vi.fn(),
      setScroll: vi.fn()
    } as Partial<ExtendedCamera>
  },
  input: {
    on: vi.fn(),
    off: vi.fn()
  },
  mapManager: {
    isPlayerInBuilding: vi.fn().mockReturnValue(false),
    getMapWidth: vi.fn().mockReturnValue(8000),
    getMapHeight: vi.fn().mockReturnValue(8000)
  },
  getPlayer: vi.fn().mockReturnValue({
    getSprite: vi.fn().mockReturnValue({
      getBounds: vi.fn().mockReturnValue({
        x: 100,
        y: 100,
        width: 32,
        height: 32
      })
    })
  }),
  npcManager: null,
  bankNPCManager: null,
  stockMarketManager: null,
  atmManager: null,
  buildingManager: null,
  tweens: mockTweens,
  add: mockAdd,
  ...overrides
} as unknown as MainGameScene);

describe('MapDragHandler', () => {
  let dragHandler: MapDragHandler;
  let mockScene: MainGameScene;
  let mockCamera: ExtendedCamera;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = createMockScene();
    mockCamera = mockScene.cameras.main as ExtendedCamera;
    dragHandler = new MapDragHandler(mockScene);
  });

  afterEach(() => {
    if (dragHandler) {
      dragHandler.destroy();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should construct successfully with valid scene', () => {
      expect(dragHandler).toBeDefined();
      expect(dragHandler['scene']).toBe(mockScene);
      expect(dragHandler['camera']).toBe(mockCamera);
    });

    it('should throw error with null scene', () => {
      expect(() => new MapDragHandler(null as any)).toThrow('MapDragHandler: Scene is required');
    });

    it('should throw error with scene without camera', () => {
      const invalidScene = createMockScene({ cameras: null });
      expect(() => new MapDragHandler(invalidScene)).toThrow('MapDragHandler: Scene must have a main camera');
    });

    it('should initialize drag state correctly', () => {
      const dragState = dragHandler['dragState'];
      expect(dragState.isDragging).toBe(false);
      expect(dragState.startX).toBe(0);
      expect(dragState.startY).toBe(0);
      expect(dragState.lastX).toBe(0);
      expect(dragState.lastY).toBe(0);
      expect(dragState.originalCursor).toBe('default');
      expect(dragState.isAtBoundary).toBe(false);
      expect(dragState.boundaryDirection).toBe('');
    });

    it('should initialize event listeners on initialize()', () => {
      dragHandler.initialize();
      
      expect(mockScene.input.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockScene.input.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockScene.input.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(mockScene.input.on).toHaveBeenCalledWith('pointerupoutside', expect.any(Function));
    });

    it('should not initialize twice', () => {
      dragHandler.initialize();
      vi.clearAllMocks();
      
      dragHandler.initialize();
      
      expect(mockScene.input.on).not.toHaveBeenCalled();
    });
  });

  describe('Drag State Management', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should start drag on valid pointer down', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      const dragState = dragHandler['dragState'];
      expect(dragState.isDragging).toBe(true);
      expect(dragState.startX).toBe(400);
      expect(dragState.startY).toBe(300);
      expect(dragState.lastX).toBe(400);
      expect(dragState.lastY).toBe(300);
    });

    it('should not start drag on right click', () => {
      const mockPointer = {
        button: 1, // Right click
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should not start drag when already dragging', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start first drag
      dragHandler['onPointerDown'](mockPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Try to start second drag
      const secondPointer = {
        button: 0,
        x: 500,
        y: 400
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](secondPointer);

      // Should still have original drag state
      expect(dragHandler['dragState'].startX).toBe(400);
      expect(dragHandler['dragState'].startY).toBe(300);
    });

    it('should not start drag when in building', () => {
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(true);

      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should end drag on pointer up', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](mockPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // End drag
      dragHandler['onPointerUp'](mockPointer);
      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should handle building state changes during drag', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](mockPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Enter building
      mockScene.mapManager.isPlayerInBuilding.mockReturnValue(true);
      dragHandler.update();

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });
  });

  describe('Boundary Calculation', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should calculate correct bounds for normal map size', () => {
      mockCamera.zoom = 1.0;
      mockCamera.width = 800;
      mockCamera.height = 600;
      mockScene.mapManager.getMapWidth.mockReturnValue(2000);
      mockScene.mapManager.getMapHeight.mockReturnValue(1500);

      const bounds = dragHandler['calculateCameraBounds']();

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(1200); // 2000 - 800
      expect(bounds.maxY).toBe(900);  // 1500 - 600
    });

    it('should calculate correct bounds with zoom', () => {
      mockCamera.zoom = 2.0;
      mockCamera.width = 800;
      mockCamera.height = 600;
      mockScene.mapManager.getMapWidth.mockReturnValue(2000);
      mockScene.mapManager.getMapHeight.mockReturnValue(1500);

      const bounds = dragHandler['calculateCameraBounds']();

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(1600); // 2000 - (800/2)
      expect(bounds.maxY).toBe(1200); // 1500 - (600/2)
    });

    it('should handle small maps correctly', () => {
      mockCamera.zoom = 1.0;
      mockCamera.width = 800;
      mockCamera.height = 600;
      mockScene.mapManager.getMapWidth.mockReturnValue(400); // Smaller than camera
      mockScene.mapManager.getMapHeight.mockReturnValue(300);

      const bounds = dragHandler['calculateCameraBounds']();

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(0); // Math.max(0, 400 - 800)
      expect(bounds.maxY).toBe(0); // Math.max(0, 300 - 600)
    });

    it('should handle invalid map dimensions gracefully', () => {
      mockScene.mapManager.getMapWidth.mockReturnValue(NaN);
      mockScene.mapManager.getMapHeight.mockReturnValue(-100);

      const bounds = dragHandler['calculateCameraBounds']();

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(0);
      expect(bounds.maxY).toBe(0);
    });
  });

  describe('Zoom-Adjusted Sensitivity', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should provide higher sensitivity at lower zoom levels', () => {
      mockCamera.zoom = 0.5;
      const lowZoomSensitivity = dragHandler['getZoomAdjustedSensitivity']();

      mockCamera.zoom = 2.0;
      const highZoomSensitivity = dragHandler['getZoomAdjustedSensitivity']();

      expect(lowZoomSensitivity).toBeGreaterThan(highZoomSensitivity);
    });

    it('should return reasonable sensitivity values', () => {
      const testZooms = [0.25, 0.5, 1.0, 1.5, 2.0];

      testZooms.forEach(zoom => {
        mockCamera.zoom = zoom;
        const sensitivity = dragHandler['getZoomAdjustedSensitivity']();

        expect(sensitivity).toBeGreaterThan(0);
        expect(sensitivity).toBeLessThan(10);
        expect(Number.isFinite(sensitivity)).toBe(true);
      });
    });

    it('should handle invalid zoom values gracefully', () => {
      mockCamera.zoom = NaN;
      const sensitivity = dragHandler['getZoomAdjustedSensitivity']();
      expect(sensitivity).toBe(1.0);

      mockCamera.zoom = 0;
      const sensitivity2 = dragHandler['getZoomAdjustedSensitivity']();
      expect(sensitivity2).toBe(1.0);

      mockCamera.zoom = -1;
      const sensitivity3 = dragHandler['getZoomAdjustedSensitivity']();
      expect(sensitivity3).toBe(1.0);
    });
  });

  describe('Cursor Management', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should change cursor to grabbing during drag', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      expect(document.body.style.cursor).toBe('grabbing');
    });

    it('should restore original cursor after drag', () => {
      const originalCursor = 'pointer';
      document.body.style.cursor = originalCursor;

      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](mockPointer);
      expect(document.body.style.cursor).toBe('grabbing');

      // End drag
      dragHandler['onPointerUp'](mockPointer);
      expect(document.body.style.cursor).toBe(originalCursor);
    });

    it('should handle cursor restoration with smooth transition', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);
      dragHandler['onPointerUp'](mockPointer);

      expect(mockTweens.add).toHaveBeenCalled();
    });
  });

  describe('Interactive Element Detection', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should detect UI elements and prevent drag', () => {
      // Mock UI element present
      document.querySelector = vi.fn().mockReturnValue({
        getBoundingClientRect: mockGetBoundingClientRect
      });

      const mockPointer = {
        button: 0,
        x: 50, // Within UI bounds
        y: 50
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should detect player and prevent drag', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Mock world coordinates that would be over player
      mockCamera.scrollX = 0;
      mockCamera.scrollY = 0;
      mockCamera.zoom = 1.0;

      // Player is at (100, 100) with 32x32 size, so world coords (400, 300) should be over player
      const worldX = 400;
      const worldY = 300;

      // Mock player bounds to include the click position
      mockScene.getPlayer().getSprite().getBounds.mockReturnValue({
        x: 350,
        y: 250,
        width: 100,
        height: 100
      });

      dragHandler['onPointerDown'](mockPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should detect NPCs and prevent drag', () => {
      // Add NPC manager
      mockScene.npcManager = {} as any;

      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Mock camera to convert screen to world coords
      mockCamera.scrollX = 337; // 737 - 400 = 337
      mockCamera.scrollY = 3453; // 3753 - 300 = 3453
      mockCamera.zoom = 1.0;

      dragHandler['onPointerDown'](mockPointer);

      expect(dragHandler['dragState'].isDragging).toBe(false);
    });

    it('should allow drag when no interactive elements are present', () => {
      // Ensure no UI elements
      document.querySelector = vi.fn().mockReturnValue(null);
      document.querySelectorAll = vi.fn().mockReturnValue([]);

      // Mock player far away
      mockScene.getPlayer().getSprite().getBounds.mockReturnValue({
        x: 1000,
        y: 1000,
        width: 32,
        height: 32
      });

      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      expect(dragHandler['dragState'].isDragging).toBe(true);
    });
  });

  describe('Camera Movement', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should update camera position during drag', () => {
      const startPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      const movePointer = {
        button: 0,
        x: 450,
        y: 350
      } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](startPointer);

      // Move during drag
      dragHandler['onPointerMove'](movePointer);

      expect(mockCamera.setScroll).toHaveBeenCalled();
    });

    it('should respect camera boundaries', () => {
      mockCamera.scrollX = 0;
      mockCamera.scrollY = 0;
      mockCamera.zoom = 1.0;
      mockCamera.width = 800;
      mockCamera.height = 600;
      mockScene.mapManager.getMapWidth.mockReturnValue(1000);
      mockScene.mapManager.getMapHeight.mockReturnValue(800);

      const startPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Try to drag beyond left boundary
      const movePointer = {
        button: 0,
        x: 500, // Moving right should move camera left
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](startPointer);
      dragHandler['onPointerMove'](movePointer);

      // Camera should be clamped to boundaries
      const setScrollCalls = mockCamera.setScroll.mock.calls;
      const lastCall = setScrollCalls[setScrollCalls.length - 1];
      expect(lastCall[0]).toBeGreaterThanOrEqual(0); // minX
      expect(lastCall[1]).toBeGreaterThanOrEqual(0); // minY
    });

    it('should not update camera when not dragging', () => {
      const mockPointer = {
        button: 0,
        x: 450,
        y: 350
      } as Phaser.Input.Pointer;

      // Move without starting drag
      dragHandler['onPointerMove'](mockPointer);

      expect(mockCamera.setScroll).not.toHaveBeenCalled();
    });

    it('should handle invalid pointer coordinates gracefully', () => {
      const startPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      const invalidPointer = {
        button: 0,
        x: NaN,
        y: undefined
      } as any;

      dragHandler['onPointerDown'](startPointer);
      dragHandler['onPointerMove'](invalidPointer);

      // Should not crash and should not update camera
      expect(mockCamera.setScroll).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should handle errors gracefully and recover', () => {
      // Mock an error in updateCameraPosition method
      const originalUpdateCameraPosition = dragHandler['updateCameraPosition'];
      dragHandler['updateCameraPosition'] = vi.fn().mockImplementation(() => {
        throw new Error('Camera error');
      });

      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start drag first
      dragHandler['onPointerDown'](mockPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Should not crash when error occurs during move
      expect(() => {
        dragHandler['onPointerMove']({
          button: 0,
          x: 450,
          y: 350
        } as Phaser.Input.Pointer);
      }).not.toThrow();

      // Should recover from error state
      expect(dragHandler['dragState'].isDragging).toBe(false);

      // Restore original method
      dragHandler['updateCameraPosition'] = originalUpdateCameraPosition;
    });

    it('should validate input parameters', () => {
      expect(dragHandler['validatePointerInput'](null as any, 'test')).toBe(false);
      expect(dragHandler['validatePointerInput']({} as any, 'test')).toBe(false);
      expect(dragHandler['validatePointerInput']({ x: NaN, y: 100 } as any, 'test')).toBe(false);
      expect(dragHandler['validatePointerInput']({ x: 100, y: 100 } as any, 'test')).toBe(true);
    });

    it('should validate scene state', () => {
      // Valid state
      expect(dragHandler['validateSceneState']()).toBe(true);

      // Invalid camera
      dragHandler['camera'] = null as any;
      expect(dragHandler['validateSceneState']()).toBe(false);
    });

    it('should handle excessive errors by temporarily disabling', () => {
      // Simulate multiple errors
      for (let i = 0; i < 6; i++) {
        dragHandler['handleError'](new Error('Test error'), 'test');
      }

      // Should have removed event listeners
      expect(mockScene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockScene.input.off).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockScene.input.off).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });
  });

  describe('Cleanup and Memory Management', () => {
    beforeEach(() => {
      dragHandler.initialize();
    });

    it('should clean up event listeners on destroy', () => {
      dragHandler.destroy();

      expect(mockScene.input.off).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockScene.input.off).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockScene.input.off).toHaveBeenCalledWith('pointerup', expect.any(Function));
      expect(mockScene.input.off).toHaveBeenCalledWith('pointerupoutside', expect.any(Function));
    });

    it('should clean up graphics objects on destroy', () => {
      dragHandler.destroy();

      expect(mockGraphics.destroy).toHaveBeenCalled();
    });

    it('should reset drag state on destroy', () => {
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](mockPointer);
      expect(dragHandler['dragState'].isDragging).toBe(true);

      // Destroy
      dragHandler.destroy();

      expect(dragHandler['dragState'].isDragging).toBe(false);
      expect(dragHandler['isInitialized']).toBe(false);
    });

    it('should handle destroy when not initialized', () => {
      const uninitializedHandler = new MapDragHandler(mockScene);
      
      expect(() => uninitializedHandler.destroy()).not.toThrow();
    });

    it('should restore cursor on destroy if dragging', () => {
      const originalCursor = 'pointer';
      document.body.style.cursor = originalCursor;

      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);
      expect(document.body.style.cursor).toBe('grabbing');

      dragHandler.destroy();
      expect(document.body.style.cursor).toBe(originalCursor);
    });
  });

  describe('Performance and Throttling', () => {
    it('should throttle mouse move events', () => {
      dragHandler.initialize();
      
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      // Start drag
      dragHandler['onPointerDown'](mockPointer);

      // Mock Date.now to simulate rapid moves within throttle window
      const originalDateNow = Date.now;
      let currentTime = 1000;
      Date.now = vi.fn(() => currentTime);

      // First move should go through
      dragHandler['onPointerMove']({
        button: 0,
        x: 401,
        y: 301
      } as Phaser.Input.Pointer);

      const firstCallCount = mockCamera.setScroll.mock.calls.length;

      // Rapid moves within throttle window (16ms)
      for (let i = 0; i < 5; i++) {
        currentTime += 1; // Only 1ms between moves
        dragHandler['onPointerMove']({
          button: 0,
          x: 400 + i + 2,
          y: 300 + i + 2
        } as Phaser.Input.Pointer);
      }

      // Should not have processed all moves due to throttling
      expect(mockCamera.setScroll.mock.calls.length).toBeLessThan(firstCallCount + 5);

      // Restore Date.now
      Date.now = originalDateNow;
    });

    it('should process moves after throttle delay', () => {
      dragHandler.initialize();
      
      const mockPointer = {
        button: 0,
        x: 400,
        y: 300
      } as Phaser.Input.Pointer;

      dragHandler['onPointerDown'](mockPointer);

      // Mock Date.now to control timing
      const originalDateNow = Date.now;
      let currentTime = 1000;
      Date.now = vi.fn(() => currentTime);

      // First move
      dragHandler['onPointerMove']({ button: 0, x: 410, y: 310 } as Phaser.Input.Pointer);
      const initialCallCount = mockCamera.setScroll.mock.calls.length;

      // Move after throttle delay
      currentTime += 20; // 20ms later, beyond 16ms throttle
      dragHandler['onPointerMove']({ button: 0, x: 420, y: 320 } as Phaser.Input.Pointer);

      expect(mockCamera.setScroll.mock.calls.length).toBeGreaterThan(initialCallCount);

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });
});