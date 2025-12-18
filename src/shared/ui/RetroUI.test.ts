/**
 * Property-Based Tests for Retro UI Aesthetic Compliance
 *
 * **Feature: retro-game-hub, Property 3: Retro UI Aesthetic Compliance**
 * **Validates: Requirements 5.1, 5.4, 5.5**
 *
 * Tests that all visual components conform to retro specifications:
 * - Pixel fonts and low-resolution graphical elements
 * - Win95-style window frames and classic color palettes
 * - Consistent keyboard-first control schemes
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  RetroColorPalette,
  ThemeType,
  WIN95_PALETTE,
  ARCADE_PALETTE,
  DOS_PALETTE,
  getPalette,
  CRTEffectConfig,
  DEFAULT_CRT_CONFIG,
  WindowFrameConfig,
  DEFAULT_UI_STYLE,
} from './types';
import { RetroTheme } from './RetroTheme';
import { WindowFrame, DEFAULT_WINDOW_CONFIG } from './WindowFrame';
import { CRTEffect } from './CRTEffect';

/**
 * Arbitrary generators for property-based testing
 */
const themeTypeArb = fc.constantFrom<ThemeType>('win95', 'arcade', 'dos');

const windowConfigArb: fc.Arbitrary<WindowFrameConfig> = fc.record({
  title: fc.string({ minLength: 1, maxLength: 50 }),
  width: fc.integer({ min: 100, max: 1920 }),
  height: fc.integer({ min: 50, max: 1080 }),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 }),
  hasCloseButton: fc.boolean(),
  hasMinimizeButton: fc.boolean(),
  hasMaximizeButton: fc.boolean(),
  isActive: fc.boolean(),
  isDraggable: fc.boolean(),
});

// Use double with noNaN to avoid NaN issues
const crtConfigArb: fc.Arbitrary<CRTEffectConfig> = fc.record({
  enabled: fc.boolean(),
  scanlineOpacity: fc.double({ min: 0, max: 1, noNaN: true }),
  scanlineSpacing: fc.integer({ min: 1, max: 10 }),
  curvature: fc.double({ min: 0, max: 0.1, noNaN: true }),
  vignetteStrength: fc.double({ min: 0, max: 1, noNaN: true }),
  flickerIntensity: fc.double({ min: 0, max: 0.1, noNaN: true }),
  rgbOffset: fc.double({ min: 0, max: 5, noNaN: true }),
});

describe('Retro UI Aesthetic Compliance - Property Tests', () => {
  /**
   * **Feature: retro-game-hub, Property 3: Retro UI Aesthetic Compliance**
   * **Validates: Requirements 5.1, 5.4, 5.5**
   *
   * Property: For any theme type, getPalette returns a valid color palette
   * with all required Win95-style color properties defined.
   */
  describe('Color Palette Consistency', () => {
    it('should return valid palettes for all theme types', () => {
      fc.assert(
        fc.property(themeTypeArb, (theme: ThemeType) => {
          const palette = getPalette(theme);

          // All required palette properties must be defined
          const requiredKeys: (keyof RetroColorPalette)[] = [
            'windowBackground',
            'windowFrame',
            'windowFrameLight',
            'windowFrameDark',
            'titleBarActive',
            'titleBarInactive',
            'titleBarText',
            'buttonFace',
            'buttonHighlight',
            'buttonShadow',
            'textPrimary',
            'textSecondary',
            'textDisabled',
            'background',
            'foreground',
            'accent',
            'warning',
            'danger',
            'success',
          ];

          for (const key of requiredKeys) {
            expect(palette[key]).toBeDefined();
            expect(typeof palette[key]).toBe('string');
            // Verify it's a valid hex color format
            expect(palette[key]).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain palette consistency when switching themes', () => {
      fc.assert(
        fc.property(
          themeTypeArb,
          themeTypeArb,
          (theme1: ThemeType, theme2: ThemeType) => {
            const retroTheme = new RetroTheme(theme1);
            const palette1 = retroTheme.getPalette();

            retroTheme.setTheme(theme2);
            const palette2 = retroTheme.getPalette();

            // After switching, palette should match the new theme
            const expectedPalette = getPalette(theme2);
            expect(palette2).toEqual(expectedPalette);

            // Original palette should match original theme
            expect(palette1).toEqual(getPalette(theme1));

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 3: Retro UI Aesthetic Compliance**
   * **Validates: Requirements 5.1, 5.4**
   *
   * Property: For any window configuration, the WindowFrame component
   * produces valid content bounds within the window dimensions.
   */
  describe('Window Frame Compliance', () => {
    it('should produce valid content bounds for any window configuration', () => {
      fc.assert(
        fc.property(windowConfigArb, (config: WindowFrameConfig) => {
          const windowFrame = new WindowFrame(config);
          const bounds = windowFrame.getContentBounds();

          // Content bounds must be within window dimensions
          expect(bounds.x).toBeGreaterThanOrEqual(config.x);
          expect(bounds.y).toBeGreaterThanOrEqual(config.y);
          expect(bounds.width).toBeLessThanOrEqual(config.width);
          expect(bounds.height).toBeLessThanOrEqual(config.height);
          expect(bounds.width).toBeGreaterThan(0);
          expect(bounds.height).toBeGreaterThan(0);

          // Content area should fit within window
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(
            config.x + config.width
          );
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(
            config.y + config.height
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve configuration after updates', () => {
      fc.assert(
        fc.property(
          windowConfigArb,
          windowConfigArb,
          (config1: WindowFrameConfig, config2: WindowFrameConfig) => {
            const windowFrame = new WindowFrame(config1);

            // Verify initial config
            const initialConfig = windowFrame.getConfig();
            expect(initialConfig.title).toBe(config1.title);
            expect(initialConfig.width).toBe(config1.width);

            // Update config
            windowFrame.setConfig(config2);
            const updatedConfig = windowFrame.getConfig();

            // Verify updated config
            expect(updatedConfig.title).toBe(config2.title);
            expect(updatedConfig.width).toBe(config2.width);
            expect(updatedConfig.height).toBe(config2.height);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 3: Retro UI Aesthetic Compliance**
   * **Validates: Requirements 5.3, 5.4**
   *
   * Property: For any CRT effect configuration, the effect settings
   * are properly stored and retrievable.
   */
  describe('CRT Effect Configuration', () => {
    it('should preserve CRT configuration values', () => {
      fc.assert(
        fc.property(crtConfigArb, (config: CRTEffectConfig) => {
          const crtEffect = new CRTEffect(config);
          const retrievedConfig = crtEffect.getConfig();

          // All config values should be preserved
          expect(retrievedConfig.enabled).toBe(config.enabled);
          expect(retrievedConfig.scanlineOpacity).toBeCloseTo(
            config.scanlineOpacity,
            5
          );
          expect(retrievedConfig.scanlineSpacing).toBe(config.scanlineSpacing);
          expect(retrievedConfig.curvature).toBeCloseTo(config.curvature, 5);
          expect(retrievedConfig.vignetteStrength).toBeCloseTo(
            config.vignetteStrength,
            5
          );
          expect(retrievedConfig.flickerIntensity).toBeCloseTo(
            config.flickerIntensity,
            5
          );
          expect(retrievedConfig.rgbOffset).toBeCloseTo(config.rgbOffset, 5);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should toggle enabled state correctly', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialEnabled: boolean) => {
          const crtEffect = new CRTEffect({ enabled: initialEnabled });

          expect(crtEffect.isEnabled()).toBe(initialEnabled);

          crtEffect.setEnabled(!initialEnabled);
          expect(crtEffect.isEnabled()).toBe(!initialEnabled);

          crtEffect.setEnabled(initialEnabled);
          expect(crtEffect.isEnabled()).toBe(initialEnabled);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 3: Retro UI Aesthetic Compliance**
   * **Validates: Requirements 5.1, 5.5**
   *
   * Property: For any theme, the generated CSS contains required
   * retro styling classes with proper font and color definitions.
   */
  describe('CSS Generation Compliance', () => {
    it('should generate CSS with required retro classes for any theme', () => {
      fc.assert(
        fc.property(themeTypeArb, (theme: ThemeType) => {
          const retroTheme = new RetroTheme(theme);
          const css = retroTheme.generateCSS();

          // Required CSS classes must be present
          const requiredClasses = [
            '.retro-font',
            '.retro-font-large',
            '.retro-font-title',
            '.retro-window',
            '.retro-window-title',
            '.retro-button',
            '.retro-inset',
            '.retro-raised',
            '.retro-menubar',
            '.retro-statusbar',
            '.retro-crt',
            '.retro-pixelated',
            '.retro-game-container',
          ];

          for (const className of requiredClasses) {
            expect(css).toContain(className);
          }

          // Font family should be monospace for pixel-perfect rendering
          expect(css).toContain('monospace');

          // Should contain image-rendering for pixel-perfect graphics
          expect(css).toContain('image-rendering: pixelated');

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should include palette colors in generated CSS', () => {
      fc.assert(
        fc.property(themeTypeArb, (theme: ThemeType) => {
          const retroTheme = new RetroTheme(theme);
          const css = retroTheme.generateCSS();
          const palette = retroTheme.getPalette();

          // Key palette colors should appear in CSS
          expect(css).toContain(palette.windowBackground);
          expect(css).toContain(palette.titleBarActive);
          expect(css).toContain(palette.buttonFace);
          expect(css).toContain(palette.textPrimary);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: retro-game-hub, Property 3: Retro UI Aesthetic Compliance**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Property: Default configurations provide valid retro styling values.
   */
  describe('Default Configuration Validity', () => {
    it('should have valid default UI style', () => {
      expect(DEFAULT_UI_STYLE.fontFamily).toContain('monospace');
      expect(DEFAULT_UI_STYLE.fontSize).toBeGreaterThan(0);
      expect(DEFAULT_UI_STYLE.borderWidth).toBeGreaterThan(0);
      expect(DEFAULT_UI_STYLE.padding).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_UI_STYLE.margin).toBeGreaterThanOrEqual(0);
    });

    it('should have valid default CRT config', () => {
      expect(DEFAULT_CRT_CONFIG.scanlineOpacity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CRT_CONFIG.scanlineOpacity).toBeLessThanOrEqual(1);
      expect(DEFAULT_CRT_CONFIG.scanlineSpacing).toBeGreaterThan(0);
      expect(DEFAULT_CRT_CONFIG.vignetteStrength).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CRT_CONFIG.vignetteStrength).toBeLessThanOrEqual(1);
    });

    it('should have valid default window config', () => {
      expect(DEFAULT_WINDOW_CONFIG.width).toBeGreaterThan(0);
      expect(DEFAULT_WINDOW_CONFIG.height).toBeGreaterThan(0);
      expect(DEFAULT_WINDOW_CONFIG.title).toBeDefined();
    });

    it('should have all predefined palettes with valid hex colors', () => {
      const palettes = [WIN95_PALETTE, ARCADE_PALETTE, DOS_PALETTE];

      for (const palette of palettes) {
        for (const [, value] of Object.entries(palette)) {
          expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      }
    });
  });
});
