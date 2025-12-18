/**
 * AI Configuration Manager
 * 
 * Centralized configuration system for AI assistants across all games.
 * Provides difficulty sliders, debug mode controls, and educational settings.
 */

export interface AIConfigOptions {
  difficultyLevel: number;      // 0 (easy/max assistance) to 1 (hard/min assistance)
  debugMode: boolean;            // Show AI decision-making processes
  educationalMode: boolean;      // Provide detailed explanations
  assistanceIntensity: number;   // 0 (minimal) to 1 (maximum)
  showConfidence: boolean;       // Display confidence indicators
  showAlternatives: boolean;     // Show alternative options
}

export class AIConfig {
  private static instance: AIConfig;
  private config: AIConfigOptions;
  private listeners: Set<(config: AIConfigOptions) => void> = new Set();

  private constructor() {
    // Default configuration
    this.config = {
      difficultyLevel: 0.5,
      debugMode: false,
      educationalMode: true,
      assistanceIntensity: 0.7,
      showConfidence: true,
      showAlternatives: false
    };

    // Load from localStorage if available
    this.loadFromStorage();
  }

  static getInstance(): AIConfig {
    if (!AIConfig.instance) {
      AIConfig.instance = new AIConfig();
    }
    return AIConfig.instance;
  }

  getConfig(): Readonly<AIConfigOptions> {
    return { ...this.config };
  }

  setDifficultyLevel(level: number): void {
    // Handle NaN and invalid values
    if (isNaN(level) || !isFinite(level)) {
      return;
    }
    
    const oldLevel = this.config.difficultyLevel;
    this.config.difficultyLevel = Math.max(0, Math.min(1, level));
    
    if (oldLevel !== this.config.difficultyLevel) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  setDebugMode(enabled: boolean): void {
    if (this.config.debugMode !== enabled) {
      this.config.debugMode = enabled;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  setEducationalMode(enabled: boolean): void {
    if (this.config.educationalMode !== enabled) {
      this.config.educationalMode = enabled;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  setAssistanceIntensity(intensity: number): void {
    // Handle NaN and invalid values
    if (isNaN(intensity) || !isFinite(intensity)) {
      return;
    }
    
    const oldIntensity = this.config.assistanceIntensity;
    this.config.assistanceIntensity = Math.max(0, Math.min(1, intensity));
    
    if (oldIntensity !== this.config.assistanceIntensity) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  setShowConfidence(show: boolean): void {
    if (this.config.showConfidence !== show) {
      this.config.showConfidence = show;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  setShowAlternatives(show: boolean): void {
    if (this.config.showAlternatives !== show) {
      this.config.showAlternatives = show;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  updateConfig(partial: Partial<AIConfigOptions>): void {
    const changed = Object.keys(partial).some(key => {
      const k = key as keyof AIConfigOptions;
      return this.config[k] !== partial[k];
    });

    if (changed) {
      this.config = { ...this.config, ...partial };
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to configuration changes
   * @param listener Callback function to be called when config changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (config: AIConfigOptions) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach(listener => listener(config));
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('retro-game-hub-ai-config', JSON.stringify(this.config));
      }
    } catch (error) {
      // Silently fail in test environments
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('retro-game-hub-ai-config');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.config = { ...this.config, ...parsed };
        }
      }
    } catch (error) {
      // Silently fail in test environments
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = {
      difficultyLevel: 0.5,
      debugMode: false,
      educationalMode: true,
      assistanceIntensity: 0.7,
      showConfidence: true,
      showAlternatives: false
    };
    this.saveToStorage();
    this.notifyListeners();
  }
}
