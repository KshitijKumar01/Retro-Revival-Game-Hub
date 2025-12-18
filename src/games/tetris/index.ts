/**
 * Tetris Game Module
 * 
 * Classic falling-block Tetris game with AI-enhanced features.
 * Implements piece rotation, collision detection, line clearing,
 * scoring system, and next piece preview functionality.
 */

import { GameModule } from '../../shared/interfaces/GameModule';
import { GameState, TetrisState, TetrisPiece, Position, InputEvent, AIHint } from '../../shared/types';
import { TetrisAIAssistant } from '../../ai/tetris';

export class TetrisGame implements GameModule {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameState: GameState;
  private aiAssistant: TetrisAIAssistant;

  private fallTimer = 0;
  private lockTimer = 0;
  private currentHint?: AIHint;
  private adaptiveDifficultyEnabled = false;
  
  // Game configuration
  private readonly BOARD_WIDTH = 10;
  private readonly BOARD_HEIGHT = 20;
  private readonly CELL_SIZE = 30;
  private readonly LOCK_DELAY = 500; // milliseconds before piece locks
  private readonly LINES_PER_LEVEL = 10;
  
  // Tetris piece definitions
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

  private readonly PIECE_COLORS: Record<TetrisPiece['type'], string> = {
    'I': '#00FFFF', // Cyan
    'O': '#FFFF00', // Yellow
    'T': '#800080', // Purple
    'S': '#00FF00', // Green
    'Z': '#FF0000', // Red
    'J': '#0000FF', // Blue
    'L': '#FFA500'  // Orange
  };

  constructor() {
    this.gameState = this.createInitialState();
    this.aiAssistant = new TetrisAIAssistant();
    
    // Enable debug mode by default for troubleshooting
    this.aiAssistant.setDebugMode(true);
    console.log('Tetris AI Assistant initialized with debug mode enabled');
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    
    // Set canvas size
    this.canvas.width = (this.BOARD_WIDTH + 8) * this.CELL_SIZE; // Extra space for UI elements
    this.canvas.height = this.BOARD_HEIGHT * this.CELL_SIZE;
    
    this.reset();
  }

  update(deltaTime: number): void {
    if (!this.gameState.isActive || this.gameState.isPaused) {
      return;
    }

    this.gameState.timeElapsed += deltaTime;
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    // Update adaptive difficulty if enabled
    if (this.adaptiveDifficultyEnabled) {
      const newSpeed = this.aiAssistant.calculateAdaptiveDifficulty(tetrisState, this.gameState.level);
      tetrisState.fallSpeed = newSpeed;
    }
    
    // Update AI analysis if AI advisor is enabled
    if (tetrisState.aiAdvisorEnabled) {
      try {
        this.aiAssistant.analyzeGameState(this.gameState);
        const hint = this.aiAssistant.getHint(this.aiAssistant.getDifficultyLevel());
        this.currentHint = hint;
        
        // Debug: Log AI hint to console for debugging
        if (this.aiAssistant.isDebugModeEnabled()) {
          console.log('AI Hint:', hint);
        }
      } catch (error) {
        // Gracefully handle AI errors
        console.error('AI analysis error:', error);
        this.currentHint = {
          message: 'AI analysis unavailable: ' + (error as Error).message,
          confidence: 0
        };
      }
    } else {
      this.currentHint = undefined;
    }
    
    // Update fall timer
    this.fallTimer += deltaTime;
    
    // Check if piece should fall
    if (this.fallTimer >= tetrisState.fallSpeed) {
      this.movePieceDown();
      this.fallTimer = 0;
    }
    
    // Update lock timer if piece is at bottom
    if (this.isPieceAtBottom()) {
      this.lockTimer += deltaTime;
      if (this.lockTimer >= this.LOCK_DELAY) {
        this.lockPiece();
        this.lockTimer = 0;
      }
    } else {
      this.lockTimer = 0;
    }
  }

  render(): void {
    if (!this.ctx) return;
    
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw board grid
    this.drawGrid();
    
    // Draw placed pieces on board
    this.drawBoard(tetrisState.board);
    
    // Draw current piece
    this.drawPiece(tetrisState.currentPiece);
    
    // Draw ghost piece (preview of where piece will land)
    this.drawGhostPiece(tetrisState.currentPiece);
    
    // Draw next piece
    this.drawNextPiece(tetrisState.nextPiece);
    
    // Draw held piece if any
    if (tetrisState.heldPiece) {
      this.drawHeldPiece(tetrisState.heldPiece);
    }
    
    // Draw UI elements
    this.drawUI();
    
    // Draw AI hints if enabled
    if (tetrisState.aiAdvisorEnabled && this.currentHint) {
      this.drawAIHint();
    }
    
    // Draw game over screen if game is not active
    if (!this.gameState.isActive) {
      this.drawGameOver();
    }
  }

  handleInput(input: InputEvent): void {
    if (input.type !== 'keydown' || !input.key) return;
    
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    switch (input.key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        this.movePiece(-1, 0);
        break;
      case 'arrowright':
      case 'd':
        this.movePiece(1, 0);
        break;
      case 'arrowdown':
      case 's':
        this.movePieceDown();
        break;
      case 'arrowup':
      case 'w':
        this.rotatePiece();
        break;
      case ' ':
        // Spacebar for hard drop
        this.hardDrop();
        break;
      case 'c':
        // Hold piece
        this.holdPiece();
        break;
      case 'p':
        // Pause/resume
        if (this.gameState.isActive) {
          this.gameState.isPaused = !this.gameState.isPaused;
        }
        break;
      case 'r':
        // Reset
        this.reset();
        break;
      case 'h':
        // Toggle AI advisor
        this.setAIAdvisor(!tetrisState.aiAdvisorEnabled);
        break;
      case 'j':
        // Toggle adaptive difficulty
        this.setAdaptiveDifficulty(!this.adaptiveDifficultyEnabled);
        break;
      case 'k':
        // Toggle AI debug mode
        this.setAIDebugMode(!this.aiAssistant.isDebugModeEnabled());
        console.log('AI Debug mode:', this.aiAssistant.isDebugModeEnabled() ? 'ON' : 'OFF');
        break;
    }
  }

  getState(): GameState {
    return { ...this.gameState };
  }

  setState(state: GameState): void {
    this.gameState = { ...state };
  }

  reset(): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    const aiAdvisorEnabled = tetrisState.aiAdvisorEnabled; // Preserve AI setting
    
    this.gameState = this.createInitialState();
    
    // Restore AI setting
    const newTetrisState = this.gameState.gameSpecificData as TetrisState;
    newTetrisState.aiAdvisorEnabled = aiAdvisorEnabled;
    
    this.fallTimer = 0;
    this.lockTimer = 0;
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
  setAIAdvisor(enabled: boolean): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    tetrisState.aiAdvisorEnabled = enabled;
  }

  setAIDifficultyLevel(level: number): void {
    this.aiAssistant.setDifficultyLevel(level);
  }

  setAdaptiveDifficulty(enabled: boolean): void {
    this.adaptiveDifficultyEnabled = enabled;
  }

  setAIDebugMode(enabled: boolean): void {
    this.aiAssistant.setDebugMode(enabled);
  }

  getAISuggestion(): string {
    if (!this.currentHint) {
      return 'AI advisor disabled';
    }
    
    const suggestion = this.aiAssistant.getSuggestion();
    return this.aiAssistant.explainDecision(suggestion);
  }

  // Public methods for AI configuration
  getAIAssistant(): TetrisAIAssistant {
    return this.aiAssistant;
  }

  private createInitialState(): GameState {
    const board = Array(this.BOARD_HEIGHT).fill(null).map(() => 
      Array(this.BOARD_WIDTH).fill(0)
    );

    const tetrisState: TetrisState = {
      board,
      currentPiece: this.generateRandomPiece(),
      nextPiece: this.generateRandomPiece(),
      heldPiece: undefined,
      linesCleared: 0,
      fallSpeed: 1000, // 1 second initially
      aiAdvisorEnabled: false
    };

    return {
      gameType: 'tetris',
      isActive: true,
      isPaused: false,
      score: 0,
      level: 1,
      timeElapsed: 0,
      gameSpecificData: tetrisState
    };
  }

  private generateRandomPiece(): TetrisPiece {
    const types: TetrisPiece['type'][] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      type,
      rotation: 0,
      position: { x: Math.floor(this.BOARD_WIDTH / 2) - 1, y: 0 },
      shape: this.PIECE_SHAPES[type][0]
    };
  }

  private movePiece(dx: number, dy: number): boolean {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    const newPosition = {
      x: tetrisState.currentPiece.position.x + dx,
      y: tetrisState.currentPiece.position.y + dy
    };

    if (this.isValidPosition(tetrisState.currentPiece, newPosition)) {
      tetrisState.currentPiece.position = newPosition;
      return true;
    }
    return false;
  }

  private movePieceDown(): boolean {
    return this.movePiece(0, 1);
  }

  private rotatePiece(): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    const piece = tetrisState.currentPiece;
    const shapes = this.PIECE_SHAPES[piece.type];
    const newRotation = (piece.rotation + 1) % shapes.length;
    const newShape = shapes[newRotation];

    // Try rotation with wall kicks
    const kickOffsets = this.getWallKickOffsets(piece.type, piece.rotation, newRotation);
    
    for (const offset of kickOffsets) {
      const testPosition = {
        x: piece.position.x + offset.x,
        y: piece.position.y + offset.y
      };

      if (this.isValidPosition({ ...piece, shape: newShape }, testPosition)) {
        piece.rotation = newRotation;
        piece.shape = newShape;
        piece.position = testPosition;
        return;
      }
    }
  }

  private getWallKickOffsets(type: TetrisPiece['type'], _fromRotation: number, _toRotation: number): Position[] {
    // Simplified wall kick system - try basic offsets
    if (type === 'I') {
      return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }];
    }
    return [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  }

  private hardDrop(): void {
    let dropDistance = 0;
    
    while (this.movePieceDown()) {
      dropDistance++;
    }
    
    // Award points for hard drop
    this.gameState.score += dropDistance * 2;
    
    // Lock piece immediately
    this.lockPiece();
  }

  private holdPiece(): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    if (tetrisState.heldPiece) {
      // Swap current and held piece
      const temp = tetrisState.currentPiece;
      tetrisState.currentPiece = { ...tetrisState.heldPiece };
      tetrisState.currentPiece.position = { x: Math.floor(this.BOARD_WIDTH / 2) - 1, y: 0 };
      tetrisState.heldPiece = temp;
    } else {
      // Hold current piece and spawn next
      tetrisState.heldPiece = tetrisState.currentPiece;
      tetrisState.currentPiece = tetrisState.nextPiece;
      tetrisState.nextPiece = this.generateRandomPiece();
    }
  }

  private isPieceAtBottom(): boolean {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    const testPosition = {
      x: tetrisState.currentPiece.position.x,
      y: tetrisState.currentPiece.position.y + 1
    };
    
    return !this.isValidPosition(tetrisState.currentPiece, testPosition);
  }

  private lockPiece(): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    const piece = tetrisState.currentPiece;
    
    // Place piece on board
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = piece.position.x + x;
          const boardY = piece.position.y + y;
          
          if (boardY >= 0 && boardY < this.BOARD_HEIGHT && 
              boardX >= 0 && boardX < this.BOARD_WIDTH) {
            tetrisState.board[boardY][boardX] = this.getPieceColorIndex(piece.type);
          }
        }
      }
    }
    
    // Check for completed lines
    this.clearLines();
    
    // Spawn next piece
    tetrisState.currentPiece = tetrisState.nextPiece;
    tetrisState.nextPiece = this.generateRandomPiece();
    
    // Check game over - if new piece can't be placed at spawn position
    if (!this.isValidPosition(tetrisState.currentPiece, tetrisState.currentPiece.position)) {
      this.gameOver();
      return;
    }
    
    // Also check if any blocks are placed in the top rows (additional safety check)
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < this.BOARD_WIDTH; x++) {
        if (tetrisState.board[y][x] !== 0) {
          // If blocks reach the top 2 rows, game over
          this.gameOver();
          return;
        }
      }
    }
  }

  private clearLines(): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    let linesCleared = 0;
    
    // Check each row from bottom to top
    for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
      if (tetrisState.board[y].every(cell => cell !== 0)) {
        // Remove completed line
        tetrisState.board.splice(y, 1);
        // Add new empty line at top
        tetrisState.board.unshift(Array(this.BOARD_WIDTH).fill(0));
        linesCleared++;
        y++; // Check same row again since we removed a line
      }
    }
    
    if (linesCleared > 0) {
      tetrisState.linesCleared += linesCleared;
      
      // Calculate score based on lines cleared
      const lineScores = [0, 100, 300, 500, 800]; // Single, double, triple, tetris
      this.gameState.score += lineScores[Math.min(linesCleared, 4)] * this.gameState.level;
      
      // Update level and speed
      this.gameState.level = Math.floor(tetrisState.linesCleared / this.LINES_PER_LEVEL) + 1;
      tetrisState.fallSpeed = Math.max(50, 1000 - (this.gameState.level - 1) * 50);
    }
  }

  private isValidPosition(piece: TetrisPiece, position: Position): boolean {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y;
          
          // Check boundaries
          if (boardX < 0 || boardX >= this.BOARD_WIDTH || 
              boardY >= this.BOARD_HEIGHT) {
            return false;
          }
          
          // Check collision with placed pieces (ignore negative Y for spawning)
          if (boardY >= 0 && tetrisState.board[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  private getPieceColorIndex(type: TetrisPiece['type']): number {
    const colorMap: Record<TetrisPiece['type'], number> = {
      'I': 1, 'O': 2, 'T': 3, 'S': 4, 'Z': 5, 'J': 6, 'L': 7
    };
    return colorMap[type];
  }

  private getColorFromIndex(index: number): string {
    const colors = ['#000000', '#00FFFF', '#FFFF00', '#800080', '#00FF00', '#FF0000', '#0000FF', '#FFA500'];
    return colors[index] || '#FFFFFF';
  }

  private gameOver(): void {
    this.gameState.isActive = false;
    console.log('Game Over! Final Score:', this.gameState.score);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= this.BOARD_WIDTH; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.CELL_SIZE, 0);
      this.ctx.lineTo(x * this.CELL_SIZE, this.BOARD_HEIGHT * this.CELL_SIZE);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.CELL_SIZE);
      this.ctx.lineTo(this.BOARD_WIDTH * this.CELL_SIZE, y * this.CELL_SIZE);
      this.ctx.stroke();
    }
  }

  private drawBoard(board: number[][]): void {
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        if (board[y][x] !== 0) {
          this.ctx.fillStyle = this.getColorFromIndex(board[y][x]);
          this.ctx.fillRect(
            x * this.CELL_SIZE + 1,
            y * this.CELL_SIZE + 1,
            this.CELL_SIZE - 2,
            this.CELL_SIZE - 2
          );
        }
      }
    }
  }

  private drawPiece(piece: TetrisPiece): void {
    this.ctx.fillStyle = this.PIECE_COLORS[piece.type];
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = (piece.position.x + x) * this.CELL_SIZE;
          const drawY = (piece.position.y + y) * this.CELL_SIZE;
          
          this.ctx.fillRect(drawX + 1, drawY + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);
        }
      }
    }
  }

  private drawGhostPiece(piece: TetrisPiece): void {
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    // Use AI optimal position if AI advisor is enabled, otherwise use standard ghost
    let ghostPosition: Position;
    
    if (tetrisState.aiAdvisorEnabled) {
      const optimalPosition = this.aiAssistant.getOptimalGhostPosition(tetrisState);
      if (optimalPosition) {
        ghostPosition = optimalPosition;
        // Draw AI ghost with different color (yellow tint)
        this.ctx.fillStyle = '#FFFF0040'; // Yellow with alpha
      } else {
        // Fallback to standard ghost
        ghostPosition = this.getStandardGhostPosition(piece);
        this.ctx.fillStyle = this.PIECE_COLORS[piece.type] + '40';
      }
    } else {
      ghostPosition = this.getStandardGhostPosition(piece);
      this.ctx.fillStyle = this.PIECE_COLORS[piece.type] + '40';
    }
    
    // Draw ghost piece
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = (ghostPosition.x + x) * this.CELL_SIZE;
          const drawY = (ghostPosition.y + y) * this.CELL_SIZE;
          
          this.ctx.fillRect(drawX + 1, drawY + 1, this.CELL_SIZE - 2, this.CELL_SIZE - 2);
        }
      }
    }
  }

  private getStandardGhostPosition(piece: TetrisPiece): Position {
    // Find where piece would land
    let ghostY = piece.position.y;
    while (this.isValidPosition(piece, { x: piece.position.x, y: ghostY + 1 })) {
      ghostY++;
    }
    return { x: piece.position.x, y: ghostY };
  }

  private drawNextPiece(piece: TetrisPiece): void {
    const startX = (this.BOARD_WIDTH + 1) * this.CELL_SIZE;
    const startY = 2 * this.CELL_SIZE;
    
    // Draw "NEXT" label
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('NEXT', startX, startY - 10);
    
    // Draw piece
    this.ctx.fillStyle = this.PIECE_COLORS[piece.type];
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = startX + x * (this.CELL_SIZE * 0.7);
          const drawY = startY + y * (this.CELL_SIZE * 0.7);
          
          this.ctx.fillRect(drawX, drawY, this.CELL_SIZE * 0.7 - 2, this.CELL_SIZE * 0.7 - 2);
        }
      }
    }
  }

  private drawHeldPiece(piece: TetrisPiece): void {
    const startX = (this.BOARD_WIDTH + 1) * this.CELL_SIZE;
    const startY = 6 * this.CELL_SIZE;
    
    // Draw "HOLD" label
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    this.ctx.fillText('HOLD', startX, startY - 10);
    
    // Draw piece
    this.ctx.fillStyle = this.PIECE_COLORS[piece.type];
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const drawX = startX + x * (this.CELL_SIZE * 0.7);
          const drawY = startY + y * (this.CELL_SIZE * 0.7);
          
          this.ctx.fillRect(drawX, drawY, this.CELL_SIZE * 0.7 - 2, this.CELL_SIZE * 0.7 - 2);
        }
      }
    }
  }

  private drawUI(): void {
    const startX = (this.BOARD_WIDTH + 3.5) * this.CELL_SIZE; // Move further right
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    
    // Score
    this.ctx.fillText(`Score: ${this.gameState.score}`, startX, 8 * this.CELL_SIZE);
    
    // Level
    this.ctx.fillText(`Level: ${this.gameState.level}`, startX, 9 * this.CELL_SIZE);
    
    // Lines
    this.ctx.fillText(`Lines: ${tetrisState.linesCleared}`, startX, 10 * this.CELL_SIZE);
    
    // AI Status
    if (tetrisState.aiAdvisorEnabled) {
      this.ctx.fillStyle = '#00FF00';
      this.ctx.fillText('AI: ON', startX, 11 * this.CELL_SIZE);
      
      if (this.adaptiveDifficultyEnabled) {
        this.ctx.fillText('Adaptive: ON', startX, 11.5 * this.CELL_SIZE);
      }
    } else {
      this.ctx.fillStyle = '#FF0000';
      this.ctx.fillText('AI: OFF', startX, 11 * this.CELL_SIZE);
    }
    
    // Controls
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('Controls:', startX, 12.5 * this.CELL_SIZE);
    this.ctx.fillText('↑/W: Rotate', startX, 13 * this.CELL_SIZE);
    this.ctx.fillText('←→/AD: Move', startX, 13.5 * this.CELL_SIZE);
    this.ctx.fillText('↓/S: Soft Drop', startX, 14 * this.CELL_SIZE);
    this.ctx.fillText('Space: Hard Drop', startX, 14.5 * this.CELL_SIZE);
    this.ctx.fillText('C: Hold', startX, 15 * this.CELL_SIZE);
    this.ctx.fillText('H: AI Advisor', startX, 15.5 * this.CELL_SIZE);
    this.ctx.fillText('J: Adaptive', startX, 16 * this.CELL_SIZE);
    this.ctx.fillText('P: Pause, R: Reset', startX, 16.5 * this.CELL_SIZE);
  }

  private drawAIHint(): void {
    if (!this.currentHint) return;
    
    // Only show AI hints when AI is enabled and game is active
    const tetrisState = this.gameState.gameSpecificData as TetrisState;
    if (!tetrisState.aiAdvisorEnabled || !this.gameState.isActive) return;
    
    // Draw AI hint in the right panel instead of bottom
    const startX = (this.BOARD_WIDTH + 3.5) * this.CELL_SIZE;
    const hintY = 17.5 * this.CELL_SIZE;
    
    // Draw AI hint text
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.font = '11px monospace';
    this.ctx.fillText(`AI: ${this.currentHint.message}`, startX, hintY);
  }

  private drawGameOver(): void {
    // Draw semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw game over text
    this.ctx.fillStyle = '#FF0000';
    this.ctx.font = 'bold 32px monospace';
    this.ctx.textAlign = 'center';
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.fillText('GAME OVER', centerX, centerY - 40);
    
    // Draw final score
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '20px monospace';
    this.ctx.fillText(`Final Score: ${this.gameState.score}`, centerX, centerY);
    
    // Draw restart instruction
    this.ctx.font = '16px monospace';
    this.ctx.fillText('Press R to restart', centerX, centerY + 40);
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
  }
}
