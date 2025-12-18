/**
 * Common types used across the Retro Game Hub
 */

export type GameType = 'snake' | 'tetris' | 'minesweeper';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface InputEvent {
  type: 'keydown' | 'keyup' | 'click';
  key?: string;
  position?: Position;
  timestamp: number;
}
