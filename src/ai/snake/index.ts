/**
 * Snake AI Assistant
 * 
 * A* pathfinding-based AI for Snake game assistance.
 * Provides safe path prediction, visual direction highlighting,
 * strategic food placement, and game state evaluation.
 */

import { AIAssistant } from '../../shared/interfaces/AIAssistant';
import { 
  GameState, 
  SnakeState, 
  AIAnalysis, 
  AIHint, 
  AISuggestion, 
  AIAction,
  Position,
  Direction,
  RiskLevel
} from '../../shared/types';
import { AIConfig, AIDebugger, AIExplainer } from '../../shared/ai';

interface PathNode {
  position: Position;
  gCost: number;
  hCost: number;
  fCost: number;
  parent?: PathNode;
}

export class SnakeAIAssistant implements AIAssistant {
  private difficultyLevel: number = 0.5;
  private debugMode: boolean = false;
  private lastAnalysis?: AIAnalysis;
  private lastSuggestion?: AISuggestion;
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
    const snakeState = state.gameSpecificData as SnakeState;
    const head = snakeState.snake[0];
    
    // Analyze all possible moves
    const possibleMoves = this.getPossibleMoves(head, snakeState);
    const safeMoves = possibleMoves.filter(move => 
      this.isSafeMove(move.position, snakeState)
    );
    
    // Calculate risk assessment
    const riskLevel = this.calculateRiskLevel(safeMoves.length, snakeState);
    
    // Find best path to food using A*
    const pathToFood = this.findPathToFood(head, snakeState.food, snakeState);
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(
      safeMoves, 
      pathToFood, 
      snakeState
    );
    
    // Generate alternative options
    const alternativeOptions = this.generateAlternativeOptions(
      possibleMoves,
      snakeState
    );
    
    const confidence = this.calculateConfidence(safeMoves.length, pathToFood);
    const reasoning = this.generateReasoning(safeMoves, pathToFood, riskLevel);
    
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
      
      this.aiDebugger.logDecision('Snake', this.lastAnalysis, suggestion, {
        algorithmName: 'A* Pathfinding',
        executionTime,
        stepsEvaluated: possibleMoves.length,
        pathLength: pathToFood?.length,
        additionalInfo: {
          safeMoves: safeMoves.length,
          totalMoves: possibleMoves.length,
          snakeLength: snakeState.snake.length,
          gridSize: `${snakeState.gridSize.width}x${snakeState.gridSize.height}`
        }
      });
    }
    
    return this.lastAnalysis;
  }

  getSuggestion(): AISuggestion {
    if (!this.lastAnalysis || this.lastAnalysis.suggestedActions.length === 0) {
      return {
        action: {
          type: 'move',
          priority: 0,
          description: 'No safe moves available'
        },
        confidence: 0,
        explanation: 'Unable to find safe moves'
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
      // Easy mode - detailed hints
      let detailedExplanation = this.lastAnalysis.reasoning;
      
      // Add educational explanation if enabled
      if (config.educationalMode) {
        const explanation = this.aiExplainer.explainSnakeDecision(this.lastAnalysis, suggestion);
        detailedExplanation = this.aiExplainer.formatExplanation(explanation);
      }
      
      return {
        message: `Move ${this.getDirectionFromAction(suggestion.action)}. ${suggestion.explanation}`,
        visualIndicator: suggestion.action.target,
        confidence: config.showConfidence ? (suggestion.confidence || 0) : undefined,
        detailedExplanation
      };
    } else if (effectiveDifficulty < 0.7) {
      // Medium mode - basic hints
      return {
        message: `Consider moving ${this.getDirectionFromAction(suggestion.action)}`,
        visualIndicator: suggestion.action.target,
        confidence: config.showConfidence ? (suggestion.confidence || 0) : undefined
      };
    } else {
      // Hard mode - minimal hints
      return {
        message: this.lastAnalysis.riskAssessment === 'high' ? 'Danger ahead!' : 'Path looks clear',
        confidence: config.showConfidence ? (suggestion.confidence || 0) : undefined
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
      
      const debugInfo = this.aiDebugger.getLatestDebugInfo();
      if (debugInfo) {
        explanation += `\n\n${this.aiDebugger.formatDebugInfo(debugInfo)}`;
      }
    }
    
    if (config.educationalMode && this.lastAnalysis) {
      const educationalExplanation = this.aiExplainer.explainSnakeDecision(this.lastAnalysis, suggestion);
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

  // Strategic food placement for AI challenge mode
  generateStrategicFoodPosition(snakeState: SnakeState): Position {
    const { snake, gridSize } = snakeState;
    const head = snake[0];
    
    // Find positions that create interesting challenges
    const challengingPositions: Position[] = [];
    
    for (let x = 0; x < gridSize.width; x++) {
      for (let y = 0; y < gridSize.height; y++) {
        const pos = { x, y };
        
        // Skip positions occupied by snake
        if (snake.some(segment => this.isPositionEqual(segment, pos))) {
          continue;
        }
        
        // Calculate challenge factor based on:
        // 1. Distance from head (moderate distance preferred)
        // 2. Number of safe paths to reach it
        // 3. Potential for creating tight situations
        
        const distance = this.manhattanDistance(head, pos);
        const safePaths = this.countSafePathsToPosition(head, pos, snakeState);
        
        // Prefer positions that are not too close or too far
        if (distance >= 3 && distance <= 8 && safePaths > 0 && safePaths <= 2) {
          challengingPositions.push(pos);
        }
      }
    }
    
    if (challengingPositions.length > 0) {
      return challengingPositions[Math.floor(Math.random() * challengingPositions.length)];
    }
    
    // Fallback to random position if no challenging positions found
    return this.generateRandomFoodPosition(snakeState);
  }

  private generateRandomFoodPosition(snakeState: SnakeState): Position {
    const { snake, gridSize } = snakeState;
    let food: Position;
    let attempts = 0;
    const maxAttempts = gridSize.width * gridSize.height;
    
    do {
      food = {
        x: Math.floor(Math.random() * gridSize.width),
        y: Math.floor(Math.random() * gridSize.height)
      };
      attempts++;
    } while (snake.some(segment => this.isPositionEqual(segment, food)) && attempts < maxAttempts);
    
    return food;
  }

  private getPossibleMoves(head: Position, snakeState: SnakeState): Array<{position: Position, direction: Direction}> {
    const moves: Array<{position: Position, direction: Direction}> = [];
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    
    // Don't allow reverse direction
    const oppositeDirection = this.getOppositeDirection(snakeState.direction);
    
    for (const direction of directions) {
      if (direction === oppositeDirection) continue;
      
      const newPosition = this.getNextPosition(head, direction);
      moves.push({ position: newPosition, direction });
    }
    
    return moves;
  }

  private isSafeMove(position: Position, snakeState: SnakeState): boolean {
    // Check wall collision
    if (this.isWallCollision(position, snakeState.gridSize)) {
      return false;
    }
    
    // Check self collision (excluding tail if no food will be consumed)
    const snakeToCheck = position.x === snakeState.food.x && position.y === snakeState.food.y
      ? snakeState.snake // Food will be consumed, tail won't move
      : snakeState.snake.slice(0, -1); // Tail will move, so exclude it
    
    return !snakeToCheck.some(segment => this.isPositionEqual(position, segment));
  }

  private calculateRiskLevel(safeMoves: number, _snakeState: SnakeState): RiskLevel {
    if (safeMoves === 0) return 'critical';
    if (safeMoves === 1) return 'high';
    if (safeMoves === 2) return 'medium';
    return 'low';
  }

  private findPathToFood(start: Position, food: Position, snakeState: SnakeState): Position[] | null {
    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();
    
    const startNode: PathNode = {
      position: start,
      gCost: 0,
      hCost: this.manhattanDistance(start, food),
      fCost: 0
    };
    startNode.fCost = startNode.gCost + startNode.hCost;
    
    openSet.push(startNode);
    
    while (openSet.length > 0) {
      // Find node with lowest fCost
      let currentNode = openSet[0];
      let currentIndex = 0;
      
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].fCost < currentNode.fCost) {
          currentNode = openSet[i];
          currentIndex = i;
        }
      }
      
      openSet.splice(currentIndex, 1);
      closedSet.add(this.positionToString(currentNode.position));
      
      // Check if we reached the food
      if (this.isPositionEqual(currentNode.position, food)) {
        return this.reconstructPath(currentNode);
      }
      
      // Check neighbors
      const neighbors = this.getNeighbors(currentNode.position);
      
      for (const neighbor of neighbors) {
        const neighborKey = this.positionToString(neighbor);
        
        if (closedSet.has(neighborKey)) continue;
        
        // Check if neighbor is valid (not wall or snake body)
        if (!this.isValidPathPosition(neighbor, snakeState)) continue;
        
        const gCost = currentNode.gCost + 1;
        const hCost = this.manhattanDistance(neighbor, food);
        const fCost = gCost + hCost;
        
        const existingNode = openSet.find(node => 
          this.isPositionEqual(node.position, neighbor)
        );
        
        if (!existingNode) {
          openSet.push({
            position: neighbor,
            gCost,
            hCost,
            fCost,
            parent: currentNode
          });
        } else if (gCost < existingNode.gCost) {
          existingNode.gCost = gCost;
          existingNode.fCost = gCost + hCost;
          existingNode.parent = currentNode;
        }
      }
    }
    
    return null; // No path found
  }

  private generateSuggestedActions(
    safeMoves: Array<{position: Position, direction: Direction}>,
    pathToFood: Position[] | null,
    snakeState: SnakeState
  ): AIAction[] {
    const actions: AIAction[] = [];
    
    if (pathToFood && pathToFood.length > 1) {
      // Follow path to food
      const nextPosition = pathToFood[1];
      const direction = this.getDirectionToPosition(snakeState.snake[0], nextPosition);
      
      actions.push({
        type: 'move',
        target: nextPosition,
        priority: 10,
        description: `Move ${direction} towards food`
      });
    }
    
    // Add safe moves as alternatives
    safeMoves.forEach((move, index) => {
      const spaceAvailable = this.calculateAvailableSpace(move.position, snakeState);
      const priority = pathToFood ? 5 - index : 8 - index;
      
      actions.push({
        type: 'move',
        target: move.position,
        priority,
        description: `Move ${move.direction} (${spaceAvailable} spaces available)`
      });
    });
    
    // Sort by priority
    return actions.sort((a, b) => b.priority - a.priority);
  }

  private generateAlternativeOptions(
    possibleMoves: Array<{position: Position, direction: Direction}>,
    snakeState: SnakeState
  ): AIAction[] {
    return possibleMoves.map(move => ({
      type: 'move',
      target: move.position,
      priority: this.isSafeMove(move.position, snakeState) ? 5 : 1,
      description: `Move ${move.direction} ${this.isSafeMove(move.position, snakeState) ? '(safe)' : '(risky)'}`
    }));
  }

  private calculateConfidence(safeMoves: number, pathToFood: Position[] | null): number {
    let confidence = 0.5;
    
    // Increase confidence based on number of safe moves
    confidence += safeMoves * 0.15;
    
    // Increase confidence if path to food exists
    if (pathToFood) {
      confidence += 0.3;
    }
    
    return Math.min(1, confidence);
  }

  private generateReasoning(safeMoves: Array<{position: Position, direction: Direction}>, pathToFood: Position[] | null, riskLevel: RiskLevel): string {
    let reasoning = `Found ${safeMoves.length} safe moves. `;
    
    if (pathToFood) {
      reasoning += `Clear path to food exists (${pathToFood.length - 1} steps). `;
    } else {
      reasoning += `No direct path to food found. `;
    }
    
    reasoning += `Risk level: ${riskLevel}.`;
    
    return reasoning;
  }

  private generateActionExplanation(action: AIAction): string {
    if (action.target) {
      return `This move leads to position (${action.target.x}, ${action.target.y}) which appears to be the safest option based on pathfinding analysis.`;
    }
    return action.description;
  }

  private getDirectionFromAction(action: AIAction): string {
    return action.description.split(' ')[1] || 'unknown';
  }

  private countSafePathsToPosition(start: Position, target: Position, snakeState: SnakeState): number {
    // Simplified implementation - count basic safe paths
    const paths = this.findAllPathsToPosition(start, target, snakeState, 3); // Max depth 3
    return paths.length;
  }

  private findAllPathsToPosition(start: Position, target: Position, snakeState: SnakeState, maxDepth: number): Position[][] {
    const paths: Position[][] = [];
    
    const dfs = (current: Position, path: Position[], depth: number) => {
      if (depth > maxDepth) return;
      if (this.isPositionEqual(current, target)) {
        paths.push([...path]);
        return;
      }
      
      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!this.isValidPathPosition(neighbor, snakeState)) continue;
        if (path.some(pos => this.isPositionEqual(pos, neighbor))) continue;
        
        path.push(neighbor);
        dfs(neighbor, path, depth + 1);
        path.pop();
      }
    };
    
    dfs(start, [start], 0);
    return paths;
  }

  private calculateAvailableSpace(position: Position, snakeState: SnakeState): number {
    const visited = new Set<string>();
    const queue = [position];
    let count = 0;
    
    while (queue.length > 0 && count < 50) { // Limit to prevent infinite loops
      const current = queue.shift()!;
      const key = this.positionToString(current);
      
      if (visited.has(key)) continue;
      visited.add(key);
      count++;
      
      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (!this.isValidPathPosition(neighbor, snakeState)) continue;
        if (!visited.has(this.positionToString(neighbor))) {
          queue.push(neighbor);
        }
      }
    }
    
    return count;
  }

  private getNeighbors(position: Position): Position[] {
    return [
      { x: position.x, y: position.y - 1 }, // up
      { x: position.x, y: position.y + 1 }, // down
      { x: position.x - 1, y: position.y }, // left
      { x: position.x + 1, y: position.y }  // right
    ];
  }

  private isValidPathPosition(position: Position, snakeState: SnakeState): boolean {
    // Check bounds
    if (this.isWallCollision(position, snakeState.gridSize)) {
      return false;
    }
    
    // Check snake collision (excluding tail unless food will be consumed)
    const snakeToCheck = snakeState.snake.slice(0, -1); // Assume tail will move
    return !snakeToCheck.some(segment => this.isPositionEqual(position, segment));
  }

  private reconstructPath(node: PathNode): Position[] {
    const path: Position[] = [];
    let current: PathNode | undefined = node;
    
    while (current) {
      path.unshift(current.position);
      current = current.parent;
    }
    
    return path;
  }

  private manhattanDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  private getNextPosition(position: Position, direction: Direction): Position {
    switch (direction) {
      case 'up':
        return { x: position.x, y: position.y - 1 };
      case 'down':
        return { x: position.x, y: position.y + 1 };
      case 'left':
        return { x: position.x - 1, y: position.y };
      case 'right':
        return { x: position.x + 1, y: position.y };
    }
  }

  private getDirectionToPosition(from: Position, to: Position): Direction {
    if (to.y < from.y) return 'up';
    if (to.y > from.y) return 'down';
    if (to.x < from.x) return 'left';
    return 'right';
  }

  private getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
      case 'up': return 'down';
      case 'down': return 'up';
      case 'left': return 'right';
      case 'right': return 'left';
    }
  }

  private isWallCollision(position: Position, gridSize: { width: number; height: number }): boolean {
    return position.x < 0 || position.x >= gridSize.width || 
           position.y < 0 || position.y >= gridSize.height;
  }

  private isPositionEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  private positionToString(position: Position): string {
    return `${position.x},${position.y}`;
  }
}
