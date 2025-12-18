/**
 * Retro UI Types
 * 
 * Type definitions for the retro UI theming system.
 * Supports Win95-style aesthetics and classic arcade visuals.
 */

/**
 * Retro color palette based on classic computing aesthetics
 */
export interface RetroColorPalette {
  // Win95 system colors
  windowBackground: string;
  windowFrame: string;
  windowFrameLight: string;
  windowFrameDark: string;
  titleBarActive: string;
  titleBarInactive: string;
  titleBarText: string;
  buttonFace: string;
  buttonHighlight: string;
  buttonShadow: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  
  // Game colors
  background: string;
  foreground: string;
  accent: string;
  warning: string;
  danger: string;
  success: string;
}

/**
 * Default Win95-inspired color palette
 */
export const WIN95_PALETTE: RetroColorPalette = {
  windowBackground: '#C0C0C0',
  windowFrame: '#DFDFDF',
  windowFrameLight: '#FFFFFF',
  windowFrameDark: '#808080',
  titleBarActive: '#000080',
  titleBarInactive: '#808080',
  titleBarText: '#FFFFFF',
  buttonFace: '#C0C0C0',
  buttonHighlight: '#FFFFFF',
  buttonShadow: '#808080',
  textPrimary: '#000000',
  textSecondary: '#808080',
  textDisabled: '#808080',
  background: '#008080',
  foreground: '#FFFFFF',
  accent: '#000080',
  warning: '#FFFF00',
  danger: '#FF0000',
  success: '#00FF00',
};

/**
 * Classic arcade color palette
 */
export const ARCADE_PALETTE: RetroColorPalette = {
  windowBackground: '#000000',
  windowFrame: '#333333',
  windowFrameLight: '#666666',
  windowFrameDark: '#111111',
  titleBarActive: '#FF0000',
  titleBarInactive: '#660000',
  titleBarText: '#FFFF00',
  buttonFace: '#333333',
  buttonHighlight: '#666666',
  buttonShadow: '#111111',
  textPrimary: '#00FF00',
  textSecondary: '#00AA00',
  textDisabled: '#006600',
  background: '#000000',
  foreground: '#00FF00',
  accent: '#FF0000',
  warning: '#FFFF00',
  danger: '#FF0000',
  success: '#00FF00',
};

/**
 * DOS-style color palette
 */
export const DOS_PALETTE: RetroColorPalette = {
  windowBackground: '#0000AA',
  windowFrame: '#5555FF',
  windowFrameLight: '#AAAAFF',
  windowFrameDark: '#000055',
  titleBarActive: '#00AAAA',
  titleBarInactive: '#005555',
  titleBarText: '#FFFFFF',
  buttonFace: '#0000AA',
  buttonHighlight: '#5555FF',
  buttonShadow: '#000055',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textDisabled: '#555555',
  background: '#0000AA',
  foreground: '#FFFFFF',
  accent: '#00AAAA',
  warning: '#FFFF55',
  danger: '#FF5555',
  success: '#55FF55',
};

/**
 * Theme type identifier
 */
export type ThemeType = 'win95' | 'arcade' | 'dos';

/**
 * Get palette by theme type
 */
export function getPalette(theme: ThemeType): RetroColorPalette {
  switch (theme) {
    case 'win95':
      return WIN95_PALETTE;
    case 'arcade':
      return ARCADE_PALETTE;
    case 'dos':
      return DOS_PALETTE;
    default:
      return WIN95_PALETTE;
  }
}

/**
 * UI Component style configuration
 */
export interface UIComponentStyle {
  fontFamily: string;
  fontSize: number;
  borderWidth: number;
  padding: number;
  margin: number;
}

/**
 * Default retro UI component style
 */
export const DEFAULT_UI_STYLE: UIComponentStyle = {
  fontFamily: '"Courier New", "Lucida Console", monospace',
  fontSize: 12,
  borderWidth: 2,
  padding: 4,
  margin: 2,
};

/**
 * Window frame configuration
 */
export interface WindowFrameConfig {
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  hasCloseButton: boolean;
  hasMinimizeButton: boolean;
  hasMaximizeButton: boolean;
  isActive: boolean;
  isDraggable: boolean;
}

/**
 * Button configuration
 */
export interface ButtonConfig {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isPressed: boolean;
  isDisabled: boolean;
  onClick?: () => void;
}

/**
 * CRT effect configuration
 */
export interface CRTEffectConfig {
  enabled: boolean;
  scanlineOpacity: number;
  scanlineSpacing: number;
  curvature: number;
  vignetteStrength: number;
  flickerIntensity: number;
  rgbOffset: number;
}

/**
 * Default CRT effect settings
 */
export const DEFAULT_CRT_CONFIG: CRTEffectConfig = {
  enabled: false,
  scanlineOpacity: 0.15,
  scanlineSpacing: 2,
  curvature: 0.02,
  vignetteStrength: 0.3,
  flickerIntensity: 0.02,
  rgbOffset: 0.5,
};
