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
        'process.env.FASTRTC_API_URL': JSON.stringify(env.FASTRTC_API_URL),
        'process.env.FASTER_WHISPER_API_URL': JSON.stringify(env.FASTER_WHISPER_API_URL),
        'process.env.VOICEFLOW_API_URL': JSON.stringify(env.VOICEFLOW_API_URL),
        'process.env.OLLAMA_API_URL': JSON.stringify(env.OLLAMA_API_URL),
        'process.env.PIPER_API_URL': JSON.stringify(env.PIPER_API_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
