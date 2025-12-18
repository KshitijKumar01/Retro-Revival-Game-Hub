/**
 * GameHubController Interface
 * 
 * Manages the game hub lifecycle, navigation between games,
 * and coordination of shared services (audio, state persistence, UI theming).
 */

import { GameType, GameState } from '../types';

export interface GameHubController {
  /**
   * Load and initialize a specific game
   * @param gameType - The type of game to load
   * @returns Promise that resolves when the game is loaded and ready
   */
  loadGame(gameType: GameType): Promise<void>;

  /**
   * Switch from one game to another, preserving state
   * @param fromGame - The current game type
   * @param toGame - The game type to switch to
   * @returns Promise that resolves when the switch is complete
   */
  switchGame(fromGame: GameType, toGame: GameType): Promise<void>;

  /**
   * Pause the currently active game
   */
  pauseCurrentGame(): void;

  /**
   * Resume the currently paused game
   */
  resumeCurrentGame(): void;

  /**
   * Return to the main menu, saving current game state
   */
  returnToMainMenu(): void;

  /**
   * Get the currently active game type
   * @returns The current game type or null if on main menu
   */
  getCurrentGame(): GameType | null;

  /**
   * Check if a game is currently paused
   * @returns Whether the current game is paused
   */
  isGamePaused(): boolean;

  /**
   * Get the state of a specific game
   * @param gameType - The game type to get state for
   * @returns The game state or null if not available
   */
  getGameState(gameType: GameType): GameState | null;

  /**
   * Save all game states to persistent storage
   * @returns Promise that resolves when save is complete
   */
  saveAllStates(): Promise<void>;

  /**
   * Load all game states from persistent storage
   * @returns Promise that resolves when load is complete
   */
  loadAllStates(): Promise<void>;
}
