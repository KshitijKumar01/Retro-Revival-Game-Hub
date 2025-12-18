/**
 * GameModule Interface
 * 
 * Defines the contract for all game implementations (Snake, Tetris, Minesweeper).
 * Each game module manages its own state, rendering, and input handling while
 * integrating with the AI assistant for enhanced features.
 */

import { GameState, InputEvent } from '../types';

export interface GameModule {
  /**
   * Initialize the game module with a canvas element
   * @param canvas - The HTML5 canvas element for rendering
   */
  initialize(canvas: HTMLCanvasElement): void;

  /**
   * Update game logic based on elapsed time
   * @param deltaTime - Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void;

  /**
   * Render the current game state to the canvas
   */
  render(): void;

  /**
   * Handle user input events
   * @param input - The input event to process
   */
  handleInput(input: InputEvent): void;

  /**
   * Get the current game state for persistence or AI analysis
   * @returns The current game state
   */
  getState(): GameState;

  /**
   * Restore a previously saved game state
   * @param state - The game state to restore
   */
  setState(state: GameState): void;

  /**
   * Reset the game to initial state
   */
  reset(): void;

  /**
   * Pause the game
   */
  pause(): void;

  /**
   * Resume a paused game
   */
  resume(): void;

  /**
   * Clean up resources when the game module is unloaded
   */
  destroy(): void;
}
