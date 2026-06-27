import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fix for Vite 5.4+ ERR_EMPTY_RESPONSE when accessing via 127.0.0.1:
//   - host:'0.0.0.0'     → bind to all network interfaces
//   - allowedHosts:'all' → bypass Vite 5.4 Host-header security check
//   - hmr.host           → tell browser HMR WebSocket to use 127.0.0.1 (not 0.0.0.0)
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: 'all',
    cors: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
      clientPort: 5173,
    },
    proxy: {
      '/api':     { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
});
