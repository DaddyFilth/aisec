# Dependency Management Guide

This guide explains how to manage and update dependencies in the AI Secretary project.

## Overview

The project uses multiple package managers:
- **npm** for JavaScript/TypeScript dependencies (React, Vite, Capacitor)
- **Gradle** for Android dependencies
- **GitHub Actions** for CI/CD workflows

## Automated Dependency Updates

### Dependabot

The project uses [Dependabot](https://docs.github.com/en/code-security/dependabot) for automated dependency updates. Configuration is in `.github/dependabot.yml`.

**Features:**
- Automatic weekly checks for outdated dependencies (Mondays at 9:00 AM UTC)
- Automated pull requests for dependency updates
- Groups minor and patch updates to reduce PR noise
- Separate updates for npm, Gradle, and GitHub Actions

**How it works:**
1. Dependabot checks for updates weekly
2. Creates pull requests for outdated dependencies
3. PRs are labeled automatically (`dependencies`, `npm`, `gradle`, etc.)
4. Review and merge the PRs after testing

### GitHub Actions Workflow

The `dependency-management.yml` workflow provides additional automation:

**Automatic Checks (Weekly):**
- Runs every Monday at 9:00 AM UTC
- Checks for outdated packages
- Runs security audits
- Analyzes for unused dependencies
- Generates summary reports

**Manual Updates:**
You can trigger manual updates from the GitHub Actions tab:

1. Go to **Actions** → **Dependency Management**
2. Click **Run workflow**
3. Select update type:
   - `check` - Just check for updates (no changes)
   - `update-patch` - Update patch versions (e.g., 1.2.3 → 1.2.4)
   - `update-minor` - Update minor versions (e.g., 1.2.3 → 1.3.0)
   - `audit-fix` - Fix security vulnerabilities automatically
4. Click **Run workflow**

If updates are found, the workflow creates a pull request automatically.

## Manual Dependency Management

### NPM Dependencies

#### Check for Outdated Packages

```bash
npm run deps:check
# or
npm outdated
```

This shows which packages have updates available.

#### Security Audit

```bash
npm run deps:audit
# or
npm audit
```

Check for security vulnerabilities in dependencies.

#### Fix Security Issues

```bash
npm run deps:audit:fix
# or
npm audit fix
```

Automatically fix security vulnerabilities (if possible).

#### Update Dependencies

**Safe updates (patch versions only):**
```bash
npm run deps:update
# or
npm update
```

**Interactive update (choose which packages to update):**
```bash
npm run deps:update:interactive
```

**Update to latest minor versions:**
```bash
npm run deps:update:minor
```

**Update to latest versions (including major):**
```bash
npm run deps:update:latest
```

**Note:** Major version updates may include breaking changes. Always test thoroughly!

#### Clean Install

If you encounter dependency issues:
```bash
npm run deps:clean
```

This removes `node_modules` and `package-lock.json`, then reinstalls everything.

### Gradle (Android) Dependencies

Android dependencies are defined in:
- `android/build.gradle` - Project-level dependencies
- `android/app/build.gradle` - App-level dependencies
- `android/variables.gradle` - Shared version variables

#### Check for Updates

```bash
cd android
./gradlew dependencyUpdates
```

**Note:** You may need to install the [Gradle Versions Plugin](https://github.com/ben-manes/gradle-versions-plugin) first.

#### Update Gradle Wrapper

```bash
cd android
./gradlew wrapper --gradle-version=<version>
```

#### Manual Updates

Edit the version numbers in:
1. `android/variables.gradle` - For library versions
2. `android/build.gradle` - For Gradle plugin versions

After updating:
```bash
cd android
./gradlew clean build
```

## Best Practices

### 1. **Always Review Changes**
- Check the changelog/release notes before updating
- Look for breaking changes
- Understand what's being updated

### 2. **Test After Updates**
- Run the app locally: `npm run dev`
- Test Android build: `npm run android:build:debug`
- Run any existing tests
- Check for console errors

### 3. **Update Regularly**
- Don't let dependencies get too outdated
- Address security vulnerabilities promptly
- Review Dependabot PRs weekly

### 4. **Semantic Versioning**
- **Patch** (1.2.3 → 1.2.4): Bug fixes, safe to update
- **Minor** (1.2.3 → 1.3.0): New features, usually backward compatible
- **Major** (1.2.3 → 2.0.0): Breaking changes, requires testing

### 5. **Lock File Management**
- Always commit `package-lock.json`
- Never manually edit `package-lock.json`
- If corrupted, use `npm run deps:clean`

### 6. **Security First**
- Run `npm audit` regularly
- Fix critical and high-severity issues immediately
- Subscribe to security advisories for key dependencies

## Common Issues

### "npm ERR! Could not resolve dependency"

**Solution:**
```bash
npm run deps:clean
```

### "ERESOLVE unable to resolve dependency tree"

**Solution 1:** Update npm
```bash
npm install -g npm@latest
```

**Solution 2:** Use `--legacy-peer-deps`
```bash
npm install --legacy-peer-deps
```

### "Gradle build failed after update"

**Solution:**
1. Check Java version: `java -version` (should be 17 or 21)
2. Clean Gradle cache:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew --stop
   ```
3. Check ANDROID_BUILD.md for troubleshooting

### "Capacitor version mismatch"

Ensure all Capacitor packages use the same version:
```bash
npm list @capacitor/core @capacitor/cli @capacitor/android
```

Update if needed:
```bash
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
```

## Monitoring Dependencies

### GitHub Security Alerts

GitHub automatically detects vulnerabilities in dependencies:
1. Check the **Security** tab in the repository
2. Review **Dependabot alerts**
3. Follow recommendations to fix

### NPM Audit

Run regularly:
```bash
npm audit
```

Review the output and fix issues:
```bash
npm audit fix
```

For issues that can't be auto-fixed:
```bash
npm audit fix --force
```

**Warning:** `--force` may install breaking changes. Test thoroughly!

## Dependency Update Checklist

When updating dependencies:

- [ ] Review what's being updated
- [ ] Check for breaking changes
- [ ] Run `npm install` or update command
- [ ] Test the development server: `npm run dev`
- [ ] Test the build: `npm run build`
- [ ] Test Android build: `npm run android:build:debug`
- [ ] Check console for errors
- [ ] Verify critical features still work
- [ ] Update documentation if needed
- [ ] Commit changes
- [ ] Create a pull request

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [npm-check-updates](https://github.com/raineorshine/npm-check-updates)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Gradle Dependency Management](https://docs.gradle.org/current/userguide/dependency_management.html)
- [Semantic Versioning](https://semver.org/)

## Getting Help

If you encounter issues:
1. Check this guide
2. Review CONTRIBUTING.md
3. Check ANDROID_BUILD.md for Android-specific issues
4. Search existing GitHub issues
5. Create a new issue with details

---

**Last Updated:** 2026-01-31
