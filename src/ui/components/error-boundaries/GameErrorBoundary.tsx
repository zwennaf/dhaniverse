import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { ErrorBoundaryProps, ErrorFallbackProps } from './types';
import { ErrorReportingService, ErrorSeverity, ErrorCategory } from './ErrorReportingService';

export interface GameState {
  scene?: string;
  playerPosition?: { x: number; y: number };
  gameData?: any;
  isGameActive?: boolean;
  lastSaveTime?: number;
}

export interface GameErrorBoundaryProps extends ErrorBoundaryProps {
  onGameError?: (error: Error, gameState?: GameState) => void;
  preserveGameState?: boolean;
  gameStateKey?: string;
  autoRestart?: boolean;
  restartDelay?: number;
}

interface GameErrorBoundaryState {
  hasGameError: boolean;
  gameError: Error | null;
  preservedGameState: GameState | null;
  errorType: 'render' | 'physics' | 'asset' | 'scene' | 'input' | 'unknown';
  isRestarting: boolean;
  lastErrorTime: number;
}

/**
 * GameErrorBoundary - Specialized error boundary for Phaser game integration
 * 
 * Features:
 * - Game state preservation during errors
 * - Phaser-specific error classification
 * - Automatic game restart with state restoration
 * - Asset loading error handling
 * - Scene transition error handling
 * - Input system error handling
 * - Performance monitoring and error prevention
 */
export class GameErrorBoundary extends Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  private gameStateBackup: GameState | null = null;
  private restartTimeoutId: NodeJS.Timeout | null = null;
  private gameInstance: any = null; // Reference to Phaser game instance

  constructor(props: GameErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasGameError: false,
      gameError: null,
      preservedGameState: null,
      errorType: 'unknown',
      isRestarting: false,
      lastErrorTime: 0,
    };
  }

  componentDidMount(): void {
    // Try to get reference to Phaser game instance
    this.gameInstance = this.findGameInstance();
    
    // Set up periodic game state backup if preservation is enabled
    if (this.props.preserveGameState) {
      this.startGameStateBackup();
    }

    // Listen for Phaser-specific errors
    this.setupPhaserErrorListeners();
  }

  componentWillUnmount(): void {
    // Clean up timers
    if (this.restartTimeoutId) {
      clearTimeout(this.restartTimeoutId);
    }

    // Clean up Phaser error listeners
    this.cleanupPhaserErrorListeners();
  }

  /**
   * Find Phaser game instance in the DOM or global scope
   */
  private findGameInstance(): any {
    // Try to find game instance in common locations
    if ((window as any).game) {
      return (window as any).game;
    }
    
    // Try to find game canvas and get instance from it
    const gameCanvas = document.querySelector('canvas[data-phaser="true"]') || 
                      document.querySelector('#game-container canvas');
    
    if (gameCanvas && (gameCanvas as any).game) {
      return (gameCanvas as any).game;
    }

    return null;
  }

  /**
   * Set up periodic game state backup
   */
  private startGameStateBackup(): void {
    const backupInterval = 5000; // Backup every 5 seconds
    
    setInterval(() => {
      if (this.gameInstance && !this.state.hasGameError) {
        this.gameStateBackup = this.captureGameState();
      }
    }, backupInterval);
  }

  /**
   * Capture current game state
   */
  private captureGameState(): GameState | null {
    try {
      if (!this.gameInstance) return null;

      const gameState: GameState = {
        isGameActive: this.gameInstance.isRunning,
        lastSaveTime: Date.now(),
      };

      // Try to capture scene information
      if (this.gameInstance.scene && this.gameInstance.scene.manager) {
        const activeScene = this.gameInstance.scene.manager.getScenes(true)[0];
        if (activeScene) {
          gameState.scene = activeScene.scene.key;
        }
      }

      // Try to capture player position (assuming there's a player object)
      if (this.gameInstance.scene && this.gameInstance.scene.manager) {
        const activeScene = this.gameInstance.scene.manager.getScenes(true)[0];
        if (activeScene && activeScene.player) {
          gameState.playerPosition = {
            x: activeScene.player.x,
            y: activeScene.player.y,
          };
        }
      }

      // Try to capture custom game data
      if (this.gameInstance.registry) {
        gameState.gameData = this.gameInstance.registry.getAll();
      }

      return gameState;
    } catch (error) {
      console.warn('Failed to capture game state:', error);
      return null;
    }
  }

  /**
   * Set up Phaser-specific error listeners
   */
  private setupPhaserErrorListeners(): void {
    // Listen for Phaser boot errors
    window.addEventListener('phaser-boot-error', this.handlePhaserError);
    
    // Listen for asset loading errors
    window.addEventListener('phaser-asset-error', this.handlePhaserError);
    
    // Listen for scene errors
    window.addEventListener('phaser-scene-error', this.handlePhaserError);
  }

  /**
   * Clean up Phaser error listeners
   */
  private cleanupPhaserErrorListeners(): void {
    window.removeEventListener('phaser-boot-error', this.handlePhaserError);
    window.removeEventListener('phaser-asset-error', this.handlePhaserError);
    window.removeEventListener('phaser-scene-error', this.handlePhaserError);
  }

  /**
   * Handle Phaser-specific errors
   */
  private handlePhaserError = (event: Event): void => {
    const customEvent = event as CustomEvent;
    const error = customEvent.detail?.error || new Error('Phaser error occurred');
    
    this.handleGameError(error);
  };

  /**
   * Handle game errors
   */
  private handleGameError(error: Error): void {
    const errorType = this.classifyGameError(error);
    const preservedState = this.props.preserveGameState ? this.captureGameState() : null;
    
    this.setState({
      hasGameError: true,
      gameError: error,
      errorType,
      preservedGameState: preservedState,
      lastErrorTime: Date.now(),
    });

    // Report the game error
    this.reportGameError(error, errorType, preservedState);

    // Call custom game error handler
    if (this.props.onGameError) {
      this.props.onGameError(error, preservedState || undefined);
    }

    // Auto-restart if enabled
    if (this.props.autoRestart) {
      this.scheduleGameRestart();
    }
  }

  /**
   * Classify game error type
   */
  private classifyGameError(error: Error): GameErrorBoundaryState['errorType'] {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    
    if (message.includes('render') || message.includes('webgl') || message.includes('canvas')) {
      return 'render';
    }
    if (message.includes('physics') || message.includes('collision') || message.includes('body')) {
      return 'physics';
    }
    if (message.includes('asset') || message.includes('load') || message.includes('texture')) {
      return 'asset';
    }
    if (message.includes('scene') || message.includes('transition') || stack.includes('scene')) {
      return 'scene';
    }
    if (message.includes('input') || message.includes('keyboard') || message.includes('pointer')) {
      return 'input';
    }
    
    return 'unknown';
  }

  /**
   * Report game error to ErrorReportingService
   */
  private reportGameError(error: Error, errorType: GameErrorBoundaryState['errorType'], gameState: GameState | null): void {
    const errorReportingService = ErrorReportingService.getInstance();
    
    const context = {
      componentName: 'GameErrorBoundary',
      routePath: window.location.pathname,
      userSession: {
        isAuthenticated: this.checkAuthenticationStatus(),
        walletConnected: this.checkWalletStatus(),
      },
      gameContext: {
        scene: gameState?.scene,
        playerPosition: gameState?.playerPosition,
        isGameActive: gameState?.isGameActive,
        errorType,
      },
      timestamp: Date.now(),
    };

    const severity = this.getErrorSeverity(errorType);

    errorReportingService.reportError(
      error,
      { componentStack: 'GameErrorBoundary' } as ErrorInfo,
      context,
      severity,
      ErrorCategory.GAME,
      {
        boundaryType: 'GameErrorBoundary',
        errorType,
        gameState,
        hasGameStateBackup: !!this.gameStateBackup,
      }
    );
  }

  /**
   * Get error severity based on error type
   */
  private getErrorSeverity(errorType: GameErrorBoundaryState['errorType']): ErrorSeverity {
    switch (errorType) {
      case 'render':
        return ErrorSeverity.CRITICAL; // Render errors are critical
      case 'physics':
        return ErrorSeverity.HIGH; // Physics errors affect gameplay
      case 'scene':
        return ErrorSeverity.HIGH; // Scene errors affect navigation
      case 'asset':
        return ErrorSeverity.MEDIUM; // Asset errors may be recoverable
      case 'input':
        return ErrorSeverity.MEDIUM; // Input errors affect UX but not critical
      default:
        return ErrorSeverity.HIGH;
    }
  }

  /**
   * Schedule automatic game restart
   */
  private scheduleGameRestart(): void {
    const { restartDelay = 3000 } = this.props;
    
    this.setState({ isRestarting: true });
    
    this.restartTimeoutId = setTimeout(() => {
      this.restartGame();
    }, restartDelay);
  }

  /**
   * Restart the game with preserved state
   */
  private restartGame = (): void => {
    try {
      // Destroy current game instance if it exists
      if (this.gameInstance && this.gameInstance.destroy) {
        this.gameInstance.destroy(true);
      }

      // Clear the game container
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.innerHTML = '';
      }

      // Reset error state
      this.setState({
        hasGameError: false,
        gameError: null,
        isRestarting: false,
      });

      // Emit custom event for game restart
      window.dispatchEvent(new CustomEvent('gameRestart', {
        detail: {
          preservedState: this.state.preservedGameState || this.gameStateBackup,
        }
      }));

    } catch (restartError) {
      console.error('Failed to restart game:', restartError);
      this.setState({ isRestarting: false });
    }
  };

  /**
   * Manual game restart
   */
  private handleManualRestart = (): void => {
    this.restartGame();
  };

  /**
   * Reset game error without restart
   */
  private resetGameError = (): void => {
    this.setState({
      hasGameError: false,
      gameError: null,
      errorType: 'unknown',
      preservedGameState: null,
      isRestarting: false,
    });
  };

  /**
   * Check authentication status
   */
  private checkAuthenticationStatus(): boolean {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).isAuthenticated : false;
    } catch {
      return false;
    }
  }

  /**
   * Check wallet status
   */
  private checkWalletStatus(): boolean {
    try {
      return !!(window as any).ethereum?.selectedAddress;
    } catch {
      return false;
    }
  }

  /**
   * Custom fallback for game errors
   */
  private renderGameErrorFallback(): ReactNode {
    const { gameError, errorType, isRestarting, preservedGameState } = this.state;
    const { autoRestart, preserveGameState } = this.props;

    const getErrorTitle = () => {
      switch (errorType) {
        case 'render': return 'Game Rendering Error';
        case 'physics': return 'Game Physics Error';
        case 'asset': return 'Game Asset Error';
        case 'scene': return 'Game Scene Error';
        case 'input': return 'Game Input Error';
        default: return 'Game Error';
      }
    };

    const getErrorMessage = () => {
      switch (errorType) {
        case 'render': return 'The game renderer encountered an error. This may be due to graphics driver issues or WebGL problems.';
        case 'physics': return 'The game physics system encountered an error. Game objects may not behave correctly.';
        case 'asset': return 'Failed to load game assets. Please check your internet connection.';
        case 'scene': return 'Error occurred during scene transition or loading.';
        case 'input': return 'Game input system encountered an error. Controls may not respond correctly.';
        default: return 'An unexpected game error occurred.';
      }
    };

    if (isRestarting) {
      return (
        <div 
          role="alert" 
          style={{
            padding: '40px',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            backgroundColor: '#fff8e1',
            color: '#8a6914',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
            Restarting Game...
          </h2>
          
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #ffc107', 
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto',
          }} />
          
          <p style={{ margin: '0' }}>
            {preservedGameState ? 'Restoring your game progress...' : 'Initializing game...'}
          </p>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    return (
      <div 
        role="alert" 
        style={{
          padding: '20px',
          border: '1px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#721c24',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
          {getErrorTitle()}
        </h2>
        
        <p style={{ margin: '0 0 16px 0' }}>
          {getErrorMessage()}
        </p>

        {preserveGameState && preservedGameState && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#e8f5e8', 
            borderRadius: '4px', 
            marginBottom: '16px',
            border: '1px solid #28a745',
          }}>
            <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>
              ✓ Game progress has been preserved and will be restored when you restart.
            </p>
          </div>
        )}

        {process.env.NODE_ENV === 'development' && gameError && (
          <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
              Error Details
            </summary>
            <pre style={{ 
              fontSize: '12px', 
              backgroundColor: '#f8f9fa', 
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {gameError.message}
              {gameError.stack && `\n\nStack trace:\n${gameError.stack}`}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={this.handleManualRestart}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {preservedGameState ? 'Restart & Restore Progress' : 'Restart Game'}
          </button>
          
          {!autoRestart && (
            <button
              onClick={this.resetGameError}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Dismiss Error
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { children, ...baseProps } = this.props;
    const { hasGameError } = this.state;

    // If there's a game error, show the game error fallback
    if (hasGameError) {
      return this.renderGameErrorFallback();
    }

    // Otherwise, wrap children in BaseErrorBoundary for regular error handling
    return (
      <BaseErrorBoundary {...baseProps}>
        {children}
      </BaseErrorBoundary>
    );
  }
}