import type { CapacitorConfig } from '@capacitor/cli';
import dotenv from 'dotenv';

dotenv.config();

const remoteAssetsUrl = process.env.AISEC_REMOTE_ASSETS_URL;

const config: CapacitorConfig = {
  appId: 'com.aisec.app',
  appName: 'AI Secretary',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    ...(remoteAssetsUrl ? { url: remoteAssetsUrl } : {})
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
