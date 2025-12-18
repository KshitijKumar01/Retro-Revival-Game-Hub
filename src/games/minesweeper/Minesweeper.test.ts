/**
 * Property-based tests for Minesweeper game mechanics
 * 
 * **Feature: retro-game-hub, Property 4: Core Game Mechanics Integrity (Minesweeper)**
 * **Validates: Requirements 4.1, 4.5**
 */

/// <reference types="vitest" />

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { MinesweeperGame } from './index';
import { MinesweeperState, GameState, Position } from '../../shared/types';

describe('Minesweeper Game - Core Mechanics Integrity', () => {
  let game: MinesweeperGame;
  let canvas: HTMLCanvasElement;

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
        arc: () => {},
        fill: () => {},
        closePath: () => {},
        strokeRect: () => {},
        font: '',
        textAlign: '',
        textBaseline: '',
        fillText: () => {}
      }),
      width: 480,
      height: 540
    } as any;
    
    game = new MinesweeperGame();
    game.initialize(canvas);
  });

  /**
   * Property 4: Core Game Mechanics Integrity (Minesweeper)
   * For any valid game state, the fundamental Minesweeper game rules should operate correctly
   * regardless of AI assistance settings, maintaining authentic classic gameplay behavior
   */
  it('should maintain core game mechanics integrity across all valid states', () => {
    fc.assert(
      fc.property(
        // Generate AI settings
        fc.boolean(),
        fc.boolean(),
        
        (aiHints: boolean, explainMode: boolean) => {
          // Set up game with generated parameters
          game.setAIHints(aiHints);
          game.setExplainMode(explainMode);
          
          const initialState = game.getState();
          const minesweeperState = initialState.gameSpecificData as MinesweeperState;
          
          // Verify initial state integrity
          expect(minesweeperState.aiHintsEnabled).toBe(aiHints);
          expect(minesweeperState.explainModeEnabled).toBe(explainMode);
          expect(minesweeperState.gameStatus).toBe('playing');
          
          // Verify board dimensions are valid
          expect(minesweeperState.board.length).toBeGreaterThan(0);
          expect(minesweeperState.board[0].length).toBeGreaterThan(0);
          
          const height = minesweeperState.board.length;
          const width = minesweeperState.board[0].length;
          
          // Verify all mine positions are within bounds
          minesweeperState.minePositions.forEach(mine => {
            expect(mine.x).toBeGreaterThanOrEqual(0);
            expect(mine.x).toBeLessThan(width);
            expect(mine.y).toBeGreaterThanOrEqual(0);
            expect(mine.y).toBeLessThan(height);
          });
          
          // Verify no duplicate mine positions
          const uniqueMines = new Set(
            minesweeperState.minePositions.map(pos => `${pos.x},${pos.y}`)
          );
          expect(uniqueMines.size).toBe(minesweeperState.minePositions.length);
          
          // Verify revealed and flagged cells arrays match board dimensions
          expect(minesweeperState.revealedCells.length).toBe(height);
          expect(minesweeperState.flaggedCells.length).toBe(height);
          
          minesweeperState.revealedCells.forEach(row => {
            expect(row.length).toBe(width);
          });
          
          minesweeperState.flaggedCells.forEach(row => {
            expect(row.length).toBe(width);
          });
          
          // Verify all cells start as not revealed
          const allUnrevealed = minesweeperState.revealedCells.every(row => 
            row.every(cell => cell === false)
          );
          expect(allUnrevealed).toBe(true);
          
          // Verify all cells start as not flagged
          const allUnflagged = minesweeperState.flaggedCells.every(row => 
            row.every(cell => cell === false)
          );
          expect(allUnflagged).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate adjacent mine counts correctly', () => {
    fc.assert(
      fc.property(
        // Generate a small grid for testing
        fc.record({
          width: fc.integer({ min: 3, max: 8 }),
          height: fc.integer({ min: 3, max: 8 })
        }),
        // Generate mine count
        fc.integer({ min: 1, max: 10 }),
        
        (gridSize: { width: number; height: number }, mineCount: number) => {
          // Create a test state with known mine positions
          const actualMineCount = Math.min(mineCount, gridSize.width * gridSize.height - 1);
          
          // Generate random mine positions
          const minePositions: Position[] = [];
          while (minePositions.length < actualMineCount) {
            const x = Math.floor(Math.random() * gridSize.width);
            const y = Math.floor(Math.random() * gridSize.height);
            
            if (!minePositions.some(pos => pos.x === x && pos.y === y)) {
              minePositions.push({ x, y });
            }
          }
          
          // Create test state
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions,
              revealedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              flaggedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          // Verify adjacent mine counts for all cells
          for (let y = 0; y < gridSize.height; y++) {
            for (let x = 0; x < gridSize.width; x++) {
              const count = game.countAdjacentMines(x, y);
              
              // Manually calculate expected count
              let expectedCount = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  
                  const nx = x + dx;
                  const ny = y + dy;
                  
                  if (nx >= 0 && nx < gridSize.width && ny >= 0 && ny < gridSize.height) {
                    if (minePositions.some(pos => pos.x === nx && pos.y === ny)) {
                      expectedCount++;
                    }
                  }
                }
              }
              
              expect(count).toBe(expectedCount);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle cell revealing correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 5, max: 10 }),
          height: fc.integer({ min: 5, max: 10 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          // Create a state with no mines for safe revealing
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions: [], // No mines
              revealedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              flaggedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          // Click on a cell
          const clickX = Math.floor(gridSize.width / 2);
          const clickY = Math.floor(gridSize.height / 2);
          
          game.handleInput({
            type: 'click',
            position: { x: clickX * 30 + 15, y: clickY * 30 + 15 }, // Center of cell
            timestamp: Date.now()
          });
          
          const finalState = game.getState();
          const finalMinesweeperState = finalState.gameSpecificData as MinesweeperState;
          
          // Since there are no mines, clicking should reveal cells
          // At minimum, the clicked cell should be revealed
          const clickedCellRevealed = finalMinesweeperState.revealedCells[clickY][clickX];
          expect(clickedCellRevealed).toBe(true);
          
          // Score should increase
          expect(finalState.score).toBeGreaterThan(0);
          
          // Game should still be active (no mines hit)
          expect(finalState.isActive).toBe(true);
          expect(finalMinesweeperState.gameStatus).toBe('playing');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect game over when mine is revealed', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 3, max: 8 }),
          height: fc.integer({ min: 3, max: 8 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          // Place a mine at a specific location
          const mineX = Math.floor(gridSize.width / 2);
          const mineY = Math.floor(gridSize.height / 2);
          
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions: [{ x: mineX, y: mineY }],
              revealedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              flaggedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          // Click on the mine
          game.handleInput({
            type: 'click',
            position: { x: mineX * 30 + 15, y: mineY * 30 + 15 },
            timestamp: Date.now()
          });
          
          const finalState = game.getState();
          const finalMinesweeperState = finalState.gameSpecificData as MinesweeperState;
          
          // Game should be over
          expect(finalState.isActive).toBe(false);
          expect(finalMinesweeperState.gameStatus).toBe('lost');
          
          // Mine cell should be revealed
          expect(finalMinesweeperState.revealedCells[mineY][mineX]).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect win condition when all non-mine cells are revealed', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 3, max: 6 }),
          height: fc.integer({ min: 3, max: 6 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          // Place a single mine in corner
          const mineX = 0;
          const mineY = 0;
          
          const revealedCells = Array(gridSize.height).fill(null).map(() => 
            Array(gridSize.width).fill(true)
          );
          
          // Don't reveal the mine cell
          revealedCells[mineY][mineX] = false;
          
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions: [{ x: mineX, y: mineY }],
              revealedCells,
              flaggedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          // Trigger update to check win condition
          game.update(16);
          
          const finalState = game.getState();
          const finalMinesweeperState = finalState.gameSpecificData as MinesweeperState;
          
          // Game should be won
          expect(finalState.isActive).toBe(false);
          expect(finalMinesweeperState.gameStatus).toBe('won');
          
          // Score should include win bonus
          expect(finalState.score).toBeGreaterThanOrEqual(1000);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent revealing flagged cells', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 3, max: 8 }),
          height: fc.integer({ min: 3, max: 8 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          const testX = Math.floor(gridSize.width / 2);
          const testY = Math.floor(gridSize.height / 2);
          
          const flaggedCells = Array(gridSize.height).fill(null).map(() => 
            Array(gridSize.width).fill(false)
          );
          
          // Flag the test cell
          flaggedCells[testY][testX] = true;
          
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions: [],
              revealedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              flaggedCells,
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          // Try to click on flagged cell
          game.handleInput({
            type: 'click',
            position: { x: testX * 30 + 15, y: testY * 30 + 15 },
            timestamp: Date.now()
          });
          
          const finalState = game.getState();
          const finalMinesweeperState = finalState.gameSpecificData as MinesweeperState;
          
          // Flagged cell should not be revealed
          expect(finalMinesweeperState.revealedCells[testY][testX]).toBe(false);
          
          // Cell should still be flagged
          expect(finalMinesweeperState.flaggedCells[testY][testX]).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle flag toggling correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 3, max: 8 }),
          height: fc.integer({ min: 3, max: 8 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          const testX = Math.floor(gridSize.width / 2);
          const testY = Math.floor(gridSize.height / 2);
          
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions: [],
              revealedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              flaggedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          const initialState = game.getState();
          const initialMinesweeperState = initialState.gameSpecificData as MinesweeperState;
          
          // Initially not flagged
          expect(initialMinesweeperState.flaggedCells[testY][testX]).toBe(false);
          
          // Toggle flag on
          game.toggleFlag(testX, testY);
          
          const afterToggleOn = game.getState();
          const afterToggleOnState = afterToggleOn.gameSpecificData as MinesweeperState;
          
          // Should be flagged
          expect(afterToggleOnState.flaggedCells[testY][testX]).toBe(true);
          
          // Toggle flag off
          game.toggleFlag(testX, testY);
          
          const afterToggleOff = game.getState();
          const afterToggleOffState = afterToggleOff.gameSpecificData as MinesweeperState;
          
          // Should not be flagged
          expect(afterToggleOffState.flaggedCells[testY][testX]).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not allow flagging revealed cells', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 3, max: 8 }),
          height: fc.integer({ min: 3, max: 8 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          const testX = Math.floor(gridSize.width / 2);
          const testY = Math.floor(gridSize.height / 2);
          
          const revealedCells = Array(gridSize.height).fill(null).map(() => 
            Array(gridSize.width).fill(false)
          );
          
          // Reveal the test cell
          revealedCells[testY][testX] = true;
          
          const testState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              board: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill('hidden')
              ),
              minePositions: [],
              revealedCells,
              flaggedCells: Array(gridSize.height).fill(null).map(() => 
                Array(gridSize.width).fill(false)
              ),
              gameStatus: 'playing',
              aiHintsEnabled: false,
              explainModeEnabled: false
            } as MinesweeperState
          };
          
          game.setState(testState);
          
          // Try to flag revealed cell
          game.toggleFlag(testX, testY);
          
          const finalState = game.getState();
          const finalMinesweeperState = finalState.gameSpecificData as MinesweeperState;
          
          // Cell should not be flagged
          expect(finalMinesweeperState.flaggedCells[testY][testX]).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
