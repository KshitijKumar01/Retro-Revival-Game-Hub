/**
 * StateManager Implementation
 * 
 * Handles persistent state management, high scores, and session restoration
 * for the Retro Game Hub. Provides localStorage-based persistence with
 * validation and error handling.
 */

import { GameType, GameState } from './types';

/**
 * High score entry for a specific game
 */
export interface HighScoreEntry {
  score: number;
  level: number;
  timestamp: number;
  gameType: GameType;
  playerName?: string;
}

/**
 * High scores collection for all games
 */
export interface HighScores {
  snake: HighScoreEntry[];
  tetris: HighScoreEntry[];
  minesweeper: HighScoreEntry[];
}

/**
 * Persistent session data
 */
export interface SessionData {
  lastPlayedGame: GameType | null;
  gameStates: Record<GameType, GameState | null>;
  highScores: HighScores;
  preferences: {
    theme: 'win95' | 'arcade' | 'dos';
    enableCRT: boolean;
    enableAudio: boolean;
    volume: number;
  };
  sessionId: string;
  lastSaveTime: number;
}

/**
 * State validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * StateManager handles all persistent state operations
 */
export class StateManager {
  private static readonly STORAGE_KEY = 'retro-game-hub-session';
  private static readonly HIGH_SCORES_KEY = 'retro-game-hub-high-scores';
  private static readonly MAX_HIGH_SCORES = 10;
  private static readonly SESSION_VERSION = '1.0.0';

  private sessionData: SessionData;
  private saveTimeout: number | null = null;
  private readonly AUTO_SAVE_DELAY = 1000; // 1 second

  constructor() {
    this.sessionData = this.createDefaultSession();
    this.loadSession();
  }

  /**
   * Create default session data
   */
  private createDefaultSession(): SessionData {
    return {
      lastPlayedGame: null,
      gameStates: {
        snake: null,
        tetris: null,
        minesweeper: null,
      },
      highScores: {
        snake: [],
        tetris: [],
        minesweeper: [],
      },
      preferences: {
        theme: 'win95',
        enableCRT: false,
        enableAudio: true,
        volume: 0.7,
      },
      sessionId: this.generateSessionId(),
      lastSaveTime: Date.now(),
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load session data from localStorage
   */
  private loadSession(): void {
    try {
      const saved = localStorage.getItem(StateManager.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SessionData;
        const validation = this.validateSessionData(parsed);
        
        if (validation.isValid) {
          this.sessionData = { ...this.sessionData, ...parsed };
          // Generate new session ID for this session
          this.sessionData.sessionId = this.generateSessionId();
        } else {
          console.warn('Invalid session data found, using defaults:', validation.errors);
          this.sessionData = this.createDefaultSession();
        }
      }
      
      // Load high scores separately for better error isolation
      this.loadHighScores();
      
    } catch (error) {
      console.error('Failed to load session data:', error);
      this.sessionData = this.createDefaultSession();
    }
  }

  /**
   * Load high scores from localStorage
   */
  private loadHighScores(): void {
    try {
      const saved = localStorage.getItem(StateManager.HIGH_SCORES_KEY);
      if (saved) {
        const highScores = JSON.parse(saved) as HighScores;
        if (this.validateHighScores(highScores)) {
          this.sessionData.highScores = highScores;
        }
      }
    } catch (error) {
      console.error('Failed to load high scores:', error);
      // Keep default empty high scores
    }
  }

  /**
   * Validate session data structure
   */
  private validateSessionData(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Session data must be an object');
      return { isValid: false, errors };
    }

    // Validate game states
    if (data.gameStates && typeof data.gameStates === 'object') {
      const gameTypes: GameType[] = ['snake', 'tetris', 'minesweeper'];
      for (const gameType of gameTypes) {
        if (data.gameStates[gameType] !== null) {
          const stateValidation = this.validateGameState(data.gameStates[gameType]);
          if (!stateValidation.isValid) {
            errors.push(`Invalid ${gameType} state: ${stateValidation.errors.join(', ')}`);
          }
        }
      }
    }

    // Validate preferences
    if (data.preferences && typeof data.preferences === 'object') {
      const prefs = data.preferences;
      if (prefs.theme && !['win95', 'arcade', 'dos'].includes(prefs.theme)) {
        errors.push('Invalid theme preference');
      }
      if (typeof prefs.enableCRT !== 'boolean') {
        errors.push('enableCRT must be boolean');
      }
      if (typeof prefs.enableAudio !== 'boolean') {
        errors.push('enableAudio must be boolean');
      }
      if (typeof prefs.volume !== 'number' || prefs.volume < 0 || prefs.volume > 1) {
        errors.push('volume must be number between 0 and 1');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate individual game state
   */
  private validateGameState(state: any): ValidationResult {
    const errors: string[] = [];

    if (!state || typeof state !== 'object') {
      errors.push('Game state must be an object');
      return { isValid: false, errors };
    }

    // Required fields
    const requiredFields = ['gameType', 'isActive', 'isPaused', 'score', 'level', 'timeElapsed', 'gameSpecificData'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validation
    if (typeof state.gameType !== 'string' || !['snake', 'tetris', 'minesweeper'].includes(state.gameType)) {
      errors.push('Invalid gameType');
    }
    if (typeof state.isActive !== 'boolean') {
      errors.push('isActive must be boolean');
    }
    if (typeof state.isPaused !== 'boolean') {
      errors.push('isPaused must be boolean');
    }
    if (typeof state.score !== 'number' || state.score < 0) {
      errors.push('score must be non-negative number');
    }
    if (typeof state.level !== 'number' || state.level < 1) {
      errors.push('level must be positive number');
    }
    if (typeof state.timeElapsed !== 'number' || state.timeElapsed < 0) {
      errors.push('timeElapsed must be non-negative number');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate high scores structure
   */
  private validateHighScores(highScores: any): boolean {
    if (!highScores || typeof highScores !== 'object') {
      return false;
    }

    const gameTypes: GameType[] = ['snake', 'tetris', 'minesweeper'];
    for (const gameType of gameTypes) {
      if (!Array.isArray(highScores[gameType])) {
        return false;
      }
      
      for (const entry of highScores[gameType]) {
        if (!this.validateHighScoreEntry(entry)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate individual high score entry
   */
  private validateHighScoreEntry(entry: any): boolean {
    return (
      entry &&
      typeof entry === 'object' &&
      typeof entry.score === 'number' &&
      entry.score >= 0 &&
      typeof entry.level === 'number' &&
      entry.level >= 1 &&
      typeof entry.timestamp === 'number' &&
      entry.timestamp > 0 &&
      typeof entry.gameType === 'string' &&
      ['snake', 'tetris', 'minesweeper'].includes(entry.gameType)
    );
  }

  /**
   * Save session data to localStorage with debouncing
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      this.saveSession();
      this.saveTimeout = null;
    }, this.AUTO_SAVE_DELAY);
  }

  /**
   * Immediately save session data to localStorage
   */
  private saveSession(): void {
    try {
      this.sessionData.lastSaveTime = Date.now();
      
      // Save session data
      localStorage.setItem(StateManager.STORAGE_KEY, JSON.stringify(this.sessionData));
      
      // Save high scores separately
      localStorage.setItem(StateManager.HIGH_SCORES_KEY, JSON.stringify(this.sessionData.highScores));
      
    } catch (error) {
      console.error('Failed to save session data:', error);
      
      // Try to clear some space and retry once
      if (error instanceof DOMException && error.code === DOMException.QUOTA_EXCEEDED_ERR) {
        this.clearOldData();
        try {
          localStorage.setItem(StateManager.STORAGE_KEY, JSON.stringify(this.sessionData));
          localStorage.setItem(StateManager.HIGH_SCORES_KEY, JSON.stringify(this.sessionData.highScores));
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Clear old data to free up localStorage space
   */
  private clearOldData(): void {
    try {
      // Remove old session data (keep only current)
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('retro-game-hub-') && key !== StateManager.STORAGE_KEY && key !== StateManager.HIGH_SCORES_KEY) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Failed to clear old data:', error);
    }
  }

  // Public API

  /**
   * Save game state for a specific game
   */
  saveGameState(gameType: GameType, state: GameState): void {
    const validation = this.validateGameState(state);
    if (!validation.isValid) {
      console.error(`Invalid game state for ${gameType}:`, validation.errors);
      return;
    }

    this.sessionData.gameStates[gameType] = { ...state };
    this.sessionData.lastPlayedGame = gameType;
    this.scheduleSave();
  }

  /**
   * Load game state for a specific game
   */
  loadGameState(gameType: GameType): GameState | null {
    return this.sessionData.gameStates[gameType];
  }

  /**
   * Clear game state for a specific game
   */
  clearGameState(gameType: GameType): void {
    this.sessionData.gameStates[gameType] = null;
    if (this.sessionData.lastPlayedGame === gameType) {
      this.sessionData.lastPlayedGame = null;
    }
    this.scheduleSave();
  }

  /**
   * Get the last played game
   */
  getLastPlayedGame(): GameType | null {
    return this.sessionData.lastPlayedGame;
  }

  /**
   * Add a new high score entry
   */
  addHighScore(entry: Omit<HighScoreEntry, 'timestamp'>): boolean {
    const fullEntry: HighScoreEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    if (!this.validateHighScoreEntry(fullEntry)) {
      console.error('Invalid high score entry:', fullEntry);
      return false;
    }

    const gameScores = this.sessionData.highScores[entry.gameType];
    gameScores.push(fullEntry);
    
    // Sort by score (descending) and keep only top entries
    gameScores.sort((a, b) => b.score - a.score);
    this.sessionData.highScores[entry.gameType] = gameScores.slice(0, StateManager.MAX_HIGH_SCORES);
    
    this.scheduleSave();
    return true;
  }

  /**
   * Get high scores for a specific game
   */
  getHighScores(gameType: GameType): HighScoreEntry[] {
    return [...this.sessionData.highScores[gameType]];
  }

  /**
   * Get all high scores
   */
  getAllHighScores(): HighScores {
    return {
      snake: [...this.sessionData.highScores.snake],
      tetris: [...this.sessionData.highScores.tetris],
      minesweeper: [...this.sessionData.highScores.minesweeper],
    };
  }

  /**
   * Check if a score qualifies as a high score
   */
  isHighScore(gameType: GameType, score: number): boolean {
    const scores = this.sessionData.highScores[gameType];
    return scores.length < StateManager.MAX_HIGH_SCORES || score > scores[scores.length - 1].score;
  }

  /**
   * Clear all high scores for a game
   */
  clearHighScores(gameType: GameType): void {
    this.sessionData.highScores[gameType] = [];
    this.scheduleSave();
  }

  /**
   * Get user preferences
   */
  getPreferences(): SessionData['preferences'] {
    return { ...this.sessionData.preferences };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<SessionData['preferences']>): void {
    this.sessionData.preferences = { ...this.sessionData.preferences, ...preferences };
    this.scheduleSave();
  }

  /**
   * Check if there's an interrupted session to restore
   */
  hasInterruptedSession(): boolean {
    return this.sessionData.lastPlayedGame !== null && 
           this.sessionData.gameStates[this.sessionData.lastPlayedGame] !== null;
  }

  /**
   * Get interrupted session info
   */
  getInterruptedSession(): { gameType: GameType; state: GameState } | null {
    if (!this.hasInterruptedSession() || !this.sessionData.lastPlayedGame) {
      return null;
    }

    const state = this.sessionData.gameStates[this.sessionData.lastPlayedGame];
    if (!state) {
      return null;
    }

    return {
      gameType: this.sessionData.lastPlayedGame,
      state,
    };
  }

  /**
   * Clear interrupted session
   */
  clearInterruptedSession(): void {
    if (this.sessionData.lastPlayedGame) {
      this.clearGameState(this.sessionData.lastPlayedGame);
    }
  }

  /**
   * Export all data for backup
   */
  exportData(): string {
    return JSON.stringify(this.sessionData, null, 2);
  }

  /**
   * Import data from backup
   */
  importData(data: string): boolean {
    try {
      const parsed = JSON.parse(data) as SessionData;
      const validation = this.validateSessionData(parsed);
      
      if (validation.isValid) {
        this.sessionData = parsed;
        this.sessionData.sessionId = this.generateSessionId(); // New session ID
        this.saveSession();
        return true;
      } else {
        console.error('Invalid import data:', validation.errors);
        return false;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  /**
   * Reset all data to defaults
   */
  reset(): void {
    this.sessionData = this.createDefaultSession();
    this.saveSession();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    sessionId: string;
    lastSaveTime: number;
    totalGamesPlayed: number;
    totalHighScores: number;
  } {
    const totalHighScores = Object.values(this.sessionData.highScores)
      .reduce((total, scores) => total + scores.length, 0);
    
    const totalGamesPlayed = Object.values(this.sessionData.gameStates)
      .filter(state => state !== null).length;

    return {
      sessionId: this.sessionData.sessionId,
      lastSaveTime: this.sessionData.lastSaveTime,
      totalGamesPlayed,
      totalHighScores,
    };
  }

  /**
   * Force immediate save (useful before page unload)
   */
  forceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveSession();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.forceSave();
  }
}