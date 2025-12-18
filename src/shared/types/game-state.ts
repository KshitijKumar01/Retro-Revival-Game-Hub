/**
 * Game state types for all game modules
 */

import { Direction, GameType, Position } from './common';

export interface TetrisPiece {
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
  rotation: number;
  position: Position;
  shape: number[][];
}

export type CellState = 'hidden' | 'revealed' | 'flagged' | 'mine' | 'number';

export interface SnakeState {
  snake: Position[];
  food: Position;
  direction: Direction;
  gridSize: { width: number; height: number };
  speed: number;
  aiAssistanceEnabled: boolean;
  aiChallengeMode: boolean;
}

export interface TetrisState {
  board: number[][];
  currentPiece: TetrisPiece;
  nextPiece: TetrisPiece;
  heldPiece?: TetrisPiece;
  linesCleared: number;
  fallSpeed: number;
  aiAdvisorEnabled: boolean;
}

export interface MinesweeperState {
  board: CellState[][];
  minePositions: Position[];
  revealedCells: boolean[][];
  flaggedCells: boolean[][];
  gameStatus: 'playing' | 'won' | 'lost';
  aiHintsEnabled: boolean;
  explainModeEnabled: boolean;
}

export type GameSpecificState = SnakeState | TetrisState | MinesweeperState;

export interface GameState {
  gameType: GameType;
  isActive: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  timeElapsed: number;
  gameSpecificData: GameSpecificState;
}
