// Location tracker manager to handle tracking targets and state
export interface TrackingTarget {
    id: string;
    name: string;
    position: { x: number; y: number };
    image?: string;
    enabled: boolean;
}

// Public contract for dependency injection
export interface ILocationTrackerManager {
    addTarget(target: TrackingTarget): void;
    removeTarget(id: string): void;
    setTargetEnabled(id: string, enabled: boolean): void;
    getTargets(): TrackingTarget[];
    getEnabledTargets(): TrackingTarget[];
    getTarget(id: string): TrackingTarget | undefined;
    updateTargetPosition(id: string, position: { x: number; y: number }): void;
    subscribe(listener: () => void): () => void;
    clear(): void;
    toggleTarget(id: string): boolean;
}

// Default implementation (can be swapped for tests / alternate logic)
export class DefaultLocationTrackerManager implements ILocationTrackerManager {
    private targets: Map<string, TrackingTarget> = new Map();
    private listeners: Set<() => void> = new Set();
    // Expose an internal debug counter
    private notifyCount = 0;

    addTarget(target: TrackingTarget): void {
        this.targets.set(target.id, target);
        this.notifyListeners();
    }
    removeTarget(id: string): void {
        this.targets.delete(id);
        this.notifyListeners();
    }
    setTargetEnabled(id: string, enabled: boolean): void {
        const target = this.targets.get(id);
        if (target) {
            target.enabled = enabled;
            this.notifyListeners();
        }
    }
    getTargets(): TrackingTarget[] {
        return Array.from(this.targets.values());
    }
    getEnabledTargets(): TrackingTarget[] {
        return Array.from(this.targets.values()).filter(t => t.enabled);
    }
    getTarget(id: string): TrackingTarget | undefined {
        return this.targets.get(id);
    }
    updateTargetPosition(id: string, position: { x: number; y: number }): void {
        const target = this.targets.get(id);
        if (target) {
            target.position = position;
            this.notifyListeners();
        }
    }
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    clear(): void {
        this.targets.clear();
        this.notifyListeners();
    }
    toggleTarget(id: string): boolean {
        const target = this.targets.get(id);
        if (target) {
            target.enabled = !target.enabled;
            this.notifyListeners();
            return target.enabled;
        }
        return false;
    }
    private notifyListeners(): void { this.listeners.forEach(l => l()); }
    // Debug helpers
    public __forceNotify(): void { this.notifyListeners(); }
    public __getDebugState() { return { notifyCount: ++this.notifyCount, targets: this.getTargets() }; }
}

// Simple DI container for the tracker manager
let currentLocationTrackerManager: ILocationTrackerManager = new DefaultLocationTrackerManager();

export const provideLocationTrackerManager = (impl: ILocationTrackerManager) => {
    currentLocationTrackerManager = impl;
};

export const getLocationTrackerManager = (): ILocationTrackerManager => currentLocationTrackerManager;

// Backwards compatible singleton export (will always point to current impl)
export const locationTrackerManager = {
    addTarget: (...args: any[]) => currentLocationTrackerManager.addTarget(args[0]),
    removeTarget: (id: string) => currentLocationTrackerManager.removeTarget(id),
    setTargetEnabled: (id: string, enabled: boolean) => currentLocationTrackerManager.setTargetEnabled(id, enabled),
    getTargets: () => currentLocationTrackerManager.getTargets(),
    getEnabledTargets: () => currentLocationTrackerManager.getEnabledTargets(),
    getTarget: (id: string) => currentLocationTrackerManager.getTarget(id),
    updateTargetPosition: (id: string, pos: { x: number; y: number }) => currentLocationTrackerManager.updateTargetPosition(id, pos),
    subscribe: (listener: () => void) => currentLocationTrackerManager.subscribe(listener),
    clear: () => currentLocationTrackerManager.clear(),
    toggleTarget: (id: string) => currentLocationTrackerManager.toggleTarget(id)
} as ILocationTrackerManager;

// Helper functions (remain stable) - they always resolve current implementation
export const trackMaya = (enabled: boolean = true) => {
    currentLocationTrackerManager.setTargetEnabled('maya', enabled);
};

export const isMayaTracked = (): boolean => {
    const maya = currentLocationTrackerManager.getTarget('maya');
    return maya?.enabled || false;
};

export const toggleMayaTracking = (): boolean => {
    return currentLocationTrackerManager.toggleTarget('maya');
};

/**
 * Enables the Maya tracker, creating it if it doesn't exist.
 * This is intended to be called once when the game starts for a new player.
 */
export const enableMayaTrackerOnGameStart = () => {
    console.log("TRACKER_LOGIC: enableMayaTrackerOnGameStart called");
    const mayaTarget = currentLocationTrackerManager.getTarget('maya');
    const MAYA_POSITION = { x: 7779, y: 3581 }; // Fixed initial coordinates

    if (mayaTarget) {
        console.log("TRACKER_LOGIC: Maya target already exists. Updating position and enabling.");
        currentLocationTrackerManager.updateTargetPosition('maya', MAYA_POSITION);
        currentLocationTrackerManager.setTargetEnabled('maya', true);
    } else {
        console.log("TRACKER_LOGIC: Maya target does not exist. Creating new target.");
        currentLocationTrackerManager.addTarget({
            id: 'maya',
            name: 'Maya',
            position: MAYA_POSITION,
            image: '/characters/maya-preview.png',
            enabled: true
        });
    }
    console.log("TRACKER_LOGIC: Maya tracker should be active now.", currentLocationTrackerManager.getTarget('maya'));
    // Force a notify on next tick in case HUD subscribed slightly later
    setTimeout(() => {
        if (typeof (currentLocationTrackerManager as any).__forceNotify === 'function') {
            (currentLocationTrackerManager as any).__forceNotify();
            console.log('TRACKER_LOGIC: Forced notify after Maya enable', (currentLocationTrackerManager as any).__getDebugState?.());
        }
    }, 50);
};
