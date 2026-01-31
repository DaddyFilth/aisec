#!/usr/bin/env node

/**
 * Check Java version and provide helpful messages for Android build compatibility
 * This script runs during npm install to inform users about Java version requirements
 */

const { execSync } = require('child_process');

function checkJavaVersion() {
  console.log('\n🔍 Checking Java installation for Android builds...');
  
  try {
    // Try to get Java version
    // Note: 'java -version' outputs to stderr, so we redirect it to stdout with 2>&1
    const javaVersion = execSync('java -version 2>&1', { encoding: 'utf8' });
    
    // Handle both old format (1.8.0_xxx) and new format (17.0.1, 21.0.2, etc.)
    // Old format: "1.8.0_xxx" -> extracts 8
    // New format: "17.0.1" -> extracts 17
    const versionMatch = javaVersion.match(/version "(?:1\.)?(\d+)/);
    
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1], 10);
      
      if (majorVersion >= 17 && majorVersion <= 21) {
        console.log(`✅ Java ${majorVersion} detected - Compatible with Android builds!`);
        console.log('   You can build Android APKs using: npm run android:build:debug');
      } else if (majorVersion > 21) {
        console.log(`⚠️  Java ${majorVersion} detected - Too new for direct use`);
        console.log('   ✨ Auto-fix enabled: Gradle will automatically download and use JDK 17');
        console.log('   Your first Android build may take longer (~100-200 MB download)');
        console.log('   Subsequent builds will be fast as JDK 17 will be cached');
      } else {
        console.log(`⚠️  Java ${majorVersion} detected - Too old for Android builds`);
        console.log('   ✨ Auto-fix enabled: Gradle will automatically download and use JDK 17');
        console.log('   Your first Android build may take longer (~100-200 MB download)');
        console.log('   Subsequent builds will be fast as JDK 17 will be cached');
      }
    }
  } catch (error) {
    // Java not found or not in PATH
    console.log('⚠️  Java not found in PATH');
    console.log('   ✨ Auto-fix enabled: Gradle will automatically download and use JDK 17');
    console.log('   Your first Android build may take longer (~100-200 MB download)');
    console.log('   To skip auto-download, install JDK 17 or 21 manually:');
    console.log('   https://adoptium.net/temurin/releases/?version=17');
  }
  
  console.log('');
}

// Only run if not in CI environment (where Java setup is typically handled separately)
if (!process.env.CI) {
  checkJavaVersion();
}
