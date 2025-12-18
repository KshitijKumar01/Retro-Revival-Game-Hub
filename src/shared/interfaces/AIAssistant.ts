/**
 * AIAssistant Interface
 * 
 * Defines the contract for AI assistants that provide gameplay hints,
 * predictions, and strategic guidance for each game module.
 * Uses established algorithms (A*, heuristic evaluation, constraint satisfaction)
 * to ensure predictable, explainable behavior.
 */

import { AIAnalysis, AIHint, AISuggestion, GameState } from '../types';

export interface AIAssistant {
  /**
   * Analyze the current game state and provide comprehensive analysis
   * @param state - The current game state to analyze
   * @returns Analysis including confidence, reasoning, and suggested actions
   */
  analyzeGameState(state: GameState): AIAnalysis;

  /**
   * Get the current best suggestion based on the last analysis
   * @returns The AI's recommended action
   */
  getSuggestion(): AISuggestion;

  /**
   * Get a hint appropriate for the current difficulty level
   * @param difficulty - Difficulty level from 0 (easy) to 1 (hard)
   * @returns A hint with appropriate detail level
   */
  getHint(difficulty: number): AIHint;

  /**
   * Provide a human-readable explanation for a suggestion
   * @param suggestion - The suggestion to explain
   * @returns A string explaining the reasoning behind the suggestion
   */
  explainDecision(suggestion: AISuggestion): string;

  /**
   * Set the AI difficulty/assistance level
   * @param level - Difficulty level from 0 (maximum assistance) to 1 (minimal assistance)
   */
  setDifficultyLevel(level: number): void;

  /**
   * Get the current difficulty level
   * @returns The current difficulty level
   */
  getDifficultyLevel(): number;

  /**
   * Enable or disable debug mode for AI decision transparency
   * @param enabled - Whether debug mode should be enabled
   */
  setDebugMode(enabled: boolean): void;

  /**
   * Check if debug mode is enabled
   * @returns Whether debug mode is currently enabled
   */
  isDebugModeEnabled(): boolean;
}
