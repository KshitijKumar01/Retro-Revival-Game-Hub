/**
 * Property-based tests for Tetris AI decision determinism
 * 
 * **Feature: retro-game-hub, Property 2: AI Decision Determinism (Tetris)**
 * **Validates: Requirements 3.2, 6.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TetrisAIAssistant } from './index';
import { GameState, TetrisState, TetrisPiece } from '../../shared/types';

describe('Tetris AI Decision Determinism Property Tests', () => {
  /**
   * **Feature: retro-game-hub, Property 2: AI Decision Determinism (Tetris)**
   * **Validates: Requirements 3.2, 6.1**
   * 
   * For any identical game state presented to an AI assistant multiple times, 
   * the AI should provide the same analysis, suggestions, and explanations, 
   * ensuring consistent algorithmic behavior across all games
   */
  it('should provide identical analysis for identical game states', () => {
    fc.assert(fc.property(
      fc.record({
        pieceType: fc.constantFrom('I', 'O', 'T', 'S', 'Z', 'J', 'L'),
        rotation: fc.integer({ min: 0, max: 3 }),
        positionX: fc.integer({ min: 0, max: 9 }),
        positionY: fc.integer({ min: 0, max: 5 }),
        score: fc.integer({ min: 0, max: 50000 }),
        level: fc.integer({ min: 1, max: 10 }),
        linesCleared: fc.integer({ min: 0, max: 100 }),
        boardFillLevel: fc.float({ min: 0, max: Math.fround(0.3) }), // Keep board mostly empty
        aiDifficulty: fc.float({ min: 0, max: Math.fround(1) }),
        debugMode: fc.boolean()
      }),
      (testData) => {
        // Create two identical AI assistants
        const ai1 = new TetrisAIAssistant();
        const ai2 = new TetrisAIAssistant();
        
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

  it('should provide consistent adaptive difficulty calculations', () => {
    fc.assert(fc.property(
      fc.record({
        linesCleared: fc.integer({ min: 0, max: 200 }),
        playerLevel: fc.integer({ min: 1, max: 20 }),
        timeElapsed: fc.integer({ min: 1000, max: 600000 }) // 1 second to 10 minutes
      }),
      (testData) => {
        const ai1 = new TetrisAIAssistant();
        const ai2 = new TetrisAIAssistant();
        
        // Create identical Tetris states
        const tetrisState1: TetrisState = {
          board: Array(20).fill(null).map(() => Array(10).fill(0)),
          currentPiece: createTestPiece('T'),
          nextPiece: createTestPiece('I'),
          linesCleared: testData.linesCleared,
          fallSpeed: 1000,
          aiAdvisorEnabled: true
        };
        
        const tetrisState2: TetrisState = {
          board: Array(20).fill(null).map(() => Array(10).fill(0)),
          currentPiece: createTestPiece('T'),
          nextPiece: createTestPiece('I'),
          linesCleared: testData.linesCleared,
          fallSpeed: 1000,
          aiAdvisorEnabled: true
        };
        
        // Calculate adaptive difficulty multiple times
        const difficulty1_run1 = ai1.calculateAdaptiveDifficulty(tetrisState1, testData.playerLevel);
        const difficulty1_run2 = ai1.calculateAdaptiveDifficulty(tetrisState1, testData.playerLevel);
        const difficulty2_run1 = ai2.calculateAdaptiveDifficulty(tetrisState2, testData.playerLevel);
        
        // Verify deterministic behavior
        expect(difficulty1_run1).toBe(difficulty1_run2);
        expect(difficulty1_run1).toBe(difficulty2_run1);
        
        // Verify difficulty is within reasonable bounds
        expect(difficulty1_run1).toBeGreaterThan(0);
        expect(difficulty1_run1).toBeLessThanOrEqual(1000);
        
        // Verify difficulty decreases with higher levels (faster gameplay)
        if (testData.playerLevel > 1) {
          const lowerLevelDifficulty = ai1.calculateAdaptiveDifficulty(tetrisState1, 1);
          expect(difficulty1_run1).toBeLessThanOrEqual(lowerLevelDifficulty);
        }
      }
    ), { numRuns: 100 });
  });

  it('should provide consistent optimal ghost positions', () => {
    fc.assert(fc.property(
      fc.record({
        pieceType: fc.constantFrom('I', 'O', 'T', 'S', 'Z', 'J', 'L') as fc.Arbitrary<TetrisPiece['type']>,
        boardPattern: fc.integer({ min: 0, max: 7 }) // Different board patterns
      }),
      (testData) => {
        const ai1 = new TetrisAIAssistant();
        const ai2 = new TetrisAIAssistant();
        
        // Create identical game states with different board patterns
        const tetrisState1 = createTestTetrisState(testData.pieceType, testData.boardPattern);
        const tetrisState2 = createTestTetrisState(testData.pieceType, testData.boardPattern);
        
        // Get optimal ghost positions multiple times
        const ghostPos1_run1 = ai1.getOptimalGhostPosition(tetrisState1);
        const ghostPos1_run2 = ai1.getOptimalGhostPosition(tetrisState1);
        const ghostPos2_run1 = ai2.getOptimalGhostPosition(tetrisState2);
        
        // Verify deterministic behavior
        if (ghostPos1_run1 && ghostPos1_run2) {
          expect(ghostPos1_run1.x).toBe(ghostPos1_run2.x);
          expect(ghostPos1_run1.y).toBe(ghostPos1_run2.y);
        }
        
        if (ghostPos1_run1 && ghostPos2_run1) {
          expect(ghostPos1_run1.x).toBe(ghostPos2_run1.x);
          expect(ghostPos1_run1.y).toBe(ghostPos2_run1.y);
        }
        
        // Verify positions are within valid bounds if they exist
        if (ghostPos1_run1) {
          expect(ghostPos1_run1.x).toBeGreaterThanOrEqual(0);
          expect(ghostPos1_run1.x).toBeLessThan(10);
          expect(ghostPos1_run1.y).toBeGreaterThanOrEqual(0);
          expect(ghostPos1_run1.y).toBeLessThan(20);
        }
      }
    ), { numRuns: 100 });
  });
});

// Helper functions
function createTestGameState(testData: any): GameState {
  const tetrisState: TetrisState = {
    board: createDeterministicTestBoard(testData.boardFillLevel),
    currentPiece: createTestPiece(testData.pieceType, testData.rotation, testData.positionX, testData.positionY),
    nextPiece: createTestPiece('I'), // Fixed next piece for consistency
    linesCleared: testData.linesCleared,
    fallSpeed: 1000,
    aiAdvisorEnabled: true
  };

  return {
    gameType: 'tetris',
    isActive: true,
    isPaused: false,
    score: testData.score,
    level: testData.level,
    timeElapsed: 0,
    gameSpecificData: tetrisState
  };
}

function createDeterministicTestBoard(fillLevel: number): number[][] {
  const board = Array(20).fill(null).map(() => Array(10).fill(0));
  
  // Fill bottom rows based on fill level deterministically
  const rowsToFill = Math.floor(20 * fillLevel);
  for (let y = 20 - rowsToFill; y < 20; y++) {
    for (let x = 0; x < 10; x++) {
      // Deterministically fill cells based on position
      if ((x + y) % 3 === 0 && x < 9) { // Don't fill last column to avoid complete lines
        board[y][x] = ((x + y) % 7) + 1;
      }
    }
  }
  
  return board;
}

function createTestPiece(type: TetrisPiece['type'], rotation: number = 0, x: number = 4, y: number = 0): TetrisPiece {
  const shapes: Record<TetrisPiece['type'], number[][][]> = {
    'I': [
      [[1, 1, 1, 1]],
      [[1], [1], [1], [1]]
    ],
    'O': [
      [[1, 1], [1, 1]]
    ],
    'T': [
      [[0, 1, 0], [1, 1, 1]],
      [[1, 0], [1, 1], [1, 0]],
      [[1, 1, 1], [0, 1, 0]],
      [[0, 1], [1, 1], [0, 1]]
    ],
    'S': [
      [[0, 1, 1], [1, 1, 0]],
      [[1, 0], [1, 1], [0, 1]]
    ],
    'Z': [
      [[1, 1, 0], [0, 1, 1]],
      [[0, 1], [1, 1], [1, 0]]
    ],
    'J': [
      [[1, 0, 0], [1, 1, 1]],
      [[1, 1], [1, 0], [1, 0]],
      [[1, 1, 1], [0, 0, 1]],
      [[0, 1], [0, 1], [1, 1]]
    ],
    'L': [
      [[0, 0, 1], [1, 1, 1]],
      [[1, 0], [1, 0], [1, 1]],
      [[1, 1, 1], [1, 0, 0]],
      [[1, 1], [0, 1], [0, 1]]
    ]
  };

  const pieceShapes = shapes[type];
  const validRotation = rotation % pieceShapes.length;

  return {
    type,
    rotation: validRotation,
    position: { x, y },
    shape: pieceShapes[validRotation]
  };
}

function createTestTetrisState(pieceType: TetrisPiece['type'], boardPattern: number): TetrisState {
  const board = Array(20).fill(null).map(() => Array(10).fill(0));
  
  // Create different board patterns for testing
  switch (boardPattern % 8) {
    case 0: // Empty board
      break;
    case 1: // Bottom row partially filled
      for (let x = 0; x < 8; x++) {
        board[19][x] = 1;
      }
      break;
    case 2: // Left wall
      for (let y = 15; y < 20; y++) {
        board[y][0] = 1;
        board[y][1] = 1;
      }
      break;
    case 3: // Right wall
      for (let y = 15; y < 20; y++) {
        board[y][8] = 1;
        board[y][9] = 1;
      }
      break;
    case 4: // Center column
      for (let y = 16; y < 20; y++) {
        board[y][4] = 1;
        board[y][5] = 1;
      }
      break;
    case 5: // Scattered blocks
      board[19][2] = 1;
      board[19][7] = 1;
      board[18][3] = 1;
      board[18][6] = 1;
      break;
    case 6: // Almost complete line
      for (let x = 0; x < 9; x++) {
        board[19][x] = 1;
      }
      break;
    case 7: // Multiple partial lines
      for (let x = 0; x < 7; x++) {
        board[19][x] = 1;
        board[18][x + 1] = 1;
      }
      break;
  }

  return {
    board,
    currentPiece: createTestPiece(pieceType),
    nextPiece: createTestPiece('I'),
    linesCleared: 0,
    fallSpeed: 1000,
    aiAdvisorEnabled: true
  };
}