import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';

dotenv.config();

const config: CapacitorConfig = {
  appId: 'com.aisec.app',
  appName: 'AI Secretary',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    ...(process.env.AISEC_REMOTE_ASSETS_URL ? { url: process.env.AISEC_REMOTE_ASSETS_URL } : {})
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
