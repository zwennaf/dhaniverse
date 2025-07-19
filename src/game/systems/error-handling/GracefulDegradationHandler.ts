import { BaseErrorHandler } from "./BaseErrorHandler.ts";
import { ChunkError, ErrorHandlerResult } from "./IErrorHandler.ts";

export interface DegradationStrategy {
    name: string;
    condition: (error: ChunkError) => boolean;
    action: () => Promise<void>;
    userMessage: string;
}

export class GracefulDegradationHandler extends BaseErrorHandler {
    private degradationStrategies: DegradationStrategy[] = [];
    private activeDegradations: Set<string> = new Set();

    constructor() {
        super();
        this.setupDefaultStrategies();
    }

    protected async doHandle(error: ChunkError): Promise<ErrorHandlerResult> {
        // Find applicable degradation strategy
        const strategy = this.degradationStrategies.find((s) =>
            s.condition(error)
        );

        if (strategy && !this.activeDegradations.has(strategy.name)) {
            console.log(
                `Applying degradation strategy: ${strategy.name} for chunk ${error.chunkId}`
            );

            this.activeDegradations.add(strategy.name);

            return {
                handled: true,
                shouldRetry: false,
                fallbackAction: strategy.action,
                userMessage: strategy.userMessage,
            };
        }

        return {
            handled: false,
            shouldRetry: false,
        };
    }

    private setupDefaultStrategies(): void {
        // Reduce quality strategy
        this.addDegradationStrategy({
            name: "reduce-quality",
            condition: (error) =>
                error.errorType === "MEMORY" || error.retryCount >= 2,
            action: async () => {
                console.log("Degradation: Reducing chunk quality");
                // Could implement lower resolution loading
            },
            userMessage: "Optimizing performance by reducing visual quality",
        });

        // Essential chunks only strategy
        this.addDegradationStrategy({
            name: "essential-only",
            condition: (error) => error.retryCount >= 3,
            action: async () => {
                console.log("Degradation: Loading essential chunks only");
                // Could limit loading to only visible chunks
            },
            userMessage:
                "Loading essential content only to maintain performance",
        });

        // Offline mode strategy
        this.addDegradationStrategy({
            name: "offline-mode",
            condition: (error) =>
                error.errorType === "NETWORK" && error.retryCount >= 5,
            action: async () => {
                console.log("Degradation: Entering offline mode");
                // Could switch to cached content only
            },
            userMessage: "Connection issues detected. Using cached content.",
        });
    }

    public addDegradationStrategy(strategy: DegradationStrategy): void {
        this.degradationStrategies.push(strategy);
    }

    public removeDegradationStrategy(name: string): void {
        this.degradationStrategies = this.degradationStrategies.filter(
            (s) => s.name !== name
        );
        this.activeDegradations.delete(name);
    }

    public clearActiveDegradations(): void {
        this.activeDegradations.clear();
    }

    public getActiveDegradations(): string[] {
        return Array.from(this.activeDegradations);
    }

    public isStrategyActive(name: string): boolean {
        return this.activeDegradations.has(name);
    }
}
