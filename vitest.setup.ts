/**
 * Vitest setup file
 * Configures canvas support for tests
 */

import { createCanvas } from 'canvas';

// Mock HTMLCanvasElement.getContext to use node-canvas
HTMLCanvasElement.prototype.getContext = function(contextType: string) {
  if (contextType === '2d') {
    const canvas = createCanvas(this.width, this.height);
    return canvas.getContext('2d');
  }
  return null;
} as any;

// Mock AudioContext for tests
global.AudioContext = class AudioContext {
  createOscillator() {
    return {
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: { 
        value: 0,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      type: 'sine'
    };
  }
  createGain() {
    return {
      connect: () => {},
      gain: { 
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      }
    };
  }
  get destination() {
    return {};
  }
  get currentTime() {
    return 0;
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
} as any;
