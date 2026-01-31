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
        'import.meta.env.OLLAMA_HOST': JSON.stringify(env.OLLAMA_HOST ?? 'http://localhost:11434'),
        'import.meta.env.OLLAMA_MODEL': JSON.stringify(env.OLLAMA_MODEL ?? 'llama3.1')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
