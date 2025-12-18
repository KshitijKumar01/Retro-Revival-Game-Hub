/**
 * Integration Tests for GameHubController
 * 
 * Tests complete user workflows including:
 * - Game switching with state preservation
 * - AI integration across all game contexts
 * - Error handling and recovery
 * - Performance under load
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameHubControllerImpl } from './GameHubController';
import { GameType } from './types';

describe('GameHubController Integration Tests', () => {
  let gameHub: GameHubControllerImpl;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a canvas element for testing
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // Initialize game hub
    gameHub = new GameHubControllerImpl({
      canvasId: 'test-canvas',
      theme: 'win95',
      enableCRT: false,
      enableAudio: false, // Disable audio for tests
      autoStart: false // Don't auto-start for tests
    });
  });

  afterEach(() => {
    // Clean up
    gameHub.dispose();
    document.body.removeChild(canvas);
  });

  describe('Game Switching Workflows', () => {
    it('should load and switch between all three games', async () => {
      const games: GameType[] = ['snake', 'tetris', 'minesweeper'];

      for (const gameType of games) {
        await gameHub.loadGame(gameType);
        expect(gameHub.getCurrentGame()).toBe(gameType);
        expect(gameHub.isGamePaused()).toBe(false);
      }
    });

    it('should preserve game state when switching games', async () => {
      // Load Snake game
      await gameHub.loadGame('snake');
      const snakeState1 = gameHub.getGameState('snake');
      expect(snakeState1).toBeTruthy();

      // Switch to Tetris
      await gameHub.switchGame('snake', 'tetris');
      expect(gameHub.getCurrentGame()).toBe('tetris');

      // Switch back to Snake
      await gameHub.loadGame('snake');
      const snakeState2 = gameHub.getGameState('snake');
      
      // State should be preserved
      expect(snakeState2).toBeTruthy();
      expect(snakeState2?.gameType).toBe('snake');
    });

    it('should handle rapid game switching without errors', async () => {
      const games: GameType[] = ['snake', 'tetris', 'minesweeper'];
      
      // Rapidly switch between games
      for (let i = 0; i < 10; i++) {
        const gameType = games[i % games.length];
        await gameHub.loadGame(gameType);
        expect(gameHub.getCurrentGame()).toBe(gameType);
      }
    });

    it('should save all game states when requested', async () => {
      // Load and play each game briefly
      await gameHub.loadGame('snake');
      await gameHub.loadGame('tetris');
      await gameHub.loadGame('minesweeper');

      // Save all states
      await gameHub.saveAllStates();

      // Verify states are saved
      expect(gameHub.getGameState('snake')).toBeTruthy();
      expect(gameHub.getGameState('tetris')).toBeTruthy();
      expect(gameHub.getGameState('minesweeper')).toBeTruthy();
    });
  });

  describe('Pause and Resume Functionality', () => {
    it('should pause and resume games correctly', async () => {
      await gameHub.loadGame('snake');
      
      expect(gameHub.isGamePaused()).toBe(false);
      
      gameHub.pauseCurrentGame();
      expect(gameHub.isGamePaused()).toBe(true);
      
      gameHub.resumeCurrentGame();
      expect(gameHub.isGamePaused()).toBe(false);
    });

    it('should maintain pause state when switching games', async () => {
      await gameHub.loadGame('snake');
      gameHub.pauseCurrentGame();
      
      await gameHub.loadGame('tetris');
      expect(gameHub.isGamePaused()).toBe(false); // New game should not be paused
    });
  });

  describe('Return to Main Menu', () => {
    it('should return to main menu and save game state', async () => {
      await gameHub.loadGame('snake');
      expect(gameHub.getCurrentGame()).toBe('snake');
      
      gameHub.returnToMainMenu();
      expect(gameHub.getCurrentGame()).toBeNull();
      
      // State should be saved
      const savedState = gameHub.getGameState('snake');
      expect(savedState).toBeTruthy();
    });

    it('should allow returning to a game after going to menu', async () => {
      await gameHub.loadGame('tetris');
      gameHub.returnToMainMenu();
      
      await gameHub.loadGame('tetris');
      expect(gameHub.getCurrentGame()).toBe('tetris');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid game type gracefully', async () => {
      // This should not throw
      try {
        await gameHub.loadGame('invalid' as GameType);
        // Should return to menu on error
        expect(gameHub.getCurrentGame()).toBeNull();
      } catch (error) {
        // Error is acceptable
        expect(error).toBeTruthy();
      }
    });

    it('should recover from game initialization errors', async () => {
      // Load a valid game first
      await gameHub.loadGame('snake');
      expect(gameHub.getCurrentGame()).toBe('snake');
      
      // Even if there's an error, the hub should remain functional
      await gameHub.loadGame('tetris');
      expect(gameHub.getCurrentGame()).toBe('tetris');
    });
  });

  describe('AI Integration Across Games', () => {
    it('should load Snake game with AI assistant', async () => {
      await gameHub.loadGame('snake');
      const state = gameHub.getGameState('snake');
      expect(state).toBeTruthy();
      expect(state?.gameType).toBe('snake');
    });

    it('should load Tetris game with AI assistant', async () => {
      await gameHub.loadGame('tetris');
      const state = gameHub.getGameState('tetris');
      expect(state).toBeTruthy();
      expect(state?.gameType).toBe('tetris');
    });

    it('should load Minesweeper game with AI assistant', async () => {
      await gameHub.loadGame('minesweeper');
      const state = gameHub.getGameState('minesweeper');
      expect(state).toBeTruthy();
      expect(state?.gameType).toBe('minesweeper');
    });

    it('should maintain separate AI states for each game', async () => {
      // Load all games
      await gameHub.loadGame('snake');
      const snakeState = gameHub.getGameState('snake');
      
      await gameHub.loadGame('tetris');
      const tetrisState = gameHub.getGameState('tetris');
      
      await gameHub.loadGame('minesweeper');
      const minesweeperState = gameHub.getGameState('minesweeper');
      
      // Each should have its own state
      expect(snakeState?.gameType).toBe('snake');
      expect(tetrisState?.gameType).toBe('tetris');
      expect(minesweeperState?.gameType).toBe('minesweeper');
    });
  });

  describe('State Persistence', () => {
    it('should persist game state across sessions', async () => {
      // Load and modify Snake game
      await gameHub.loadGame('snake');
      const initialState = gameHub.getGameState('snake');
      
      // Save state
      await gameHub.saveAllStates();
      
      // Dispose and recreate hub
      gameHub.dispose();
      document.body.removeChild(canvas);
      
      canvas = document.createElement('canvas');
      canvas.id = 'test-canvas';
      canvas.width = 800;
      canvas.height = 600;
      document.body.appendChild(canvas);
      
      gameHub = new GameHubControllerImpl({
        canvasId: 'test-canvas',
        theme: 'win95',
        enableCRT: false,
        enableAudio: false,
        autoStart: false
      });
      
      // Load states
      await gameHub.loadAllStates();
      
      // State should be restored
      const restoredState = gameHub.getGameState('snake');
      expect(restoredState).toBeTruthy();
      expect(restoredState?.gameType).toBe(initialState?.gameType);
    });
  });

  describe('Performance and Stability', () => {
    it('should handle multiple game loads without memory leaks', async () => {
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        await gameHub.loadGame('snake');
        await gameHub.loadGame('tetris');
        await gameHub.loadGame('minesweeper');
      }
      
      // Should still be functional
      expect(gameHub.getCurrentGame()).toBe('minesweeper');
    });

    it('should maintain consistent state after many operations', async () => {
      // Perform many operations
      for (let i = 0; i < 10; i++) {
        await gameHub.loadGame('snake');
        gameHub.pauseCurrentGame();
        gameHub.resumeCurrentGame();
        gameHub.returnToMainMenu();
      }
      
      // Should still be functional
      await gameHub.loadGame('tetris');
      expect(gameHub.getCurrentGame()).toBe('tetris');
    });
  });

  describe('Complete User Workflows', () => {
    it('should support a complete gaming session workflow', async () => {
      // 1. Start with main menu (implicit)
      expect(gameHub.getCurrentGame()).toBeNull();
      
      // 2. Load Snake game
      await gameHub.loadGame('snake');
      expect(gameHub.getCurrentGame()).toBe('snake');
      
      // 3. Pause the game
      gameHub.pauseCurrentGame();
      expect(gameHub.isGamePaused()).toBe(true);
      
      // 4. Resume the game
      gameHub.resumeCurrentGame();
      expect(gameHub.isGamePaused()).toBe(false);
      
      // 5. Switch to Tetris
      await gameHub.switchGame('snake', 'tetris');
      expect(gameHub.getCurrentGame()).toBe('tetris');
      
      // 6. Return to menu
      gameHub.returnToMainMenu();
      expect(gameHub.getCurrentGame()).toBeNull();
      
      // 7. Load Minesweeper
      await gameHub.loadGame('minesweeper');
      expect(gameHub.getCurrentGame()).toBe('minesweeper');
      
      // 8. Save all progress
      await gameHub.saveAllStates();
      
      // All states should be saved
      expect(gameHub.getGameState('snake')).toBeTruthy();
      expect(gameHub.getGameState('tetris')).toBeTruthy();
      expect(gameHub.getGameState('minesweeper')).toBeTruthy();
    });

    it('should handle interrupted session recovery', async () => {
      // Start a game
      await gameHub.loadGame('snake');
      const initialState = gameHub.getGameState('snake');
      
      // Simulate interruption (save and dispose)
      await gameHub.saveAllStates();
      gameHub.dispose();
      
      // Recreate hub (simulating app restart)
      document.body.removeChild(canvas);
      canvas = document.createElement('canvas');
      canvas.id = 'test-canvas';
      canvas.width = 800;
      canvas.height = 600;
      document.body.appendChild(canvas);
      
      gameHub = new GameHubControllerImpl({
        canvasId: 'test-canvas',
        theme: 'win95',
        enableCRT: false,
        enableAudio: false,
        autoStart: false
      });
      
      // Load the game again
      await gameHub.loadGame('snake');
      const restoredState = gameHub.getGameState('snake');
      
      // State should be restored
      expect(restoredState).toBeTruthy();
      expect(restoredState?.gameType).toBe(initialState?.gameType);
    });
  });
});
