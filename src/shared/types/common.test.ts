/**
 * Tests for common types and fast-check setup verification
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Position, Direction, GameType, RiskLevel } from './common';

describe('Common Types', () => {
  describe('Position', () => {
    it('should create valid positions', () => {
      const pos: Position = { x: 10, y: 20 };
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
    });
  });

  describe('Direction', () => {
    it('should support all four directions', () => {
      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      expect(directions).toHaveLength(4);
    });
  });

  describe('GameType', () => {
    it('should support all three game types', () => {
      const games: GameType[] = ['snake', 'tetris', 'minesweeper'];
      expect(games).toHaveLength(3);
    });
  });

  describe('RiskLevel', () => {
    it('should support all risk levels', () => {
      const risks: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      expect(risks).toHaveLength(4);
    });
  });
});

describe('Fast-check Setup Verification', () => {
  it('should generate valid positions with fast-check', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (x, y) => {
          const pos: Position = { x, y };
          return pos.x >= 0 && pos.x <= 100 && pos.y >= 0 && pos.y <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate valid directions with fast-check', () => {
    const directionArb = fc.constantFrom<Direction>('up', 'down', 'left', 'right');
    
    fc.assert(
      fc.property(directionArb, (dir) => {
        return ['up', 'down', 'left', 'right'].includes(dir);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate valid game types with fast-check', () => {
    const gameTypeArb = fc.constantFrom<GameType>('snake', 'tetris', 'minesweeper');
    
    fc.assert(
      fc.property(gameTypeArb, (gameType) => {
        return ['snake', 'tetris', 'minesweeper'].includes(gameType);
      }),
      { numRuns: 100 }
    );
  });
});
