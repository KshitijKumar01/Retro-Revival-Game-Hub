/**
 * GameHubController Implementation
 * 
 * Manages the game hub lifecycle, navigation between games,
 * and coordination of shared services (audio, state persistence, UI theming).
 */

import { GameHubController } from './interfaces/GameHubController';
import { GameModule } from './interfaces/GameModule';
import { GameType, GameState, InputEvent } from './types';
import { RetroAudio } from './audio/RetroAudio';
import { RetroTheme } from './ui/RetroTheme';
import { WindowFrame } from './ui/WindowFrame';
import { WIN95_PALETTE } from './ui/types';
import { StateManager } from './StateManager';

/**
 * Main menu state
 */
interface MainMenuState {
  selectedGameIndex: number;
  isVisible: boolean;
}

/**
 * Game hub configuration
 */
interface GameHubConfig {
  canvasId: string;
  theme: 'win95' | 'arcade' | 'dos';
  enableCRT: boolean;
  enableAudio: boolean;
  autoStart: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: GameHubConfig = {
  canvasId: 'game-canvas',
  theme: 'win95',
  enableCRT: false,
  enableAudio: true,
  autoStart: true,
};

/**
 * GameHubController manages the entire game hub system
 */
export class GameHubControllerImpl implements GameHubController {
  private config: GameHubConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  // Core systems
  private audio: RetroAudio;
  private theme: RetroTheme;
  private windowFrame: WindowFrame;
  
  // Game management
  private gameModules: Map<GameType, GameModule> = new Map();
  private stateManager: StateManager;
  private currentGame: GameType | null = null;
  private gamePaused: boolean = false;
  
  // Main menu
  private mainMenu: MainMenuState = {
    selectedGameIndex: 0,
    isVisible: true,
  };
  
  // Game list for menu
  private readonly GAMES: Array<{ type: GameType; title: string; description: string }> = [
    { type: 'snake', title: 'SNAKE', description: 'Classic grid-based snake with AI pathfinding' },
    { type: 'tetris', title: 'TETRIS', description: 'Falling blocks with AI piece advisor' },
    { type: 'minesweeper', title: 'MINESWEEPER', description: 'Mine detection with AI hints' },
  ];
  
  // Input handling
  private keyStates: Set<string> = new Set();
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  
  // Error handling
  private errorMessage: string | null = null;
  private errorTimeout: number | null = null;
  
  // Performance monitoring
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFPS: number = 60;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_TIME = 1000 / 60; // 16.67ms per frame
  
  // Transition effects
  private transitionAlpha: number = 0;
  private isTransitioning: boolean = false;
  private transitionDuration: number = 300; // milliseconds
  private transitionStartTime: number = 0;

  constructor(config: Partial<GameHubConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize core systems
    this.audio = new RetroAudio();
    this.theme = new RetroTheme(this.config.theme);
    this.stateManager = new StateManager();
    this.windowFrame = new WindowFrame(
      {
        title: 'Retro Revival Game Hub',
        width: 800,
        height: 600,
        x: 0,
        y: 0,
      },
      WIN95_PALETTE
    );
    
    this.initializeCanvas();
    this.setupEventListeners();
    this.theme.injectStyles();
    
    // StateManager handles loading automatically
    
    // Start main loop if auto-start is enabled
    if (this.config.autoStart) {
      this.startMainLoop();
    }
  }

  /**
   * Initialize the canvas element
   */
  private initializeCanvas(): void {
    this.canvas = document.getElementById(this.config.canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      // Create canvas if it doesn't exist
      this.canvas = document.createElement('canvas');
      this.canvas.id = this.config.canvasId;
      this.canvas.width = 800;
      this.canvas.height = 600;
      this.canvas.className = 'retro-game-container retro-pixelated';
      document.body.appendChild(this.canvas);
    }
    
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    
    // Configure canvas for pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Setup keyboard and mouse event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse events for canvas
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }
    
    // Resume audio context on first user interaction
    document.addEventListener('click', () => this.audio.resume(), { once: true });
    document.addEventListener('keydown', () => this.audio.resume(), { once: true });
  }

  /**
   * Handle keyboard down events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    this.keyStates.add(e.key);
    
    const inputEvent: InputEvent = {
      type: 'keydown',
      key: e.key,
      timestamp: Date.now(),
    };
    
    if (this.mainMenu.isVisible) {
      this.handleMainMenuInput(inputEvent);
    } else if (this.currentGame) {
      const gameModule = this.gameModules.get(this.currentGame);
      if (gameModule && !this.gamePaused) {
        gameModule.handleInput(inputEvent);
      } else {
        this.handlePausedGameInput(inputEvent);
      }
    }
    
    // Global shortcuts
    if (e.key === 'Escape') {
      if (this.currentGame && !this.mainMenu.isVisible) {
        if (this.gamePaused) {
          this.resumeCurrentGame();
        } else {
          this.pauseCurrentGame();
        }
      } else if (this.currentGame) {
        this.returnToMainMenu();
      }
    }
    
    e.preventDefault();
  }

  /**
   * Handle keyboard up events
   */
  private handleKeyUp(e: KeyboardEvent): void {
    this.keyStates.delete(e.key);
    
    const inputEvent: InputEvent = {
      type: 'keyup',
      key: e.key,
      timestamp: Date.now(),
    };
    
    if (!this.mainMenu.isVisible && this.currentGame && !this.gamePaused) {
      const gameModule = this.gameModules.get(this.currentGame);
      if (gameModule) {
        gameModule.handleInput(inputEvent);
      }
    }
  }

  /**
   * Handle mouse click events
   */
  private handleClick(e: MouseEvent): void {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const inputEvent: InputEvent = {
      type: 'click',
      position: { x, y },
      timestamp: Date.now(),
    };
    
    if (this.mainMenu.isVisible) {
      this.handleMainMenuClick(inputEvent);
    } else if (this.currentGame && !this.gamePaused) {
      const gameModule = this.gameModules.get(this.currentGame);
      if (gameModule) {
        gameModule.handleInput(inputEvent);
      }
    }
  }

  /**
   * Handle main menu input
   */
  private handleMainMenuInput(input: InputEvent): void {
    if (input.type !== 'keydown' || !input.key) return;
    
    switch (input.key) {
      case 'ArrowUp':
        this.mainMenu.selectedGameIndex = Math.max(0, this.mainMenu.selectedGameIndex - 1);
        this.audio.play('select');
        break;
      case 'ArrowDown':
        this.mainMenu.selectedGameIndex = Math.min(this.GAMES.length - 1, this.mainMenu.selectedGameIndex + 1);
        this.audio.play('select');
        break;
      case 'Enter':
      case ' ':
        const selectedGame = this.GAMES[this.mainMenu.selectedGameIndex];
        if (selectedGame) {
          this.loadGame(selectedGame.type);
          this.audio.play('confirm');
        }
        break;
    }
  }

  /**
   * Handle main menu click
   */
  private handleMainMenuClick(input: InputEvent): void {
    if (!input.position) return;
    
    // Simple click detection for menu items
    const menuStartY = 250;
    const itemHeight = 60;
    
    for (let i = 0; i < this.GAMES.length; i++) {
      const itemY = menuStartY + i * itemHeight;
      if (input.position.y >= itemY && input.position.y <= itemY + itemHeight) {
        this.mainMenu.selectedGameIndex = i;
        this.loadGame(this.GAMES[i].type);
        this.audio.play('confirm');
        break;
      }
    }
  }

  /**
   * Handle input when game is paused
   */
  private handlePausedGameInput(input: InputEvent): void {
    if (input.type !== 'keydown' || !input.key) return;
    
    switch (input.key) {
      case 'Enter':
      case ' ':
        this.resumeCurrentGame();
        break;
      case 'Escape':
        this.returnToMainMenu();
        break;
    }
  }

  /**
   * Start the main game loop
   */
  private startMainLoop(): void {
    this.lastUpdateTime = performance.now();
    this.fpsUpdateTime = this.lastUpdateTime;
    
    const loop = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = timestamp - this.lastUpdateTime;
      this.lastUpdateTime = timestamp;
      
      // Update FPS counter
      this.frameCount++;
      if (timestamp - this.fpsUpdateTime >= 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = timestamp;
        
        // Warn if FPS drops significantly
        if (this.currentFPS < this.TARGET_FPS * 0.8) {
          console.warn(`Performance warning: FPS dropped to ${this.currentFPS}`);
        }
      }
      
      // Cap delta time to prevent spiral of death
      const cappedDeltaTime = Math.min(deltaTime, this.FRAME_TIME * 3);
      
      try {
        this.update(cappedDeltaTime);
        this.render();
      } catch (error) {
        console.error('Error in game loop:', error);
        this.showErrorMessage('An error occurred. Returning to menu...');
        this.returnToMainMenu();
      }
      
      this.animationFrameId = requestAnimationFrame(loop);
    };
    
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Update game logic
   */
  private update(deltaTime: number): void {
    if (this.currentGame && !this.gamePaused && !this.mainMenu.isVisible) {
      const gameModule = this.gameModules.get(this.currentGame);
      if (gameModule) {
        try {
          gameModule.update(deltaTime);
        } catch (error) {
          console.error(`Error updating game ${this.currentGame}:`, error);
          throw error; // Re-throw to be caught by main loop
        }
      }
    }
  }

  /**
   * Render the current screen
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;
    
    // Clear canvas
    this.ctx.fillStyle = this.theme.getPalette().background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.mainMenu.isVisible) {
      this.renderMainMenu();
    } else if (this.currentGame) {
      this.renderGame();
      if (this.gamePaused) {
        this.renderPauseOverlay();
      }
    }
    
    // Render transition effect
    if (this.isTransitioning) {
      this.renderTransition();
    }
    
    // Render error message if present
    if (this.errorMessage) {
      this.renderErrorMessage();
    }
  }

  /**
   * Render the main menu
   */
  private renderMainMenu(): void {
    if (!this.ctx || !this.canvas) return;
    
    const palette = this.theme.getPalette();
    
    // Render window frame
    this.windowFrame.render(this.ctx);
    
    // Get content area
    const content = this.windowFrame.getContentBounds();
    
    // Title
    this.ctx.fillStyle = palette.textPrimary;
    this.ctx.font = 'bold 32px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('RETRO REVIVAL', content.x + content.width / 2, content.y + 60);
    this.ctx.fillText('GAME HUB', content.x + content.width / 2, content.y + 100);
    
    // Subtitle
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = palette.textSecondary;
    this.ctx.fillText('Select a game to play', content.x + content.width / 2, content.y + 140);
    
    // Game menu
    const menuStartY = content.y + 200;
    const itemHeight = 60;
    
    this.GAMES.forEach((game, index) => {
      const y = menuStartY + index * itemHeight;
      const isSelected = index === this.mainMenu.selectedGameIndex;
      
      // Selection highlight
      if (isSelected && this.ctx) {
        // Fill the selection background
        this.ctx.fillStyle = palette.accent;
        this.ctx.fillRect(content.x + 50, y - 5, content.width - 100, itemHeight - 10);
        
        // Add a thicker border around the selection
        this.ctx.strokeStyle = palette.accent;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(content.x + 50, y - 5, content.width - 100, itemHeight - 10);
      }
      
      // Game title
      if (this.ctx) {
        this.ctx.fillStyle = isSelected ? palette.titleBarText : palette.textPrimary;
        this.ctx.font = 'bold 20px "Courier New", monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(game.title, content.x + 70, y + 20);
        
        // Game description
        this.ctx.fillStyle = isSelected ? palette.titleBarText : palette.textSecondary;
        this.ctx.font = '14px "Courier New", monospace';
        this.ctx.fillText(game.description, content.x + 70, y + 40);
      }
    });
    
    // Instructions
    this.ctx.fillStyle = palette.textSecondary;
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Use ↑↓ arrows to navigate, ENTER to select', content.x + content.width / 2, content.y + content.height - 40);
    this.ctx.fillText('ESC to pause/resume games', content.x + content.width / 2, content.y + content.height - 20);
  }

  /**
   * Render the current game
   */
  private renderGame(): void {
    if (!this.currentGame) return;
    
    const gameModule = this.gameModules.get(this.currentGame);
    if (gameModule) {
      try {
        gameModule.render();
      } catch (error) {
        console.error(`Error rendering game ${this.currentGame}:`, error);
        throw error; // Re-throw to be caught by main loop
      }
    }
    
    // Render FPS counter in debug mode (top-right corner)
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = '#00FF00';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`FPS: ${this.currentFPS}`, this.canvas.width - 10, 20);
    }
  }

  /**
   * Render pause overlay
   */
  private renderPauseOverlay(): void {
    if (!this.ctx || !this.canvas) return;
    
    const palette = this.theme.getPalette();
    
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Pause message
    this.ctx.fillStyle = palette.titleBarText;
    this.ctx.font = 'bold 48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2 - 40);
    
    // Instructions
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillText('Press ENTER to resume', this.canvas.width / 2, this.canvas.height / 2 + 20);
    this.ctx.fillText('Press ESC to return to menu', this.canvas.width / 2, this.canvas.height / 2 + 45);
  }

  // GameHubController interface implementation

  async loadGame(gameType: GameType): Promise<void> {
    try {
      // Save current game state if switching
      if (this.currentGame && this.currentGame !== gameType) {
        await this.saveGameState(this.currentGame);
      }
      
      // Load game module if not already loaded
      if (!this.gameModules.has(gameType)) {
        const gameModule = await this.loadGameModule(gameType);
        this.gameModules.set(gameType, gameModule);
        
        // Initialize with canvas
        if (this.canvas) {
          try {
            gameModule.initialize(this.canvas);
          } catch (initError) {
            console.error(`Failed to initialize game ${gameType}:`, initError);
            this.gameModules.delete(gameType);
            throw new Error(`Game initialization failed: ${initError}`);
          }
        }
      }
      
      // Restore game state if available
      try {
        const savedState = this.stateManager.loadGameState(gameType);
        if (savedState) {
          const gameModule = this.gameModules.get(gameType);
          if (gameModule) {
            gameModule.setState(savedState);
          }
        }
      } catch (stateError) {
        console.warn(`Failed to restore game state for ${gameType}, starting fresh:`, stateError);
        // Continue with fresh game state
      }
      
      this.currentGame = gameType;
      this.gamePaused = false;
      this.mainMenu.isVisible = false;
      
      // Update window title
      const gameTitle = this.GAMES.find(g => g.type === gameType)?.title || gameType.toUpperCase();
      this.windowFrame.setConfig({ title: `Retro Revival - ${gameTitle}` });
      
      // Start transition effect
      this.startTransition();
      
      if (this.config.enableAudio) {
        this.audio.play('confirm');
      }
      
    } catch (error) {
      console.error(`Failed to load game ${gameType}:`, error);
      if (this.config.enableAudio) {
        this.audio.play('error');
      }
      
      // Return to main menu on error
      this.mainMenu.isVisible = true;
      this.currentGame = null;
      
      // Show error message to user
      this.showErrorMessage(`Failed to load ${gameType}. Please try again.`);
    }
  }

  async switchGame(fromGame: GameType, toGame: GameType): Promise<void> {
    if (fromGame === toGame) return;
    
    // Save current game state
    await this.saveGameState(fromGame);
    
    // Load new game
    await this.loadGame(toGame);
  }

  pauseCurrentGame(): void {
    if (!this.currentGame || this.gamePaused) return;
    
    const gameModule = this.gameModules.get(this.currentGame);
    if (gameModule) {
      gameModule.pause();
      this.gamePaused = true;
      this.audio.play('select');
    }
  }

  resumeCurrentGame(): void {
    if (!this.currentGame || !this.gamePaused) return;
    
    const gameModule = this.gameModules.get(this.currentGame);
    if (gameModule) {
      gameModule.resume();
      this.gamePaused = false;
      this.audio.play('confirm');
    }
  }

  returnToMainMenu(): void {
    if (this.currentGame) {
      // Save current game state
      this.saveGameState(this.currentGame);
      
      // Pause the game
      const gameModule = this.gameModules.get(this.currentGame);
      if (gameModule) {
        gameModule.pause();
      }
      
      // Clear current game
      this.currentGame = null;
    }
    
    // Reset canvas to default menu size
    if (this.canvas) {
      this.canvas.width = 800;
      this.canvas.height = 600;
    }
    
    this.mainMenu.isVisible = true;
    this.gamePaused = false;
    this.windowFrame.setConfig({ title: 'Retro Revival Game Hub' });
    this.audio.play('cancel');
  }

  getCurrentGame(): GameType | null {
    return this.currentGame;
  }

  isGamePaused(): boolean {
    return this.gamePaused;
  }

  getGameState(gameType: GameType): GameState | null {
    return this.stateManager.loadGameState(gameType);
  }

  async saveAllStates(): Promise<void> {
    try {
      // Save current game state
      if (this.currentGame) {
        await this.saveGameState(this.currentGame);
      }
      
      // StateManager handles persistence automatically
      this.stateManager.forceSave();
      
    } catch (error) {
      console.error('Failed to save game states:', error);
    }
  }

  async loadAllStates(): Promise<void> {
    // StateManager handles loading automatically in constructor
    // This method is kept for interface compatibility
  }

  /**
   * Save individual game state
   */
  private async saveGameState(gameType: GameType): Promise<void> {
    try {
      const gameModule = this.gameModules.get(gameType);
      if (gameModule) {
        const state = gameModule.getState();
        this.stateManager.saveGameState(gameType, state);
      }
    } catch (error) {
      console.error(`Failed to save game state for ${gameType}:`, error);
      // Don't throw - saving state failure shouldn't break the app
    }
  }

  /**
   * Load game module dynamically
   */
  private async loadGameModule(gameType: GameType): Promise<GameModule> {
    switch (gameType) {
      case 'snake': {
        const { SnakeGame } = await import('../games/snake');
        return new SnakeGame();
      }
      case 'tetris': {
        const { TetrisGame } = await import('../games/tetris');
        return new TetrisGame();
      }
      case 'minesweeper': {
        const { MinesweeperGame } = await import('../games/minesweeper');
        return new MinesweeperGame();
      }
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
  }

  /**
   * Show error message to user
   */
  private showErrorMessage(message: string, duration: number = 3000): void {
    this.errorMessage = message;
    
    // Clear existing timeout
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    
    // Auto-hide after duration
    this.errorTimeout = window.setTimeout(() => {
      this.errorMessage = null;
      this.errorTimeout = null;
    }, duration);
  }

  /**
   * Render transition effect
   */
  private renderTransition(): void {
    if (!this.ctx || !this.canvas) return;
    
    const elapsed = performance.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.transitionDuration, 1);
    
    // Fade in/out effect
    this.transitionAlpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.transitionAlpha})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // End transition when complete
    if (progress >= 1) {
      this.isTransitioning = false;
      this.transitionAlpha = 0;
    }
  }

  /**
   * Start a transition effect
   */
  private startTransition(): void {
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
  }

  /**
   * Render error message overlay
   */
  private renderErrorMessage(): void {
    if (!this.ctx || !this.canvas || !this.errorMessage) return;
    
    const palette = this.theme.getPalette();
    
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Error box
    const boxWidth = 600;
    const boxHeight = 150;
    const boxX = (this.canvas.width - boxWidth) / 2;
    const boxY = (this.canvas.height - boxHeight) / 2;
    
    // Box background
    this.ctx.fillStyle = palette.background;
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    
    // Box border
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Error title
    this.ctx.fillStyle = '#FF0000';
    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ERROR', this.canvas.width / 2, boxY + 40);
    
    // Error message
    this.ctx.fillStyle = palette.textPrimary;
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillText(this.errorMessage, this.canvas.width / 2, boxY + 80);
    
    // Dismiss instruction
    this.ctx.fillStyle = palette.textSecondary;
    this.ctx.font = '14px "Courier New", monospace';
    this.ctx.fillText('This message will disappear automatically', this.canvas.width / 2, boxY + 120);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    
    this.gameModules.forEach(module => {
      try {
        module.destroy();
      } catch (error) {
        console.error('Error destroying game module:', error);
      }
    });
    
    this.audio.dispose();
    this.theme.removeStyles();
    this.stateManager.dispose();
  }
}

