/**
 * Property-based tests for Minesweeper AI decision determinism
 * 
 * **Feature: retro-game-hub, Property 2: AI Decision Determinism (Minesweeper)**
 * **Validates: Requirements 4.2, 4.3, 6.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MinesweeperAIAssistant } from './index';
import { GameState, MinesweeperState, Position } from '../../shared/types';

describe('Minesweeper AI Decision Determinism Property Tests', () => {
  /**
   * **Feature: retro-game-hub, Property 2: AI Decision Determinism (Minesweeper)**
   * **Validates: Requirements 4.2, 4.3, 6.1**
   * 
   * For any identical game state presented to an AI assistant multiple times, 
   * the AI should provide the same analysis, suggestions, and explanations, 
   * ensuring consistent algorithmic behavior across all games
   */
  it('should provide identical analysis for identical game states', () => {
    fc.assert(fc.property(
      fc.record({
        gridWidth: fc.integer({ min: 5, max: 12 }),
        gridHeight: fc.integer({ min: 5, max: 12 }),
        mineCount: fc.integer({ min: 3, max: 15 }),
        revealedCellCount: fc.integer({ min: 1, max: 10 }),
        flaggedCellCount: fc.integer({ min: 0, max: 5 }),
        aiDifficulty: fc.float({ min: 0, max: Math.fround(1) }),
        debugMode: fc.boolean(),
        seed: fc.integer({ min: 0, max: 10000 })
      }),
      (testData) => {
        // Create two identical AI assistants
        const ai1 = new MinesweeperAIAssistant();
        const ai2 = new MinesweeperAIAssistant();
        
        // Set identical configurations
        ai1.setDifficultyLevel(testData.aiDifficulty);
        ai2.setDifficultyLevel(testData.aiDifficulty);
        ai1.setDebugMode(testData.debugMode);
        ai2.setDebugMode(testData.debugMode);
        
        // Create identical game states
        const gameState1 = createTestGameState(testData);
        const gameState2 = createTestGameState(testData);
        
        // Verify states are identical
        expect(JSON.stringify(gameState1)).toBe(JSON.stringify(gameState2));
        
        // Analyze the same state multiple times
        const analysis1_run1 = ai1.analyzeGameState(gameState1);
        const analysis1_run2 = ai1.analyzeGameState(gameState1);
        const analysis2_run1 = ai2.analyzeGameState(gameState2);
        
        // Verify deterministic behavior - same AI, same state, same results
        expect(analysis1_run1.confidence).toBe(analysis1_run2.confidence);
        expect(analysis1_run1.reasoning).toBe(analysis1_run2.reasoning);
        expect(analysis1_run1.riskAssessment).toBe(analysis1_run2.riskAssessment);
        expect(analysis1_run1.suggestedActions.length).toBe(analysis1_run2.suggestedActions.length);
        
        // Verify identical AIs produce identical results
        expect(analysis1_run1.confidence).toBe(analysis2_run1.confidence);
        expect(analysis1_run1.reasoning).toBe(analysis2_run1.reasoning);
        expect(analysis1_run1.riskAssessment).toBe(analysis2_run1.riskAssessment);
        expect(analysis1_run1.suggestedActions.length).toBe(analysis2_run1.suggestedActions.length);
        
        // Verify suggested actions are identical
        for (let i = 0; i < analysis1_run1.suggestedActions.length; i++) {
          const action1 = analysis1_run1.suggestedActions[i];
          const action2 = analysis2_run1.suggestedActions[i];
          
          expect(action1.type).toBe(action2.type);
          expect(action1.priority).toBe(action2.priority);
          expect(action1.description).toBe(action2.description);
          if (action1.target && action2.target) {
            expect(action1.target.x).toBe(action2.target.x);
            expect(action1.target.y).toBe(action2.target.y);
          }
        }
        
        // Test suggestion consistency
        const suggestion1 = ai1.getSuggestion();
        const suggestion2 = ai2.getSuggestion();
        
        expect(suggestion1.confidence).toBe(suggestion2.confidence);
        expect(suggestion1.action.type).toBe(suggestion2.action.type);
        expect(suggestion1.action.priority).toBe(suggestion2.action.priority);
        
        // Test hint consistency
        const hint1 = ai1.getHint(testData.aiDifficulty);
        const hint2 = ai2.getHint(testData.aiDifficulty);
        
        expect(hint1.confidence).toBe(hint2.confidence);
        expect(hint1.message).toBe(hint2.message);
        
        // Test explanation consistency
        const explanation1 = ai1.explainDecision(suggestion1);
        const explanation2 = ai2.explainDecision(suggestion2);
        
        expect(explanation1).toBe(explanation2);
        
        // Verify configuration consistency
        expect(ai1.getDifficultyLevel()).toBe(ai2.getDifficultyLevel());
        expect(ai1.isDebugModeEnabled()).toBe(ai2.isDebugModeEnabled());
      }
    ), { numRuns: 100 });
  });

  it('should provide consistent probability calculations for constraint satisfaction', () => {
    fc.assert(fc.property(
      fc.record({
        gridSize: fc.integer({ min: 6, max: 10 }),
        mineCount: fc.integer({ min: 5, max: 15 }),
        revealPattern: fc.integer({ min: 0, max: 7 }),
        seed: fc.integer({ min: 0, max: 10000 })
      }),
      (testData) => {
        const ai1 = new MinesweeperAIAssistant();
        const ai2 = new MinesweeperAIAssistant();
        
        // Create identical game states with specific reveal patterns
        const gameState1 = createConstraintTestState(testData);
        const gameState2 = createConstraintTestState(testData);
        
        // Analyze multiple times
        const analysis1_run1 = ai1.analyzeGameState(gameState1);
        const analysis1_run2 = ai1.analyzeGameState(gameState1);
        const analysis2_run1 = ai2.analyzeGameState(gameState2);
        
        // Verify deterministic constraint satisfaction
        expect(analysis1_run1.confidence).toBe(analysis1_run2.confidence);
        expect(analysis1_run1.confidence).toBe(analysis2_run1.confidence);
        
        expect(analysis1_run1.reasoning).toBe(analysis1_run2.reasoning);
        expect(analysis1_run1.reasoning).toBe(analysis2_run1.reasoning);
        
        // Verify suggested actions are identical
        expect(analysis1_run1.suggestedActions.length).toBe(analysis1_run2.suggestedActions.length);
        expect(analysis1_run1.suggestedActions.length).toBe(analysis2_run1.suggestedActions.length);
        
        // Verify action details match
        for (let i = 0; i < analysis1_run1.suggestedActions.length; i++) {
          const action1 = analysis1_run1.suggestedActions[i];
          const action2 = analysis2_run1.suggestedActions[i];
          
          expect(action1.type).toBe(action2.type);
          expect(action1.priority).toBe(action2.priority);
          
          if (action1.target && action2.target) {
            expect(action1.target.x).toBe(action2.target.x);
            expect(action1.target.y).toBe(action2.target.y);
          }
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide consistent hints at different difficulty levels', () => {
    fc.assert(fc.property(
      fc.record({
        gridSize: fc.integer({ min: 6, max: 10 }),
        mineCount: fc.integer({ min: 5, max: 12 }),
        difficulty: fc.float({ min: 0, max: Math.fround(1) }),
        seed: fc.integer({ min: 0, max: 10000 })
      }),
      (testData) => {
        const ai1 = new MinesweeperAIAssistant();
        const ai2 = new MinesweeperAIAssistant();
        
        ai1.setDifficultyLevel(testData.difficulty);
        ai2.setDifficultyLevel(testData.difficulty);
        
        // Create identical game states
        const gameState1 = createSimpleTestState(testData);
        const gameState2 = createSimpleTestState(testData);
        
        // Analyze states
        ai1.analyzeGameState(gameState1);
        ai2.analyzeGameState(gameState2);
        
        // Get hints multiple times
        const hint1_run1 = ai1.getHint(testData.difficulty);
        const hint1_run2 = ai1.getHint(testData.difficulty);
        const hint2_run1 = ai2.getHint(testData.difficulty);
        
        // Verify hint consistency
        expect(hint1_run1.message).toBe(hint1_run2.message);
        expect(hint1_run1.message).toBe(hint2_run1.message);
        expect(hint1_run1.confidence).toBe(hint1_run2.confidence);
        expect(hint1_run1.confidence).toBe(hint2_run1.confidence);
        
        // Verify visual indicators are consistent
        if (hint1_run1.visualIndicator && hint2_run1.visualIndicator) {
          const indicators1 = Array.isArray(hint1_run1.visualIndicator) 
            ? hint1_run1.visualIndicator 
            : [hint1_run1.visualIndicator];
          const indicators2 = Array.isArray(hint2_run1.visualIndicator) 
            ? hint2_run1.visualIndicator 
            : [hint2_run1.visualIndicator];
          
          expect(indicators1.length).toBe(indicators2.length);
          
          for (let i = 0; i < indicators1.length; i++) {
            expect(indicators1[i].x).toBe(indicators2[i].x);
            expect(indicators1[i].y).toBe(indicators2[i].y);
          }
        }
        
        // Verify detailed explanations are consistent when present
        if (hint1_run1.detailedExplanation && hint2_run1.detailedExplanation) {
          expect(hint1_run1.detailedExplanation).toBe(hint2_run1.detailedExplanation);
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide consistent risk assessments', () => {
    fc.assert(fc.property(
      fc.record({
        gridSize: fc.integer({ min: 6, max: 10 }),
        mineCount: fc.integer({ min: 5, max: 15 }),
        revealedPercentage: fc.float({ min: Math.fround(0.1), max: Math.fround(0.7) }),
        seed: fc.integer({ min: 0, max: 10000 })
      }),
      (testData) => {
        const ai1 = new MinesweeperAIAssistant();
        const ai2 = new MinesweeperAIAssistant();
        
        // Create identical game states
        const gameState1 = createProgressTestState(testData);
        const gameState2 = createProgressTestState(testData);
        
        // Analyze multiple times
        const analysis1_run1 = ai1.analyzeGameState(gameState1);
        const analysis1_run2 = ai1.analyzeGameState(gameState1);
        const analysis2_run1 = ai2.analyzeGameState(gameState2);
        
        // Verify risk assessment consistency
        expect(analysis1_run1.riskAssessment).toBe(analysis1_run2.riskAssessment);
        expect(analysis1_run1.riskAssessment).toBe(analysis2_run1.riskAssessment);
        
        // Verify risk assessment is valid
        const validRiskLevels = ['low', 'medium', 'high', 'critical'];
        expect(validRiskLevels).toContain(analysis1_run1.riskAssessment);
      }
    ), { numRuns: 100 });
  });
});

// Helper functions
function createTestGameState(testData: any): GameState {
  const { gridWidth, gridHeight, mineCount, revealedCellCount, flaggedCellCount, seed } = testData;
  
  // Use seed for deterministic random generation
  const rng = createSeededRNG(seed);
  
  // Create board
  const board = Array(gridHeight).fill(null).map(() => 
    Array(gridWidth).fill('hidden' as const)
  );
  
  // Generate deterministic mine positions
  const minePositions = generateDeterministicMines(gridWidth, gridHeight, mineCount, rng);
  
  // Create revealed and flagged cells arrays
  const revealedCells = Array(gridHeight).fill(null).map(() => 
    Array(gridWidth).fill(false)
  );
  
  const flaggedCells = Array(gridHeight).fill(null).map(() => 
    Array(gridWidth).fill(false)
  );
  
  // Reveal some cells deterministically (avoiding mines)
  const nonMineCells = getAllNonMineCells(gridWidth, gridHeight, minePositions);
  const cellsToReveal = Math.min(revealedCellCount, nonMineCells.length);
  
  for (let i = 0; i < cellsToReveal; i++) {
    const cell = nonMineCells[i];
    revealedCells[cell.y][cell.x] = true;
  }
  
  // Flag some cells deterministically
  const cellsToFlag = Math.min(flaggedCellCount, minePositions.length);
  for (let i = 0; i < cellsToFlag; i++) {
    const mine = minePositions[i];
    if (!revealedCells[mine.y][mine.x]) {
      flaggedCells[mine.y][mine.x] = true;
    }
  }
  
  const minesweeperState: MinesweeperState = {
    board,
    minePositions,
    revealedCells,
    flaggedCells,
    gameStatus: 'playing',
    aiHintsEnabled: true,
    explainModeEnabled: true
  };

  return {
    gameType: 'minesweeper',
    isActive: true,
    isPaused: false,
    score: 0,
    level: 1,
    timeElapsed: 0,
    gameSpecificData: minesweeperState
  };
}

function createConstraintTestState(testData: any): GameState {
  const { gridSize, mineCount, revealPattern, seed } = testData;
  const rng = createSeededRNG(seed);
  
  const board = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill('hidden' as const)
  );
  
  const minePositions = generateDeterministicMines(gridSize, gridSize, mineCount, rng);
  
  const revealedCells = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(false)
  );
  
  const flaggedCells = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(false)
  );
  
  // Create specific reveal patterns for constraint testing
  switch (revealPattern % 8) {
    case 0: // Reveal center cell
      if (gridSize > 2) {
        const center = Math.floor(gridSize / 2);
        if (!isMineAt(center, center, minePositions)) {
          revealedCells[center][center] = true;
        }
      }
      break;
    case 1: // Reveal corner
      if (!isMineAt(0, 0, minePositions)) {
        revealedCells[0][0] = true;
      }
      break;
    case 2: // Reveal top row
      for (let x = 0; x < gridSize; x++) {
        if (!isMineAt(x, 0, minePositions)) {
          revealedCells[0][x] = true;
        }
      }
      break;
    case 3: // Reveal diagonal
      for (let i = 0; i < gridSize; i++) {
        if (!isMineAt(i, i, minePositions)) {
          revealedCells[i][i] = true;
        }
      }
      break;
    case 4: // Reveal checkerboard pattern
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if ((x + y) % 2 === 0 && !isMineAt(x, y, minePositions)) {
            revealedCells[y][x] = true;
          }
        }
      }
      break;
    case 5: // Reveal left column
      for (let y = 0; y < gridSize; y++) {
        if (!isMineAt(0, y, minePositions)) {
          revealedCells[y][0] = true;
        }
      }
      break;
    case 6: // Reveal cross pattern
      const mid = Math.floor(gridSize / 2);
      for (let i = 0; i < gridSize; i++) {
        if (!isMineAt(mid, i, minePositions)) {
          revealedCells[i][mid] = true;
        }
        if (!isMineAt(i, mid, minePositions)) {
          revealedCells[mid][i] = true;
        }
      }
      break;
    case 7: // Reveal border
      for (let x = 0; x < gridSize; x++) {
        if (!isMineAt(x, 0, minePositions)) revealedCells[0][x] = true;
        if (!isMineAt(x, gridSize - 1, minePositions)) revealedCells[gridSize - 1][x] = true;
      }
      for (let y = 1; y < gridSize - 1; y++) {
        if (!isMineAt(0, y, minePositions)) revealedCells[y][0] = true;
        if (!isMineAt(gridSize - 1, y, minePositions)) revealedCells[y][gridSize - 1] = true;
      }
      break;
  }
  
  const minesweeperState: MinesweeperState = {
    board,
    minePositions,
    revealedCells,
    flaggedCells,
    gameStatus: 'playing',
    aiHintsEnabled: true,
    explainModeEnabled: true
  };

  return {
    gameType: 'minesweeper',
    isActive: true,
    isPaused: false,
    score: 0,
    level: 1,
    timeElapsed: 0,
    gameSpecificData: minesweeperState
  };
}

function createSimpleTestState(testData: any): GameState {
  const { gridSize, mineCount, seed } = testData;
  const rng = createSeededRNG(seed);
  
  const board = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill('hidden' as const)
  );
  
  const minePositions = generateDeterministicMines(gridSize, gridSize, mineCount, rng);
  
  const revealedCells = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(false)
  );
  
  const flaggedCells = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(false)
  );
  
  // Reveal a few safe cells
  const nonMineCells = getAllNonMineCells(gridSize, gridSize, minePositions);
  const cellsToReveal = Math.min(3, nonMineCells.length);
  
  for (let i = 0; i < cellsToReveal; i++) {
    const cell = nonMineCells[i];
    revealedCells[cell.y][cell.x] = true;
  }
  
  const minesweeperState: MinesweeperState = {
    board,
    minePositions,
    revealedCells,
    flaggedCells,
    gameStatus: 'playing',
    aiHintsEnabled: true,
    explainModeEnabled: true
  };

  return {
    gameType: 'minesweeper',
    isActive: true,
    isPaused: false,
    score: 0,
    level: 1,
    timeElapsed: 0,
    gameSpecificData: minesweeperState
  };
}

function createProgressTestState(testData: any): GameState {
  const { gridSize, mineCount, revealedPercentage, seed } = testData;
  const rng = createSeededRNG(seed);
  
  const board = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill('hidden' as const)
  );
  
  const minePositions = generateDeterministicMines(gridSize, gridSize, mineCount, rng);
  
  const revealedCells = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(false)
  );
  
  const flaggedCells = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(false)
  );
  
  // Reveal cells based on percentage
  const nonMineCells = getAllNonMineCells(gridSize, gridSize, minePositions);
  const cellsToReveal = Math.floor(nonMineCells.length * revealedPercentage);
  
  for (let i = 0; i < cellsToReveal; i++) {
    const cell = nonMineCells[i];
    revealedCells[cell.y][cell.x] = true;
  }
  
  const minesweeperState: MinesweeperState = {
    board,
    minePositions,
    revealedCells,
    flaggedCells,
    gameStatus: 'playing',
    aiHintsEnabled: true,
    explainModeEnabled: true
  };

  return {
    gameType: 'minesweeper',
    isActive: true,
    isPaused: false,
    score: 0,
    level: 1,
    timeElapsed: 0,
    gameSpecificData: minesweeperState
  };
}

// Seeded random number generator for deterministic tests
function createSeededRNG(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function generateDeterministicMines(
  width: number, 
  height: number, 
  count: number, 
  rng: () => number
): Position[] {
  const positions: Position[] = [];
  const totalCells = width * height;
  const actualCount = Math.min(count, totalCells - 1);
  
  while (positions.length < actualCount) {
    const x = Math.floor(rng() * width);
    const y = Math.floor(rng() * height);
    
    if (!positions.some(pos => pos.x === x && pos.y === y)) {
      positions.push({ x, y });
    }
  }
  
  return positions;
}

function getAllNonMineCells(width: number, height: number, minePositions: Position[]): Position[] {
  const cells: Position[] = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!minePositions.some(pos => pos.x === x && pos.y === y)) {
        cells.push({ x, y });
      }
    }
  }
  
  return cells;
}

function isMineAt(x: number, y: number, minePositions: Position[]): boolean {
  return minePositions.some(pos => pos.x === x && pos.y === y);
}
