import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.BACKEND_API_URL': JSON.stringify(env.BACKEND_API_URL),
        'process.env.BACKEND_WS_URL': JSON.stringify(env.BACKEND_WS_URL),
        'process.env.BACKEND_API_KEY': JSON.stringify(env.BACKEND_API_KEY),
        'import.meta.env.VITE_BACKEND_API_URL': JSON.stringify(env.BACKEND_API_URL || env.VITE_BACKEND_API_URL),
        'import.meta.env.VITE_BACKEND_WS_URL': JSON.stringify(env.BACKEND_WS_URL || env.VITE_BACKEND_WS_URL),
        'import.meta.env.VITE_BACKEND_API_KEY': JSON.stringify(env.BACKEND_API_KEY || env.VITE_BACKEND_API_KEY),
        'import.meta.env.VITE_AISEC_UPDATE_URL': JSON.stringify(env.AISEC_UPDATE_URL || env.VITE_AISEC_UPDATE_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
