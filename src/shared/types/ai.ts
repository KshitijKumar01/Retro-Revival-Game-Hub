/**
 * AI-related types for game assistants
 */

import { Position, RiskLevel } from './common';

export interface AIAction {
  type: string;
  target?: Position;
  priority: number;
  description: string;
}

export interface AIAnalysis {
  confidence: number;
  reasoning: string;
  suggestedActions: AIAction[];
  riskAssessment: RiskLevel;
  alternativeOptions: AIAction[];
}

export interface AISuggestion {
  action: AIAction;
  confidence: number;
  explanation: string;
}

export interface AIHint {
  message: string;
  visualIndicator?: Position | Position[];
  confidence?: number;
  detailedExplanation?: string;
}
