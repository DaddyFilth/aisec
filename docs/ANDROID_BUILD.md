# Android APK Build Guide

This guide explains how to build AI Secretary as an Android APK file.

> **⚡ Runtime Permissions**: The app now includes automatic runtime permission requests for microphone access. When users first launch the app, they'll be prompted to grant microphone permission, which is required for call screening functionality.

> **🔧 Java Version Auto-Fix**: The build system now automatically handles Java version compatibility! If your system Java is incompatible (too old or too new), Gradle will automatically download and use JDK 17. You don't need to manually install or configure Java unless you want to.

> **🔧 Android SDK Auto-Setup**: The build system now automatically detects and configures your Android SDK! During `npm install`, the setup script will create `android/local.properties` with your SDK location. Manual configuration is only needed if auto-detection fails.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)

2. **Java Development Kit (JDK)** - **OPTIONAL with Auto-Fix Enabled**
   - **✨ NEW: Automatic Java version handling** - The build will automatically download JDK 17 if needed
   - Your first build may take longer while JDK 17 is downloaded (~100-200 MB)
   - **Recommended (but optional):** Install JDK 17 or 21 to avoid download time
     - Download JDK 17 from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=17) (recommended)
     - Or download JDK 21 from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21)
     - Verify: `java -version` should show version 17.x.x or 21.x.x
   - **How Auto-Fix Works:**
     - Detects your system Java version
     - If incompatible (< 17 or > 21), downloads JDK 17 automatically
     - Uses the correct JDK for building without changing your system settings
     - Shows a warning message explaining what's happening

3. **Android Studio** (recommended) or Android SDK Command-line Tools
   - Download from [Android Studio](https://developer.android.com/studio)
   - Install Android SDK Platform 34 (or latest)
   - Install Android SDK Build-Tools
   - Install Android SDK Platform-Tools

4. **Gradle** (will be downloaded automatically by the wrapper)

### Environment Variables

> **✨ NEW: SDK auto-detection** - The `ANDROID_HOME` environment variable is now **optional**. The setup script will automatically find your Android SDK during `npm install` from common locations. Setting `ANDROID_HOME` is still recommended for reliability.

**Linux/Mac:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export JAVA_HOME=/path/to/your/jdk  # Optional with auto-fix
```

**Windows:**
```cmd
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
setx JAVA_HOME "C:\Program Files\Java\jdk-17"  # Optional with auto-fix
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
- **With Auto-Fix:** This is usually fine - Gradle will download JDK 17 automatically
- **To install Java manually:** Download JDK 17 and set JAVA_HOME correctly

### "SDK location not found"
- **✨ NEW: Automatic SDK detection** - The setup script automatically creates `android/local.properties` during `npm install`
- The script detects your Android SDK from:
  1. `ANDROID_HOME` environment variable
  2. `ANDROID_SDK_ROOT` environment variable
  3. Common installation paths
- If auto-detection fails:
  - Install Android SDK (via Android Studio or command-line tools)
  - Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable, OR
  - Manually create `android/local.properties` with:
    ```properties
    sdk.dir=/path/to/Android/Sdk
    ```
  - Run `npm install` again to trigger auto-setup

### "Gradle build failed"
- Try cleaning the build:
  ```bash
  cd android && ./gradlew clean
  ```

### "Unsupported class file major version 69" or Java Version Issues
- **✨ This should be automatically fixed!** The build system detects incompatible Java and auto-downloads JDK 17
- If you see a warning message about auto-fix, this is normal - the build will continue
- Your first build may take 5-10 minutes while JDK 17 is downloaded (~100-200 MB)
- Subsequent builds will be fast since the JDK is cached

**If auto-fix doesn't work:**
- Make sure you have internet connection (needed to download JDK)
- Check that `gradle.properties` has toolchain settings enabled
- Manually install JDK 17:
  - Download: [Eclipse Temurin JDK 17](https://adoptium.net/temurin/releases/?version=17)
  - Set JAVA_HOME:
    - **Linux/Mac:** `export JAVA_HOME=/path/to/jdk-17`
    - **Windows:** `setx JAVA_HOME "C:\Program Files\Java\jdk-17"`
  - Verify: `java -version` should show 17.x.x
- Stop all Gradle daemons: `cd android && ./gradlew --stop`
- Clean and rebuild:
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
5. Configure Ollama host/model via environment variables and keep any sensitive settings out of version control

## Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android Developer Guide](https://developer.android.com/guide)
- [Gradle Build Documentation](https://docs.gradle.org/)
