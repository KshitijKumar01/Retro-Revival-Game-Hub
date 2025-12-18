/**
 * WindowFrame
 * 
 * Win95-style window frame component for canvas rendering.
 * Provides authentic retro window aesthetics with title bar and controls.
 */

import { RetroColorPalette, WindowFrameConfig, WIN95_PALETTE } from './types';

/**
 * Default window frame configuration
 */
export const DEFAULT_WINDOW_CONFIG: WindowFrameConfig = {
  title: 'Window',
  width: 320,
  height: 240,
  x: 0,
  y: 0,
  hasCloseButton: true,
  hasMinimizeButton: true,
  hasMaximizeButton: true,
  isActive: true,
  isDraggable: true,
};

/**
 * WindowFrame renders Win95-style window frames on canvas
 */
export class WindowFrame {
  private config: WindowFrameConfig;
  private palette: RetroColorPalette;
  
  // Title bar dimensions
  private readonly TITLE_BAR_HEIGHT = 18;
  private readonly BUTTON_SIZE = 14;
  private readonly BUTTON_MARGIN = 2;
  private readonly BORDER_WIDTH = 2;

  constructor(
    config: Partial<WindowFrameConfig> = {},
    palette: RetroColorPalette = WIN95_PALETTE
  ) {
    this.config = { ...DEFAULT_WINDOW_CONFIG, ...config };
    this.palette = palette;
  }

  /**
   * Get window configuration
   */
  getConfig(): WindowFrameConfig {
    return { ...this.config };
  }

  /**
   * Update window configuration
   */
  setConfig(config: Partial<WindowFrameConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set color palette
   */
  setPalette(palette: RetroColorPalette): void {
    this.palette = palette;
  }

  /**
   * Get content area bounds (inside the window frame)
   */
  getContentBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.x + this.BORDER_WIDTH + 2,
      y: this.config.y + this.TITLE_BAR_HEIGHT + this.BORDER_WIDTH + 2,
      width: this.config.width - (this.BORDER_WIDTH + 2) * 2,
      height: this.config.height - this.TITLE_BAR_HEIGHT - (this.BORDER_WIDTH + 2) * 2,
    };
  }

  /**
   * Render the window frame to a canvas context
   */
  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, title, isActive } = this.config;
    const p = this.palette;

    // Outer border (raised effect)
    this.drawBeveledRect(ctx, x, y, width, height, p.windowFrameLight, p.windowFrameDark);

    // Inner border
    this.drawBeveledRect(
      ctx,
      x + 1,
      y + 1,
      width - 2,
      height - 2,
      p.windowFrameLight,
      p.windowFrameDark
    );

    // Window background
    ctx.fillStyle = p.windowBackground;
    ctx.fillRect(x + 2, y + 2, width - 4, height - 4);

    // Title bar
    this.renderTitleBar(ctx, x + 3, y + 3, width - 6, title, isActive);

    // Title bar buttons
    this.renderTitleBarButtons(ctx, x + width - 3, y + 3);
  }

  /**
   * Render the title bar
   */
  private renderTitleBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    title: string,
    isActive: boolean
  ): void {
    const p = this.palette;

    // Title bar background gradient
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    if (isActive) {
      gradient.addColorStop(0, p.titleBarActive);
      gradient.addColorStop(1, this.lightenColor(p.titleBarActive, 30));
    } else {
      gradient.addColorStop(0, p.titleBarInactive);
      gradient.addColorStop(1, this.lightenColor(p.titleBarInactive, 20));
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, this.TITLE_BAR_HEIGHT);

    // Title text
    ctx.fillStyle = p.titleBarText;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 4, y + this.TITLE_BAR_HEIGHT / 2 + 1);
  }

  /**
   * Render title bar buttons (close, minimize, maximize)
   */
  private renderTitleBarButtons(
    ctx: CanvasRenderingContext2D,
    rightEdge: number,
    y: number
  ): void {
    let buttonX = rightEdge;
    const buttonY = y + 2;

    // Close button
    if (this.config.hasCloseButton) {
      buttonX -= this.BUTTON_SIZE + this.BUTTON_MARGIN;
      this.renderButton(ctx, buttonX, buttonY, this.BUTTON_SIZE, this.BUTTON_SIZE - 2, 'X');
    }

    // Maximize button
    if (this.config.hasMaximizeButton) {
      buttonX -= this.BUTTON_SIZE + this.BUTTON_MARGIN;
      this.renderButton(ctx, buttonX, buttonY, this.BUTTON_SIZE, this.BUTTON_SIZE - 2, '□');
    }

    // Minimize button
    if (this.config.hasMinimizeButton) {
      buttonX -= this.BUTTON_SIZE + this.BUTTON_MARGIN;
      this.renderButton(ctx, buttonX, buttonY, this.BUTTON_SIZE, this.BUTTON_SIZE - 2, '_');
    }
  }

  /**
   * Render a Win95-style button
   */
  renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    isPressed: boolean = false
  ): void {
    const p = this.palette;

    // Button background
    ctx.fillStyle = p.buttonFace;
    ctx.fillRect(x, y, width, height);

    // Button border (beveled effect)
    if (isPressed) {
      this.drawBeveledRect(ctx, x, y, width, height, p.buttonShadow, p.buttonHighlight);
    } else {
      this.drawBeveledRect(ctx, x, y, width, height, p.buttonHighlight, p.buttonShadow);
    }

    // Button label
    ctx.fillStyle = p.textPrimary;
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + width / 2, y + height / 2 + 1);
    ctx.textAlign = 'left';
  }

  /**
   * Draw a beveled rectangle (3D effect)
   */
  private drawBeveledRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    lightColor: string,
    darkColor: string
  ): void {
    // Top and left edges (light)
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height - 1);
    ctx.lineTo(x, y);
    ctx.lineTo(x + width - 1, y);
    ctx.stroke();

    // Bottom and right edges (dark)
    ctx.strokeStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(x + width - 1, y);
    ctx.lineTo(x + width - 1, y + height - 1);
    ctx.lineTo(x, y + height - 1);
    ctx.stroke();
  }

  /**
   * Render an inset panel (sunken effect)
   */
  renderInsetPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor?: string
  ): void {
    const p = this.palette;

    // Background
    ctx.fillStyle = backgroundColor || p.background;
    ctx.fillRect(x, y, width, height);

    // Inset border (reversed bevel)
    this.drawBeveledRect(ctx, x, y, width, height, p.windowFrameDark, p.windowFrameLight);
  }

  /**
   * Lighten a hex color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  /**
   * Check if a point is within the close button
   */
  isPointInCloseButton(px: number, py: number): boolean {
    if (!this.config.hasCloseButton) return false;
    
    const buttonX = this.config.x + this.config.width - 3 - this.BUTTON_SIZE - this.BUTTON_MARGIN;
    const buttonY = this.config.y + 3 + 2;
    
    return (
      px >= buttonX &&
      px <= buttonX + this.BUTTON_SIZE &&
      py >= buttonY &&
      py <= buttonY + this.BUTTON_SIZE - 2
    );
  }

  /**
   * Check if a point is within the title bar (for dragging)
   */
  isPointInTitleBar(px: number, py: number): boolean {
    return (
      px >= this.config.x + 3 &&
      px <= this.config.x + this.config.width - 3 &&
      py >= this.config.y + 3 &&
      py <= this.config.y + 3 + this.TITLE_BAR_HEIGHT
    );
  }
}
