/**
 * Minesweeper Game Module
 * 
 * Classic grid-based Minesweeper game with AI-enhanced features.
 * Implements mine placement, number clue calculation, cell revealing,
 * flagging mechanics, and win/lose condition detection.
 */

import { GameModule } from '../../shared/interfaces/GameModule';
import { GameState, MinesweeperState, CellState, Position, InputEvent, AIHint } from '../../shared/types';
import { MinesweeperAIAssistant } from '../../ai/minesweeper';

export class MinesweeperGame implements GameModule {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private gameState: GameState;
  private aiAssistant: MinesweeperAIAssistant;
  private currentHint?: AIHint;
  
  // Game configuration
  private readonly DEFAULT_GRID_SIZE = { width: 16, height: 16 };
  private readonly DEFAULT_MINE_COUNT = 40;
  private readonly CELL_SIZE = 30;
  
  // Number colors for clues (classic Minesweeper colors)
  private readonly NUMBER_COLORS = [
    '#000000', // 0 (not used)
    '#0000FF', // 1 - Blue
    '#008000', // 2 - Green
    '#FF0000', // 3 - Red
    '#000080', // 4 - Dark Blue
    '#800000', // 5 - Maroon
    '#008080', // 6 - Teal
    '#000000', // 7 - Black
    '#808080'  // 8 - Gray
  ];
  
  constructor() {
    this.gameState = this.createInitialState();
    this.aiAssistant = new MinesweeperAIAssistant();
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    
    // Set canvas size based on grid
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    this.canvas.width = minesweeperState.board[0].length * this.CELL_SIZE;
    this.canvas.height = minesweeperState.board.length * this.CELL_SIZE + 200; // Extra space for UI and AI hints
    
    this.reset();
  }

  update(deltaTime: number): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Update AI analysis if hints are enabled (even when game is over for learning)
    if (minesweeperState.aiHintsEnabled) {
      this.updateAIAnalysis();
    }
    
    // Only update game logic if active and not paused
    if (!this.gameState.isActive || this.gameState.isPaused) {
      return;
    }

    this.gameState.timeElapsed += deltaTime;
    
    // Check win condition
    this.checkWinCondition();
  }

  render(): void {
    if (!this.ctx) return;
    
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Clear canvas with retro background
    this.ctx.fillStyle = '#C0C0C0'; // Classic Windows gray
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw board
    this.drawBoard(minesweeperState);
    
    // Draw debug mode (show mine positions)
    if ((minesweeperState as any).debugMode) {
      this.drawDebugMines(minesweeperState);
    }
    
    // Draw AI hints if enabled
    if (minesweeperState.aiHintsEnabled && this.currentHint) {
      this.drawAIHints();
    }
    
    // Draw UI elements
    this.drawUI();
  }

  handleInput(input: InputEvent): void {
    if (input.type === 'click' && input.position) {
      // Check if in flag mode or shift-click for flagging
      const isRightClick = (this as any).flagMode || (input as any).shiftKey || (input as any).button === 2;
      this.handleCellClick(input.position, isRightClick);
      
      // Reset flag mode after click
      if ((this as any).flagMode) {
        (this as any).flagMode = false;
      }
    } else if (input.type === 'keydown' && input.key) {
      this.handleKeyPress(input.key);
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
  setAIHints(enabled: boolean): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    minesweeperState.aiHintsEnabled = enabled;
  }

  setExplainMode(enabled: boolean): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    minesweeperState.explainModeEnabled = enabled;
  }

  setAIDifficulty(level: number): void {
    this.aiAssistant.setDifficultyLevel(level);
  }

  private createInitialState(): GameState {
    const gridWidth = this.DEFAULT_GRID_SIZE.width;
    const gridHeight = this.DEFAULT_GRID_SIZE.height;
    
    // Initialize empty board
    const board: CellState[][] = Array(gridHeight).fill(null).map(() => 
      Array(gridWidth).fill('hidden' as CellState)
    );
    
    const revealedCells: boolean[][] = Array(gridHeight).fill(null).map(() => 
      Array(gridWidth).fill(false)
    );
    
    const flaggedCells: boolean[][] = Array(gridHeight).fill(null).map(() => 
      Array(gridWidth).fill(false)
    );
    
    // Generate mine positions
    const minePositions = this.generateMinePositions(gridWidth, gridHeight, this.DEFAULT_MINE_COUNT);
    
    const minesweeperState: MinesweeperState = {
      board,
      minePositions,
      revealedCells,
      flaggedCells,
      gameStatus: 'playing',
      aiHintsEnabled: false,
      explainModeEnabled: false
    };

    return {
      gameType: 'minesweeper',
      isActive: true,
      isPaused: false,
      score: 0,
      level: 1,
      timeElapsed: 0,
      gameSpecificData: minesweeperState
    };
  }

  private generateMinePositions(width: number, height: number, mineCount: number): Position[] {
    const positions: Position[] = [];
    const totalCells = width * height;
    const actualMineCount = Math.min(mineCount, totalCells - 1); // Leave at least one safe cell
    
    while (positions.length < actualMineCount) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      
      // Check if position already has a mine
      if (!positions.some(pos => pos.x === x && pos.y === y)) {
        positions.push({ x, y });
      }
    }
    
    return positions;
  }

  private handleCellClick(clickPosition: Position, isRightClick: boolean = false): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Convert screen coordinates to grid coordinates
    const gridX = Math.floor(clickPosition.x / this.CELL_SIZE);
    const gridY = Math.floor(clickPosition.y / this.CELL_SIZE);
    
    // Validate coordinates
    if (!this.isValidPosition(gridX, gridY)) {
      return;
    }
    
    // Ignore clicks on already revealed cells
    if (minesweeperState.revealedCells[gridY][gridX]) {
      return;
    }
    
    if (isRightClick) {
      // Right click - toggle flag
      this.toggleFlag(gridX, gridY);
    } else {
      // Left click - reveal cell (only if not flagged)
      if (!minesweeperState.flaggedCells[gridY][gridX]) {
        this.revealCell(gridX, gridY);
      }
    }
  }

  private handleKeyPress(key: string): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    switch (key.toLowerCase()) {
      case ' ':
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
        // Toggle AI hints
        this.setAIHints(!minesweeperState.aiHintsEnabled);
        break;
      case 'e':
        // Toggle explain mode
        this.setExplainMode(!minesweeperState.explainModeEnabled);
        break;
      case 'd':
        // Toggle debug mode (show mine positions)
        (minesweeperState as any).debugMode = !(minesweeperState as any).debugMode;
        break;
      case 'f':
        // Flag mode toggle - next click will flag instead of reveal
        (this as any).flagMode = !(this as any).flagMode;
        break;
      case 't':
        // Test mode - create a scenario where AI can provide hints
        this.createTestScenario();
        break;
    }
  }

  private revealCell(x: number, y: number): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Check if cell is already revealed
    if (minesweeperState.revealedCells[y][x]) {
      return;
    }
    
    // Check if cell has a mine
    if (this.isMine(x, y)) {
      // Game over - hit a mine
      minesweeperState.revealedCells[y][x] = true;
      minesweeperState.gameStatus = 'lost';
      this.gameState.isActive = false;
      this.revealAllMines();
      return;
    }
    
    // Reveal the cell
    minesweeperState.revealedCells[y][x] = true;
    
    // Calculate number of adjacent mines
    const adjacentMines = this.countAdjacentMines(x, y);
    
    // If no adjacent mines, recursively reveal neighbors (flood fill)
    if (adjacentMines === 0) {
      this.revealAdjacentCells(x, y);
    }
    
    // Update score
    this.gameState.score += 1;
  }

  private revealAdjacentCells(x: number, y: number): void {
    const neighbors = this.getNeighbors(x, y);
    
    for (const neighbor of neighbors) {
      const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
      
      // Skip if already revealed or flagged
      if (minesweeperState.revealedCells[neighbor.y][neighbor.x] || 
          minesweeperState.flaggedCells[neighbor.y][neighbor.x]) {
        continue;
      }
      
      // Recursively reveal
      this.revealCell(neighbor.x, neighbor.y);
    }
  }

  toggleFlag(x: number, y: number): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Can't flag revealed cells
    if (minesweeperState.revealedCells[y][x]) {
      return;
    }
    
    // Toggle flag
    minesweeperState.flaggedCells[y][x] = !minesweeperState.flaggedCells[y][x];
  }

  private isMine(x: number, y: number): boolean {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    return minesweeperState.minePositions.some(pos => pos.x === x && pos.y === y);
  }

  countAdjacentMines(x: number, y: number): number {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.filter(pos => this.isMine(pos.x, pos.y)).length;
  }

  private getNeighbors(x: number, y: number): Position[] {
    const neighbors: Position[] = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        // Skip center cell
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (this.isValidPosition(nx, ny)) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    
    return neighbors;
  }

  private isValidPosition(x: number, y: number): boolean {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    return x >= 0 && x < minesweeperState.board[0].length && 
           y >= 0 && y < minesweeperState.board.length;
  }

  private checkWinCondition(): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Already won or lost
    if (minesweeperState.gameStatus !== 'playing') {
      return;
    }
    
    // Count revealed cells
    let revealedCount = 0;
    for (let y = 0; y < minesweeperState.revealedCells.length; y++) {
      for (let x = 0; x < minesweeperState.revealedCells[y].length; x++) {
        if (minesweeperState.revealedCells[y][x]) {
          revealedCount++;
        }
      }
    }
    
    // Win condition: all non-mine cells are revealed
    const totalCells = minesweeperState.board.length * minesweeperState.board[0].length;
    const nonMineCells = totalCells - minesweeperState.minePositions.length;
    
    if (revealedCount === nonMineCells) {
      minesweeperState.gameStatus = 'won';
      this.gameState.isActive = false;
      
      // Bonus score for winning
      this.gameState.score += 1000;
    }
  }

  private revealAllMines(): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    for (const mine of minesweeperState.minePositions) {
      minesweeperState.revealedCells[mine.y][mine.x] = true;
    }
  }

  private drawBoard(state: MinesweeperState): void {
    for (let y = 0; y < state.board.length; y++) {
      for (let x = 0; x < state.board[y].length; x++) {
        this.drawCell(x, y, state);
      }
    }
  }

  private drawCell(x: number, y: number, state: MinesweeperState): void {
    const drawX = x * this.CELL_SIZE;
    const drawY = y * this.CELL_SIZE;
    
    // Draw cell background
    if (state.revealedCells[y][x]) {
      // Revealed cell - light gray background
      this.ctx.fillStyle = '#F0F0F0';
      this.ctx.fillRect(drawX, drawY, this.CELL_SIZE, this.CELL_SIZE);
      
      // Draw mine or number
      if (this.isMine(x, y)) {
        this.drawMine(drawX, drawY);
      } else {
        const adjacentMines = this.countAdjacentMines(x, y);
        if (adjacentMines > 0) {
          this.drawNumber(drawX, drawY, adjacentMines);
        }
      }
      
      // Draw inset border for revealed cells
      this.ctx.strokeStyle = '#808080';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(drawX, drawY + this.CELL_SIZE - 1);
      this.ctx.lineTo(drawX, drawY);
      this.ctx.lineTo(drawX + this.CELL_SIZE - 1, drawY);
      this.ctx.stroke();
      
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.moveTo(drawX + this.CELL_SIZE - 1, drawY);
      this.ctx.lineTo(drawX + this.CELL_SIZE - 1, drawY + this.CELL_SIZE - 1);
      this.ctx.lineTo(drawX, drawY + this.CELL_SIZE - 1);
      this.ctx.stroke();
    } else {
      // Hidden cell - draw raised button with better contrast
      this.ctx.fillStyle = '#C0C0C0';
      this.ctx.fillRect(drawX, drawY, this.CELL_SIZE, this.CELL_SIZE);
      
      // Draw 3D raised border effect with better visibility
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(drawX, drawY + this.CELL_SIZE - 1);
      this.ctx.lineTo(drawX, drawY);
      this.ctx.lineTo(drawX + this.CELL_SIZE - 1, drawY);
      this.ctx.stroke();
      
      this.ctx.strokeStyle = '#404040';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(drawX + this.CELL_SIZE - 1, drawY);
      this.ctx.lineTo(drawX + this.CELL_SIZE - 1, drawY + this.CELL_SIZE - 1);
      this.ctx.lineTo(drawX, drawY + this.CELL_SIZE - 1);
      this.ctx.stroke();
      
      // Draw flag if flagged
      if (state.flaggedCells[y][x]) {
        this.drawFlag(drawX, drawY);
      }
    }
    
    // Draw outer cell border for better grid visibility
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(drawX, drawY, this.CELL_SIZE, this.CELL_SIZE);
  }

  private drawMine(x: number, y: number): void {
    const centerX = x + this.CELL_SIZE / 2;
    const centerY = y + this.CELL_SIZE / 2;
    const radius = this.CELL_SIZE / 4;
    
    // Draw mine circle
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw mine spikes
    const spikeLength = radius * 0.6;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const startX = centerX + Math.cos(angle) * radius;
      const startY = centerY + Math.sin(angle) * radius;
      const endX = centerX + Math.cos(angle) * (radius + spikeLength);
      const endY = centerY + Math.sin(angle) * (radius + spikeLength);
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  private drawNumber(x: number, y: number, number: number): void {
    this.ctx.fillStyle = this.NUMBER_COLORS[number];
    this.ctx.font = 'bold 18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(
      number.toString(),
      x + this.CELL_SIZE / 2,
      y + this.CELL_SIZE / 2
    );
  }

  private drawFlag(x: number, y: number): void {
    const centerX = x + this.CELL_SIZE / 2;
    const centerY = y + this.CELL_SIZE / 2;
    
    // Draw flag pole
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - 8);
    this.ctx.lineTo(centerX, centerY + 8);
    this.ctx.stroke();
    
    // Draw flag
    this.ctx.fillStyle = '#FF0000';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - 8);
    this.ctx.lineTo(centerX + 8, centerY - 4);
    this.ctx.lineTo(centerX, centerY);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawUI(): void {
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    const boardHeight = minesweeperState.board.length * this.CELL_SIZE;
    
    // Calculate mine statistics
    const totalMines = minesweeperState.minePositions.length;
    const flaggedCount = minesweeperState.flaggedCells.flat().filter(Boolean).length;
    const remainingMines = totalMines - flaggedCount;
    
    // Line 1: Game stats (Mines, Time, Status)
    const line1Y = boardHeight + 15;
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    
    this.ctx.fillText(`Mines: ${remainingMines}/${totalMines}`, 10, line1Y);
    this.ctx.fillText(`Time: ${Math.floor(this.gameState.timeElapsed / 1000)}s`, 200, line1Y);
    
    // Game status with better visibility
    let statusText = 'Playing';
    let statusColor = '#008800';
    if (minesweeperState.gameStatus === 'won') {
      statusText = 'YOU WIN!';
      statusColor = '#008800';
    } else if (minesweeperState.gameStatus === 'lost') {
      statusText = 'GAME OVER';
      statusColor = '#CC0000';
    }
    
    this.ctx.fillStyle = statusColor;
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(statusText, 350, line1Y);
    
    // Line 2: AI Status
    const line2Y = boardHeight + 40;
    this.ctx.font = '14px monospace';
    
    // Count revealed cells to check if AI can provide hints
    const revealedCount = minesweeperState.revealedCells.flat().filter(Boolean).length;
    
    if (minesweeperState.aiHintsEnabled) {
      this.ctx.fillStyle = '#0066CC';
      if (revealedCount === 0) {
        this.ctx.fillText('AI Hints: ON (Reveal some cells first)', 10, line2Y);
      } else {
        this.ctx.fillText('AI Hints: ON', 10, line2Y);
      }
    } else {
      this.ctx.fillStyle = '#666666';
      this.ctx.fillText('AI Hints: OFF', 10, line2Y);
    }
    
    if (minesweeperState.explainModeEnabled) {
      this.ctx.fillStyle = '#0066CC';
      this.ctx.fillText('Explain Mode: ON', 200, line2Y);
    }
    
    // Line 3: Controls (moved down to avoid overlap)
    const line3Y = boardHeight + 65;
    this.ctx.fillStyle = '#555555';
    this.ctx.font = '11px monospace';
    
    const flagModeText = (this as any).flagMode ? ' [FLAG MODE]' : '';
    this.ctx.fillText(`Click: Reveal | F+Click: Flag${flagModeText} | H: AI | E: Explain | D: Debug | T: Test | R: Reset`, 10, line3Y);
  }

  private updateAIAnalysis(): void {
    try {
      this.aiAssistant.analyzeGameState(this.gameState);
      this.currentHint = this.aiAssistant.getHint(this.aiAssistant.getDifficultyLevel());
      
      // Debug: Log hint information
      if (this.currentHint && (this.gameState.gameSpecificData as any).debugMode) {
        console.log('AI Hint:', this.currentHint);
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
      // Gracefully handle AI errors
      this.currentHint = {
        message: 'AI analysis unavailable',
        confidence: 0
      };
    }
  }

  private drawAIHints(): void {
    if (!this.currentHint) return;
    
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Draw hint indicators on cells
    if (this.currentHint.visualIndicator) {
      const indicators = Array.isArray(this.currentHint.visualIndicator) 
        ? this.currentHint.visualIndicator 
        : [this.currentHint.visualIndicator];
      
      for (const pos of indicators) {
        const drawX = pos.x * this.CELL_SIZE;
        const drawY = pos.y * this.CELL_SIZE;
        
        // Draw pulsing highlight for better visibility
        const time = Date.now() / 1000;
        const pulse = (Math.sin(time * 4) + 1) / 2; // 0 to 1, faster pulse
        const alpha = 0.6 + (pulse * 0.4); // 0.6 to 1.0, more visible
        
        // Bright green highlight for safe cells
        this.ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
        this.ctx.lineWidth = 5;
        this.ctx.strokeRect(drawX, drawY, this.CELL_SIZE, this.CELL_SIZE);
        
        // Add inner bright glow effect
        this.ctx.strokeStyle = `rgba(50, 255, 50, ${alpha * 0.8})`;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(drawX + 2, drawY + 2, this.CELL_SIZE - 4, this.CELL_SIZE - 4);
        
        // Add center dot for extra visibility
        this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 0.6})`;
        this.ctx.fillRect(drawX + this.CELL_SIZE/2 - 2, drawY + this.CELL_SIZE/2 - 2, 4, 4);
      }
    }
    
    // AI hint message area - positioned well below controls to avoid overlap
    const boardHeight = minesweeperState.board.length * this.CELL_SIZE;
    const aiHintY = boardHeight + 90; // Moved much further down
    
    // Draw background for AI hints for better visibility
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.fillRect(5, aiHintY - 8, this.canvas.width - 10, 35);
    this.ctx.strokeStyle = '#0066CC';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(5, aiHintY - 8, this.canvas.width - 10, 35);
    
    // AI hint text
    this.ctx.fillStyle = '#003399';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    
    // Show basic hint message
    if (this.currentHint && this.currentHint.message) {
      this.ctx.fillText(`AI: ${this.currentHint.message}`, 10, aiHintY);
      
      // Show confidence if available - on a separate line to avoid overlap
      if (this.currentHint.confidence !== undefined) {
        const confidence = Math.round(this.currentHint.confidence * 100);
        this.ctx.fillStyle = '#006600';
        this.ctx.font = 'bold 12px monospace';
        const confidenceText = `${confidence}% confident`;
        const textWidth = this.ctx.measureText(confidenceText).width;
        this.ctx.fillText(confidenceText, this.canvas.width - textWidth - 15, aiHintY + 18);
      }
    } else {
      // Show status when no hint is available
      const revealedCount = minesweeperState.revealedCells.flat().filter(Boolean).length;
      if (revealedCount === 0) {
        this.ctx.fillText('AI: Waiting for game data... (Press T for test scenario)', 10, aiHintY);
      } else {
        this.ctx.fillText('AI: Analyzing...', 10, aiHintY);
      }
    }
    
    // Show detailed explanation if explain mode is enabled
    if (minesweeperState.explainModeEnabled && this.currentHint && this.currentHint.detailedExplanation) {
      const detailY = aiHintY + 42; // More space between AI hint and explanation
      
      // Draw background for detailed explanation
      const explanationHeight = 45;
      this.ctx.fillStyle = 'rgba(240, 248, 255, 0.95)';
      this.ctx.fillRect(5, detailY - 8, this.canvas.width - 10, explanationHeight);
      this.ctx.strokeStyle = '#0066FF';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(5, detailY - 8, this.canvas.width - 10, explanationHeight);
      
      this.ctx.fillStyle = '#0033AA';
      this.ctx.font = '12px monospace';
      
      // Word wrap the explanation text
      const maxWidth = this.canvas.width - 25;
      const words = this.currentHint.detailedExplanation.split(' ');
      let line = '';
      let y = detailY;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = this.ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
          this.ctx.fillText(line, 12, y);
          line = word + ' ';
          y += 15;
          if (y > detailY + 30) break; // Prevent overflow
        } else {
          line = testLine;
        }
      }
      if (line.trim() && y <= detailY + 30) {
        this.ctx.fillText(line, 12, y);
      }
    }
  }

  private drawDebugMines(state: MinesweeperState): void {
    // Draw semi-transparent indicators on mine positions for debugging
    for (const mine of state.minePositions) {
      if (!state.revealedCells[mine.y][mine.x]) {
        const drawX = mine.x * this.CELL_SIZE;
        const drawY = mine.y * this.CELL_SIZE;
        
        // Draw red X to indicate mine
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(drawX + 5, drawY + 5);
        this.ctx.lineTo(drawX + this.CELL_SIZE - 5, drawY + this.CELL_SIZE - 5);
        this.ctx.moveTo(drawX + this.CELL_SIZE - 5, drawY + 5);
        this.ctx.lineTo(drawX + 5, drawY + this.CELL_SIZE - 5);
        this.ctx.stroke();
      }
    }
  }

  private createTestScenario(): void {
    // Reset the game first
    this.reset();
    
    const minesweeperState = this.gameState.gameSpecificData as MinesweeperState;
    
    // Create a simple test pattern where AI can provide hints
    // Reveal some safe cells to create constraints
    const testReveals = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 },
      { x: 0, y: 2 }
    ];
    
    // Safely reveal these cells (avoid mines)
    for (const pos of testReveals) {
      if (!this.isMine(pos.x, pos.y)) {
        minesweeperState.revealedCells[pos.y][pos.x] = true;
      }
    }
    
    // Enable AI hints automatically
    minesweeperState.aiHintsEnabled = true;
    
    console.log('Test scenario created! AI should now provide hints.');
  }

  // Public methods for AI configuration
  getAIAssistant(): MinesweeperAIAssistant {
    return this.aiAssistant;
  }
}
