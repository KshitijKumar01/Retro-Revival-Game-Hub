/**
 * RetroTheme
 * 
 * Manages retro UI theming with Win95-style aesthetics.
 * Provides CSS class generation and theme switching capabilities.
 */

import {
  RetroColorPalette,
  ThemeType,
  UIComponentStyle,
  CRTEffectConfig,
  getPalette,
  DEFAULT_UI_STYLE,
  DEFAULT_CRT_CONFIG,
} from './types';

/**
 * RetroTheme class manages the visual theming system
 */
export class RetroTheme {
  private currentTheme: ThemeType;
  private palette: RetroColorPalette;
  private uiStyle: UIComponentStyle;
  private crtConfig: CRTEffectConfig;
  private styleElement: HTMLStyleElement | null = null;

  constructor(
    theme: ThemeType = 'win95',
    uiStyle: Partial<UIComponentStyle> = {},
    crtConfig: Partial<CRTEffectConfig> = {}
  ) {
    this.currentTheme = theme;
    this.palette = getPalette(theme);
    this.uiStyle = { ...DEFAULT_UI_STYLE, ...uiStyle };
    this.crtConfig = { ...DEFAULT_CRT_CONFIG, ...crtConfig };
  }

  /**
   * Get current theme type
   */
  getTheme(): ThemeType {
    return this.currentTheme;
  }

  /**
   * Get current color palette
   */
  getPalette(): RetroColorPalette {
    return this.palette;
  }

  /**
   * Get current UI style
   */
  getUIStyle(): UIComponentStyle {
    return this.uiStyle;
  }

  /**
   * Get CRT effect configuration
   */
  getCRTConfig(): CRTEffectConfig {
    return this.crtConfig;
  }

  /**
   * Switch to a different theme
   */
  setTheme(theme: ThemeType): void {
    this.currentTheme = theme;
    this.palette = getPalette(theme);
    this.updateStyles();
  }

  /**
   * Update CRT effect settings
   */
  setCRTConfig(config: Partial<CRTEffectConfig>): void {
    this.crtConfig = { ...this.crtConfig, ...config };
  }

  /**
   * Generate CSS string for retro styling
   */
  generateCSS(): string {
    const p = this.palette;
    const s = this.uiStyle;

    return `
/* Retro Game Hub - ${this.currentTheme.toUpperCase()} Theme */

/* Pixel Font Styling */
.retro-font {
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize}px;
  image-rendering: pixelated;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
}

.retro-font-large {
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize * 1.5}px;
}

.retro-font-title {
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize * 2}px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

/* Color Classes */
.retro-text-primary { color: ${p.textPrimary}; }
.retro-text-secondary { color: ${p.textSecondary}; }
.retro-text-disabled { color: ${p.textDisabled}; }
.retro-text-accent { color: ${p.accent}; }
.retro-text-warning { color: ${p.warning}; }
.retro-text-danger { color: ${p.danger}; }
.retro-text-success { color: ${p.success}; }

.retro-bg-window { background-color: ${p.windowBackground}; }
.retro-bg-primary { background-color: ${p.background}; }
.retro-bg-accent { background-color: ${p.accent}; }

/* Win95-Style Window Frame */
.retro-window {
  background-color: ${p.windowBackground};
  border: ${s.borderWidth}px solid;
  border-color: ${p.windowFrameLight} ${p.windowFrameDark} ${p.windowFrameDark} ${p.windowFrameLight};
  box-shadow: inset 1px 1px 0 ${p.windowFrameLight}, inset -1px -1px 0 ${p.windowFrameDark};
  padding: ${s.padding}px;
}

.retro-window-title {
  background: linear-gradient(90deg, ${p.titleBarActive}, ${p.titleBarInactive});
  color: ${p.titleBarText};
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize}px;
  font-weight: bold;
  padding: 2px 4px;
  margin: -${s.padding}px -${s.padding}px ${s.padding}px -${s.padding}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.retro-window-title.inactive {
  background: ${p.titleBarInactive};
}

.retro-window-content {
  background-color: ${p.windowBackground};
  padding: ${s.padding}px;
}

/* Win95-Style Buttons */
.retro-button {
  background-color: ${p.buttonFace};
  border: ${s.borderWidth}px solid;
  border-color: ${p.buttonHighlight} ${p.buttonShadow} ${p.buttonShadow} ${p.buttonHighlight};
  color: ${p.textPrimary};
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize}px;
  padding: ${s.padding}px ${s.padding * 2}px;
  cursor: pointer;
  outline: none;
}

.retro-button:active,
.retro-button.pressed {
  border-color: ${p.buttonShadow} ${p.buttonHighlight} ${p.buttonHighlight} ${p.buttonShadow};
  padding: ${s.padding + 1}px ${s.padding * 2 - 1}px ${s.padding - 1}px ${s.padding * 2 + 1}px;
}

.retro-button:disabled {
  color: ${p.textDisabled};
  cursor: not-allowed;
}

.retro-button-close {
  width: 16px;
  height: 14px;
  padding: 0;
  font-size: 10px;
  line-height: 1;
}

/* Inset Panel (for game areas) */
.retro-inset {
  border: ${s.borderWidth}px solid;
  border-color: ${p.windowFrameDark} ${p.windowFrameLight} ${p.windowFrameLight} ${p.windowFrameDark};
  background-color: ${p.background};
}

/* Raised Panel */
.retro-raised {
  border: ${s.borderWidth}px solid;
  border-color: ${p.windowFrameLight} ${p.windowFrameDark} ${p.windowFrameDark} ${p.windowFrameLight};
  background-color: ${p.windowBackground};
}

/* Menu Bar */
.retro-menubar {
  background-color: ${p.windowBackground};
  border-bottom: 1px solid ${p.windowFrameDark};
  padding: 2px;
  display: flex;
  gap: 2px;
}

.retro-menu-item {
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize}px;
  padding: 2px 8px;
  cursor: pointer;
}

.retro-menu-item:hover {
  background-color: ${p.titleBarActive};
  color: ${p.titleBarText};
}

/* Status Bar */
.retro-statusbar {
  background-color: ${p.windowBackground};
  border-top: 1px solid ${p.windowFrameLight};
  padding: 2px 4px;
  font-family: ${s.fontFamily};
  font-size: ${s.fontSize - 2}px;
  display: flex;
  gap: 4px;
}

.retro-statusbar-item {
  border: 1px solid;
  border-color: ${p.windowFrameDark} ${p.windowFrameLight} ${p.windowFrameLight} ${p.windowFrameDark};
  padding: 1px 4px;
  flex: 1;
}

/* Scrollbar Styling */
.retro-scrollbar::-webkit-scrollbar {
  width: 16px;
  height: 16px;
}

.retro-scrollbar::-webkit-scrollbar-track {
  background: ${p.windowBackground};
  border: 1px solid ${p.windowFrameDark};
}

.retro-scrollbar::-webkit-scrollbar-thumb {
  background: ${p.buttonFace};
  border: 2px solid;
  border-color: ${p.buttonHighlight} ${p.buttonShadow} ${p.buttonShadow} ${p.buttonHighlight};
}

/* CRT/Scanline Effects */
.retro-crt {
  position: relative;
}

.retro-crt::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, ${this.crtConfig.scanlineOpacity}),
    rgba(0, 0, 0, ${this.crtConfig.scanlineOpacity}) 1px,
    transparent 1px,
    transparent ${this.crtConfig.scanlineSpacing}px
  );
  pointer-events: none;
  z-index: 1000;
}

.retro-crt-vignette::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 60%,
    rgba(0, 0, 0, ${this.crtConfig.vignetteStrength}) 100%
  );
  pointer-events: none;
  z-index: 1001;
}

/* Pixel-perfect rendering */
.retro-pixelated {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

/* Game Canvas Container */
.retro-game-container {
  background-color: ${p.background};
  border: ${s.borderWidth}px solid;
  border-color: ${p.windowFrameDark} ${p.windowFrameLight} ${p.windowFrameLight} ${p.windowFrameDark};
  padding: 0;
  overflow: hidden;
}

.retro-game-container canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
`;
  }

  /**
   * Inject CSS styles into the document
   */
  injectStyles(): void {
    if (typeof document === 'undefined') return;

    // Remove existing style element if present
    if (this.styleElement) {
      this.styleElement.remove();
    }

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'retro-theme-styles';
    this.styleElement.textContent = this.generateCSS();
    document.head.appendChild(this.styleElement);
  }

  /**
   * Update injected styles
   */
  private updateStyles(): void {
    if (this.styleElement) {
      this.styleElement.textContent = this.generateCSS();
    }
  }

  /**
   * Remove injected styles
   */
  removeStyles(): void {
    if (this.styleElement) {
      if (this.styleElement.remove) {
        this.styleElement.remove();
      } else if (this.styleElement.parentNode) {
        this.styleElement.parentNode.removeChild(this.styleElement);
      }
      this.styleElement = null;
    }
  }
}
