#!/usr/bin/env node

/**
 * Setup Android SDK location for builds
 * This script creates the local.properties file if it doesn't exist
 * Run automatically during postinstall or manually before Android builds
 */

const fs = require('fs');
const path = require('path');

function setupAndroidSDK() {
  const androidDir = path.join(__dirname, '..', 'android');
  const localPropertiesPath = path.join(androidDir, 'local.properties');
  
  // Check if local.properties already exists
  if (fs.existsSync(localPropertiesPath)) {
    console.log('✅ Android SDK already configured (local.properties exists)');
    return;
  }
  
  console.log('\n🔧 Setting up Android SDK configuration...');
  
  // Try to detect Android SDK location
  let sdkPath = null;
  
  // Check environment variables
  if (process.env.ANDROID_HOME) {
    sdkPath = process.env.ANDROID_HOME;
    console.log(`   Found ANDROID_HOME: ${sdkPath}`);
  } else if (process.env.ANDROID_SDK_ROOT) {
    sdkPath = process.env.ANDROID_SDK_ROOT;
    console.log(`   Found ANDROID_SDK_ROOT: ${sdkPath}`);
  } else {
    // Try common locations
    const commonPaths = [
      path.join(process.env.HOME || '', 'Android', 'Sdk'),
      path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
      '/usr/local/lib/android/sdk',
      '/opt/android-sdk'
    ];
    
    for (const testPath of commonPaths) {
      if (fs.existsSync(testPath)) {
        sdkPath = testPath;
        console.log(`   Found Android SDK at: ${sdkPath}`);
        break;
      }
    }
  }
  
  if (sdkPath && fs.existsSync(sdkPath)) {
    // Normalize path for the platform
    const normalizedPath = sdkPath.replace(/\\/g, '/');
    
    // Create local.properties file
    const content = `# This file must *NOT* be checked into Version Control Systems,
# as it contains information specific to your local configuration.
#
# Location of the android SDK. This is only read by Gradle.
# For customization when using a Version Control System, please read the
# header note.
sdk.dir=${normalizedPath}
`;
    
    try {
      fs.writeFileSync(localPropertiesPath, content, 'utf8');
      console.log(`✅ Created android/local.properties with SDK location`);
      console.log(`   SDK path: ${normalizedPath}`);
    } catch (error) {
      console.error(`❌ Failed to create local.properties: ${error.message}`);
    }
  } else {
    console.log('⚠️  Android SDK location not found');
    console.log('   To build Android APKs, you need to:');
    console.log('   1. Install Android SDK (via Android Studio or command-line tools)');
    console.log('   2. Set ANDROID_HOME or ANDROID_SDK_ROOT environment variable');
    console.log('   3. Or manually create android/local.properties with:');
    console.log('      sdk.dir=/path/to/your/android/sdk');
    console.log('');
    console.log('   See docs/ANDROID_BUILD.md for detailed instructions');
  }
  
  console.log('');
}

// Only run if not in CI environment (where setup might be different)
if (!process.env.CI) {
  setupAndroidSDK();
}
