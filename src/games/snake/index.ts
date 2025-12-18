/**
 * Snake Game Module
 * 
 * Classic grid-based Snake game with AI-enhanced features.
 * Implements grid-based movement, collision detection, food consumption,
 * scoring system, and configurable game settings.
 */

import { GameModule } from '../../shared/interfaces/GameModule';
import { GameState, SnakeState, Position, Direction, InputEvent, AIHint } from '../../shared/types';
import { SnakeAIAssistant } from '../../ai/snake';

export class SnakeGame implements GameModule {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameState: GameState;

  private moveTimer = 0;
  private aiAssistant: SnakeAIAssistant;
  private currentHint?: AIHint;
  
  // Default configuration
  private readonly DEFAULT_GRID_SIZE = { width: 20, height: 20 };
  private readonly DEFAULT_SPEED = 200; // milliseconds per move
  private readonly CELL_SIZE = 20;
  
  constructor() {
    this.gameState = this.createInitialState();
    this.aiAssistant = new SnakeAIAssistant();
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    
    // Keep the original canvas size (800x600) and position game in center
    // Don't resize the canvas - use the full available space
    
    this.reset();
  }

  update(deltaTime: number): void {
    if (!this.gameState.isActive || this.gameState.isPaused) {
      return;
    }

    this.gameState.timeElapsed += deltaTime;
    this.moveTimer += deltaTime;
    
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    
    // Update AI analysis if assistance is enabled
    if (snakeState.aiAssistanceEnabled) {
      this.updateAIAnalysis();
    }
    
    // Move snake based on speed
    if (this.moveTimer >= snakeState.speed) {
      this.moveSnake();
      this.moveTimer = 0;
    }
  }

  render(): void {
    if (!this.ctx) return;
    
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    
    // Clear canvas with retro background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate game area offset to center the grid
    const gameWidth = snakeState.gridSize.width * this.CELL_SIZE;
    const gameHeight = snakeState.gridSize.height * this.CELL_SIZE;
    const offsetX = (this.canvas.width - gameWidth) / 2;
    const offsetY = (this.canvas.height - gameHeight) / 2;
    
    // Save context and translate for game area
    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    
    // Draw grid lines (optional retro effect)
    this.drawGrid();
    
    // Draw AI visual indicators if assistance is enabled
    if (snakeState.aiAssistanceEnabled && this.currentHint) {
      this.drawAIIndicators();
    }
    
    // Draw food
    this.drawFood(snakeState.food);
    
    // Draw snake
    this.drawSnake(snakeState.snake);
    
    // Restore context for UI elements
    this.ctx.restore();
    
    // Draw UI elements in the margins
    this.drawScore();
    
    // Draw AI hint text if available
    if (snakeState.aiAssistanceEnabled && this.currentHint) {
      this.drawAIHint();
    }
  }

  handleInput(input: InputEvent): void {
    if (input.type !== 'keydown' || !input.key) return;
    
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    let newDirection: Direction | null = null;
    
    switch (input.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        if (snakeState.direction !== 'down') newDirection = 'up';
        break;
      case 'arrowdown':
      case 's':
        if (snakeState.direction !== 'up') newDirection = 'down';
        break;
      case 'arrowleft':
      case 'a':
        if (snakeState.direction !== 'right') newDirection = 'left';
        break;
      case 'arrowright':
      case 'd':
        if (snakeState.direction !== 'left') newDirection = 'right';
        break;
      case ' ':
      case 'p':
        // Spacebar or P to pause/resume
        if (this.gameState.isActive) {
          this.gameState.isPaused = !this.gameState.isPaused;
        }
        break;
      case 'r':
        // R to reset
        this.reset();
        break;
      case 'h':
        // H to toggle AI assistance
        snakeState.aiAssistanceEnabled = !snakeState.aiAssistanceEnabled;
        break;
      case 'c':
        // C to toggle AI challenge mode
        snakeState.aiChallengeMode = !snakeState.aiChallengeMode;
        break;
      case 'x':
        // X to clear saved state and reset (for debugging)
        localStorage.removeItem('retro-game-hub-session');
        this.reset();
        break;
    }
    
    if (newDirection) {
      snakeState.direction = newDirection;
    }
  }

  getState(): GameState {
    return { ...this.gameState };
  }

  setState(state: GameState): void {
    this.gameState = { ...state };
  }

  reset(): void {
    this.gameState = this.createInitialState();
    this.moveTimer = 0;
  }

  pause(): void {
    this.gameState.isPaused = true;
  }

  resume(): void {
    this.gameState.isPaused = false;
  }

  destroy(): void {
    // Clean up any resources if needed
  }

  // Configuration methods
  setGridSize(width: number, height: number): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    snakeState.gridSize = { width, height };
    
    // Don't resize canvas - keep using full available space
    
    // Reset with new grid size
    this.resetWithGridSize(width, height);
  }

  setSpeed(speed: number): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    snakeState.speed = Math.max(50, Math.min(1000, speed)); // Clamp between 50-1000ms
  }

  setAIAssistance(enabled: boolean): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    snakeState.aiAssistanceEnabled = enabled;
  }

  setAIChallengeMode(enabled: boolean): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    snakeState.aiChallengeMode = enabled;
  }

  private resetWithGridSize(width: number, height: number): void {
    this.gameState = this.createInitialStateWithGridSize({ width, height });
    this.moveTimer = 0;
  }

  private createInitialState(): GameState {
    return this.createInitialStateWithGridSize(this.DEFAULT_GRID_SIZE);
  }

  private createInitialStateWithGridSize(gridSize: { width: number; height: number }): GameState {
    const centerX = Math.floor(gridSize.width / 2);
    const centerY = Math.floor(gridSize.height / 2);
    
    const snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY }
    ];
    
    const snakeState: SnakeState = {
      snake,
      food: this.generateFoodStandard(snake, gridSize), // Use standard generation during initialization
      direction: 'right',
      gridSize,
      speed: this.DEFAULT_SPEED,
      aiAssistanceEnabled: true,  // Enable AI assistance by default
      aiChallengeMode: false
    };

    return {
      gameType: 'snake',
      isActive: true,
      isPaused: false,
      score: 0,
      level: 1,
      timeElapsed: 0,
      gameSpecificData: snakeState
    };
  }

  private moveSnake(): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    const head = snakeState.snake[0];
    const newHead = this.getNextPosition(head, snakeState.direction);
    
    // Check wall collision
    if (this.isWallCollision(newHead, snakeState.gridSize)) {
      this.gameOver();
      return;
    }
    
    // Check self collision
    if (this.isSelfCollision(newHead, snakeState.snake)) {
      this.gameOver();
      return;
    }
    
    // Move snake
    snakeState.snake.unshift(newHead);
    
    // Check food consumption
    if (this.isPositionEqual(newHead, snakeState.food)) {
      this.consumeFood();
    } else {
      // Remove tail if no food consumed
      snakeState.snake.pop();
    }
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

  private isWallCollision(position: Position, gridSize: { width: number; height: number }): boolean {
    return position.x < 0 || position.x >= gridSize.width || 
           position.y < 0 || position.y >= gridSize.height;
  }

  private isSelfCollision(position: Position, snake: Position[]): boolean {
    return snake.some(segment => this.isPositionEqual(position, segment));
  }

  private isPositionEqual(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  private consumeFood(): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    
    // Increase score
    this.gameState.score += 10;
    
    // Increase speed slightly (make game harder)
    snakeState.speed = Math.max(50, snakeState.speed - 5);
    
    // Update level based on score
    this.gameState.level = Math.floor(this.gameState.score / 100) + 1;
    
    // Generate new food
    snakeState.food = this.generateFood(snakeState.snake, snakeState.gridSize);
  }

  private generateFood(snake: Position[], gridSize: { width: number; height: number }): Position {
    // Check if we have a valid game state and AI challenge mode is enabled
    if (this.gameState?.gameSpecificData) {
      const snakeState = this.gameState.gameSpecificData as SnakeState;
      if (snakeState.aiChallengeMode) {
        return this.aiAssistant.generateStrategicFoodPosition(snakeState);
      }
    }
    
    return this.generateFoodStandard(snake, gridSize);
  }

  private generateFoodStandard(snake: Position[], gridSize: { width: number; height: number }): Position {
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

  private gameOver(): void {
    this.gameState.isActive = false;
  }

  private drawGrid(): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    const gameWidth = snakeState.gridSize.width * this.CELL_SIZE;
    const gameHeight = snakeState.gridSize.height * this.CELL_SIZE;
    
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= snakeState.gridSize.width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.CELL_SIZE, 0);
      this.ctx.lineTo(x * this.CELL_SIZE, gameHeight);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= snakeState.gridSize.height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.CELL_SIZE);
      this.ctx.lineTo(gameWidth, y * this.CELL_SIZE);
      this.ctx.stroke();
    }
  }

  private drawSnake(snake: Position[]): void {
    snake.forEach((segment, index) => {
      // Head is brighter green, body is darker
      this.ctx.fillStyle = index === 0 ? '#00FF00' : '#00AA00';
      this.ctx.fillRect(
        segment.x * this.CELL_SIZE + 1,
        segment.y * this.CELL_SIZE + 1,
        this.CELL_SIZE - 2,
        this.CELL_SIZE - 2
      );
    });
  }

  private drawFood(food: Position): void {
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(
      food.x * this.CELL_SIZE + 2,
      food.y * this.CELL_SIZE + 2,
      this.CELL_SIZE - 4,
      this.CELL_SIZE - 4
    );
  }

  private drawScore(): void {
    const snakeState = this.gameState.gameSpecificData as SnakeState;
    
    // Position score panel on the left side
    const panelX = 20;
    const panelY = 50;
    const panelWidth = 180;
    const panelHeight = 135; // Increased height to accommodate all text
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'left';
    
    // Draw score with background for better visibility
    const scoreText = `Score: ${this.gameState.score}`;
    const levelText = `Level: ${this.gameState.level}`;
    const aiStatusText = `AI: ${snakeState.aiAssistanceEnabled ? 'ON' : 'OFF'}`;
    const challengeText = snakeState.aiChallengeMode ? ' (Challenge)' : '';
    
    // Draw background rectangles for better visibility
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Draw border
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Draw text
    this.ctx.fillStyle = '#00FF00'; // Bright green for better visibility
    this.ctx.fillText(scoreText, panelX + 10, panelY + 25);
    this.ctx.fillText(levelText, panelX + 10, panelY + 45);
    
    // Draw AI status
    this.ctx.fillStyle = snakeState.aiAssistanceEnabled ? '#00FFFF' : '#888888';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(aiStatusText + challengeText, panelX + 10, panelY + 70);
    
    // Draw controls hint
    this.ctx.fillStyle = '#CCCCCC';
    this.ctx.font = '10px monospace';
    this.ctx.fillText('H: AI Toggle', panelX + 10, panelY + 90);
    this.ctx.fillText('C: Challenge', panelX + 10, panelY + 105);
    this.ctx.fillText('R: Reset', panelX + 10, panelY + 120);
  }

  private updateAIAnalysis(): void {
    this.aiAssistant.analyzeGameState(this.gameState);
    this.currentHint = this.aiAssistant.getHint(this.aiAssistant.getDifficultyLevel());
  }

  private drawAIIndicators(): void {
    if (!this.currentHint?.visualIndicator) return;
    
    const indicators = Array.isArray(this.currentHint.visualIndicator) 
      ? this.currentHint.visualIndicator 
      : [this.currentHint.visualIndicator];
    
    // Draw direction highlighting
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 3;
    
    indicators.forEach(pos => {
      this.ctx.strokeRect(
        pos.x * this.CELL_SIZE + 2,
        pos.y * this.CELL_SIZE + 2,
        this.CELL_SIZE - 4,
        this.CELL_SIZE - 4
      );
    });
    
    // Draw confidence indicator
    const confidence = this.currentHint.confidence || 0;
    const alpha = Math.max(0.3, confidence);
    this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    
    indicators.forEach(pos => {
      this.ctx.fillRect(
        pos.x * this.CELL_SIZE + 4,
        pos.y * this.CELL_SIZE + 4,
        this.CELL_SIZE - 8,
        this.CELL_SIZE - 8
      );
    });
  }

  private drawAIHint(): void {
    if (!this.currentHint) return;
    
    const hintText = `AI: ${this.currentHint.message}`;
    const confidenceText = `Confidence: ${Math.round((this.currentHint.confidence || 0) * 100)}%`;
    
    // Position AI panel on the right side
    const panelX = this.canvas.width - 220;
    const panelY = 50;
    const panelWidth = 200;
    const panelHeight = 100;
    
    // Draw background for AI hint area
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Draw border
    this.ctx.strokeStyle = '#00FFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Draw hint text with better visibility
    this.ctx.fillStyle = '#00FFFF'; // Cyan for better visibility
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'left';
    
    // Word wrap the hint text
    const words = hintText.split(' ');
    let line = '';
    let y = panelY + 20;
    const maxWidth = panelWidth - 20;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, panelX + 10, y);
        line = words[i] + ' ';
        y += 16;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, panelX + 10, y);
    
    // Draw confidence bar
    const barWidth = 120;
    const barHeight = 8;
    const barX = panelX + 10;
    const barY = panelY + 60;
    
    // Background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Confidence fill
    const confidence = this.currentHint.confidence || 0;
    const confidenceWidth = barWidth * confidence;
    const confidenceColor = confidence > 0.7 ? '#00FF00' : 
                           confidence > 0.4 ? '#FFFF00' : '#FF0000';
    this.ctx.fillStyle = confidenceColor;
    this.ctx.fillRect(barX, barY, confidenceWidth, barHeight);
    
    // Label
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(confidenceText, barX, barY + 20);
  }

  // Public methods for AI configuration
  getAIAssistant(): SnakeAIAssistant {
    return this.aiAssistant;
  }

  setAIDifficulty(level: number): void {
    this.aiAssistant.setDifficultyLevel(level);
  }

  setAIDebugMode(enabled: boolean): void {
    this.aiAssistant.setDebugMode(enabled);
  }
}
