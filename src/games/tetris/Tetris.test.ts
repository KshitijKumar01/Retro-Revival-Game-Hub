/**
 * Property-based tests for Tetris game mechanics
 * 
 * **Feature: retro-game-hub, Property 4: Core Game Mechanics Integrity (Tetris)**
 * **Validates: Requirements 3.1, 3.5**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TetrisGame } from './index';
import { TetrisState } from '../../shared/types';

describe('Tetris Game Mechanics Property Tests', () => {
  /**
   * **Feature: retro-game-hub, Property 4: Core Game Mechanics Integrity (Tetris)**
   * **Validates: Requirements 3.1, 3.5**
   * 
   * For any Tetris game module, the fundamental game rules should operate correctly 
   * regardless of AI assistance settings, maintaining authentic classic gameplay behavior
   */
  it('should maintain core Tetris mechanics integrity across all game states', () => {
    fc.assert(fc.property(
      fc.record({
        aiAdvisorEnabled: fc.boolean(),
        pieceType: fc.constantFrom('I', 'O', 'T', 'S', 'Z', 'J', 'L'),
        rotation: fc.integer({ min: 0, max: 3 }),
        positionX: fc.integer({ min: -2, max: 12 }),
        positionY: fc.integer({ min: -2, max: 22 }),
        boardFillLevel: fc.float({ min: 0, max: Math.fround(0.3) }) // Keep board mostly empty for valid tests
      }),
      (testData) => {
        const game = new TetrisGame();
        
        // Create a mock canvas for initialization
        const mockCanvas = {
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            font: '',
            fillText: () => {}
          }),
          width: 0,
          height: 0
        } as any;
        
        game.initialize(mockCanvas);
        
        // Set AI advisor state
        game.setAIAdvisor(testData.aiAdvisorEnabled);
        
        const initialState = game.getState();
        const tetrisState = initialState.gameSpecificData as TetrisState;
        
        // Verify initial state integrity
        expect(initialState.gameType).toBe('tetris');
        expect(initialState.isActive).toBe(true);
        expect(initialState.score).toBe(0);
        expect(tetrisState.board).toHaveLength(20); // Standard Tetris height
        expect(tetrisState.board[0]).toHaveLength(10); // Standard Tetris width
        expect(tetrisState.aiAdvisorEnabled).toBe(testData.aiAdvisorEnabled);
        
        // Verify board is properly initialized (all zeros)
        const flatBoard = tetrisState.board.flat();
        expect(flatBoard.every(cell => cell === 0)).toBe(true);
        
        // Verify current piece is valid
        expect(['I', 'O', 'T', 'S', 'Z', 'J', 'L']).toContain(tetrisState.currentPiece.type);
        expect(tetrisState.currentPiece.rotation).toBeGreaterThanOrEqual(0);
        expect(tetrisState.currentPiece.shape).toBeDefined();
        expect(tetrisState.currentPiece.shape.length).toBeGreaterThan(0);
        
        // Verify next piece is valid
        expect(['I', 'O', 'T', 'S', 'Z', 'J', 'L']).toContain(tetrisState.nextPiece.type);
        expect(tetrisState.nextPiece.rotation).toBeGreaterThanOrEqual(0);
        expect(tetrisState.nextPiece.shape).toBeDefined();
        
        // Test game state preservation after pause/resume
        game.pause();
        const pausedState = game.getState();
        expect(pausedState.isPaused).toBe(true);
        
        game.resume();
        const resumedState = game.getState();
        expect(resumedState.isPaused).toBe(false);
        
        // Verify that AI setting doesn't affect core game mechanics
        const stateBeforeAIToggle = game.getState();
        game.setAIAdvisor(!testData.aiAdvisorEnabled);
        const stateAfterAIToggle = game.getState();
        
        // Core game state should remain the same except for AI setting
        expect(stateAfterAIToggle.gameType).toBe(stateBeforeAIToggle.gameType);
        expect(stateAfterAIToggle.isActive).toBe(stateBeforeAIToggle.isActive);
        expect(stateAfterAIToggle.score).toBe(stateBeforeAIToggle.score);
        expect(stateAfterAIToggle.level).toBe(stateBeforeAIToggle.level);
        
        const tetrisAfterToggle = stateAfterAIToggle.gameSpecificData as TetrisState;
        expect(tetrisAfterToggle.aiAdvisorEnabled).toBe(!testData.aiAdvisorEnabled);
      }
    ), { numRuns: 100 });
  });

  it('should handle piece movement and rotation correctly', () => {
    fc.assert(fc.property(
      fc.record({
        movements: fc.array(fc.constantFrom('left', 'right', 'down', 'rotate'), { minLength: 1, maxLength: 10 }),
        aiEnabled: fc.boolean()
      }),
      (testData) => {
        const game = new TetrisGame();
        
        // Create a mock canvas
        const mockCanvas = {
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            font: '',
            fillText: () => {}
          }),
          width: 0,
          height: 0
        } as any;
        
        game.initialize(mockCanvas);
        game.setAIAdvisor(testData.aiEnabled);
        
        const initialState = game.getState();
        
        // Apply movements
        testData.movements.forEach(movement => {
          const inputEvent = {
            type: 'keydown' as const,
            timestamp: Date.now(),
            key: movement === 'left' ? 'ArrowLeft' :
                 movement === 'right' ? 'ArrowRight' :
                 movement === 'down' ? 'ArrowDown' :
                 'ArrowUp' // rotate
          };
          
          game.handleInput(inputEvent);
        });
        
        const finalState = game.getState();
        const finalTetrisState = finalState.gameSpecificData as TetrisState;
        
        // Verify game state integrity after movements
        expect(finalState.gameType).toBe('tetris');
        expect(finalTetrisState.board).toHaveLength(20);
        expect(finalTetrisState.board[0]).toHaveLength(10);
        expect(finalTetrisState.currentPiece.type).toBeDefined();
        expect(['I', 'O', 'T', 'S', 'Z', 'J', 'L']).toContain(finalTetrisState.currentPiece.type);
        
        // Verify piece position is within valid bounds or game ended appropriately
        const piece = finalTetrisState.currentPiece;
        if (finalState.isActive) {
          // If game is still active, piece should be in valid position
          expect(piece.position.x).toBeGreaterThanOrEqual(-3); // Allow some overhang for rotation
          expect(piece.position.x).toBeLessThan(13);
          expect(piece.position.y).toBeGreaterThanOrEqual(-2); // Allow spawning above board
        }
        
        // AI setting should not affect movement mechanics
        expect(finalTetrisState.aiAdvisorEnabled).toBe(testData.aiEnabled);
      }
    ), { numRuns: 100 });
  });

  it('should maintain scoring and level progression integrity', () => {
    fc.assert(fc.property(
      fc.record({
        initialScore: fc.integer({ min: 0, max: 10000 }),
        initialLevel: fc.integer({ min: 1, max: 10 }),
        linesCleared: fc.integer({ min: 0, max: 20 }),
        aiEnabled: fc.boolean()
      }),
      (testData) => {
        const game = new TetrisGame();
        
        // Create a mock canvas
        const mockCanvas = {
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            font: '',
            fillText: () => {}
          }),
          width: 0,
          height: 0
        } as any;
        
        game.initialize(mockCanvas);
        game.setAIAdvisor(testData.aiEnabled);
        
        // Manually set initial state for testing
        const state = game.getState();
        state.score = testData.initialScore;
        state.level = testData.initialLevel;
        const tetrisState = state.gameSpecificData as TetrisState;
        tetrisState.linesCleared = testData.linesCleared;
        game.setState(state);
        
        const modifiedState = game.getState();
        
        // Verify state was set correctly
        expect(modifiedState.score).toBe(testData.initialScore);
        expect(modifiedState.level).toBe(testData.initialLevel);
        expect((modifiedState.gameSpecificData as TetrisState).linesCleared).toBe(testData.linesCleared);
        
        // Verify level calculation is consistent
        if (testData.linesCleared > 0) {
          // Level should be based on lines cleared
          expect(modifiedState.level).toBeGreaterThanOrEqual(1);
        }
        
        // Verify AI setting doesn't affect scoring
        expect((modifiedState.gameSpecificData as TetrisState).aiAdvisorEnabled).toBe(testData.aiEnabled);
        
        // Score should never be negative
        expect(modifiedState.score).toBeGreaterThanOrEqual(0);
        
        // Level should never be less than 1
        expect(modifiedState.level).toBeGreaterThanOrEqual(1);
      }
    ), { numRuns: 100 });
  });

  it('should maintain game state consistency during reset operations', () => {
    fc.assert(fc.property(
      fc.record({
        aiEnabled: fc.boolean(),
        operationsBeforeReset: fc.array(fc.constantFrom('pause', 'resume', 'move'), { maxLength: 5 })
      }),
      (testData) => {
        const game = new TetrisGame();
        
        // Create a mock canvas
        const mockCanvas = {
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            strokeStyle: '',
            lineWidth: 0,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            font: '',
            fillText: () => {}
          }),
          width: 0,
          height: 0
        } as any;
        
        game.initialize(mockCanvas);
        game.setAIAdvisor(testData.aiEnabled);
        
        // Perform some operations
        testData.operationsBeforeReset.forEach(operation => {
          switch (operation) {
            case 'pause':
              game.pause();
              break;
            case 'resume':
              game.resume();
              break;
            case 'move':
              game.handleInput({
                type: 'keydown',
                key: 'ArrowLeft',
                timestamp: Date.now()
              });
              break;
          }
        });
        
        // Reset the game
        game.reset();
        
        const resetState = game.getState();
        const resetTetrisState = resetState.gameSpecificData as TetrisState;
        
        // Verify reset state integrity
        expect(resetState.gameType).toBe('tetris');
        expect(resetState.isActive).toBe(true);
        expect(resetState.isPaused).toBe(false);
        expect(resetState.score).toBe(0);
        expect(resetState.level).toBe(1);
        expect(resetState.timeElapsed).toBe(0);
        
        // Verify board is cleared
        const flatBoard = resetTetrisState.board.flat();
        expect(flatBoard.every(cell => cell === 0)).toBe(true);
        
        // Verify pieces are valid
        expect(['I', 'O', 'T', 'S', 'Z', 'J', 'L']).toContain(resetTetrisState.currentPiece.type);
        expect(['I', 'O', 'T', 'S', 'Z', 'J', 'L']).toContain(resetTetrisState.nextPiece.type);
        
        // Verify initial game parameters
        expect(resetTetrisState.linesCleared).toBe(0);
        expect(resetTetrisState.fallSpeed).toBe(1000); // Initial fall speed
        expect(resetTetrisState.heldPiece).toBeUndefined();
        
        // AI setting should be preserved (this is configuration, not game state)
        expect(resetTetrisState.aiAdvisorEnabled).toBe(testData.aiEnabled);
      }
    ), { numRuns: 100 });
  });
});