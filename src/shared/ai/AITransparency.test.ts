/**
 * Property-Based Tests for AI Assistance Transparency
 * 
 * **Feature: retro-game-hub, Property 6: AI Assistance Transparency**
 * **Validates: Requirements 6.4, 8.2, 8.4**
 * 
 * For any AI suggestion or decision made across all games, the system should provide
 * algorithmic reasoning and explanations when requested, ensuring transparent
 * decision-making processes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SnakeAIAssistant } from '../../ai/snake';
import { TetrisAIAssistant } from '../../ai/tetris';
import { MinesweeperAIAssistant } from '../../ai/minesweeper';
import { AIConfig, AIDebugger, AIExplainer } from './index';
import { GameState, SnakeState, TetrisState, MinesweeperState } from '../types';

describe('AI Assistance Transparency', () => {
  beforeEach(() => {
    // Reset AI config before each test
    AIConfig.getInstance().reset();
    AIDebugger.getInstance().clearHistory();
  });

  /**
   * Property 6: AI Assistance Transparency
   * 
   * For any AI assistant and any game state, when debug mode is enabled,
   * the explainDecision method should provide transparent reasoning including:
   * - The suggested action
   * - Confidence level (when showConfidence is enabled)
   * - Reasoning for the decision
   * - Debug information (when debug mode is enabled)
   * - Educational explanation (when educational mode is enabled)
   */
  it('should provide transparent reasoning for Snake AI decisions', () => {
    fc.assert(
      fc.property(
        fc.record({
          gridWidth: fc.integer({ min: 5, max: 20 }),
          gridHeight: fc.integer({ min: 5, max: 20 }),
          snakeLength: fc.integer({ min: 3, max: 10 }),
          debugMode: fc.boolean(),
          educationalMode: fc.boolean(),
          showConfidence: fc.boolean()
        }),
        (config) => {
          const assistant = new SnakeAIAssistant();
          const aiConfig = AIConfig.getInstance();
          
          // Configure AI settings
          aiConfig.setDebugMode(config.debugMode);
          aiConfig.setEducationalMode(config.educationalMode);
          aiConfig.setShowConfidence(config.showConfidence);
          
          // Create a valid snake state
          const snake: { x: number; y: number }[] = [];
          for (let i = 0; i < config.snakeLength; i++) {
            snake.push({ x: 5 + i, y: 5 });
          }
          
          const snakeState: SnakeState = {
            snake,
            food: { x: 10, y: 10 },
            direction: 'right' as const,
            gridSize: { width: config.gridWidth, height: config.gridHeight },
            speed: 100,
            aiAssistanceEnabled: true,
            aiChallengeMode: false
          };
          
          const gameState: GameState = {
            gameType: 'snake',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: snakeState
          };
          
          // Analyze game state and get suggestion
          assistant.analyzeGameState(gameState);
          const suggestion = assistant.getSuggestion();
          const explanation = assistant.explainDecision(suggestion);
          
          // Verify transparency requirements
          expect(explanation).toBeTruthy();
          expect(explanation.length).toBeGreaterThan(0);
          
          // Should always include the suggested action
          expect(explanation).toContain('Suggested action');
          
          // Should include confidence if showConfidence is enabled
          if (config.showConfidence) {
            expect(explanation).toContain('Confidence');
          }
          
          // Should include reasoning
          expect(explanation).toContain('Reasoning');
          
          // Should include debug info if debug mode is enabled
          if (config.debugMode) {
            expect(explanation).toContain('Debug Info');
          }
          
          // Should include educational explanation if educational mode is enabled
          if (config.educationalMode) {
            expect(explanation).toContain('Educational Explanation');
          }
          
          assistant.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide transparent reasoning for Tetris AI decisions', () => {
    fc.assert(
      fc.property(
        fc.record({
          debugMode: fc.boolean(),
          educationalMode: fc.boolean(),
          showConfidence: fc.boolean()
        }),
        (config) => {
          const assistant = new TetrisAIAssistant();
          const aiConfig = AIConfig.getInstance();
          
          // Configure AI settings
          aiConfig.setDebugMode(config.debugMode);
          aiConfig.setEducationalMode(config.educationalMode);
          aiConfig.setShowConfidence(config.showConfidence);
          
          // Create a simple Tetris state
          const board = Array(20).fill(null).map(() => Array(10).fill(0));
          
          const tetrisState: TetrisState = {
            board,
            currentPiece: { type: 'I', x: 4, y: 0, rotation: 0 },
            nextPiece: { type: 'O', x: 0, y: 0, rotation: 0 },
            linesCleared: 0,
            fallSpeed: 1000,
            aiAdvisorEnabled: true
          };
          
          const gameState: GameState = {
            gameType: 'tetris',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: tetrisState
          };
          
          // Analyze game state and get suggestion
          assistant.analyzeGameState(gameState);
          const suggestion = assistant.getSuggestion();
          const explanation = assistant.explainDecision(suggestion);
          
          // Verify transparency requirements
          expect(explanation).toBeTruthy();
          expect(explanation.length).toBeGreaterThan(0);
          
          // Should always include the suggested placement
          expect(explanation).toContain('Suggested placement');
          
          // Should include confidence if showConfidence is enabled
          if (config.showConfidence) {
            expect(explanation).toContain('Confidence');
          }
          
          // Should include reasoning
          expect(explanation).toContain('Reasoning');
          
          // Should include debug info if debug mode is enabled
          if (config.debugMode) {
            expect(explanation).toContain('Debug Info');
          }
          
          // Should include educational explanation if educational mode is enabled
          if (config.educationalMode) {
            expect(explanation).toContain('Educational Explanation');
          }
          
          assistant.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide transparent reasoning for Minesweeper AI decisions', () => {
    fc.assert(
      fc.property(
        fc.record({
          gridSize: fc.integer({ min: 5, max: 10 }),
          debugMode: fc.boolean(),
          educationalMode: fc.boolean(),
          showConfidence: fc.boolean()
        }),
        (config) => {
          const assistant = new MinesweeperAIAssistant();
          const aiConfig = AIConfig.getInstance();
          
          // Configure AI settings
          aiConfig.setDebugMode(config.debugMode);
          aiConfig.setEducationalMode(config.educationalMode);
          aiConfig.setShowConfidence(config.showConfidence);
          
          // Create a simple Minesweeper state
          const size = config.gridSize;
          const board = Array(size).fill(null).map(() => Array(size).fill(0));
          const revealedCells = Array(size).fill(null).map(() => Array(size).fill(false));
          const flaggedCells = Array(size).fill(null).map(() => Array(size).fill(false));
          
          // Reveal a few cells to give the AI something to work with
          revealedCells[0][0] = true;
          board[0][0] = 1;
          
          const minesweeperState: MinesweeperState = {
            board,
            minePositions: [{ x: 1, y: 1 }],
            revealedCells,
            flaggedCells,
            gameStatus: 'playing',
            aiHintsEnabled: true,
            explainModeEnabled: true
          };
          
          const gameState: GameState = {
            gameType: 'minesweeper',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: minesweeperState
          };
          
          // Analyze game state and get suggestion
          assistant.analyzeGameState(gameState);
          const suggestion = assistant.getSuggestion();
          const explanation = assistant.explainDecision(suggestion);
          
          // Verify transparency requirements
          expect(explanation).toBeTruthy();
          expect(explanation.length).toBeGreaterThan(0);
          
          // Should always include the suggested action
          expect(explanation).toContain('Suggested action');
          
          // Should include confidence if showConfidence is enabled
          if (config.showConfidence) {
            expect(explanation).toContain('Confidence');
          }
          
          // Should include reasoning
          expect(explanation).toContain('Reasoning');
          
          // Should include debug info if debug mode is enabled
          if (config.debugMode) {
            expect(explanation).toContain('Debug Info');
          }
          
          // Should include educational explanation if educational mode is enabled
          if (config.educationalMode) {
            expect(explanation).toContain('Educational Explanation');
          }
          
          assistant.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional transparency property: Debug information should be logged when enabled
   */
  it('should log debug information when debug mode is enabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (debugMode) => {
          const assistant = new SnakeAIAssistant();
          const aiConfig = AIConfig.getInstance();
          const aiDebugger = AIDebugger.getInstance();
          
          aiConfig.setDebugMode(debugMode);
          aiDebugger.clearHistory();
          
          // Create a simple snake state
          const snakeState: SnakeState = {
            snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
            food: { x: 10, y: 10 },
            direction: 'right',
            gridSize: { width: 20, height: 20 },
            speed: 100,
            aiAssistanceEnabled: true,
            aiChallengeMode: false
          };
          
          const gameState: GameState = {
            gameType: 'snake',
            isActive: true,
            isPaused: false,
            score: 0,
            level: 1,
            timeElapsed: 0,
            gameSpecificData: snakeState
          };
          
          // Analyze game state
          assistant.analyzeGameState(gameState);
          
          // Check if debug info was logged
          const debugHistory = aiDebugger.getDebugHistory();
          
          if (debugMode) {
            expect(debugHistory.length).toBeGreaterThan(0);
            const latestDebug = aiDebugger.getLatestDebugInfo();
            expect(latestDebug).toBeTruthy();
            expect(latestDebug?.gameType).toBe('Snake');
            expect(latestDebug?.algorithmDetails).toBeTruthy();
          } else {
            expect(debugHistory.length).toBe(0);
          }
          
          assistant.destroy();
        }
      ),
      { numRuns: 100 }
    );
  });
});
