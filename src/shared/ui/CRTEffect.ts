/**
 * CRTEffect
 * 
 * Canvas-based CRT and scanline visual effects.
 * Provides authentic retro display aesthetics with configurable intensity.
 */

import { CRTEffectConfig, DEFAULT_CRT_CONFIG } from './types';

/**
 * CRTEffect class applies retro display effects to canvas
 */
export class CRTEffect {
  private config: CRTEffectConfig;
  private scanlineCanvas: HTMLCanvasElement | null = null;
  private scanlineCtx: CanvasRenderingContext2D | null = null;
  private flickerPhase: number = 0;

  constructor(config: Partial<CRTEffectConfig> = {}) {
    this.config = { ...DEFAULT_CRT_CONFIG, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CRTEffectConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<CRTEffectConfig>): void {
    this.config = { ...this.config, ...config };
    // Invalidate cached scanline canvas
    this.scanlineCanvas = null;
    this.scanlineCtx = null;
  }

  /**
   * Enable or disable CRT effects
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if effects are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Apply all CRT effects to a canvas
   */
  apply(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.config.enabled) return;

    // Apply effects in order
    this.applyScanlines(ctx, width, height);
    this.applyVignette(ctx, width, height);
    this.applyFlicker(ctx, width, height);
    this.applyRGBOffset(ctx, width, height);
  }

  /**
   * Apply scanline effect
   */
  applyScanlines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.config.scanlineOpacity <= 0) return;

    // Create or reuse scanline pattern canvas
    if (!this.scanlineCanvas || this.scanlineCanvas.height !== height) {
      this.createScanlineCanvas(width, height);
    }

    if (this.scanlineCanvas && this.scanlineCtx) {
      ctx.globalAlpha = this.config.scanlineOpacity;
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(this.scanlineCanvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Create cached scanline pattern canvas
   */
  private createScanlineCanvas(width: number, height: number): void {
    this.scanlineCanvas = document.createElement('canvas');
    this.scanlineCanvas.width = width;
    this.scanlineCanvas.height = height;
    this.scanlineCtx = this.scanlineCanvas.getContext('2d');

    if (!this.scanlineCtx) return;

    // Draw scanline pattern
    this.scanlineCtx.fillStyle = '#000000';
    for (let y = 0; y < height; y += this.config.scanlineSpacing) {
      this.scanlineCtx.fillRect(0, y, width, 1);
    }
  }

  /**
   * Apply vignette effect (darkened corners)
   */
  applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.config.vignetteStrength <= 0) return;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) * 0.7;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${this.config.vignetteStrength})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Apply flicker effect (subtle brightness variation)
   */
  applyFlicker(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.config.flickerIntensity <= 0) return;

    // Update flicker phase
    this.flickerPhase += 0.1;
    const flickerAmount = Math.sin(this.flickerPhase) * this.config.flickerIntensity;

    if (flickerAmount > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flickerAmount})`;
    } else {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(flickerAmount)})`;
    }
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Apply RGB offset effect (chromatic aberration)
   */
  applyRGBOffset(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.config.rgbOffset <= 0) return;

    // Get current image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const offset = Math.round(this.config.rgbOffset);

    // Create output buffer
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        // Red channel - shift left
        const redX = Math.max(0, x - offset);
        const redI = (y * width + redX) * 4;
        output[i] = data[redI];

        // Green channel - no shift
        output[i + 1] = data[i + 1];

        // Blue channel - shift right
        const blueX = Math.min(width - 1, x + offset);
        const blueI = (y * width + blueX) * 4;
        output[i + 2] = data[blueI + 2];

        // Alpha channel
        output[i + 3] = data[i + 3];
      }
    }

    // Put modified image data back
    const outputImageData = new ImageData(output, width, height);
    ctx.putImageData(outputImageData, 0, 0);
  }

  /**
   * Apply curvature effect (barrel distortion)
   * Note: This is computationally expensive, use sparingly
   */
  applyCurvature(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.config.curvature <= 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    const centerX = width / 2;
    const centerY = height / 2;
    const k = this.config.curvature;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Normalize coordinates to -1 to 1
        const nx = (x - centerX) / centerX;
        const ny = (y - centerY) / centerY;

        // Apply barrel distortion
        const r2 = nx * nx + ny * ny;
        const factor = 1 + k * r2;

        // Map back to pixel coordinates
        const srcX = Math.round(centerX + nx * factor * centerX);
        const srcY = Math.round(centerY + ny * factor * centerY);

        const destI = (y * width + x) * 4;

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          const srcI = (srcY * width + srcX) * 4;
          output[destI] = data[srcI];
          output[destI + 1] = data[srcI + 1];
          output[destI + 2] = data[srcI + 2];
          output[destI + 3] = data[srcI + 3];
        } else {
          // Fill with black for out-of-bounds
          output[destI] = 0;
          output[destI + 1] = 0;
          output[destI + 2] = 0;
          output[destI + 3] = 255;
        }
      }
    }

    const outputImageData = new ImageData(output, width, height);
    ctx.putImageData(outputImageData, 0, 0);
  }

  /**
   * Apply a quick scanline-only effect (performance optimized)
   */
  applyQuickScanlines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.config.enabled || this.config.scanlineOpacity <= 0) return;

    ctx.fillStyle = `rgba(0, 0, 0, ${this.config.scanlineOpacity})`;
    for (let y = 0; y < height; y += this.config.scanlineSpacing) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  /**
   * Reset flicker phase
   */
  resetFlicker(): void {
    this.flickerPhase = 0;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.scanlineCanvas = null;
    this.scanlineCtx = null;
  }
}
