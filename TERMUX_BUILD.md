# Building in Termux (Android Terminal)

This document explains how to build the AI Secretary app directly on your Android device using Termux.

## Overview

The AI Secretary app can be built directly on Android devices using [Termux](https://termux.dev/), a powerful terminal emulator and Linux environment for Android. However, building Android apps in Termux requires special handling because:

1. **Architecture Difference**: Termux runs on ARM64 architecture, while most Android build tools are compiled for x86/x64
2. **AAPT2 Compatibility**: The Android Asset Packaging Tool 2 (AAPT2) bundled with the Android Gradle Plugin doesn't work on ARM64

## Automatic Termux Detection

**Good news!** This project now automatically detects when you're building in Termux and applies the necessary fixes.

### How It Works

The build configuration in `android/build.gradle` checks for the `PREFIX` environment variable:
- If `PREFIX` contains `com.termux`, the build system knows you're in Termux
- It then looks for ARM64-compatible AAPT2 at `/data/data/com.termux/files/usr/bin/aapt2`
- If found, it automatically configures Gradle to use it instead of the bundled x86/x64 version
- If not found, it displays a helpful warning message

### What You Need to Do

Simply install the ARM64-compatible AAPT2:

```bash
pkg install aapt2
```

That's it! The build system handles everything else automatically.

## Building the App

### Prerequisites

1. **Install Termux** from [F-Droid](https://f-droid.org/packages/com.termux/) (recommended) or GitHub releases
2. **Install required packages**:
   ```bash
   pkg update
   pkg install nodejs git openjdk-17 aapt2
   ```

### Build Steps

1. **Clone the repository**:
   ```bash
   cd ~
   git clone https://github.com/DaddyFilth/aisec.git
   cd aisec
   ```

2. **Install npm dependencies**:
   ```bash
   npm install
   ```

3. **Build the debug APK**:
   ```bash
   npm run android:build:debug
   ```

   The APK will be created at: `android/app/build/outputs/apk/debug/app-debug.apk`

4. **Install the APK**:
   ```bash
   # The APK is in the android folder, you can install it using:
   # Option 1: Use a file manager to navigate to the APK and install it
   # Option 2: Use adb if you have it installed
   ```

## Troubleshooting

### "AAPT2 Daemon startup failed"

This error occurs when AAPT2 is not installed or not compatible. 

**Solution:**

1. **Install ARM64-compatible AAPT2:**
   ```bash
   pkg install aapt2
   ```

2. **Verify installation:**
   ```bash
   file /data/data/com.termux/files/usr/bin/aapt2
   # Should show: ELF 64-bit LSB executable, ARM aarch64
   ```

3. **The AAPT2 override is now enabled by default** in `android/gradle.properties` to prevent this error. If you still encounter issues, verify that the file exists and is executable.

**Note:** The gradle.properties file now has the AAPT2 override uncommented by default. This ensures builds work in Termux without manual configuration. The build system will use the Termux AAPT2 if it exists, or fall back to the default behavior otherwise.

### Build is very slow

Android builds in Termux can be slow due to:
- Limited device resources
- ARM architecture requires translation/emulation of some x86 tools
- Large dependency downloads

**Tips to speed up builds**:
- Close other apps to free up memory
- Use `./gradlew --offline` for subsequent builds (after first successful build)
- Consider increasing Gradle's memory in `android/gradle.properties`:
  ```properties
  org.gradle.jvmargs=-Xmx2048m
  ```

### Out of memory errors

If you get out of memory errors during build:
1. Close all other apps
2. Reduce Gradle's memory allocation in `android/gradle.properties`
3. Try building with `--no-daemon` flag:
   ```bash
   cd android && ./gradlew assembleDebug --no-daemon
   ```

### Manual AAPT2 Override

The AAPT2 override is **already enabled** in `android/gradle.properties` to fix AAPT2 daemon startup failures.

If you need to change the AAPT2 location:

1. Edit `android/gradle.properties`
2. Modify the line:
   ```properties
   android.aapt2FromMavenOverride=/path/to/your/aapt2
   ```

To disable the override (e.g., when building on a desktop), comment out the line:
```properties
#android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
```

## Performance Considerations

Building in Termux is generally **slower** than building on a desktop computer:
- **First build**: Can take 10-30 minutes depending on device
- **Incremental builds**: 2-5 minutes
- **Full rebuilds**: 10-20 minutes

For faster development, consider:
1. Using a desktop computer for development
2. Building in Termux only for final testing on the device
3. Using `npm run android:sync` instead of full builds when only web assets change

## Security Note

Building directly on your device means:
- The APK is created locally and not sent over the network
- You have full control over the build process
- No need to trust third-party build services

However, keep in mind:
- Building apps requires significant permissions in Termux
- Always review code before building from unknown sources
- The APK won't be signed with a release key unless you configure one

## Additional Resources

- [Termux Wiki](https://wiki.termux.com/)
- [Android Build Guide](ANDROID_BUILD.md)
- [Termux GitHub Issues](https://github.com/termux/termux-app/issues)
