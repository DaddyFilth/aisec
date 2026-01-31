# Android 16 Compatibility Upgrade Guide

This document describes the changes made to support Android 16 (API level 36) and APK signing.

## Overview

The application has been updated to target Android 16 (API level 36), which is required for:
- Latest Android features and APIs
- Google Play Store submission requirements (starting August 2026)
- Improved security and performance optimizations

## Changes Made

### 1. Android SDK Version Updates

**File: `android/variables.gradle`**
- Updated `compileSdkVersion` from 35 to **36**
- Updated `targetSdkVersion` from 35 to **36**
- Kept `minSdkVersion` at 23 (Android 6.0+) for backward compatibility

### 2. Build Tools Updates

**Files: `android/build.gradle` and `android/gradle/wrapper/gradle-wrapper.properties`**

To support Android 16 (API 36), the following build tool versions are required:

- **Android Gradle Plugin (AGP):** 9.0.0 (minimum required for API 36)
- **Gradle:** 9.1 (minimum required for AGP 9.0.0)
- **JDK:** 17 (already configured via Java Toolchain)

**Note:** These versions are configured in the build files but require network access to download. The build system will automatically download these when you run a build with internet connectivity.

### 3. APK Signing Configuration (NEW)

**File: `android/app/build.gradle`**

Added comprehensive signing configuration to support multiple scenarios:

#### Option 1: Environment Variables (Recommended for CI/CD)
```bash
export KEYSTORE_FILE=/path/to/your/keystore.jks
export KEYSTORE_PASSWORD=your_store_password
export KEY_ALIAS=your_key_alias
export KEY_PASSWORD=your_key_password
```

#### Option 2: Keystore Properties File (Recommended for Local Development)
1. Copy `android/keystore.properties.example` to `android/keystore.properties`
2. Fill in your keystore details:
   ```properties
   storeFile=/path/to/your/keystore.jks
   storePassword=your_store_password
   keyAlias=your_key_alias
   keyPassword=your_key_password
   ```
3. The file is automatically ignored by Git for security

#### Option 3: Debug Keystore (Fallback)
If no signing configuration is provided, the build will automatically use the Android debug keystore with a warning. This is suitable for development but **not for production releases**.

### 4. Capacitor Patches

**Files: `patches/@capacitor+android+7.4.5.patch` and `patches/@capacitor+cli+7.4.5.patch`**

Maintained compatibility patches that:
- Change Java version from 21 to 17 for broader compatibility
- Fix tar import issues in Capacitor CLI

These patches are automatically applied during `npm install`.

## Building Signed APKs

### Create a Keystore (One-time Setup)

If you don't have a keystore, create one:

```bash
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias
```

**Important:** Keep your keystore file and passwords secure! Store backups in a safe location.

### Build Signed Release APK

#### Using npm scripts:
```bash
npm run android:build
```

#### Using Gradle directly:
```bash
cd android
./gradlew assembleRelease
```

The signed APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Build Debug APK

For testing purposes, you can build a debug APK:
```bash
npm run android:build:debug
```

## Android 16 Behavior Changes

### Important Changes to Be Aware Of:

1. **Adaptive Layouts:** Apps must support adaptive layouts on large screens (≥600dp). Screen orientation locking is restricted on tablets and foldables.

2. **Predictive Back Navigation:** Predictive back gestures are enabled by default. The legacy `onBackPressed` API is deprecated.

3. **Foreground Service Limitations:** Stricter quotas on background jobs and foreground services.

4. **Permission Model:** Continued refinement of the Android permission model with tighter restrictions.

## Testing

### Test on Android 16 Devices/Emulators

1. Install Android Studio with Android 16 SDK (API 36)
2. Create an Android 16 emulator or use a physical device
3. Install the APK:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```
4. Test all features, especially:
   - Microphone permissions
   - Screen rotation on tablets
   - Back navigation
   - Background tasks

### Verify Signing

To verify your APK is signed correctly:
```bash
jarsigner -verify -verbose -certs app-release.apk
```

Or use `apksigner`:
```bash
apksigner verify --verbose app-release.apk
```

## Troubleshooting

### Build Fails with "Unsupported class file major version"
- Ensure you're using JDK 17
- Check that Gradle toolchain is configured correctly (already done in `build.gradle`)

### "Could not resolve com.android.tools.build:gradle:9.0.0"
- Ensure you have internet connectivity
- Gradle will download the required version on first build

### Signing Configuration Not Found
- Verify `keystore.properties` exists and has correct paths
- Or set environment variables for CI/CD builds
- Check that the keystore file exists at the specified path

### Network Issues Downloading Gradle 9.1
- If behind a proxy, configure Gradle proxy settings in `gradle.properties`
- Or manually download Gradle 9.1 and place in the wrapper/dists folder

## Security Considerations

1. **Never commit keystore files to version control**
   - Keystore files (*.jks, *.keystore) are excluded via `.gitignore`
   - `keystore.properties` is excluded via `.gitignore`

2. **Protect your keystore credentials**
   - Store passwords in a secure password manager
   - Keep backups of your keystore in a secure location
   - Losing your keystore means you cannot update your app on Google Play

3. **Use different keystores for debug and release**
   - Debug keystore: for development and testing
   - Release keystore: for production releases only

## References

- [Android 16 SDK Setup](https://developer.android.com/about/versions/16/setup-sdk)
- [Android 16 Behavior Changes](https://developer.android.com/about/versions/16/behavior-changes-16)
- [AGP 9.0.0 Release Notes](https://developer.android.com/build/releases/agp-9-0-0-release-notes)
- [Sign Your App](https://developer.android.com/studio/publish/app-signing)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)

## Migration Checklist

- [x] Update compileSdk to 36
- [x] Update targetSdk to 36
- [x] Update AGP to 9.0.0
- [x] Update Gradle to 9.1
- [x] Configure APK signing
- [x] Update .gitignore for security
- [x] Create keystore.properties.example
- [ ] Create production keystore
- [ ] Configure signing credentials
- [ ] Test build with signing
- [ ] Test on Android 16 devices
- [ ] Review behavior changes impact
- [ ] Update app for adaptive layouts (if needed)
- [ ] Migrate to predictive back navigation (if needed)
