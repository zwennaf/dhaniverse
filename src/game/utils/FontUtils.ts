/**
 * Font utilities for ensuring fonts are properly loaded before use
 */

export class FontUtils {
    private static fontLoadPromises: Map<string, Promise<void>> = new Map();
    private static tickerbitReady: boolean = false;
    
    /**
     * Initialize and preload all game fonts
     */
    static async initializeGameFonts(): Promise<void> {
        try {
            if ('fonts' in document) {
                await Promise.all([
                    document.fonts.load('24px Tickerbit'),
                    document.fonts.load('16px Tickerbit'),
                    document.fonts.load('18px Tickerbit')
                ]);
                this.tickerbitReady = true;
                console.log('All game fonts initialized successfully');
            } else {
                // Fallback for browsers without Font Loading API
                setTimeout(() => {
                    this.tickerbitReady = true;
                    console.log('Font Loading API not available, using fallback');
                }, 500);
            }
        } catch (error) {
            console.warn('Font initialization failed:', error);
            this.tickerbitReady = true; // Set to true anyway to continue with fallbacks
        }
    }
    
    /**
     * Check if Tickerbit font is ready
     */
    static isTickerbitReady(): boolean {
        return this.tickerbitReady;
    }
    
    /**
     * Ensure a font is loaded before using it
     */
    static async ensureFontLoaded(fontFamily: string, fontSize: string = '24px'): Promise<void> {
        const fontKey = `${fontSize} ${fontFamily}`;
        
        // Return existing promise if already loading
        if (this.fontLoadPromises.has(fontKey)) {
            return this.fontLoadPromises.get(fontKey)!;
        }
        
        const loadPromise = new Promise<void>((resolve) => {
            try {
                if ('fonts' in document) {
                    document.fonts.load(fontKey).then(() => {
                        console.log(`Font loaded: ${fontKey}`);
                        resolve();
                    }).catch((error) => {
                        console.warn(`Font loading failed for ${fontKey}:`, error);
                        resolve(); // Resolve anyway to continue with fallback
                    });
                } else {
                    // Fallback for browsers without Font Loading API
                    setTimeout(() => {
                        console.log(`Font loading API not available, using fallback for: ${fontKey}`);
                        resolve();
                    }, 100);
                }
            } catch (error) {
                console.warn(`Error loading font ${fontKey}:`, error);
                resolve(); // Resolve anyway to continue with fallback
            }
        });
        
        this.fontLoadPromises.set(fontKey, loadPromise);
        return loadPromise;
    }
    
    /**
     * Get the font family string with proper fallbacks
     */
    static getPlayerNameFont(): string {
        return 'Tickerbit, Arial, sans-serif';
    }
    
    /**
     * Create text style object with proper font loading
     */
    static async createTextStyle(fontFamily: string, fontSize: string, color: string, options: any = {}): Promise<any> {
        // Ensure font is loaded first
        await this.ensureFontLoaded(fontFamily, fontSize);
        
        return {
            fontFamily,
            fontSize,
            color,
            ...options
        };
    }
}