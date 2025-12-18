/**
 * StateManager Property-Based Tests
 * 
 * Tests the correctness properties for state persistence and score system integrity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { StateManager, HighScoreEntry } from './StateManager';
import { GameType, GameState, Direction } from './types';
import { SnakeState, TetrisState, MinesweeperState, TetrisPiece, CellState } from './types/game-state';

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Replace global localStorage with mock
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Also define window for the StateManager
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
  },
  writable: true,
});

describe('StateManager Property-Based Tests', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    mockLocalStorage.clear();
    // Ensure clean state by clearing any existing data
    mockLocalStorage.removeItem('retro-game-hub-session');
    mockLocalStorage.removeItem('retro-game-hub-high-scores');
    stateManager = new StateManager();
  });

  afterEach(() => {
    stateManager.dispose();
    mockLocalStorage.clear();
  });

  // Generators for property-based testing

  const gameTypeArb = fc.constantFrom('snake', 'tetris', 'minesweeper');

  const positionArb = fc.record({
    x: fc.integer({ min: 0, max: 100 }),
    y: fc.integer({ min: 0, max: 100 }),
  });

  const directionArb = fc.constantFrom('up', 'down', 'left', 'right');

  const cellStateArb = fc.constantFrom('hidden', 'revealed', 'flagged', 'mine', 'number');

  const tetrisPieceArb = fc.record({
    type: fc.constantFrom('I', 'O', 'T', 'S', 'Z', 'J', 'L'),
    rotation: fc.integer({ min: 0, max: 3 }),
    position: positionArb,
    shape: fc.array(fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 4, maxLength: 4 }), { minLength: 4, maxLength: 4 }),
  });

  const snakeStateArb = fc.record({
    snake: fc.array(positionArb, { minLength: 1, maxLength: 20 }),
    food: positionArb,
    direction: directionArb,
    gridSize: fc.record({
      width: fc.integer({ min: 10, max: 50 }),
      height: fc.integer({ min: 10, max: 50 }),
    }),
    speed: fc.integer({ min: 1, max: 10 }),
    aiAssistanceEnabled: fc.boolean(),
    aiChallengeMode: fc.boolean(),
  });

  const tetrisStateArb = fc.record({
    board: fc.array(fc.array(fc.integer({ min: 0, max: 7 }), { minLength: 10, maxLength: 10 }), { minLength: 20, maxLength: 20 }),
    currentPiece: tetrisPieceArb,
    nextPiece: tetrisPieceArb,
    heldPiece: fc.option(tetrisPieceArb),
    linesCleared: fc.integer({ min: 0, max: 1000 }),
    fallSpeed: fc.integer({ min: 1, max: 20 }),
    aiAdvisorEnabled: fc.boolean(),
  });

  const minesweeperStateArb = fc.record({
    board: fc.array(fc.array(cellStateArb, { minLength: 8, maxLength: 16 }), { minLength: 8, maxLength: 16 }),
    minePositions: fc.array(positionArb, { minLength: 1, maxLength: 40 }),
    revealedCells: fc.array(fc.array(fc.boolean(), { minLength: 8, maxLength: 16 }), { minLength: 8, maxLength: 16 }),
    flaggedCells: fc.array(fc.array(fc.boolean(), { minLength: 8, maxLength: 16 }), { minLength: 8, maxLength: 16 }),
    gameStatus: fc.constantFrom('playing', 'won', 'lost'),
    aiHintsEnabled: fc.boolean(),
    explainModeEnabled: fc.boolean(),
  });

  const gameSpecificDataArb = fc.oneof(snakeStateArb, tetrisStateArb, minesweeperStateArb);

  const gameStateArb = fc.record({
    gameType: gameTypeArb,
    isActive: fc.boolean(),
    isPaused: fc.boolean(),
    score: fc.integer({ min: 0, max: 1000000 }),
    level: fc.integer({ min: 1, max: 100 }),
    timeElapsed: fc.integer({ min: 0, max: 3600000 }), // Up to 1 hour in ms
    gameSpecificData: gameSpecificDataArb,
  });

  const highScoreEntryArb = fc.record({
    score: fc.integer({ min: 0, max: 1000000 }),
    level: fc.integer({ min: 1, max: 100 }),
    gameType: gameTypeArb,
    playerName: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  });

  describe('Property 5: State Persistence Round Trip', () => {
    /**
     * **Feature: retro-game-hub, Property 5: State Persistence Round Trip**
     * **Validates: Requirements 7.2, 7.3**
     * 
     * For any game state that is saved (through pause, exit, or application restart), 
     * loading the saved state should restore functionally equivalent gameplay with all progress preserved
     */
    it('should preserve game state through save/load cycles', () => {
      fc.assert(
        fc.property(gameTypeArb, gameStateArb, (gameType, originalState) => {
          // Ensure gameType matches the state
          const state = { ...originalState, gameType };
          
          // Save the state
          stateManager.saveGameState(gameType, state);
          
          // Load the state back
          const loadedState = stateManager.loadGameState(gameType);
          
          // Should not be null
          expect(loadedState).not.toBeNull();
          
          if (loadedState) {
            // All fields should be preserved
            expect(loadedState.gameType).toBe(state.gameType);
            expect(loadedState.isActive).toBe(state.isActive);
            expect(loadedState.isPaused).toBe(state.isPaused);
            expect(loadedState.score).toBe(state.score);
            expect(loadedState.level).toBe(state.level);
            expect(loadedState.timeElapsed).toBe(state.timeElapsed);
            
            // Game-specific data should be deeply equal
            expect(loadedState.gameSpecificData).toEqual(state.gameSpecificData);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle multiple game states independently', () => {
      fc.assert(
        fc.property(
          fc.record({
            snake: gameStateArb,
            tetris: gameStateArb,
            minesweeper: gameStateArb,
          }),
          (states) => {
            // Save all three game states
            stateManager.saveGameState('snake', { ...states.snake, gameType: 'snake' });
            stateManager.saveGameState('tetris', { ...states.tetris, gameType: 'tetris' });
            stateManager.saveGameState('minesweeper', { ...states.minesweeper, gameType: 'minesweeper' });
            
            // Load them back
            const loadedSnake = stateManager.loadGameState('snake');
            const loadedTetris = stateManager.loadGameState('tetris');
            const loadedMinesweeper = stateManager.loadGameState('minesweeper');
            
            // All should be preserved independently
            expect(loadedSnake).not.toBeNull();
            expect(loadedTetris).not.toBeNull();
            expect(loadedMinesweeper).not.toBeNull();
            
            if (loadedSnake && loadedTetris && loadedMinesweeper) {
              expect(loadedSnake.score).toBe(states.snake.score);
              expect(loadedTetris.score).toBe(states.tetris.score);
              expect(loadedMinesweeper.score).toBe(states.minesweeper.score);
              
              // States should not interfere with each other
              expect(loadedSnake.gameType).toBe('snake');
              expect(loadedTetris.gameType).toBe('tetris');
              expect(loadedMinesweeper.gameType).toBe('minesweeper');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist state across StateManager instances (simulating app restart)', () => {
      fc.assert(
        fc.property(gameTypeArb, gameStateArb, (gameType, originalState) => {
          const state = { ...originalState, gameType };
          
          // Save with first instance
          stateManager.saveGameState(gameType, state);
          stateManager.forceSave(); // Ensure immediate save
          
          // Create new instance (simulating app restart)
          const newStateManager = new StateManager();
          
          try {
            // Load with new instance
            const loadedState = newStateManager.loadGameState(gameType);
            
            expect(loadedState).not.toBeNull();
            if (loadedState) {
              expect(loadedState.score).toBe(state.score);
              expect(loadedState.level).toBe(state.level);
              expect(loadedState.gameType).toBe(state.gameType);
            }
          } finally {
            newStateManager.dispose();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle interrupted session restoration', () => {
      fc.assert(
        fc.property(gameTypeArb, gameStateArb, (gameType, originalState) => {
          const state = { ...originalState, gameType, isActive: true };
          
          // Save an active game state
          stateManager.saveGameState(gameType, state);
          
          // Should detect interrupted session
          expect(stateManager.hasInterruptedSession()).toBe(true);
          
          const interrupted = stateManager.getInterruptedSession();
          expect(interrupted).not.toBeNull();
          
          if (interrupted) {
            expect(interrupted.gameType).toBe(gameType);
            expect(interrupted.state.score).toBe(state.score);
          }
          
          // Clear interrupted session
          stateManager.clearInterruptedSession();
          expect(stateManager.hasInterruptedSession()).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Score System Integrity', () => {
    /**
     * **Feature: retro-game-hub, Property 8: Score System Integrity**
     * **Validates: Requirements 7.1, 7.4**
     * 
     * For any completed game session, scores should be accurately calculated according to game-specific rules, 
     * properly recorded in the global system, and maintained separately for each game type
     */
    it('should maintain high scores separately for each game type', () => {
      fc.assert(
        fc.property(
          fc.array(highScoreEntryArb, { minLength: 1, maxLength: 15 }),
          (entries) => {
            // Clear localStorage completely for this test
            mockLocalStorage.clear();
            
            // Create a fresh StateManager for this test to ensure isolation
            const testStateManager = new StateManager();
            
            // Add all entries
            entries.forEach(entry => {
              testStateManager.addHighScore(entry);
            });
            
            // Count entries by game type
            const snakeEntries = entries.filter(e => e.gameType === 'snake');
            const tetrisEntries = entries.filter(e => e.gameType === 'tetris');
            const minesweeperEntries = entries.filter(e => e.gameType === 'minesweeper');
            
            // Verify separation
            const snakeScores = testStateManager.getHighScores('snake');
            const tetrisScores = testStateManager.getHighScores('tetris');
            const minesweeperScores = testStateManager.getHighScores('minesweeper');
            
            // Each game should only have its own scores
            expect(snakeScores.every(s => s.gameType === 'snake')).toBe(true);
            expect(tetrisScores.every(s => s.gameType === 'tetris')).toBe(true);
            expect(minesweeperScores.every(s => s.gameType === 'minesweeper')).toBe(true);
            
            // Count should match (up to max limit)
            expect(snakeScores.length).toBe(Math.min(snakeEntries.length, 10));
            expect(tetrisScores.length).toBe(Math.min(tetrisEntries.length, 10));
            expect(minesweeperScores.length).toBe(Math.min(minesweeperEntries.length, 10));
            
            testStateManager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain high scores in descending order', () => {
      fc.assert(
        fc.property(
          gameTypeArb,
          fc.array(highScoreEntryArb, { minLength: 2, maxLength: 15 }),
          (gameType, entries) => {
            // Ensure all entries are for the same game type
            const gameEntries = entries.map(e => ({ ...e, gameType }));
            
            // Add all entries
            gameEntries.forEach(entry => {
              stateManager.addHighScore(entry);
            });
            
            // Get high scores
            const highScores = stateManager.getHighScores(gameType);
            
            // Should be sorted in descending order
            for (let i = 1; i < highScores.length; i++) {
              expect(highScores[i - 1].score).toBeGreaterThanOrEqual(highScores[i].score);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should limit high scores to maximum entries per game', () => {
      fc.assert(
        fc.property(
          gameTypeArb,
          fc.array(highScoreEntryArb, { minLength: 15, maxLength: 25 }),
          (gameType, entries) => {
            // Clear localStorage completely for this test
            mockLocalStorage.clear();
            
            // Create a fresh StateManager for this test to ensure isolation
            const testStateManager = new StateManager();
            
            // Ensure all entries are for the same game type
            const gameEntries = entries.map(e => ({ ...e, gameType }));
            
            // Add all entries
            gameEntries.forEach(entry => {
              testStateManager.addHighScore(entry);
            });
            
            // Should not exceed maximum
            const highScores = testStateManager.getHighScores(gameType);
            expect(highScores.length).toBeLessThanOrEqual(10);
            
            // Should keep the highest scores
            if (highScores.length === 10) {
              const allScores = gameEntries.map(e => e.score).sort((a, b) => b - a);
              const topTenScores = allScores.slice(0, 10);
              const actualScores = highScores.map(e => e.score).sort((a, b) => b - a);
              
              expect(actualScores).toEqual(topTenScores);
            }
            
            testStateManager.dispose();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify qualifying high scores', () => {
      fc.assert(
        fc.property(
          gameTypeArb,
          fc.array(fc.integer({ min: 100, max: 1000 }), { minLength: 5, maxLength: 10 }),
          fc.integer({ min: 50, max: 1500 }),
          (gameType, existingScores, testScore) => {
            // Add existing scores
            existingScores.forEach(score => {
              stateManager.addHighScore({
                score,
                level: 1,
                gameType,
              });
            });
            
            const isQualifying = stateManager.isHighScore(gameType, testScore);
            const currentScores = stateManager.getHighScores(gameType);
            
            if (currentScores.length < 10) {
              // If not at limit, any score qualifies
              expect(isQualifying).toBe(true);
            } else {
              // If at limit, only scores higher than the lowest qualify
              const lowestScore = currentScores[currentScores.length - 1].score;
              expect(isQualifying).toBe(testScore > lowestScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should persist high scores across sessions', () => {
      fc.assert(
        fc.property(
          fc.array(highScoreEntryArb, { minLength: 1, maxLength: 10 }),
          (entries) => {
            // Clear localStorage completely for this test
            mockLocalStorage.clear();
            
            // Create a fresh StateManager for this test to ensure isolation
            const firstStateManager = new StateManager();
            
            // Add scores with first instance
            entries.forEach(entry => {
              firstStateManager.addHighScore(entry);
            });
            firstStateManager.forceSave();
            
            // Create new instance (simulating app restart)
            const newStateManager = new StateManager();
            
            try {
              // Verify scores are preserved
              const allScores = newStateManager.getAllHighScores();
              
              // Check that at least some scores were preserved (up to the limit per game)
              const snakeEntries = entries.filter(e => e.gameType === 'snake');
              const tetrisEntries = entries.filter(e => e.gameType === 'tetris');
              const minesweeperEntries = entries.filter(e => e.gameType === 'minesweeper');
              
              expect(allScores.snake.length).toBe(Math.min(snakeEntries.length, 10));
              expect(allScores.tetris.length).toBe(Math.min(tetrisEntries.length, 10));
              expect(allScores.minesweeper.length).toBe(Math.min(minesweeperEntries.length, 10));
              
              // Verify that all returned scores match the game type
              expect(allScores.snake.every(s => s.gameType === 'snake')).toBe(true);
              expect(allScores.tetris.every(s => s.gameType === 'tetris')).toBe(true);
              expect(allScores.minesweeper.every(s => s.gameType === 'minesweeper')).toBe(true);
            } finally {
              firstStateManager.dispose();
              newStateManager.dispose();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});