/**
 * CanvasRenderer
 * 
 * Basic HTML5 Canvas rendering pipeline for retro-style graphics.
 * Provides utilities for pixel-perfect rendering and retro effects.
 */

import { Position, Size } from '../types';
import { CRTEffect, CRTEffectConfig, RetroColorPalette, WIN95_PALETTE } from '../ui';

export interface RenderConfig {
  pixelSize: number;
  backgroundColor: string;
  enableCRTEffect: boolean;
  enableScanlines: boolean;
  crtConfig?: Partial<CRTEffectConfig>;
  palette?: RetroColorPalette;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  pixelSize: 1,
  backgroundColor: '#000000',
  enableCRTEffect: false,
  enableScanlines: false,
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private lastFrameTime: number = 0;
  private frameCallback: ((deltaTime: number) => void) | null = null;
  private animationFrameId: number | null = null;
  private crtEffect: CRTEffect;
  private palette: RetroColorPalette;

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;
    this.config = { ...DEFAULT_RENDER_CONFIG, ...config };
    this.palette = config.palette || WIN95_PALETTE;
    
    // Initialize CRT effect
    this.crtEffect = new CRTEffect({
      enabled: this.config.enableCRTEffect,
      ...this.config.crtConfig,
    });
    
    // Disable image smoothing for pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Clear the canvas with the background color
   */
  clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw a filled rectangle
   */
  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      x * this.config.pixelSize,
      y * this.config.pixelSize,
      width * this.config.pixelSize,
      height * this.config.pixelSize
    );
  }

  /**
   * Draw a stroked rectangle
   */
  strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(
      x * this.config.pixelSize,
      y * this.config.pixelSize,
      width * this.config.pixelSize,
      height * this.config.pixelSize
    );
  }

  /**
   * Draw text with pixel font styling
   */
  drawText(text: string, x: number, y: number, color: string, fontSize: number = 16): void {
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px "Courier New", monospace`;
    this.ctx.fillText(text, x * this.config.pixelSize, y * this.config.pixelSize);
  }

  /**
   * Draw a single pixel
   */
  drawPixel(x: number, y: number, color: string): void {
    this.fillRect(x, y, 1, 1, color);
  }

  /**
   * Draw a line between two points
   */
  drawLine(from: Position, to: Position, color: string, lineWidth: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x * this.config.pixelSize, from.y * this.config.pixelSize);
    this.ctx.lineTo(to.x * this.config.pixelSize, to.y * this.config.pixelSize);
    this.ctx.stroke();
  }

  /**
   * Get canvas size
   */
  getSize(): Size {
    return {
      width: this.canvas.width / this.config.pixelSize,
      height: this.canvas.height / this.config.pixelSize,
    };
  }

  /**
   * Set canvas size
   */
  setSize(width: number, height: number): void {
    this.canvas.width = width * this.config.pixelSize;
    this.canvas.height = height * this.config.pixelSize;
    // Re-disable smoothing after resize
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Update render configuration
   */
  setConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update CRT effect settings
    if (config.enableCRTEffect !== undefined) {
      this.crtEffect.setEnabled(config.enableCRTEffect);
    }
    if (config.crtConfig) {
      this.crtEffect.setConfig(config.crtConfig);
    }
    if (config.palette) {
      this.palette = config.palette;
    }
  }

  /**
   * Get current color palette
   */
  getPalette(): RetroColorPalette {
    return this.palette;
  }

  /**
   * Set color palette
   */
  setPalette(palette: RetroColorPalette): void {
    this.palette = palette;
  }

  /**
   * Get CRT effect instance
   */
  getCRTEffect(): CRTEffect {
    return this.crtEffect;
  }

  /**
   * Apply CRT effects to the current canvas state
   */
  applyCRTEffects(): void {
    if (this.config.enableCRTEffect) {
      this.crtEffect.apply(this.ctx, this.canvas.width, this.canvas.height);
    } else if (this.config.enableScanlines) {
      this.crtEffect.applyQuickScanlines(this.ctx, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Draw a filled rectangle with palette color
   */
  fillRectWithPalette(
    x: number,
    y: number,
    width: number,
    height: number,
    colorKey: keyof RetroColorPalette
  ): void {
    this.fillRect(x, y, width, height, this.palette[colorKey]);
  }

  /**
   * Draw a Win95-style beveled rectangle
   */
  drawBeveledRect(
    x: number,
    y: number,
    width: number,
    height: number,
    raised: boolean = true
  ): void {
    const px = this.config.pixelSize;
    const lightColor = raised ? this.palette.windowFrameLight : this.palette.windowFrameDark;
    const darkColor = raised ? this.palette.windowFrameDark : this.palette.windowFrameLight;

    // Background
    this.ctx.fillStyle = this.palette.buttonFace;
    this.ctx.fillRect(x * px, y * px, width * px, height * px);

    // Top and left edges (light)
    this.ctx.strokeStyle = lightColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x * px, (y + height) * px - 1);
    this.ctx.lineTo(x * px, y * px);
    this.ctx.lineTo((x + width) * px - 1, y * px);
    this.ctx.stroke();

    // Bottom and right edges (dark)
    this.ctx.strokeStyle = darkColor;
    this.ctx.beginPath();
    this.ctx.moveTo((x + width) * px - 1, y * px);
    this.ctx.lineTo((x + width) * px - 1, (y + height) * px - 1);
    this.ctx.lineTo(x * px, (y + height) * px - 1);
    this.ctx.stroke();
  }

  /**
   * Draw pixel-perfect text with retro font
   */
  drawRetroText(
    text: string,
    x: number,
    y: number,
    colorKey: keyof RetroColorPalette = 'textPrimary',
    fontSize: number = 12
  ): void {
    this.ctx.fillStyle = this.palette[colorKey];
    this.ctx.font = `${fontSize}px "Courier New", "Lucida Console", monospace`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, x * this.config.pixelSize, y * this.config.pixelSize);
  }

  /**
   * Get the raw 2D context for advanced operations
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Start the render loop
   */
  startRenderLoop(callback: (deltaTime: number) => void): void {
    this.frameCallback = callback;
    this.lastFrameTime = performance.now();
    this.renderLoop();
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.frameCallback = null;
  }

  private renderLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    if (this.frameCallback) {
      this.frameCallback(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };
}
