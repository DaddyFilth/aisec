# Android APK Build Guide

This guide explains how to build AI Secretary as an Android APK file.

> **⚡ Runtime Permissions**: The app now includes automatic runtime permission requests for microphone access. When users first launch the app, they'll be prompted to grant microphone permission, which is required for call screening functionality.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
2. **Java Development Kit (JDK)** 17 or 21 (NOT Java 25)
   - **IMPORTANT:** Android Gradle Plugin 8.7.2 requires Java 17 or 21
   - Java 25 is NOT supported and will cause build errors
   - Download JDK 17 from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=17) (recommended)
   - Or download from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://openjdk.org/)
   - Verify: `java -version` should show version 17.x.x or 21.x.x

3. **Android Studio** (recommended) or Android SDK Command-line Tools
   - Download from [Android Studio](https://developer.android.com/studio)
   - Install Android SDK Platform 34 (or latest)
   - Install Android SDK Build-Tools
   - Install Android SDK Platform-Tools

4. **Gradle** (will be downloaded automatically by the wrapper)

### Environment Variables

Set up the following environment variables:

**Linux/Mac:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export JAVA_HOME=/path/to/your/jdk
```

**Windows:**
```cmd
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
setx JAVA_HOME "C:\Program Files\Java\jdk-17"
```

## Build Steps

**Important:** All npm commands must be run from the project root directory. Navigate to the project directory first:

```bash
cd aisec
```

If you receive an error like `npm error code ENOENT` or `Could not read package.json`, you are not in the correct directory.

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Debug APK (for testing)

```bash
npm run android:build:debug
```

The APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Build Release APK (for distribution)

#### First-time setup: Generate a keystore

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important:** Keep your keystore file and passwords safe! You'll need them for all future app updates.

#### Configure signing

Create or edit `android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=my-key-alias
storeFile=/path/to/my-release-key.keystore
```

#### Build the release APK

```bash
npm run android:build
```

The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Alternative: Build via Android Studio

### 1. Sync the project

```bash
npm run android:sync
```

### 2. Open in Android Studio

```bash
npm run android:open
```

### 3. Build from Android Studio

1. Go to **Build → Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore or create a new one
4. Select release build variant
5. Click **Finish**

## Testing the APK

### On an Emulator

1. Create an Android Virtual Device (AVD) in Android Studio
2. Install the APK:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### On a Physical Device

1. Enable Developer Options and USB Debugging on your Android device
2. Connect via USB
3. Install the APK:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

Or simply copy the APK file to your device and open it to install.

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `npm run android:sync` | Sync web assets to Android project |
| `npm run android:open` | Open project in Android Studio |
| `npm run android:run` | Build and run on connected device |
| `npm run android:build:debug` | Build debug APK |
| `npm run android:build` | Build release APK (requires signing) |

## Troubleshooting

### "Could not read package.json" or "npm error code ENOENT"
- This error means you're not in the project directory
- Navigate to the project directory first:
  ```bash
  cd aisec
  ```
- Verify you're in the correct directory:
  ```bash
  ls package.json  # Should show the file exists
  ```

### "JAVA_HOME is not set"
- Make sure you have JDK 17+ installed
- Set the JAVA_HOME environment variable correctly

### "SDK location not found"
- Install Android SDK
- Create `android/local.properties` with:
  ```properties
  sdk.dir=/path/to/Android/Sdk
  ```

### "Gradle build failed"
- Try cleaning the build:
  ```bash
  cd android && ./gradlew clean
  ```

### "Unsupported class file major version 69"
- This error occurs when trying to use Java 25, which is NOT supported
- Major version 69 = Java 25
- **Solution:** Use Java 17 or Java 21 instead
- Android Gradle Plugin 8.7.2 and Gradle 8.9 only support up to Java 21
- Check your Java version:
  ```bash
  java -version  # Should show version 17.x.x or 21.x.x (NOT 25.x.x)
  ```
- If you have multiple Java versions installed:
  - **Linux/Mac:** Set JAVA_HOME to Java 17 or 21:
    ```bash
    export JAVA_HOME=/path/to/jdk-17  # or jdk-21
    ```
  - **Windows:** Update JAVA_HOME environment variable:
    ```cmd
    setx JAVA_HOME "C:\Program Files\Java\jdk-17"  # or jdk-21
    ```
- **Recommended:** Install [Eclipse Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17)
- After fixing Java version, clean and rebuild:
  ```bash
  cd android && ./gradlew clean && cd ..
  npm run android:build:debug
  ```

### Microphone permission not working
- Permissions are declared in `AndroidManifest.xml` (already configured)
- **The app requests permissions at runtime** when you click "Enable Call Screening"
- On first launch, Android will show a permission dialog - tap **"Allow"**
- If you denied permission:
  1. Go to Settings → Apps → AI Secretary → Permissions
  2. Enable Microphone permission
  3. Return to app and click "Grant Microphone Access"
- The app won't function without microphone access as it needs to process voice calls

### App crashes on launch
- Check logcat for errors:
  ```bash
  adb logcat | grep -i "aisec"
  ```

### AAPT2 errors in Termux (ARM64)
If you're building in Termux and see errors like:
```
AAPT2 aapt2-8.7.2-12006047-linux Daemon #X: Unexpected error output
Syntax error: "(" unexpected
AAPT2 Daemon startup failed
```

This happens because the default AAPT2 binary from Android Gradle Plugin is compiled for x86/x64 architecture and cannot run on ARM64 devices.

**Solution:**

The AAPT2 override is now **enabled by default** in `android/gradle.properties`, so Termux builds work out of the box!

For Termux builds:

1. Install ARM64-compatible AAPT2 in Termux:
   ```bash
   pkg install aapt2
   ```

2. Verify the installation:
   ```bash
   file /data/data/com.termux/files/usr/bin/aapt2
   # Should show "ARM aarch64" in the output
   ```

3. Build the app (the override is already configured):
   ```bash
   npm run android:build:debug
   ```

**How it works:** 
- The `android/gradle.properties` file has `android.aapt2FromMavenOverride` enabled by default
- In Termux (after installing AAPT2), Gradle uses the ARM64-compatible AAPT2 binary
- On desktop/CI systems where the Termux path doesn't exist, Gradle automatically falls back to the bundled AAPT2
- This approach ensures seamless operation in both Termux and non-Termux environments
- The build configuration also provides helpful error messages if AAPT2 is not installed in Termux

**Note:** The override is now enabled by default and safe for all environments. If you need to disable it, comment out the line in `android/gradle.properties`:
```properties
#android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
```

## APK Size Optimization

To reduce APK size:

1. Enable ProGuard/R8 (already configured in release builds)
2. Use APK Analyzer in Android Studio to identify large resources
3. Consider using Android App Bundle (AAB) instead of APK for Play Store

## Distribution

### Direct Distribution
- Share the APK file directly
- Users may need to enable "Install from Unknown Sources"

### Google Play Store
- Build an Android App Bundle (AAB):
  ```bash
  cd android && ./gradlew bundleRelease
  ```
- Upload to Google Play Console
- Follow Play Store review guidelines

## Security Notes

1. **Never commit your keystore** to version control
2. Store keystore passwords securely
3. Use different keystores for debug and release
4. Keep a backup of your release keystore
5. The Gemini API key should be stored securely (consider using environment-specific configs)

## Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/guide)
- [Gradle Build Documentation](https://docs.gradle.org/)
