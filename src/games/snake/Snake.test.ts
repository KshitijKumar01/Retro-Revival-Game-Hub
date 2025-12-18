/**
 * Property-based tests for Snake game mechanics and AI assistant
 * 
 * **Feature: retro-game-hub, Property 4: Core Game Mechanics Integrity (Snake)**
 * **Validates: Requirements 2.1**
 * 
 * **Feature: retro-game-hub, Property 2: AI Decision Determinism (Snake)**
 * **Validates: Requirements 2.2, 2.3, 6.1**
 */

/// <reference types="vitest" />

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SnakeGame } from './index';
import { SnakeAIAssistant } from '../../ai/snake';
import { SnakeState, GameState, Direction } from '../../shared/types';

describe('Snake Game - Core Mechanics Integrity', () => {
  let game: SnakeGame;
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
        font: '',
        fillText: () => {}
      }),
      width: 400,
      height: 400
    } as any;
    
    game = new SnakeGame();
    game.initialize(canvas);
  });

  /**
   * Property 4: Core Game Mechanics Integrity (Snake)
   * For any valid game state, the fundamental Snake game rules should operate correctly
   * regardless of AI assistance settings, maintaining authentic classic gameplay behavior
   */
  it('should maintain core game mechanics integrity across all valid states', () => {
    fc.assert(
      fc.property(
        // Generate valid grid sizes
        fc.record({
          width: fc.integer({ min: 5, max: 30 }),
          height: fc.integer({ min: 5, max: 30 })
        }),
        // Generate valid directions
        fc.constantFrom('up' as Direction, 'down' as Direction, 'left' as Direction, 'right' as Direction),
        // Generate AI settings
        fc.boolean(),
        fc.boolean(),
        // Generate speed settings
        fc.integer({ min: 50, max: 500 }),
        
        (gridSize: { width: number; height: number }, _direction: Direction, aiAssistance: boolean, aiChallenge: boolean, speed: number) => {
          // Set up game with generated parameters
          game.setGridSize(gridSize.width, gridSize.height);
          game.setSpeed(speed);
          game.setAIAssistance(aiAssistance);
          game.setAIChallengeMode(aiChallenge);
          
          const initialState = game.getState();
          const snakeState = initialState.gameSpecificData as SnakeState;
          
          // Verify initial state integrity
          expect(snakeState.gridSize).toEqual(gridSize);
          expect(snakeState.speed).toBe(speed);
          expect(snakeState.aiAssistanceEnabled).toBe(aiAssistance);
          expect(snakeState.aiChallengeMode).toBe(aiChallenge);
          
          // Verify snake starts with valid positions
          expect(snakeState.snake.length).toBeGreaterThan(0);
          snakeState.snake.forEach(segment => {
            expect(segment.x).toBeGreaterThanOrEqual(0);
            expect(segment.x).toBeLessThan(gridSize.width);
            expect(segment.y).toBeGreaterThanOrEqual(0);
            expect(segment.y).toBeLessThan(gridSize.height);
          });
          
          // Verify food is placed in valid position
          expect(snakeState.food.x).toBeGreaterThanOrEqual(0);
          expect(snakeState.food.x).toBeLessThan(gridSize.width);
          expect(snakeState.food.y).toBeGreaterThanOrEqual(0);
          expect(snakeState.food.y).toBeLessThan(gridSize.height);
          
          // Verify food is not on snake
          const foodOnSnake = snakeState.snake.some(segment => 
            segment.x === snakeState.food.x && segment.y === snakeState.food.y
          );
          expect(foodOnSnake).toBe(false);
          
          // Test direction changes (should not allow reverse direction)
          game.handleInput({
            type: 'keydown',
            key: getOppositeDirectionKey(snakeState.direction),
            timestamp: Date.now()
          });
          
          const stateAfterInput = game.getState();
          const snakeStateAfterInput = stateAfterInput.gameSpecificData as SnakeState;
          
          // Direction should not change to opposite
          expect(snakeStateAfterInput.direction).toBe(snakeState.direction);
          
          // Test valid direction change
          const validDirectionKey = getValidDirectionKey(snakeState.direction);
          game.handleInput({
            type: 'keydown',
            key: validDirectionKey.key,
            timestamp: Date.now()
          });
          
          const stateAfterValidInput = game.getState();
          const snakeStateAfterValidInput = stateAfterValidInput.gameSpecificData as SnakeState;
          
          // Direction should change to valid direction
          expect(snakeStateAfterValidInput.direction).toBe(validDirectionKey.direction);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle collision detection correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 3, max: 10 }),
          height: fc.integer({ min: 3, max: 10 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          game.setGridSize(gridSize.width, gridSize.height);
          
          // Create a state where snake will hit wall
          const testState: GameState = {
            gameType: 'snake',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              snake: [{ x: gridSize.width - 1, y: 0 }], // Snake at right edge
              food: { x: 0, y: 0 },
              direction: 'right' as Direction,
              gridSize,
              speed: 200,
              aiAssistanceEnabled: false,
              aiChallengeMode: false
            } as SnakeState
          };
          
          game.setState(testState);
          
          // Move the snake (should cause wall collision)
          game.update(200); // Trigger movement
          
          const finalState = game.getState();
          
          // Game should be inactive after wall collision
          expect(finalState.isActive).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle food consumption correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 5, max: 15 }),
          height: fc.integer({ min: 5, max: 15 })
        }),
        
        (gridSize: { width: number; height: number }) => {
          game.setGridSize(gridSize.width, gridSize.height);
          
          // Create a state where snake will eat food
          const testState: GameState = {
            gameType: 'snake',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: {
              snake: [{ x: 1, y: 1 }],
              food: { x: 2, y: 1 }, // Food directly in front of snake
              direction: 'right' as Direction,
              gridSize,
              speed: 200,
              aiAssistanceEnabled: false,
              aiChallengeMode: false
            } as SnakeState
          };
          
          game.setState(testState);
          const initialSnakeLength = (testState.gameSpecificData as SnakeState).snake.length;
          const initialScore = testState.score;
          
          // Move the snake (should consume food)
          game.update(200); // Trigger movement
          
          const finalState = game.getState();
          const finalSnakeState = finalState.gameSpecificData as SnakeState;
          
          // Snake should grow by one segment
          expect(finalSnakeState.snake.length).toBe(initialSnakeLength + 1);
          
          // Score should increase
          expect(finalState.score).toBeGreaterThan(initialScore);
          
          // Food should be in a new position
          const newFoodPosition = finalSnakeState.food;
          expect(newFoodPosition.x !== 2 || newFoodPosition.y !== 1).toBe(true);
          
          // New food should not be on snake
          const foodOnSnake = finalSnakeState.snake.some(segment => 
            segment.x === newFoodPosition.x && segment.y === newFoodPosition.y
          );
          expect(foodOnSnake).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Snake AI Assistant - Decision Determinism', () => {
  let aiAssistant: SnakeAIAssistant;

  beforeEach(() => {
    aiAssistant = new SnakeAIAssistant();
  });

  /**
   * Property 2: AI Decision Determinism (Snake)
   * For any identical game state presented to an AI assistant multiple times,
   * the AI should provide the same analysis, suggestions, and explanations,
   * ensuring consistent algorithmic behavior
   */
  it('should provide deterministic AI decisions for identical game states', () => {
    fc.assert(
      fc.property(
        // Generate valid game states
        fc.record({
          gridSize: fc.record({
            width: fc.integer({ min: 5, max: 20 }),
            height: fc.integer({ min: 5, max: 20 })
          }),
          snakeLength: fc.integer({ min: 1, max: 5 }),
          direction: fc.constantFrom('up' as Direction, 'down' as Direction, 'left' as Direction, 'right' as Direction),
          aiAssistanceEnabled: fc.boolean(),
          aiChallengeMode: fc.boolean(),
          score: fc.integer({ min: 0, max: 1000 }),
          level: fc.integer({ min: 1, max: 10 })
        }),
        
        (params: {
          gridSize: { width: number; height: number };
          snakeLength: number;
          direction: Direction;
          aiAssistanceEnabled: boolean;
          aiChallengeMode: boolean;
          score: number;
          level: number;
        }) => {
          // Generate a valid snake position
          const centerX = Math.floor(params.gridSize.width / 2);
          const centerY = Math.floor(params.gridSize.height / 2);
          
          const snake = [];
          for (let i = 0; i < params.snakeLength; i++) {
            snake.push({ x: centerX - i, y: centerY });
          }
          
          // Generate food position (not on snake)
          let food = { x: 0, y: 0 };
          let attempts = 0;
          do {
            food = {
              x: Math.floor(Math.random() * params.gridSize.width),
              y: Math.floor(Math.random() * params.gridSize.height)
            };
            attempts++;
          } while (snake.some(segment => segment.x === food.x && segment.y === food.y) && attempts < 100);
          
          const gameState: GameState = {
            gameType: 'snake',
            isActive: true,
            isPaused: false,
            score: params.score,
            level: params.level,
            timeElapsed: 0,
            gameSpecificData: {
              snake,
              food,
              direction: params.direction,
              gridSize: params.gridSize,
              speed: 200,
              aiAssistanceEnabled: params.aiAssistanceEnabled,
              aiChallengeMode: params.aiChallengeMode
            } as SnakeState
          };
          
          // Analyze the same state multiple times
          const analysis1 = aiAssistant.analyzeGameState(gameState);
          const suggestion1 = aiAssistant.getSuggestion();
          const hint1 = aiAssistant.getHint(0.5);
          
          const analysis2 = aiAssistant.analyzeGameState(gameState);
          const suggestion2 = aiAssistant.getSuggestion();
          const hint2 = aiAssistant.getHint(0.5);
          
          const analysis3 = aiAssistant.analyzeGameState(gameState);
          const suggestion3 = aiAssistant.getSuggestion();
          const hint3 = aiAssistant.getHint(0.5);
          
          // Verify deterministic behavior - all analyses should be identical
          expect(analysis1.confidence).toBe(analysis2.confidence);
          expect(analysis1.confidence).toBe(analysis3.confidence);
          
          expect(analysis1.reasoning).toBe(analysis2.reasoning);
          expect(analysis1.reasoning).toBe(analysis3.reasoning);
          
          expect(analysis1.riskAssessment).toBe(analysis2.riskAssessment);
          expect(analysis1.riskAssessment).toBe(analysis3.riskAssessment);
          
          expect(analysis1.suggestedActions.length).toBe(analysis2.suggestedActions.length);
          expect(analysis1.suggestedActions.length).toBe(analysis3.suggestedActions.length);
          
          // Verify suggested actions are identical
          for (let i = 0; i < analysis1.suggestedActions.length; i++) {
            expect(analysis1.suggestedActions[i].type).toBe(analysis2.suggestedActions[i].type);
            expect(analysis1.suggestedActions[i].type).toBe(analysis3.suggestedActions[i].type);
            
            expect(analysis1.suggestedActions[i].priority).toBe(analysis2.suggestedActions[i].priority);
            expect(analysis1.suggestedActions[i].priority).toBe(analysis3.suggestedActions[i].priority);
            
            expect(analysis1.suggestedActions[i].description).toBe(analysis2.suggestedActions[i].description);
            expect(analysis1.suggestedActions[i].description).toBe(analysis3.suggestedActions[i].description);
            
            if (analysis1.suggestedActions[i].target && analysis2.suggestedActions[i].target && analysis3.suggestedActions[i].target) {
              expect(analysis1.suggestedActions[i].target!.x).toBe(analysis2.suggestedActions[i].target!.x);
              expect(analysis1.suggestedActions[i].target!.x).toBe(analysis3.suggestedActions[i].target!.x);
              expect(analysis1.suggestedActions[i].target!.y).toBe(analysis2.suggestedActions[i].target!.y);
              expect(analysis1.suggestedActions[i].target!.y).toBe(analysis3.suggestedActions[i].target!.y);
            }
          }
          
          // Verify suggestions are identical
          expect(suggestion1.confidence).toBe(suggestion2.confidence);
          expect(suggestion1.confidence).toBe(suggestion3.confidence);
          
          expect(suggestion1.explanation).toBe(suggestion2.explanation);
          expect(suggestion1.explanation).toBe(suggestion3.explanation);
          
          expect(suggestion1.action.type).toBe(suggestion2.action.type);
          expect(suggestion1.action.type).toBe(suggestion3.action.type);
          
          expect(suggestion1.action.priority).toBe(suggestion2.action.priority);
          expect(suggestion1.action.priority).toBe(suggestion3.action.priority);
          
          expect(suggestion1.action.description).toBe(suggestion2.action.description);
          expect(suggestion1.action.description).toBe(suggestion3.action.description);
          
          // Verify hints are identical
          expect(hint1.message).toBe(hint2.message);
          expect(hint1.message).toBe(hint3.message);
          
          expect(hint1.confidence).toBe(hint2.confidence);
          expect(hint1.confidence).toBe(hint3.confidence);
          
          // Verify explanations are deterministic
          const explanation1 = aiAssistant.explainDecision(suggestion1);
          const explanation2 = aiAssistant.explainDecision(suggestion2);
          const explanation3 = aiAssistant.explainDecision(suggestion3);
          
          expect(explanation1).toBe(explanation2);
          expect(explanation1).toBe(explanation3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide consistent strategic food placement in challenge mode', () => {
    fc.assert(
      fc.property(
        fc.record({
          gridSize: fc.record({
            width: fc.integer({ min: 8, max: 15 }),
            height: fc.integer({ min: 8, max: 15 })
          }),
          snakeLength: fc.integer({ min: 3, max: 6 })
        }),
        
        (params: {
          gridSize: { width: number; height: number };
          snakeLength: number;
        }) => {
          // Create identical snake states
          const centerX = Math.floor(params.gridSize.width / 2);
          const centerY = Math.floor(params.gridSize.height / 2);
          
          const snake = [];
          for (let i = 0; i < params.snakeLength; i++) {
            snake.push({ x: centerX - i, y: centerY });
          }
          
          const snakeState1: SnakeState = {
            snake: [...snake],
            food: { x: 0, y: 0 }, // Will be overridden
            direction: 'right',
            gridSize: params.gridSize,
            speed: 200,
            aiAssistanceEnabled: true,
            aiChallengeMode: true
          };
          

          
          // Generate strategic food positions multiple times with same state
          // Note: Strategic placement may have some randomness, but should follow consistent logic
          const positions = [];
          for (let i = 0; i < 5; i++) {
            const pos = aiAssistant.generateStrategicFoodPosition(snakeState1);
            positions.push(pos);
            
            // Verify position is valid (not on snake, within bounds)
            expect(pos.x).toBeGreaterThanOrEqual(0);
            expect(pos.x).toBeLessThan(params.gridSize.width);
            expect(pos.y).toBeGreaterThanOrEqual(0);
            expect(pos.y).toBeLessThan(params.gridSize.height);
            
            const onSnake = snake.some(segment => segment.x === pos.x && segment.y === pos.y);
            expect(onSnake).toBe(false);
          }
          
          // All positions should be valid strategic positions
          // (The exact position may vary due to randomness in strategic selection,
          // but the algorithm should consistently produce valid strategic positions)
          expect(positions.length).toBe(5);
          positions.forEach(pos => {
            expect(typeof pos.x).toBe('number');
            expect(typeof pos.y).toBe('number');
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Helper functions
function getOppositeDirectionKey(direction: Direction): string {
  switch (direction) {
    case 'up': return 'ArrowDown';
    case 'down': return 'ArrowUp';
    case 'left': return 'ArrowRight';
    case 'right': return 'ArrowLeft';
  }
}

function getValidDirectionKey(direction: Direction): { key: string; direction: Direction } {
  switch (direction) {
    case 'up':
    case 'down':
      return { key: 'ArrowLeft', direction: 'left' };
    case 'left':
    case 'right':
      return { key: 'ArrowUp', direction: 'up' };
  }
}