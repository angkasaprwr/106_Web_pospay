import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 5174,
    },
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        ws: true,
        timeout: 30_000,
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        timeout: 30_000,
      },
    },
  },
});
