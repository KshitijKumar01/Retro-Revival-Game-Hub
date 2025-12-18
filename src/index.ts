/**
 * Retro Revival Game Hub
 * 
 * AI-enhanced classic games platform with authentic retro aesthetics.
 * Main entry point for the application.
 */

import { GameHubControllerImpl } from './shared/GameHubController';

// Initialize when loaded in browser
window.addEventListener('DOMContentLoaded', () => {
  const gameHub = new GameHubControllerImpl({
    canvasId: 'game-canvas',
    theme: 'win95',
    enableCRT: false,
    enableAudio: true,
    autoStart: true
  });
  
  // Make it available globally for debugging
  (window as any).gameHub = gameHub;
});
