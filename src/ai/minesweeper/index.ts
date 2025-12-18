/**
 * Minesweeper AI Assistant
 * 
 * Constraint satisfaction and probability-based AI for Minesweeper.
 * Provides tile safety analysis, risk assessment with confidence indicators,
 * hint system, and step-by-step logical reasoning explanations.
 */

import { AIAssistant } from '../../shared/interfaces/AIAssistant';
import { 
  GameState, 
  MinesweeperState, 
  AIAnalysis, 
  AIHint, 
  AISuggestion, 
  AIAction,
  Position,
  RiskLevel
} from '../../shared/types';
import { AIConfig, AIDebugger, AIExplainer } from '../../shared/ai';

interface CellAnalysis {
  position: Position;
  isSafe: boolean;
  isMine: boolean;
  probability: number;
  reasoning: string;
}

interface ConstraintGroup {
  unknownCells: Position[];
  knownMines: number;
  totalMines: number;
}

export class MinesweeperAIAssistant implements AIAssistant {
  private difficultyLevel: number = 0.5;
  private debugMode: boolean = false;
  private lastAnalysis?: AIAnalysis;
  private lastSuggestion?: AISuggestion;
  private cellAnalyses: Map<string, CellAnalysis> = new Map();
  private aiConfig = AIConfig.getInstance();
  private aiDebugger = AIDebugger.getInstance();
  private aiExplainer = AIExplainer.getInstance();
  private configUnsubscribe?: () => void;

  constructor() {
    // Subscribe to config changes
    this.configUnsubscribe = this.aiConfig.subscribe((config) => {
      this.difficultyLevel = config.difficultyLevel;
      this.debugMode = config.debugMode;
      this.aiDebugger.setEnabled(config.debugMode);
    });

    // Initialize from current config
    const config = this.aiConfig.getConfig();
    this.difficultyLevel = config.difficultyLevel;
    this.debugMode = config.debugMode;
  }

  destroy(): void {
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
    }
  }

  analyzeGameState(state: GameState): AIAnalysis {
    const startTime = performance.now();
    const minesweeperState = state.gameSpecificData as MinesweeperState;
    
    // Clear previous analyses
    this.cellAnalyses.clear();
    
    // Perform constraint satisfaction analysis
    const constraints = this.extractConstraints(minesweeperState);
    const solutions = this.solveConstraints(constraints, minesweeperState);
    
    // Calculate probabilities for each unknown cell
    this.calculateProbabilities(solutions, minesweeperState);
    
    // Find safe cells and risky cells
    const safeCells = this.findSafeCells();
    const mineCells = this.findMineCells();
    
    // Calculate risk assessment
    const riskLevel = this.calculateRiskLevel(safeCells, minesweeperState);
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(safeCells, mineCells);
    
    // Generate alternative options
    const alternativeOptions = this.generateAlternativeOptions(minesweeperState);
    
    const confidence = this.calculateConfidence(safeCells, mineCells);
    const reasoning = this.generateReasoning(safeCells, mineCells, riskLevel);
    
    this.lastAnalysis = {
      confidence,
      reasoning,
      suggestedActions,
      riskAssessment: riskLevel,
      alternativeOptions
    };

    // Log debug info if enabled
    if (this.debugMode && this.lastAnalysis.suggestedActions.length > 0) {
      const executionTime = performance.now() - startTime;
      const suggestion = this.getSuggestion();
      
      this.aiDebugger.logDecision('Minesweeper', this.lastAnalysis, suggestion, {
        algorithmName: 'Constraint Satisfaction',
        executionTime,
        stepsEvaluated: this.cellAnalyses.size,
        constraintsSolved: constraints.length,
        additionalInfo: {
          safeCellsFound: safeCells.length,
          mineCellsFound: mineCells.length,
          solutionsGenerated: solutions.length,
          constraintsExtracted: constraints.length,
          cellsAnalyzed: this.cellAnalyses.size
        }
      });
    }
    
    return this.lastAnalysis;
  }

  getSuggestion(): AISuggestion {
    if (!this.lastAnalysis || this.lastAnalysis.suggestedActions.length === 0) {
      return {
        action: {
          type: 'reveal',
          priority: 0,
          description: 'No safe moves identified'
        },
        confidence: 0,
        explanation: 'Unable to determine safe cells with current information'
      };
    }
    
    const bestAction = this.lastAnalysis.suggestedActions[0];
    this.lastSuggestion = {
      action: bestAction,
      confidence: this.lastAnalysis.confidence,
      explanation: this.generateActionExplanation(bestAction)
    };
    
    return this.lastSuggestion;
  }

  getHint(difficulty: number): AIHint {
    if (!this.lastAnalysis) {
      return {
        message: 'Analyze game state first',
        confidence: 0
      };
    }
    
    const config = this.aiConfig.getConfig();
    const suggestion = this.getSuggestion();
    
    // Use configured difficulty if not explicitly provided
    const effectiveDifficulty = difficulty ?? config.difficultyLevel;
    
    if (effectiveDifficulty < 0.3) {
      // Easy mode - detailed hints with explanations
      const positions = this.getSafeCellPositions();
      let detailedExplanation = this.lastAnalysis.reasoning;
      
      // Add educational explanation if enabled
      if (config.educationalMode) {
        const explanation = this.aiExplainer.explainMinesweeperDecision(this.lastAnalysis, suggestion);
        detailedExplanation = this.aiExplainer.formatExplanation(explanation);
      }
      
      return {
        message: `${positions.length} safe cell(s) identified. ${suggestion.action.description}`,
        visualIndicator: positions,
        confidence: config.showConfidence ? suggestion.confidence : undefined,
        detailedExplanation
      };
    } else if (effectiveDifficulty < 0.7) {
      // Medium mode - basic hints
      const positions = this.getSafeCellPositions();
      return {
        message: `${suggestion.action.description}`,
        visualIndicator: positions.length > 0 ? [positions[0]] : undefined,
        confidence: config.showConfidence ? suggestion.confidence : undefined
      };
    } else {
      // Hard mode - minimal hints
      return {
        message: this.lastAnalysis.riskAssessment === 'high' 
          ? 'Careful analysis required' 
          : 'Safe moves available',
        confidence: config.showConfidence ? suggestion.confidence : undefined
      };
    }
  }

  explainDecision(suggestion: AISuggestion): string {
    const config = this.aiConfig.getConfig();
    const action = suggestion.action;
    let explanation = `Suggested action: ${action.description}\n`;
    
    if (config.showConfidence) {
      explanation += `Confidence: ${Math.round(suggestion.confidence * 100)}%\n`;
    }
    
    explanation += `Priority: ${action.priority}\n`;
    explanation += `Reasoning: ${suggestion.explanation}`;
    
    if (config.showAlternatives && this.lastAnalysis && this.lastAnalysis.alternativeOptions.length > 0) {
      explanation += `\n\nAlternative Options:\n`;
      this.lastAnalysis.alternativeOptions.slice(0, 3).forEach((alt, i) => {
        explanation += `  ${i + 1}. ${alt.description}\n`;
      });
    }
    
    if (this.debugMode && this.lastAnalysis) {
      explanation += `\n\n=== Debug Info ===\n`;
      explanation += `Risk Assessment: ${this.lastAnalysis.riskAssessment}\n`;
      explanation += `Alternative Options: ${this.lastAnalysis.alternativeOptions.length}\n`;
      explanation += `Full Analysis: ${this.lastAnalysis.reasoning}`;
      
      // Add cell-by-cell probability breakdown
      explanation += `\n\nCell Probabilities:\n`;
      this.cellAnalyses.forEach((analysis, key) => {
        explanation += `  ${key}: ${(analysis.probability * 100).toFixed(1)}% mine - ${analysis.reasoning}\n`;
      });
      
      const debugInfo = this.aiDebugger.getLatestDebugInfo();
      if (debugInfo) {
        explanation += `\n\n${this.aiDebugger.formatDebugInfo(debugInfo)}`;
      }
    }
    
    if (config.educationalMode && this.lastAnalysis) {
      const educationalExplanation = this.aiExplainer.explainMinesweeperDecision(this.lastAnalysis, suggestion);
      explanation += `\n\n=== Educational Explanation ===\n`;
      explanation += this.aiExplainer.formatExplanation(educationalExplanation);
    }
    
    return explanation;
  }

  setDifficultyLevel(level: number): void {
    this.difficultyLevel = Math.max(0, Math.min(1, level));
    this.aiConfig.setDifficultyLevel(this.difficultyLevel);
  }

  getDifficultyLevel(): number {
    return this.aiConfig.getConfig().difficultyLevel;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.aiConfig.setDebugMode(enabled);
    this.aiDebugger.setEnabled(enabled);
  }

  isDebugModeEnabled(): boolean {
    return this.aiConfig.getConfig().debugMode;
  }

  /**
   * Extract constraint groups from revealed cells
   * Each constraint represents a revealed cell with its adjacent unknown cells
   */
  private extractConstraints(state: MinesweeperState): ConstraintGroup[] {
    const constraints: ConstraintGroup[] = [];
    
    for (let y = 0; y < state.board.length; y++) {
      for (let x = 0; x < state.board[y].length; x++) {
        // Only process revealed cells
        if (!state.revealedCells[y][x]) continue;
        
        // Skip if it's a mine
        if (this.isMine({ x, y }, state)) continue;
        
        // Get adjacent cells
        const neighbors = this.getNeighbors({ x, y }, state);
        const unknownNeighbors = neighbors.filter(pos => 
          !state.revealedCells[pos.y][pos.x] && !state.flaggedCells[pos.y][pos.x]
        );
        const flaggedNeighbors = neighbors.filter(pos => 
          state.flaggedCells[pos.y][pos.x]
        );
        
        // Only create constraint if there are unknown neighbors
        if (unknownNeighbors.length > 0) {
          const totalMines = this.countAdjacentMines({ x, y }, state);
          const knownMines = flaggedNeighbors.length;
          
          constraints.push({
            unknownCells: unknownNeighbors,
            knownMines,
            totalMines
          });
        }
      }
    }
    
    return constraints;
  }

  /**
   * Solve constraints using constraint satisfaction
   * Returns all valid mine configurations
   */
  private solveConstraints(constraints: ConstraintGroup[], state: MinesweeperState): Map<string, number>[] {
    // Get all unique unknown cells
    const unknownCells = new Set<string>();
    constraints.forEach(constraint => {
      constraint.unknownCells.forEach(cell => {
        unknownCells.add(this.positionToString(cell));
      });
    });
    
    const unknownCellsList = Array.from(unknownCells).map(str => this.stringToPosition(str));
    
    // If no unknown cells, return empty solution
    if (unknownCellsList.length === 0) {
      return [new Map()];
    }
    
    // For large numbers of unknown cells, use heuristic approach
    if (unknownCellsList.length > 15) {
      return this.heuristicSolve(constraints, unknownCellsList);
    }
    
    // Try all possible mine configurations (brute force for small sets)
    const solutions: Map<string, number>[] = [];
    const maxSolutions = 1000; // Limit to prevent performance issues
    
    this.generateSolutions(
      constraints,
      unknownCellsList,
      0,
      new Map(),
      solutions,
      maxSolutions
    );
    
    return solutions.length > 0 ? solutions : [new Map()];
  }

  /**
   * Recursively generate valid mine configurations
   */
  private generateSolutions(
    constraints: ConstraintGroup[],
    unknownCells: Position[],
    index: number,
    current: Map<string, number>,
    solutions: Map<string, number>[],
    maxSolutions: number
  ): void {
    if (solutions.length >= maxSolutions) return;
    
    if (index === unknownCells.length) {
      // Check if this configuration satisfies all constraints
      if (this.satisfiesConstraints(current, constraints)) {
        solutions.push(new Map(current));
      }
      return;
    }
    
    const cell = unknownCells[index];
    const cellKey = this.positionToString(cell);
    
    // Try cell as safe (0)
    current.set(cellKey, 0);
    this.generateSolutions(constraints, unknownCells, index + 1, current, solutions, maxSolutions);
    
    // Try cell as mine (1)
    current.set(cellKey, 1);
    this.generateSolutions(constraints, unknownCells, index + 1, current, solutions, maxSolutions);
    
    // Backtrack
    current.delete(cellKey);
  }

  /**
   * Check if a mine configuration satisfies all constraints
   */
  private satisfiesConstraints(config: Map<string, number>, constraints: ConstraintGroup[]): boolean {
    for (const constraint of constraints) {
      const minesInGroup = constraint.unknownCells.reduce((count, cell) => {
        const cellKey = this.positionToString(cell);
        return count + (config.get(cellKey) || 0);
      }, 0);
      
      const remainingMines = constraint.totalMines - constraint.knownMines;
      
      if (minesInGroup !== remainingMines) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Heuristic-based solving for large constraint sets
   */
  private heuristicSolve(
    constraints: ConstraintGroup[],
    unknownCells: Position[]
  ): Map<string, number>[] {
    // Use simple probability-based heuristic
    const solution = new Map<string, number>();
    
    unknownCells.forEach(cell => {
      const cellKey = this.positionToString(cell);
      
      // Find constraints that include this cell
      const relevantConstraints = constraints.filter(c =>
        c.unknownCells.some(pos => this.positionToString(pos) === cellKey)
      );
      
      if (relevantConstraints.length > 0) {
        // Calculate average mine probability from constraints
        let totalProb = 0;
        relevantConstraints.forEach(constraint => {
          const remainingMines = constraint.totalMines - constraint.knownMines;
          const prob = remainingMines / constraint.unknownCells.length;
          totalProb += prob;
        });
        
        const avgProb = totalProb / relevantConstraints.length;
        solution.set(cellKey, avgProb > 0.5 ? 1 : 0);
      } else {
        solution.set(cellKey, 0);
      }
    });
    
    return [solution];
  }

  /**
   * Calculate mine probabilities for each unknown cell based on solutions
   */
  private calculateProbabilities(solutions: Map<string, number>[], state: MinesweeperState): void {
    if (solutions.length === 0) return;
    
    // Count how many solutions have each cell as a mine
    const mineCounts = new Map<string, number>();
    
    solutions.forEach(solution => {
      solution.forEach((isMine, cellKey) => {
        mineCounts.set(cellKey, (mineCounts.get(cellKey) || 0) + isMine);
      });
    });
    
    // Calculate probabilities
    mineCounts.forEach((count, cellKey) => {
      const probability = count / solutions.length;
      const position = this.stringToPosition(cellKey);
      
      let reasoning = '';
      if (probability === 0) {
        reasoning = 'Definitely safe - all valid solutions show no mine here';
      } else if (probability === 1) {
        reasoning = 'Definitely a mine - all valid solutions show a mine here';
      } else {
        reasoning = `${(probability * 100).toFixed(1)}% chance of mine based on ${solutions.length} valid configuration(s)`;
      }
      
      this.cellAnalyses.set(cellKey, {
        position,
        isSafe: probability === 0,
        isMine: probability === 1,
        probability,
        reasoning
      });
    });
    
    // Add analysis for cells not in any constraint (use global probability)
    this.addGlobalProbabilityAnalysis(state);
  }

  /**
   * Add probability analysis for cells not covered by local constraints
   */
  private addGlobalProbabilityAnalysis(state: MinesweeperState): void {
    const totalCells = state.board.length * state.board[0].length;
    const revealedCount = state.revealedCells.flat().filter(Boolean).length;
    const flaggedCount = state.flaggedCells.flat().filter(Boolean).length;
    const totalMines = state.minePositions.length;
    
    const unknownCells = totalCells - revealedCount - flaggedCount;
    const remainingMines = totalMines - flaggedCount;
    
    const globalProbability = unknownCells > 0 ? remainingMines / unknownCells : 0;
    
    // Add analysis for cells not yet analyzed
    for (let y = 0; y < state.board.length; y++) {
      for (let x = 0; x < state.board[y].length; x++) {
        if (!state.revealedCells[y][x] && !state.flaggedCells[y][x]) {
          const cellKey = this.positionToString({ x, y });
          
          if (!this.cellAnalyses.has(cellKey)) {
            this.cellAnalyses.set(cellKey, {
              position: { x, y },
              isSafe: false,
              isMine: false,
              probability: globalProbability,
              reasoning: `Global probability: ${(globalProbability * 100).toFixed(1)}% (${remainingMines} mines in ${unknownCells} unknown cells)`
            });
          }
        }
      }
    }
  }

  private findSafeCells(): CellAnalysis[] {
    return Array.from(this.cellAnalyses.values()).filter(analysis => analysis.isSafe);
  }

  private findMineCells(): CellAnalysis[] {
    return Array.from(this.cellAnalyses.values()).filter(analysis => analysis.isMine);
  }

  private getSafeCellPositions(): Position[] {
    return this.findSafeCells().map(analysis => analysis.position);
  }

  private calculateRiskLevel(safeCells: CellAnalysis[], state: MinesweeperState): RiskLevel {
    if (safeCells.length > 0) return 'low';
    
    // Check if we have any low-probability cells
    const lowRiskCells = Array.from(this.cellAnalyses.values())
      .filter(analysis => analysis.probability < 0.3);
    
    if (lowRiskCells.length > 0) return 'medium';
    
    // Check board state
    const revealedCount = state.revealedCells.flat().filter(Boolean).length;
    const totalCells = state.board.length * state.board[0].length;
    const progress = revealedCount / totalCells;
    
    if (progress < 0.2) return 'medium'; // Early game
    
    return 'high';
  }

  private generateSuggestedActions(safeCells: CellAnalysis[], mineCells: CellAnalysis[]): AIAction[] {
    const actions: AIAction[] = [];
    
    // Add safe cell reveals (highest priority)
    safeCells.forEach((cell, index) => {
      actions.push({
        type: 'reveal',
        target: cell.position,
        priority: 10 - index * 0.1,
        description: `Reveal (${cell.position.x}, ${cell.position.y}) - ${cell.reasoning}`
      });
    });
    
    // Add mine flags (high priority)
    mineCells.forEach((cell, index) => {
      actions.push({
        type: 'flag',
        target: cell.position,
        priority: 9 - index * 0.1,
        description: `Flag (${cell.position.x}, ${cell.position.y}) as mine - ${cell.reasoning}`
      });
    });
    
    // If no certain moves, suggest lowest probability cells
    if (actions.length === 0) {
      const sortedByProbability = Array.from(this.cellAnalyses.values())
        .sort((a, b) => a.probability - b.probability)
        .slice(0, 3);
      
      sortedByProbability.forEach((cell, index) => {
        actions.push({
          type: 'reveal',
          target: cell.position,
          priority: 5 - index,
          description: `Consider (${cell.position.x}, ${cell.position.y}) - ${cell.reasoning}`
        });
      });
    }
    
    return actions.sort((a, b) => b.priority - a.priority);
  }

  private generateAlternativeOptions(state: MinesweeperState): AIAction[] {
    const alternatives: AIAction[] = [];
    
    // Find medium-probability cells as alternatives
    const mediumRiskCells = Array.from(this.cellAnalyses.values())
      .filter(analysis => analysis.probability > 0 && analysis.probability < 0.5)
      .sort((a, b) => a.probability - b.probability)
      .slice(0, 5);
    
    mediumRiskCells.forEach((cell, index) => {
      alternatives.push({
        type: 'reveal',
        target: cell.position,
        priority: 3 - index * 0.1,
        description: `Alternative: (${cell.position.x}, ${cell.position.y}) - ${cell.reasoning}`
      });
    });
    
    return alternatives;
  }

  private calculateConfidence(safeCells: CellAnalysis[], mineCells: CellAnalysis[]): number {
    if (safeCells.length > 0) {
      return 1.0; // Certain safe moves
    }
    
    if (mineCells.length > 0) {
      return 0.9; // Certain mines to flag
    }
    
    // Base confidence on lowest probability available
    const lowestProbability = Math.min(
      ...Array.from(this.cellAnalyses.values()).map(a => a.probability)
    );
    
    return Math.max(0.1, 1 - lowestProbability);
  }

  private generateReasoning(safeCells: CellAnalysis[], mineCells: CellAnalysis[], riskLevel: RiskLevel): string {
    let reasoning = '';
    
    if (safeCells.length > 0) {
      reasoning += `Found ${safeCells.length} definitely safe cell(s) through constraint satisfaction. `;
    }
    
    if (mineCells.length > 0) {
      reasoning += `Identified ${mineCells.length} certain mine(s). `;
    }
    
    if (safeCells.length === 0 && mineCells.length === 0) {
      reasoning += 'No certain moves available. ';
      const lowestProb = Math.min(
        ...Array.from(this.cellAnalyses.values()).map(a => a.probability)
      );
      reasoning += `Best guess has ${(lowestProb * 100).toFixed(1)}% mine probability. `;
    }
    
    reasoning += `Risk level: ${riskLevel}.`;
    
    return reasoning;
  }

  private generateActionExplanation(action: AIAction): string {
    if (!action.target) return action.description;
    
    const cellKey = this.positionToString(action.target);
    const analysis = this.cellAnalyses.get(cellKey);
    
    if (!analysis) return action.description;
    
    let explanation = `Cell at (${action.target.x}, ${action.target.y}): `;
    
    if (analysis.isSafe) {
      explanation += 'Constraint satisfaction proves this cell is safe. ';
    } else if (analysis.isMine) {
      explanation += 'Constraint satisfaction proves this cell contains a mine. ';
    } else {
      explanation += `Probability analysis shows ${(analysis.probability * 100).toFixed(1)}% chance of mine. `;
    }
    
    explanation += analysis.reasoning;
    
    return explanation;
  }

  // Helper methods
  private getNeighbors(position: Position, state: MinesweeperState): Position[] {
    const neighbors: Position[] = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const x = position.x + dx;
        const y = position.y + dy;
        
        if (this.isValidPosition({ x, y }, state)) {
          neighbors.push({ x, y });
        }
      }
    }
    
    return neighbors;
  }

  private isValidPosition(position: Position, state: MinesweeperState): boolean {
    return position.x >= 0 && position.x < state.board[0].length &&
           position.y >= 0 && position.y < state.board.length;
  }

  private isMine(position: Position, state: MinesweeperState): boolean {
    return state.minePositions.some(pos => pos.x === position.x && pos.y === position.y);
  }

  private countAdjacentMines(position: Position, state: MinesweeperState): number {
    const neighbors = this.getNeighbors(position, state);
    return neighbors.filter(pos => this.isMine(pos, state)).length;
  }

  private positionToString(position: Position): string {
    return `${position.x},${position.y}`;
  }

  private stringToPosition(str: string): Position {
    const [x, y] = str.split(',').map(Number);
    return { x, y };
  }
}
