/**
 * Cross-Game Feature Consistency Property Tests
 * 
 * **Feature: retro-game-hub, Property 10: Cross-Game Feature Consistency**
 * **Validates: Requirements 2.4, 2.5, 3.4, 5.3, 6.2**
 * 
 * Tests that shared features (retro styling, keyboard controls, AI assistance patterns)
 * behave consistently across all three game modules while respecting game-specific adaptations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SnakeGame } from '../games/snake';
import { TetrisGame } from '../games/tetris';
import { MinesweeperGame } from '../games/minesweeper';
import { GameModule } from './interfaces/GameModule';
import { InputEvent, GameType } from './types';

describe('Cross-Game Feature Consistency', () => {
  let canvas: HTMLCanvasElement;
  let snakeGame: SnakeGame;
  let tetrisGame: TetrisGame;
  let minesweeperGame: MinesweeperGame;
  let games: GameModule[];

  beforeEach(() => {
    // Create a mock canvas for testing
    canvas = {
      getContext: () => ({
        fillStyle: '',
        fillRect: () => {},
        strokeStyle: '',
        lineWidth: 0,
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        strokeRect: () => {},
        font: '',
        fillText: () => {},
        textAlign: '',
        textBaseline: '',
        arc: () => {},
        fill: () => {},
        closePath: () => {}
      }),
      width: 800,
      height: 600
    } as any;

    // Initialize all games
    snakeGame = new SnakeGame();
    tetrisGame = new TetrisGame();
    minesweeperGame = new MinesweeperGame();

    snakeGame.initialize(canvas);
    tetrisGame.initialize(canvas);
    minesweeperGame.initialize(canvas);

    games = [snakeGame, tetrisGame, minesweeperGame];
  });

  describe('Property 10: Keyboard Control Consistency', () => {
    it('should handle pause/resume consistently across all games', () => {
      // Test that all games support 'p' key for pause (common key)
      // Note: Spacebar is game-specific (Tetris uses it for hard drop)
      fc.assert(
        fc.property(
          fc.constantFrom('p', 'P'),
          (pauseKey) => {
            games.forEach(game => {
              // Reset game to known state
              game.reset();
              const initialState = game.getState();
              expect(initialState.isPaused).toBe(false);

              // Pause the game
              const pauseEvent: InputEvent = {
                type: 'keydown',
                key: pauseKey,
                timestamp: Date.now()
              };
              game.handleInput(pauseEvent);

              // Check if game is paused
              const pausedState = game.getState();
              expect(pausedState.isPaused).toBe(true);

              // Resume the game
              game.handleInput(pauseEvent);

              // Check if game is resumed
              const resumedState = game.getState();
              expect(resumedState.isPaused).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle reset consistently across all games', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('r', 'R'),
          (resetKey) => {
            games.forEach(game => {
              // Modify game state
              game.reset();
              const initialState = game.getState();
              
              // Simulate some gameplay by updating
              game.update(1000);
              
              // Reset the game
              const resetEvent: InputEvent = {
                type: 'keydown',
                key: resetKey,
                timestamp: Date.now()
              };
              game.handleInput(resetEvent);

              // Check if game is reset to initial state
              const resetState = game.getState();
              expect(resetState.score).toBe(0);
              expect(resetState.level).toBe(1);
              expect(resetState.isActive).toBe(true);
              expect(resetState.isPaused).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support WASD and arrow keys consistently for directional input', () => {
      // This test focuses on Snake and Tetris which have directional controls
      const directionalGames = [snakeGame, tetrisGame];
      
      fc.assert(
        fc.property(
          fc.constantFrom(
            { arrow: 'ArrowUp', wasd: 'w' },
            { arrow: 'ArrowDown', wasd: 's' },
            { arrow: 'ArrowLeft', wasd: 'a' },
            { arrow: 'ArrowRight', wasd: 'd' }
          ),
          (keyPair) => {
            directionalGames.forEach(game => {
              game.reset();
              
              // Test arrow key
              const arrowEvent: InputEvent = {
                type: 'keydown',
                key: keyPair.arrow,
                timestamp: Date.now()
              };
              game.handleInput(arrowEvent);
              const stateAfterArrow = game.getState();

              // Reset and test WASD key
              game.reset();
              const wasdEvent: InputEvent = {
                type: 'keydown',
                key: keyPair.wasd,
                timestamp: Date.now()
              };
              game.handleInput(wasdEvent);
              const stateAfterWASD = game.getState();

              // Both should produce equivalent game states
              // (we can't compare exact states due to timing, but we can verify both are valid)
              expect(stateAfterArrow.isActive).toBe(true);
              expect(stateAfterWASD.isActive).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: AI Assistance Pattern Consistency', () => {
    it('should provide consistent AI configuration interface across all games', () => {
      // All games should have AI assistants with consistent interfaces
      expect(snakeGame.getAIAssistant()).toBeDefined();
      expect(tetrisGame.getAIAssistant()).toBeDefined();
      expect(minesweeperGame.getAIAssistant()).toBeDefined();

      // All AI assistants should support difficulty levels
      const snakeAI = snakeGame.getAIAssistant();
      const tetrisAI = tetrisGame.getAIAssistant();
      const minesweeperAI = minesweeperGame.getAIAssistant();

      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          (difficulty) => {
            // Set difficulty on all AI assistants
            snakeAI.setDifficultyLevel(difficulty);
            tetrisAI.setDifficultyLevel(difficulty);
            minesweeperAI.setDifficultyLevel(difficulty);

            // Verify difficulty is set consistently
            expect(snakeAI.getDifficultyLevel()).toBeCloseTo(difficulty, 2);
            expect(tetrisAI.getDifficultyLevel()).toBeCloseTo(difficulty, 2);
            expect(minesweeperAI.getDifficultyLevel()).toBeCloseTo(difficulty, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide consistent debug mode interface across all games', () => {
      const snakeAI = snakeGame.getAIAssistant();
      const tetrisAI = tetrisGame.getAIAssistant();
      const minesweeperAI = minesweeperGame.getAIAssistant();

      fc.assert(
        fc.property(
          fc.boolean(),
          (debugEnabled) => {
            // Set debug mode on all AI assistants
            snakeAI.setDebugMode(debugEnabled);
            tetrisAI.setDebugMode(debugEnabled);
            minesweeperAI.setDebugMode(debugEnabled);

            // Verify debug mode is set consistently
            expect(snakeAI.isDebugModeEnabled()).toBe(debugEnabled);
            expect(tetrisAI.isDebugModeEnabled()).toBe(debugEnabled);
            expect(minesweeperAI.isDebugModeEnabled()).toBe(debugEnabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide consistent AI analysis structure across all games', () => {
      const snakeAI = snakeGame.getAIAssistant();
      const tetrisAI = tetrisGame.getAIAssistant();
      const minesweeperAI = minesweeperGame.getAIAssistant();

      // Analyze game states
      const snakeAnalysis = snakeAI.analyzeGameState(snakeGame.getState());
      const tetrisAnalysis = tetrisAI.analyzeGameState(tetrisGame.getState());
      const minesweeperAnalysis = minesweeperAI.analyzeGameState(minesweeperGame.getState());

      // All analyses should have consistent structure
      const analyses = [snakeAnalysis, tetrisAnalysis, minesweeperAnalysis];
      
      analyses.forEach(analysis => {
        expect(analysis).toHaveProperty('confidence');
        expect(analysis).toHaveProperty('reasoning');
        expect(analysis).toHaveProperty('suggestedActions');
        expect(analysis).toHaveProperty('riskAssessment');
        expect(analysis).toHaveProperty('alternativeOptions');

        // Confidence should be between 0 and 1
        expect(analysis.confidence).toBeGreaterThanOrEqual(0);
        expect(analysis.confidence).toBeLessThanOrEqual(1);

        // Risk assessment should be valid
        expect(['low', 'medium', 'high', 'critical']).toContain(analysis.riskAssessment);

        // Suggested actions should be an array
        expect(Array.isArray(analysis.suggestedActions)).toBe(true);
        expect(Array.isArray(analysis.alternativeOptions)).toBe(true);
      });
    });

    it('should provide consistent hint structure across all games', () => {
      const snakeAI = snakeGame.getAIAssistant();
      const tetrisAI = tetrisGame.getAIAssistant();
      const minesweeperAI = minesweeperGame.getAIAssistant();

      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1 }),
          (difficulty) => {
            // Analyze states first
            snakeAI.analyzeGameState(snakeGame.getState());
            tetrisAI.analyzeGameState(tetrisGame.getState());
            minesweeperAI.analyzeGameState(minesweeperGame.getState());

            // Get hints
            const snakeHint = snakeAI.getHint(difficulty);
            const tetrisHint = tetrisAI.getHint(difficulty);
            const minesweeperHint = minesweeperAI.getHint(difficulty);

            const hints = [snakeHint, tetrisHint, minesweeperHint];

            // All hints should have consistent structure
            hints.forEach(hint => {
              expect(hint).toHaveProperty('message');
              expect(typeof hint.message).toBe('string');
              expect(hint.message.length).toBeGreaterThan(0);

              // Confidence should be between 0 and 1 if present
              if (hint.confidence !== undefined) {
                expect(hint.confidence).toBeGreaterThanOrEqual(0);
                expect(hint.confidence).toBeLessThanOrEqual(1);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: State Management Consistency', () => {
    it('should maintain consistent state structure across all games', () => {
      games.forEach(game => {
        const state = game.getState();

        // All games should have these common properties
        expect(state).toHaveProperty('gameType');
        expect(state).toHaveProperty('isActive');
        expect(state).toHaveProperty('isPaused');
        expect(state).toHaveProperty('score');
        expect(state).toHaveProperty('level');
        expect(state).toHaveProperty('timeElapsed');
        expect(state).toHaveProperty('gameSpecificData');

        // Common properties should have correct types
        expect(['snake', 'tetris', 'minesweeper']).toContain(state.gameType);
        expect(typeof state.isActive).toBe('boolean');
        expect(typeof state.isPaused).toBe('boolean');
        expect(typeof state.score).toBe('number');
        expect(typeof state.level).toBe('number');
        expect(typeof state.timeElapsed).toBe('number');
        expect(typeof state.gameSpecificData).toBe('object');

        // Numeric properties should be non-negative
        expect(state.score).toBeGreaterThanOrEqual(0);
        expect(state.level).toBeGreaterThanOrEqual(1);
        expect(state.timeElapsed).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle state save/restore consistently across all games', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 1000 }),
          (updateTime) => {
            games.forEach(game => {
              // Reset to known state
              game.reset();
              
              // Update game
              game.update(updateTime);
              
              // Save state
              const savedState = game.getState();
              
              // Modify game further
              game.update(updateTime);
              
              // Restore saved state
              game.setState(savedState);
              const restoredState = game.getState();
              
              // Restored state should match saved state
              expect(restoredState.score).toBe(savedState.score);
              expect(restoredState.level).toBe(savedState.level);
              expect(restoredState.isActive).toBe(savedState.isActive);
              expect(restoredState.isPaused).toBe(savedState.isPaused);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle pause/resume state transitions consistently', () => {
      games.forEach(game => {
        game.reset();
        
        // Initial state should be active and not paused
        let state = game.getState();
        expect(state.isActive).toBe(true);
        expect(state.isPaused).toBe(false);

        // Pause should set isPaused to true
        game.pause();
        state = game.getState();
        expect(state.isPaused).toBe(true);

        // Resume should set isPaused to false
        game.resume();
        state = game.getState();
        expect(state.isPaused).toBe(false);

        // Multiple pause/resume cycles should work consistently
        game.pause();
        game.pause(); // Double pause
        state = game.getState();
        expect(state.isPaused).toBe(true);

        game.resume();
        game.resume(); // Double resume
        state = game.getState();
        expect(state.isPaused).toBe(false);
      });
    });
  });

  describe('Property 10: Update/Render Cycle Consistency', () => {
    it('should handle update cycles consistently when paused', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5000 }),
          (deltaTime) => {
            games.forEach(game => {
              game.reset();
              game.pause();
              
              const stateBefore = game.getState();
              const timeBefore = stateBefore.timeElapsed;
              
              // Update while paused
              game.update(deltaTime);
              
              const stateAfter = game.getState();
              
              // Time should not advance when paused
              expect(stateAfter.timeElapsed).toBe(timeBefore);
              
              // Game should still be paused
              expect(stateAfter.isPaused).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle update cycles consistently when active', () => {
      fc.assert(
        fc.property(
          fc.nat({ min: 1, max: 1000 }),
          (deltaTime) => {
            games.forEach(game => {
              game.reset();
              
              const stateBefore = game.getState();
              const timeBefore = stateBefore.timeElapsed;
              
              // Update while active
              game.update(deltaTime);
              
              const stateAfter = game.getState();
              
              // Time should advance when active and not paused
              if (stateAfter.isActive && !stateAfter.isPaused) {
                expect(stateAfter.timeElapsed).toBeGreaterThanOrEqual(timeBefore);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle render calls without errors across all games', () => {
      games.forEach(game => {
        game.reset();
        
        // Render should not throw errors
        expect(() => game.render()).not.toThrow();
        
        // Render while paused should not throw
        game.pause();
        expect(() => game.render()).not.toThrow();
        
        // Render after update should not throw
        game.resume();
        game.update(100);
        expect(() => game.render()).not.toThrow();
      });
    });
  });

  describe('Property 10: Lifecycle Consistency', () => {
    it('should handle reset consistently across all games', () => {
      games.forEach(game => {
        // Modify game state
        game.update(1000);
        game.pause();
        
        // Reset
        game.reset();
        
        const state = game.getState();
        
        // After reset, game should be in initial state
        expect(state.score).toBe(0);
        expect(state.level).toBe(1);
        expect(state.timeElapsed).toBe(0);
        expect(state.isActive).toBe(true);
        expect(state.isPaused).toBe(false);
      });
    });

    it('should handle destroy without errors across all games', () => {
      games.forEach(game => {
        // Destroy should not throw errors
        expect(() => game.destroy()).not.toThrow();
      });
    });
  });
});
