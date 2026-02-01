import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';

dotenv.config();

const config: CapacitorConfig = {
  appId: 'com.aisec.app',
  appName: 'AI Secretary',
  webDir: 'dist',
  server: process.env.AISEC_REMOTE_ASSETS_URL
    ? {
      androidScheme: 'https',
      cleartext: true,
      url: process.env.AISEC_REMOTE_ASSETS_URL
    }
    : {
      androidScheme: 'https',
      cleartext: true
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
