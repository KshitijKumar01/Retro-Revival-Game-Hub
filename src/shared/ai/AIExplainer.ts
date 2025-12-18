/**
 * AI Explainer
 * 
 * Educational explanation system for AI suggestions.
 * Provides step-by-step reasoning and learning resources.
 */

import { AIAnalysis, AISuggestion, AIAction } from '../types';

export interface Explanation {
  summary: string;
  steps: ExplanationStep[];
  concepts: string[];
  learningTips: string[];
}

export interface ExplanationStep {
  stepNumber: number;
  description: string;
  reasoning: string;
  visualAid?: string;
}

export class AIExplainer {
  private static instance: AIExplainer;

  private constructor() {}

  static getInstance(): AIExplainer {
    if (!AIExplainer.instance) {
      AIExplainer.instance = new AIExplainer();
    }
    return AIExplainer.instance;
  }

  /**
   * Generate educational explanation for Snake AI decision
   */
  explainSnakeDecision(analysis: AIAnalysis, suggestion: AISuggestion): Explanation {
    const steps: ExplanationStep[] = [];
    let stepNum = 1;

    // Step 1: Analyze safe moves
    steps.push({
      stepNumber: stepNum++,
      description: 'Identify safe moves',
      reasoning: 'The AI first checks all possible directions (up, down, left, right) and eliminates moves that would cause immediate collision with walls or the snake\'s body.',
      visualAid: 'Green arrows indicate safe directions'
    });

    // Step 2: Pathfinding
    if (analysis.reasoning.includes('path to food')) {
      steps.push({
        stepNumber: stepNum++,
        description: 'Find path to food using A* algorithm',
        reasoning: 'A* pathfinding calculates the shortest safe path to the food. It considers both the distance to the goal (heuristic) and the actual path cost.',
        visualAid: 'Blue line shows the calculated path'
      });
    }

    // Step 3: Space analysis
    steps.push({
      stepNumber: stepNum++,
      description: 'Evaluate available space',
      reasoning: 'For each safe move, the AI calculates how much open space would be accessible. This prevents getting trapped in dead ends.',
      visualAid: 'Numbers show available space in each direction'
    });

    // Step 4: Risk assessment
    steps.push({
      stepNumber: stepNum++,
      description: 'Assess risk level',
      reasoning: `Risk level is ${analysis.riskAssessment}. This is based on the number of safe moves available and the current board state.`,
      visualAid: `Risk indicator: ${analysis.riskAssessment}`
    });

    const concepts = [
      'A* Pathfinding: An algorithm that finds the shortest path between two points',
      'Heuristic: An estimate of distance used to guide the search',
      'Space Analysis: Evaluating how much room is available to maneuver',
      'Risk Assessment: Determining danger level based on available options'
    ];

    const learningTips = [
      'Always prioritize moves that keep the most space available',
      'Think ahead: consider where your next move will lead',
      'When in doubt, move toward open space rather than toward food',
      'Watch for patterns that could trap you in corners'
    ];

    return {
      summary: `The AI recommends ${suggestion.action.description} with ${(suggestion.confidence * 100).toFixed(0)}% confidence. ${analysis.reasoning}`,
      steps,
      concepts,
      learningTips
    };
  }

  /**
   * Generate educational explanation for Tetris AI decision
   */
  explainTetrisDecision(analysis: AIAnalysis, suggestion: AISuggestion): Explanation {
    const steps: ExplanationStep[] = [];
    let stepNum = 1;

    // Step 1: Evaluate all placements
    steps.push({
      stepNumber: stepNum++,
      description: 'Evaluate all possible placements',
      reasoning: 'The AI tries every possible position and rotation for the current piece, calculating a score for each placement.',
      visualAid: 'Ghost pieces show evaluated positions'
    });

    // Step 2: Heuristic scoring
    steps.push({
      stepNumber: stepNum++,
      description: 'Calculate heuristic scores',
      reasoning: 'Each placement is scored based on: lines cleared (good), height increase (bad), holes created (bad), and surface bumpiness (bad).',
      visualAid: 'Score breakdown shown for top placements'
    });

    // Step 3: Line clearing
    if (analysis.reasoning.includes('Clears')) {
      steps.push({
        stepNumber: stepNum++,
        description: 'Prioritize line clearing',
        reasoning: 'Placements that clear lines receive bonus points. Clearing multiple lines simultaneously is especially valuable.',
        visualAid: 'Highlighted rows show potential line clears'
      });
    }

    // Step 4: Hole avoidance
    steps.push({
      stepNumber: stepNum++,
      description: 'Avoid creating holes',
      reasoning: 'Holes (empty cells with blocks above them) are heavily penalized because they\'re difficult to fill later.',
      visualAid: 'Red cells indicate potential holes'
    });

    const concepts = [
      'Heuristic Evaluation: Scoring positions based on multiple factors',
      'Aggregate Height: Total height of all columns',
      'Holes: Empty cells with blocks above them',
      'Bumpiness: Variation in column heights',
      'Line Clearing: Completing full rows to score points'
    ];

    const learningTips = [
      'Keep the board flat to avoid creating holes',
      'Save the I-piece for clearing multiple lines',
      'Don\'t always take the highest-scoring immediate move - think ahead',
      'Build with future pieces in mind'
    ];

    return {
      summary: `The AI suggests ${suggestion.action.description} with ${(suggestion.confidence * 100).toFixed(0)}% confidence. ${analysis.reasoning}`,
      steps,
      concepts,
      learningTips
    };
  }

  /**
   * Generate educational explanation for Minesweeper AI decision
   */
  explainMinesweeperDecision(analysis: AIAnalysis, suggestion: AISuggestion): Explanation {
    const steps: ExplanationStep[] = [];
    let stepNum = 1;

    // Step 1: Extract constraints
    steps.push({
      stepNumber: stepNum++,
      description: 'Extract constraints from revealed cells',
      reasoning: 'Each revealed number creates a constraint: the number tells us exactly how many adjacent cells contain mines.',
      visualAid: 'Numbers show mine counts for adjacent cells'
    });

    // Step 2: Constraint satisfaction
    steps.push({
      stepNumber: stepNum++,
      description: 'Solve constraints using logic',
      reasoning: 'The AI tries different mine configurations and keeps only those that satisfy all constraints. If all valid configurations agree on a cell, we know it\'s safe or a mine.',
      visualAid: 'Green = definitely safe, Red = definitely mine'
    });

    // Step 3: Probability calculation
    if (analysis.reasoning.includes('probability')) {
      steps.push({
        stepNumber: stepNum++,
        description: 'Calculate probabilities',
        reasoning: 'For cells where we\'re not certain, the AI calculates the probability of a mine based on how many valid configurations have a mine there.',
        visualAid: 'Percentages show mine probability'
      });
    }

    // Step 4: Risk assessment
    steps.push({
      stepNumber: stepNum++,
      description: 'Assess risk and recommend action',
      reasoning: `Risk level is ${analysis.riskAssessment}. The AI recommends the safest available move based on logical deduction and probability.`,
      visualAid: `Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`
    });

    const concepts = [
      'Constraint Satisfaction: Using logical rules to eliminate possibilities',
      'Probability Analysis: Calculating likelihood when logic isn\'t enough',
      'Mine Density: The ratio of mines to unknown cells',
      'Local vs Global Probability: Specific constraints vs overall board statistics'
    ];

    const learningTips = [
      'Start by finding cells that are definitely safe or mines',
      'Look for patterns: 1-2-1 patterns often reveal safe cells',
      'When guessing is necessary, choose cells with lowest mine probability',
      'Work on areas with the most information (revealed numbers)'
    ];

    return {
      summary: `The AI recommends ${suggestion.action.description} with ${(suggestion.confidence * 100).toFixed(0)}% confidence. ${analysis.reasoning}`,
      steps,
      concepts,
      learningTips
    };
  }

  /**
   * Format explanation as readable text
   */
  formatExplanation(explanation: Explanation): string {
    let output = `${explanation.summary}\n\n`;

    output += '=== Step-by-Step Reasoning ===\n';
    explanation.steps.forEach(step => {
      output += `\nStep ${step.stepNumber}: ${step.description}\n`;
      output += `${step.reasoning}\n`;
      if (step.visualAid) {
        output += `Visual: ${step.visualAid}\n`;
      }
    });

    output += '\n=== Key Concepts ===\n';
    explanation.concepts.forEach(concept => {
      output += `• ${concept}\n`;
    });

    output += '\n=== Learning Tips ===\n';
    explanation.learningTips.forEach(tip => {
      output += `• ${tip}\n`;
    });

    return output;
  }

  /**
   * Generate a simple explanation suitable for tooltips
   */
  generateSimpleExplanation(action: AIAction, confidence: number): string {
    const confidenceText = confidence > 0.8 ? 'highly confident' :
                          confidence > 0.5 ? 'moderately confident' :
                          'uncertain';

    return `${action.description}\n\nThe AI is ${confidenceText} in this recommendation (${(confidence * 100).toFixed(0)}% confidence).`;
  }
}
