/**
 * Tetris AI Assistant
 * 
 * Heuristic evaluation-based AI for Tetris piece placement.
 * Provides optimal position suggestions, visual ghost placement,
 * adaptive difficulty, and strategic guidance.
 */

import { AIAssistant } from '../../shared/interfaces/AIAssistant';
import { 
  GameState, 
  TetrisState, 
  TetrisPiece,
  AIAnalysis, 
  AIHint, 
  AISuggestion, 
  AIAction,
  Position,
  RiskLevel
} from '../../shared/types';
import { AIConfig, AIDebugger, AIExplainer } from '../../shared/ai';

interface PlacementEvaluation {
  position: Position;
  rotation: number;
  score: number;
  reasoning: string;
}

interface HeuristicWeights {
  linesCleared: number;
  height: number;
  holes: number;
  bumpiness: number;
  completeness: number;
}

export class TetrisAIAssistant implements AIAssistant {
  private difficultyLevel: number = 0.5;
  private debugMode: boolean = false;
  private lastAnalysis?: AIAnalysis;
  private lastSuggestion?: AISuggestion;
  private aiConfig = AIConfig.getInstance();
  private aiDebugger = AIDebugger.getInstance();
  private aiExplainer = AIExplainer.getInstance();
  private configUnsubscribe?: () => void;
  
  // Heuristic weights for piece placement evaluation
  private readonly heuristicWeights: HeuristicWeights = {
    linesCleared: 10.0,    // Reward for clearing lines
    height: -0.5,          // Penalty for height
    holes: -3.0,           // Penalty for creating holes
    bumpiness: -0.2,       // Penalty for uneven surface
    completeness: 2.0      // Reward for completing rows
  };

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

  // Tetris piece definitions (same as in game)
  private readonly PIECE_SHAPES: Record<TetrisPiece['type'], number[][][]> = {
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

  analyzeGameState(state: GameState): AIAnalysis {
    const startTime = performance.now();
    const tetrisState = state.gameSpecificData as TetrisState;
    
    // Debug: Log current piece and board state
    if (this.debugMode) {
      console.log('Analyzing Tetris state:', {
        currentPiece: tetrisState.currentPiece,
        boardHeight: tetrisState.board.length,
        boardWidth: tetrisState.board[0]?.length
      });
    }
    
    // Evaluate all possible placements for current piece
    const placements = this.evaluateAllPlacements(tetrisState);
    
    // Debug: Log placements found
    if (this.debugMode) {
      console.log(`Found ${placements.length} possible placements`);
      if (placements.length > 0) {
        console.log('Best placement:', placements[0]);
      }
    }
    
    // Calculate risk assessment
    const riskLevel = this.calculateRiskLevel(tetrisState, placements);
    
    // Generate suggested actions based on best placements
    const suggestedActions = this.generateSuggestedActions(placements);
    
    // Generate alternative options
    const alternativeOptions = this.generateAlternativeOptions(placements);
    
    const confidence = this.calculateConfidence(placements, tetrisState);
    const reasoning = this.generateReasoning(placements, riskLevel, tetrisState);
    
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
      
      this.aiDebugger.logDecision('Tetris', this.lastAnalysis, suggestion, {
        algorithmName: 'Heuristic Evaluation',
        executionTime,
        stepsEvaluated: placements.length,
        heuristicScores: placements.length > 0 ? {
          bestScore: placements[0].score,
          avgScore: placements.reduce((sum, p) => sum + p.score, 0) / placements.length,
          worstScore: placements[placements.length - 1]?.score || 0
        } : undefined,
        additionalInfo: {
          placementsEvaluated: placements.length,
          linesCleared: tetrisState.linesCleared,
          boardHeight: this.calculateAggregateHeight(tetrisState.board),
          holes: this.countHoles(tetrisState.board)
        }
      });
    }
    
    return this.lastAnalysis;
  }

  getSuggestion(): AISuggestion {
    if (!this.lastAnalysis || this.lastAnalysis.suggestedActions.length === 0) {
      return {
        action: {
          type: 'place',
          priority: 0,
          description: 'No valid placements available'
        },
        confidence: 0,
        explanation: 'Unable to find valid piece placements'
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
      // Easy mode - detailed hints with ghost piece
      let detailedExplanation = this.lastAnalysis.reasoning;
      
      // Add educational explanation if enabled
      if (config.educationalMode) {
        const explanation = this.aiExplainer.explainTetrisDecision(this.lastAnalysis, suggestion);
        detailedExplanation = this.aiExplainer.formatExplanation(explanation);
      }
      
      return {
        message: `Best: ${suggestion.action.description}`,
        visualIndicator: suggestion.action.target,
        confidence: config.showConfidence ? suggestion.confidence : undefined,
        detailedExplanation
      };
    } else if (effectiveDifficulty < 0.7) {
      // Medium mode - basic hints
      return {
        message: `Try: ${suggestion.action.description}`,
        visualIndicator: suggestion.action.target,
        confidence: config.showConfidence ? suggestion.confidence : undefined
      };
    } else {
      // Hard mode - minimal hints
      return {
        message: this.lastAnalysis.riskAssessment === 'high' ? 'Careful placement needed!' : 'Good opportunities available',
        confidence: config.showConfidence ? suggestion.confidence : undefined
      };
    }
  }

  explainDecision(suggestion: AISuggestion): string {
    const config = this.aiConfig.getConfig();
    const action = suggestion.action;
    let explanation = `Suggested placement: ${action.description}\n`;
    
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
      
      const debugInfo = this.aiDebugger.getLatestDebugInfo();
      if (debugInfo) {
        explanation += `\n\n${this.aiDebugger.formatDebugInfo(debugInfo)}`;
      }
    }
    
    if (config.educationalMode && this.lastAnalysis) {
      const educationalExplanation = this.aiExplainer.explainTetrisDecision(this.lastAnalysis, suggestion);
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

  // Adaptive difficulty based on player performance
  calculateAdaptiveDifficulty(tetrisState: TetrisState, playerLevel: number): number {
    const baseSpeed = 1000; // Base fall speed in ms
    const levelMultiplier = Math.max(0.1, 1 - (playerLevel - 1) * 0.05);
    
    // Adjust based on lines cleared rate
    const linesPerMinute = tetrisState.linesCleared / Math.max(1, Date.now() / 60000);
    const performanceMultiplier = Math.max(0.3, 1 - linesPerMinute * 0.02);
    
    return Math.floor(baseSpeed * levelMultiplier * performanceMultiplier);
  }

  // Get optimal ghost piece position for visual feedback
  getOptimalGhostPosition(tetrisState: TetrisState): Position | null {
    const placements = this.evaluateAllPlacements(tetrisState);
    
    if (placements.length === 0) return null;
    
    const bestPlacement = placements[0];
    return bestPlacement.position;
  }

  private evaluateAllPlacements(tetrisState: TetrisState): PlacementEvaluation[] {
    const { currentPiece, board } = tetrisState;
    const placements: PlacementEvaluation[] = [];
    const shapes = this.PIECE_SHAPES[currentPiece.type];
    
    // Try all rotations
    for (let rotation = 0; rotation < shapes.length; rotation++) {
      const shape = shapes[rotation];
      
      // Try all horizontal positions
      for (let x = -shape[0].length + 1; x < board[0].length; x++) {
        // Find the lowest valid position for this x and rotation
        const position = this.findLowestPosition(x, shape, board);
        
        if (position && this.isValidPlacement(position, shape, board)) {
          const score = this.evaluatePlacement(position, rotation, shape, board);
          const reasoning = this.generatePlacementReasoning(position, rotation, shape, board, score);
          
          placements.push({
            position,
            rotation,
            score,
            reasoning
          });
        }
      }
    }
    
    // Sort by score (highest first)
    return placements.sort((a, b) => b.score - a.score);
  }

  private findLowestPosition(x: number, shape: number[][], board: number[][]): Position | null {
    // Start from the top and find the first invalid position
    for (let y = 0; y < board.length; y++) {
      if (!this.isValidPlacement({ x, y }, shape, board)) {
        return y > 0 ? { x, y: y - 1 } : null;
      }
    }
    
    // If we can place it at the bottom, calculate the correct position
    const maxY = board.length - shape.length;
    return maxY >= 0 ? { x, y: maxY } : null;
  }

  private isValidPlacement(position: Position, shape: number[][], board: number[][]): boolean {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          // Check boundaries
          if (boardX < 0 || boardX >= board[0].length || 
              boardY < 0 || boardY >= board.length) {
            return false;
          }
          
          // Check collision with existing pieces
          if (board[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    return true;
  }

  private evaluatePlacement(position: Position, _rotation: number, shape: number[][], board: number[][]): number {
    // Create a copy of the board with the piece placed
    const testBoard = board.map(row => [...row]);
    
    // Place the piece
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          if (boardY >= 0 && boardY < testBoard.length && 
              boardX >= 0 && boardX < testBoard[0].length) {
            testBoard[boardY][boardX] = 1;
          }
        }
      }
    }
    
    // Calculate heuristic score
    const linesCleared = this.countCompletedLines(testBoard);
    const height = this.calculateAggregateHeight(testBoard);
    const holes = this.countHoles(testBoard);
    const bumpiness = this.calculateBumpiness(testBoard);
    const completeness = this.calculateCompleteness(testBoard);
    
    return (
      this.heuristicWeights.linesCleared * linesCleared +
      this.heuristicWeights.height * height +
      this.heuristicWeights.holes * holes +
      this.heuristicWeights.bumpiness * bumpiness +
      this.heuristicWeights.completeness * completeness
    );
  }

  private countCompletedLines(board: number[][]): number {
    return board.filter(row => row.every(cell => cell !== 0)).length;
  }

  private calculateAggregateHeight(board: number[][]): number {
    let totalHeight = 0;
    
    for (let x = 0; x < board[0].length; x++) {
      for (let y = 0; y < board.length; y++) {
        if (board[y][x] !== 0) {
          totalHeight += board.length - y;
          break;
        }
      }
    }
    
    return totalHeight;
  }

  private countHoles(board: number[][]): number {
    let holes = 0;
    
    for (let x = 0; x < board[0].length; x++) {
      let blockFound = false;
      for (let y = 0; y < board.length; y++) {
        if (board[y][x] !== 0) {
          blockFound = true;
        } else if (blockFound) {
          holes++;
        }
      }
    }
    
    return holes;
  }

  private calculateBumpiness(board: number[][]): number {
    const heights: number[] = [];
    
    for (let x = 0; x < board[0].length; x++) {
      let height = 0;
      for (let y = 0; y < board.length; y++) {
        if (board[y][x] !== 0) {
          height = board.length - y;
          break;
        }
      }
      heights.push(height);
    }
    
    let bumpiness = 0;
    for (let i = 0; i < heights.length - 1; i++) {
      bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }
    
    return bumpiness;
  }

  private calculateCompleteness(board: number[][]): number {
    let completeness = 0;
    
    for (const row of board) {
      const filledCells = row.filter(cell => cell !== 0).length;
      completeness += filledCells / row.length;
    }
    
    return completeness;
  }

  private calculateRiskLevel(tetrisState: TetrisState, placements: PlacementEvaluation[]): RiskLevel {
    if (placements.length === 0) return 'critical';
    
    const bestScore = placements[0].score;
    const height = this.calculateAggregateHeight(tetrisState.board);
    const maxHeight = tetrisState.board.length;
    
    if (height > maxHeight * 0.8 || bestScore < -10) return 'high';
    if (height > maxHeight * 0.6 || bestScore < 0) return 'medium';
    return 'low';
  }

  private generateSuggestedActions(placements: PlacementEvaluation[]): AIAction[] {
    return placements.slice(0, 3).map((placement, index) => ({
      type: 'place',
      target: placement.position,
      priority: 10 - index,
      description: `x:${placement.position.x} rot:${placement.rotation} (${placement.score.toFixed(1)})`
    }));
  }

  private generateAlternativeOptions(placements: PlacementEvaluation[]): AIAction[] {
    return placements.slice(3, 8).map((placement, index) => ({
      type: 'place',
      target: placement.position,
      priority: 5 - index,
      description: `Alternative: (${placement.position.x}, ${placement.position.y}) rotation ${placement.rotation}`
    }));
  }

  private calculateConfidence(placements: PlacementEvaluation[], tetrisState: TetrisState): number {
    if (placements.length === 0) return 0;
    
    const bestScore = placements[0].score;
    const height = this.calculateAggregateHeight(tetrisState.board);
    const maxHeight = tetrisState.board.length;
    
    let confidence = 0.5;
    
    // Increase confidence for positive scores
    if (bestScore > 0) confidence += Math.min(0.3, bestScore * 0.02);
    
    // Decrease confidence for high board
    confidence -= (height / maxHeight) * 0.3;
    
    // Increase confidence if multiple good options
    if (placements.length > 3) confidence += 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private generateReasoning(placements: PlacementEvaluation[], riskLevel: RiskLevel, tetrisState: TetrisState): string {
    if (placements.length === 0) {
      return 'No valid placements found. Game over imminent.';
    }
    
    const bestPlacement = placements[0];
    const height = this.calculateAggregateHeight(tetrisState.board);
    
    let reasoning = `Found ${placements.length} valid placements. `;
    reasoning += `Best option scores ${bestPlacement.score.toFixed(1)}. `;
    reasoning += `Current board height: ${height}. `;
    reasoning += `Risk level: ${riskLevel}. `;
    reasoning += bestPlacement.reasoning;
    
    return reasoning;
  }

  private generatePlacementReasoning(position: Position, _rotation: number, shape: number[][], board: number[][], _score: number): string {
    const testBoard = board.map(row => [...row]);
    
    // Place piece to analyze
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          if (boardY >= 0 && boardY < testBoard.length && 
              boardX >= 0 && boardX < testBoard[0].length) {
            testBoard[boardY][boardX] = 1;
          }
        }
      }
    }
    
    const linesCleared = this.countCompletedLines(testBoard);
    const holes = this.countHoles(testBoard);
    
    let reasoning = '';
    if (linesCleared > 0) {
      reasoning += `Clears ${linesCleared} line(s). `;
    }
    if (holes > this.countHoles(board)) {
      reasoning += `Creates ${holes - this.countHoles(board)} hole(s). `;
    }
    if (reasoning === '') {
      reasoning = 'Maintains board stability. ';
    }
    
    return reasoning.trim();
  }

  private generateActionExplanation(action: AIAction): string {
    if (action.target) {
      return `This placement at (${action.target.x}, ${action.target.y}) provides the best heuristic score based on line clearing potential, height management, and hole avoidance.`;
    }
    return action.description;
  }
}
