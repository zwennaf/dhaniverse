// Location tracker manager to handle tracking targets and state
export interface TrackingTarget {
    id: string;
    name: string;
    position: { x: number; y: number };
    image?: string;
    enabled: boolean;
}

class LocationTrackerManager {
    private targets: Map<string, TrackingTarget> = new Map();
    private listeners: Set<() => void> = new Set();

    // Add or update a tracking target
    addTarget(target: TrackingTarget): void {
        this.targets.set(target.id, target);
        this.notifyListeners();
    }

    // Remove a tracking target
    removeTarget(id: string): void {
        this.targets.delete(id);
        this.notifyListeners();
    }

    // Enable/disable tracking for a specific target
    setTargetEnabled(id: string, enabled: boolean): void {
        const target = this.targets.get(id);
        if (target) {
            target.enabled = enabled;
            this.notifyListeners();
        }
    }

    // Get all targets
    getTargets(): TrackingTarget[] {
        return Array.from(this.targets.values());
    }

    // Get enabled targets only
    getEnabledTargets(): TrackingTarget[] {
        return Array.from(this.targets.values()).filter(target => target.enabled);
    }

    // Get a specific target
    getTarget(id: string): TrackingTarget | undefined {
        return this.targets.get(id);
    }

    // Update target position
    updateTargetPosition(id: string, position: { x: number; y: number }): void {
        const target = this.targets.get(id);
        if (target) {
            target.position = position;
            this.notifyListeners();
        }
    }

    // Subscribe to changes
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    // Clear all targets
    clear(): void {
        this.targets.clear();
        this.notifyListeners();
    }

    // Toggle tracking for a target
    toggleTarget(id: string): boolean {
        const target = this.targets.get(id);
        if (target) {
            target.enabled = !target.enabled;
            this.notifyListeners();
            return target.enabled;
        }
        return false;
    }
}

// Export singleton instance
export const locationTrackerManager = new LocationTrackerManager();

// Helper functions for common operations
export const trackMaya = (enabled: boolean = true) => {
    locationTrackerManager.setTargetEnabled('maya', enabled);
};

export const isMayaTracked = (): boolean => {
    const maya = locationTrackerManager.getTarget('maya');
    return maya?.enabled || false;
};

export const toggleMayaTracking = (): boolean => {
    return locationTrackerManager.toggleTarget('maya');
};
