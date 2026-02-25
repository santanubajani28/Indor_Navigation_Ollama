import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // Proxy /ollama-api → http://localhost:11434
      // This avoids all browser CORS issues with Ollama
      '/ollama-api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ollama-api/, ''),
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
