import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths for Electron compatibility
  server: {
    port: 3000,
    host: true
  }
});
