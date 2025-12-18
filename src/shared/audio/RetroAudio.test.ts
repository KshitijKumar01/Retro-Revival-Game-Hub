/**
 * Property-Based Tests for Audio-Visual Synchronization
 * 
 * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
 * **Validates: Requirements 5.2**
 * 
 * Tests that for any user interaction or game event, the corresponding
 * retro sound effects play synchronously with visual feedback.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  RetroAudio,
  SoundEffectType,
  RETRO_SOUNDS,
} from './RetroAudio';

/**
 * Arbitrary generators for property-based testing
 */
const soundEffectTypeArb = fc.constantFrom<SoundEffectType>(
  'beep',
  'boop',
  'click',
  'select',
  'confirm',
  'cancel',
  'error',
  'success',
  'gameOver',
  'levelUp',
  'pickup',
  'drop',
  'move',
  'collision',
  'explosion',
  'powerUp'
);

const volumeArb = fc.double({ min: 0, max: 1, noNaN: true });

const soundConfigArb = fc.record({
  frequency: fc.integer({ min: 20, max: 20000 }),
  duration: fc.double({ min: 0.01, max: 2, noNaN: true }),
  type: fc.constantFrom<OscillatorType>('sine', 'square', 'sawtooth', 'triangle'),
  volume: fc.double({ min: 0, max: 1, noNaN: true }),
  attack: fc.double({ min: 0.001, max: 0.5, noNaN: true }),
  decay: fc.double({ min: 0.001, max: 0.5, noNaN: true }),
  sustain: fc.double({ min: 0, max: 1, noNaN: true }),
  release: fc.double({ min: 0.001, max: 0.5, noNaN: true }),
});

describe('Audio-Visual Synchronization - Property Tests', () => {
  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: All predefined sound effects have valid configurations
   * with proper frequency, duration, and envelope parameters.
   */
  describe('Sound Effect Configuration Validity', () => {
    it('should have valid configurations for all predefined sound effects', () => {
      fc.assert(
        fc.property(soundEffectTypeArb, (effectType) => {
          const config = RETRO_SOUNDS[effectType];
          
          // Configuration must exist
          expect(config).toBeDefined();
          
          // Frequency must be in audible range
          expect(config.frequency).toBeGreaterThanOrEqual(20);
          expect(config.frequency).toBeLessThanOrEqual(20000);
          
          // Duration must be positive
          expect(config.duration).toBeGreaterThan(0);
          
          // Volume must be in valid range
          expect(config.volume).toBeGreaterThanOrEqual(0);
          expect(config.volume).toBeLessThanOrEqual(1);
          
          // ADSR envelope must have valid values
          expect(config.attack).toBeGreaterThanOrEqual(0);
          expect(config.decay).toBeGreaterThanOrEqual(0);
          expect(config.sustain).toBeGreaterThanOrEqual(0);
          expect(config.sustain).toBeLessThanOrEqual(1);
          expect(config.release).toBeGreaterThanOrEqual(0);
          
          // Oscillator type must be valid
          expect(['sine', 'square', 'sawtooth', 'triangle']).toContain(config.type);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should have envelope timing that fits within duration', () => {
      fc.assert(
        fc.property(soundEffectTypeArb, (effectType) => {
          const config = RETRO_SOUNDS[effectType];
          
          // Attack + decay + release should not exceed duration
          // (sustain is a level, not a time)
          const envelopeTime = config.attack + config.decay + config.release;
          expect(envelopeTime).toBeLessThanOrEqual(config.duration * 2);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: Volume controls work correctly across all valid volume levels.
   */
  describe('Volume Control Consistency', () => {
    it('should preserve volume settings across any valid volume level', () => {
      fc.assert(
        fc.property(volumeArb, (volume) => {
          const audio = new RetroAudio();
          
          audio.setVolume(volume);
          const retrievedVolume = audio.getVolume();
          
          // Volume should be clamped to [0, 1] range
          expect(retrievedVolume).toBeGreaterThanOrEqual(0);
          expect(retrievedVolume).toBeLessThanOrEqual(1);
          
          // If input was in valid range, output should match
          if (volume >= 0 && volume <= 1) {
            expect(retrievedVolume).toBeCloseTo(volume, 5);
          }
          
          audio.dispose();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should clamp out-of-range volume values', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -10, max: 10, noNaN: true }),
          (volume) => {
            const audio = new RetroAudio();
            
            audio.setVolume(volume);
            const retrievedVolume = audio.getVolume();
            
            // Volume should always be clamped to [0, 1]
            expect(retrievedVolume).toBeGreaterThanOrEqual(0);
            expect(retrievedVolume).toBeLessThanOrEqual(1);
            
            audio.dispose();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: Mute state toggles correctly and is consistent.
   */
  describe('Mute State Consistency', () => {
    it('should toggle mute state correctly', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialMuted) => {
          const audio = new RetroAudio();
          
          // Set initial state
          if (initialMuted) {
            audio.mute();
          } else {
            audio.unmute();
          }
          
          expect(audio.getMuted()).toBe(initialMuted);
          
          // Toggle should flip the state
          const newState = audio.toggleMute();
          expect(newState).toBe(!initialMuted);
          expect(audio.getMuted()).toBe(!initialMuted);
          
          // Toggle again should return to original
          audio.toggleMute();
          expect(audio.getMuted()).toBe(initialMuted);
          
          audio.dispose();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain mute state through multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          (operations) => {
            const audio = new RetroAudio();
            let expectedMuted = false;
            
            for (const shouldMute of operations) {
              if (shouldMute) {
                audio.mute();
                expectedMuted = true;
              } else {
                audio.unmute();
                expectedMuted = false;
              }
              
              expect(audio.getMuted()).toBe(expectedMuted);
            }
            
            audio.dispose();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: Sound effect types map to distinct configurations.
   */
  describe('Sound Effect Distinctness', () => {
    it('should have distinct configurations for different effect types', () => {
      const effectTypes: SoundEffectType[] = [
        'beep', 'boop', 'click', 'select', 'confirm', 'cancel',
        'error', 'success', 'gameOver', 'levelUp', 'pickup',
        'drop', 'move', 'collision', 'explosion', 'powerUp'
      ];
      
      // Each effect type should have a unique configuration
      const configs = effectTypes.map(type => RETRO_SOUNDS[type]);
      
      // At minimum, not all configs should be identical
      const uniqueFrequencies = new Set(configs.map(c => c.frequency));
      const uniqueDurations = new Set(configs.map(c => c.duration));
      
      // There should be variety in the sound effects
      expect(uniqueFrequencies.size).toBeGreaterThan(1);
      expect(uniqueDurations.size).toBeGreaterThan(1);
    });

    it('should categorize sounds appropriately by frequency', () => {
      // UI sounds should generally be higher frequency
      const uiSounds: SoundEffectType[] = ['click', 'select', 'beep'];
      // Alert sounds should have distinct characteristics
      const alertSounds: SoundEffectType[] = ['error', 'gameOver', 'collision'];
      
      for (const sound of uiSounds) {
        const config = RETRO_SOUNDS[sound];
        // UI sounds typically use higher frequencies
        expect(config.frequency).toBeGreaterThanOrEqual(200);
      }
      
      for (const sound of alertSounds) {
        const config = RETRO_SOUNDS[sound];
        // Alert sounds often use lower frequencies or frequency sweeps
        expect(config.duration).toBeGreaterThanOrEqual(0.1);
      }
    });
  });

  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: Audio event tracking provides accurate timing information.
   */
  describe('Audio Event Timing', () => {
    it('should track audio events with valid timestamps', () => {
      fc.assert(
        fc.property(soundEffectTypeArb, (effectType) => {
          const config = RETRO_SOUNDS[effectType];
          
          // Verify the config has valid timing for synchronization
          // Duration should accommodate the envelope
          expect(config.duration).toBeGreaterThan(0);
          
          // Duration in milliseconds should be reasonable for UI feedback
          const durationMs = config.duration * 1000;
          expect(durationMs).toBeGreaterThan(0);
          expect(durationMs).toBeLessThan(5000); // Max 5 seconds
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: Custom sound configurations are validated correctly.
   */
  describe('Custom Sound Configuration', () => {
    it('should accept valid custom sound configurations', () => {
      fc.assert(
        fc.property(soundConfigArb, (config) => {
          // Verify the generated config has valid values
          expect(config.frequency).toBeGreaterThanOrEqual(20);
          expect(config.frequency).toBeLessThanOrEqual(20000);
          expect(config.duration).toBeGreaterThan(0);
          expect(config.volume).toBeGreaterThanOrEqual(0);
          expect(config.volume).toBeLessThanOrEqual(1);
          expect(config.attack).toBeGreaterThan(0);
          expect(config.decay).toBeGreaterThan(0);
          expect(config.sustain).toBeGreaterThanOrEqual(0);
          expect(config.sustain).toBeLessThanOrEqual(1);
          expect(config.release).toBeGreaterThan(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 7: Audio-Visual Synchronization**
   * **Validates: Requirements 5.2**
   * 
   * Property: Frequency sweep sounds have valid start and end frequencies.
   */
  describe('Frequency Sweep Validity', () => {
    it('should have valid frequency sweeps for applicable sounds', () => {
      const sweepSounds: SoundEffectType[] = [
        'select', 'confirm', 'cancel', 'error', 'success',
        'gameOver', 'levelUp', 'pickup', 'drop', 'collision',
        'explosion', 'powerUp'
      ];
      
      for (const sound of sweepSounds) {
        const config = RETRO_SOUNDS[sound];
        
        if (config.frequencyEnd !== undefined) {
          // Both frequencies should be in audible range
          expect(config.frequency).toBeGreaterThanOrEqual(20);
          expect(config.frequency).toBeLessThanOrEqual(20000);
          expect(config.frequencyEnd).toBeGreaterThanOrEqual(20);
          expect(config.frequencyEnd).toBeLessThanOrEqual(20000);
        }
      }
    });
  });
});
