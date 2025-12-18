/**
 * AI Debugger
 * 
 * Provides transparency into AI decision-making processes.
 * Displays algorithmic reasoning, confidence scores, and alternative options.
 */

import { AIAnalysis, AISuggestion } from '../types';

export interface DebugInfo {
  timestamp: number;
  gameType: string;
  analysis: AIAnalysis;
  suggestion: AISuggestion;
  algorithmDetails: AlgorithmDetails;
}

export interface AlgorithmDetails {
  algorithmName: string;
  executionTime: number;
  stepsEvaluated: number;
  heuristicScores?: Record<string, number>;
  pathLength?: number;
  constraintsSolved?: number;
  additionalInfo: Record<string, any>;
}

export class AIDebugger {
  private static instance: AIDebugger;
  private debugHistory: DebugInfo[] = [];
  private maxHistorySize: number = 50;
  private enabled: boolean = false;

  private constructor() {}

  static getInstance(): AIDebugger {
    if (!AIDebugger.instance) {
      AIDebugger.instance = new AIDebugger();
    }
    return AIDebugger.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearHistory();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log AI decision for debugging
   */
  logDecision(
    gameType: string,
    analysis: AIAnalysis,
    suggestion: AISuggestion,
    algorithmDetails: AlgorithmDetails
  ): void {
    if (!this.enabled) return;

    const debugInfo: DebugInfo = {
      timestamp: Date.now(),
      gameType,
      analysis,
      suggestion,
      algorithmDetails
    };

    this.debugHistory.push(debugInfo);

    // Maintain max history size
    if (this.debugHistory.length > this.maxHistorySize) {
      this.debugHistory.shift();
    }
  }

  /**
   * Get the most recent debug info
   */
  getLatestDebugInfo(): DebugInfo | null {
    return this.debugHistory.length > 0 
      ? this.debugHistory[this.debugHistory.length - 1] 
      : null;
  }

  /**
   * Get all debug history
   */
  getDebugHistory(): DebugInfo[] {
    return [...this.debugHistory];
  }

  /**
   * Clear debug history
   */
  clearHistory(): void {
    this.debugHistory = [];
  }

  /**
   * Format debug info as human-readable text
   */
  formatDebugInfo(info: DebugInfo): string {
    let output = `=== AI Debug Info (${info.gameType}) ===\n`;
    output += `Timestamp: ${new Date(info.timestamp).toLocaleTimeString()}\n\n`;

    output += `Algorithm: ${info.algorithmDetails.algorithmName}\n`;
    output += `Execution Time: ${info.algorithmDetails.executionTime.toFixed(2)}ms\n`;
    output += `Steps Evaluated: ${info.algorithmDetails.stepsEvaluated}\n`;

    if (info.algorithmDetails.pathLength !== undefined) {
      output += `Path Length: ${info.algorithmDetails.pathLength}\n`;
    }

    if (info.algorithmDetails.constraintsSolved !== undefined) {
      output += `Constraints Solved: ${info.algorithmDetails.constraintsSolved}\n`;
    }

    if (info.algorithmDetails.heuristicScores) {
      output += `\nHeuristic Scores:\n`;
      Object.entries(info.algorithmDetails.heuristicScores).forEach(([key, value]) => {
        output += `  ${key}: ${value.toFixed(2)}\n`;
      });
    }

    output += `\nAnalysis:\n`;
    output += `  Confidence: ${(info.analysis.confidence * 100).toFixed(1)}%\n`;
    output += `  Risk: ${info.analysis.riskAssessment}\n`;
    output += `  Reasoning: ${info.analysis.reasoning}\n`;

    output += `\nSuggestion:\n`;
    output += `  Action: ${info.suggestion.action.description}\n`;
    output += `  Priority: ${info.suggestion.action.priority}\n`;
    output += `  Explanation: ${info.suggestion.explanation}\n`;

    if (info.analysis.suggestedActions.length > 1) {
      output += `\nTop Actions:\n`;
      info.analysis.suggestedActions.slice(0, 3).forEach((action, i) => {
        output += `  ${i + 1}. ${action.description} (priority: ${action.priority})\n`;
      });
    }

    if (info.analysis.alternativeOptions.length > 0) {
      output += `\nAlternatives: ${info.analysis.alternativeOptions.length} options available\n`;
    }

    if (Object.keys(info.algorithmDetails.additionalInfo).length > 0) {
      output += `\nAdditional Info:\n`;
      Object.entries(info.algorithmDetails.additionalInfo).forEach(([key, value]) => {
        output += `  ${key}: ${JSON.stringify(value)}\n`;
      });
    }

    return output;
  }

  /**
   * Export debug history as JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.debugHistory, null, 2);
  }
}
