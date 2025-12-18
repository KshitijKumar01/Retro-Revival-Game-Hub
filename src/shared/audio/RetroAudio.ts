/**
 * RetroAudio
 * 
 * Audio synthesis system for retro sound effects.
 * Uses Web Audio API to generate authentic arcade and DOS-style sounds.
 */

/**
 * Sound effect type identifiers
 */
export type SoundEffectType =
  | 'beep'
  | 'boop'
  | 'click'
  | 'select'
  | 'confirm'
  | 'cancel'
  | 'error'
  | 'success'
  | 'gameOver'
  | 'levelUp'
  | 'pickup'
  | 'drop'
  | 'move'
  | 'collision'
  | 'explosion'
  | 'powerUp';

/**
 * Sound effect configuration
 */
export interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  frequencyEnd?: number;
  detune?: number;
}

/**
 * Predefined retro sound effects
 */
export const RETRO_SOUNDS: Record<SoundEffectType, SoundConfig> = {
  beep: {
    frequency: 800,
    duration: 0.1,
    type: 'square',
    volume: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.5,
    release: 0.05,
  },
  boop: {
    frequency: 400,
    duration: 0.1,
    type: 'square',
    volume: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.5,
    release: 0.05,
  },
  click: {
    frequency: 1000,
    duration: 0.05,
    type: 'square',
    volume: 0.2,
    attack: 0.001,
    decay: 0.02,
    sustain: 0.3,
    release: 0.02,
  },
  select: {
    frequency: 600,
    duration: 0.08,
    type: 'square',
    volume: 0.25,
    attack: 0.01,
    decay: 0.03,
    sustain: 0.4,
    release: 0.03,
    frequencyEnd: 800,
  },
  confirm: {
    frequency: 523,
    duration: 0.15,
    type: 'square',
    volume: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.6,
    release: 0.05,
    frequencyEnd: 784,
  },
  cancel: {
    frequency: 400,
    duration: 0.15,
    type: 'square',
    volume: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.5,
    release: 0.05,
    frequencyEnd: 200,
  },
  error: {
    frequency: 200,
    duration: 0.3,
    type: 'sawtooth',
    volume: 0.35,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.4,
    release: 0.1,
    frequencyEnd: 100,
  },
  success: {
    frequency: 440,
    duration: 0.2,
    type: 'square',
    volume: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.6,
    release: 0.05,
    frequencyEnd: 880,
  },
  gameOver: {
    frequency: 440,
    duration: 0.8,
    type: 'sawtooth',
    volume: 0.4,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.3,
    release: 0.3,
    frequencyEnd: 110,
  },
  levelUp: {
    frequency: 523,
    duration: 0.4,
    type: 'square',
    volume: 0.35,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.1,
    frequencyEnd: 1047,
  },
  pickup: {
    frequency: 880,
    duration: 0.1,
    type: 'square',
    volume: 0.25,
    attack: 0.005,
    decay: 0.03,
    sustain: 0.4,
    release: 0.03,
    frequencyEnd: 1320,
  },
  drop: {
    frequency: 300,
    duration: 0.15,
    type: 'triangle',
    volume: 0.3,
    attack: 0.01,
    decay: 0.05,
    sustain: 0.4,
    release: 0.05,
    frequencyEnd: 100,
  },
  move: {
    frequency: 200,
    duration: 0.05,
    type: 'square',
    volume: 0.15,
    attack: 0.005,
    decay: 0.02,
    sustain: 0.3,
    release: 0.02,
  },
  collision: {
    frequency: 150,
    duration: 0.2,
    type: 'sawtooth',
    volume: 0.4,
    attack: 0.005,
    decay: 0.1,
    sustain: 0.3,
    release: 0.08,
    frequencyEnd: 50,
  },
  explosion: {
    frequency: 100,
    duration: 0.5,
    type: 'sawtooth',
    volume: 0.5,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.2,
    release: 0.2,
    frequencyEnd: 30,
  },
  powerUp: {
    frequency: 440,
    duration: 0.3,
    type: 'square',
    volume: 0.3,
    attack: 0.01,
    decay: 0.08,
    sustain: 0.5,
    release: 0.1,
    frequencyEnd: 1760,
  },
};

/**
 * Audio event for synchronization tracking
 */
export interface AudioEvent {
  type: SoundEffectType;
  timestamp: number;
  duration: number;
}

/**
 * RetroAudio class manages sound synthesis and playback
 */
export class RetroAudio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.5;
  private audioEvents: AudioEvent[] = [];
  private maxEventHistory: number = 100;

  constructor() {
    this.initAudioContext();
  }

  /**
   * Initialize the Web Audio API context
   */
  private initAudioContext(): void {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
      return;
    }

    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.masterVolume;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Play a predefined sound effect
   */
  play(effectType: SoundEffectType): AudioEvent | null {
    const config = RETRO_SOUNDS[effectType];
    if (!config) return null;

    const event = this.playSound(config);
    if (event) {
      event.type = effectType;
    }
    return event;
  }

  /**
   * Play a custom sound with configuration
   */
  playSound(config: SoundConfig): AudioEvent | null {
    if (!this.audioContext || !this.masterGain || this.isMuted) {
      return null;
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const { frequency, duration, type, volume, attack, decay, sustain, release, frequencyEnd, detune } = config;

    // Create oscillator
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    // Apply frequency sweep if specified
    if (frequencyEnd !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(frequencyEnd, now + duration);
    }

    // Apply detune if specified
    if (detune !== undefined) {
      oscillator.detune.setValueAtTime(detune, now);
    }

    // Create gain node for envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);

    // ADSR envelope
    const attackEnd = now + attack;
    const decayEnd = attackEnd + decay;
    const sustainEnd = now + duration - release;
    const releaseEnd = now + duration;

    gainNode.gain.linearRampToValueAtTime(volume, attackEnd);
    gainNode.gain.linearRampToValueAtTime(volume * sustain, decayEnd);
    gainNode.gain.setValueAtTime(volume * sustain, sustainEnd);
    gainNode.gain.linearRampToValueAtTime(0, releaseEnd);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Start and stop
    oscillator.start(now);
    oscillator.stop(releaseEnd);

    // Track audio event
    const audioEvent: AudioEvent = {
      type: 'beep', // Default, will be overwritten by play()
      timestamp: Date.now(),
      duration: duration * 1000, // Convert to milliseconds
    };

    this.audioEvents.push(audioEvent);
    if (this.audioEvents.length > this.maxEventHistory) {
      this.audioEvents.shift();
    }

    return audioEvent;
  }

  /**
   * Play a sequence of notes (for melodies)
   */
  playSequence(notes: Array<{ frequency: number; duration: number }>, baseConfig?: Partial<SoundConfig>): void {
    if (!this.audioContext) return;

    let delay = 0;
    const defaultConfig: SoundConfig = {
      frequency: 440,
      duration: 0.1,
      type: 'square',
      volume: 0.3,
      attack: 0.01,
      decay: 0.02,
      sustain: 0.5,
      release: 0.02,
      ...baseConfig,
    };

    notes.forEach((note) => {
      setTimeout(() => {
        this.playSound({
          ...defaultConfig,
          frequency: note.frequency,
          duration: note.duration,
        });
      }, delay);
      delay += note.duration * 1000;
    });
  }

  /**
   * Get recent audio events for synchronization
   */
  getRecentEvents(withinMs: number = 100): AudioEvent[] {
    const now = Date.now();
    return this.audioEvents.filter((event) => now - event.timestamp <= withinMs);
  }

  /**
   * Check if audio was played recently (for sync verification)
   */
  wasAudioPlayedRecently(withinMs: number = 100): boolean {
    return this.getRecentEvents(withinMs).length > 0;
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Get current master volume
   */
  getVolume(): number {
    return this.masterVolume;
  }

  /**
   * Mute all audio
   */
  mute(): void {
    this.isMuted = true;
    if (this.masterGain) {
      this.masterGain.gain.value = 0;
    }
  }

  /**
   * Unmute audio
   */
  unmute(): void {
    this.isMuted = false;
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  /**
   * Check if audio is muted
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Check if audio context is available
   */
  isAvailable(): boolean {
    return this.audioContext !== null;
  }

  /**
   * Get audio context state
   */
  getState(): AudioContextState | 'unavailable' {
    return this.audioContext?.state ?? 'unavailable';
  }

  /**
   * Clean up audio resources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
    this.audioEvents = [];
  }
}
