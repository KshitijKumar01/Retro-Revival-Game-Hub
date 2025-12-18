import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    host: true,
    open: true, // Automatically open browser
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@games': '/src/games',
      '@ai': '/src/ai',
      '@shared': '/src/shared',
    },
  },
});