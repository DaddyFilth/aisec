<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# AI Secretary 🤖📞

**An intelligent call screening assistant powered by Swireit, AnythingLLM, and Ollama**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Contributing](#contributing)

</div>

---

## 📖 Overview

AI Secretary is an intelligent call screening application that uses Swireit Programmable Voice, AnythingLLM, and Ollama to interact with callers, ask for their name and purpose, and provide you with the information you need to decide whether to:
- **Accept the call** and connect directly
- **Send to voicemail** to record a message
- **Forward the call** to another number
- **Block** unwanted callers automatically

## ✨ Features

### 🎯 Core Functionality
- **AI-Powered Call Screening**: Swireit handles phone audio, AnythingLLM retrieves document-backed context, and Ollama generates responses
- **Smart Contact Management**: Maintain a contact list with VIP designations
- **Call Blocking**: Automatically block unwanted numbers
- **Call History**: Review complete transcripts and recordings of all calls
- **Voicemail Recording**: Capture and playback voicemail messages
- **Call Forwarding**: Route calls to alternate numbers
- **Real-time Transcription**: See live transcripts of AI-caller conversations

### 🎨 User Interface
- **Modern Dashboard**: Sleek, terminal-inspired design with glassmorphism effects
- **Live Console**: Real-time display of call interactions
- **Call Logs**: Searchable history with expandable details
- **Contact Management**: Easy-to-use contact and blocked numbers management
- **Configuration Panel**: Customize voice, audio settings, and behavior

### 🔧 Technical Features
- **Multiple Voice Options**: Choose from Zephyr, Puck, Charon, Kore, or Fenrir
- **Audio Processing**: Configurable noise suppression, echo cancellation, and auto-gain control
- **Language Support**: Multiple language focus options (English US/UK, Spanish, French, German, Japanese, Korean)
- **Local Storage**: Persistent data storage for contacts, logs, and settings
- **Persistent Memory**: Optional memory summary stored in local storage
- **Cross-Platform**: Works on desktop web and Android devices (via APK)
- **Responsive Design**: Optimized for desktop and mobile screens

## 🎬 Demo

View your app in AI Studio: https://ai.studio/apps/drive/129UWr-WSACDH_B1WBLuIyoni4AVryZ4e

## 🚀 Installation

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Service Endpoints** - Backend, AISec, AnythingLLM, and Ollama endpoints
- **Microphone access** on your device

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/DaddyFilth/aisec.git
   cd aisec
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   > **Troubleshooting:** If you encounter a `patch-package` error during installation:
   > ```bash
   > # Clean install
   > rm -rf node_modules package-lock.json
   > npm install
   > ```

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   
Edit `.env.local` and add your service endpoints:
```env
BACKEND_API_URL=http://localhost:8080
BACKEND_WS_URL=ws://localhost:8080
AISEC_UPDATE_URL=https://updates.example.com/aisec.json
AISEC_REMOTE_ASSETS_URL=https://assets.example.com/aisec
AISEC_API_URL=http://localhost:8080/api/ai/process
AISEC_API_KEY=your_aisec_api_key
AISEC_TIMEOUT_MS=5000
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
ANYTHINGLLM_API_URL=http://localhost:3001/api
ANYTHINGLLM_API_KEY=your_anythingllm_api_key
ANYTHINGLLM_WORKSPACE_SLUG=your_workspace_slug
SWIREIT_PROJECT_ID=your_swireit_project_id
SWIREIT_API_TOKEN=your_swireit_api_token
SWIREIT_SPACE_URL=your-space.swireit.com
SWIREIT_CALLER_ID=+15551231234
SWIREIT_SCREENING_NUMBER=+15551230001
SWIREIT_FORWARD_NUMBER=+15551230002
SWIREIT_TWIML_URL=your_swireit_twiml_url
SWIREIT_VALIDATE_WEBHOOKS=true
ALLOWED_ORIGINS=*
```

> **Tip:** If you don't set `BACKEND_API_URL` ahead of time, you can enter it in the app's **Config** panel after launch. It is stored locally for future sessions.

4. **Start the backend server**
   ```bash
   node server/swireit-server.mjs
   ```

5. **Start the development server (auto-opens the UI)**
   ```bash
   npm run dev
   ```

6. **Launch the UI**
    
    Open the app in your preferred client (web or Android). The UI auto-detects Swireit + AISec status from the backend.

### Minimal APK + Remote Assets

To keep the APK size minimal, you can point the Android build to a remote asset host. When `AISEC_REMOTE_ASSETS_URL` is set, Capacitor loads the web bundle from that URL after install. Note that Capacitor's `server.url` mode is primarily intended for remote hosting scenarios and requires network access at runtime, so the app will not work offline without a bundled web build.

```env
AISEC_REMOTE_ASSETS_URL=https://assets.example.com/aisec
```

### Automatic Update Checks

Set `AISEC_UPDATE_URL` to a hosted JSON with the latest version details. On launch, the console will show an update notice.

```json
{
  "version": "1.2.3",
  "notes": "Bug fixes and UI refinements"
}
```

## 📱 Android APK Deployment

AI Secretary can be built and deployed as an Android APK for mobile devices!

**🆕 Android 16 Compatible:** This app now targets Android 16 (API level 36) for the latest features and security improvements.

### Quick Start

**Important:** All commands must be run from the project directory. If you get an error like "Could not read package.json", make sure you are in the `aisec` directory:
```bash
cd aisec
```

1. **Build debug APK for testing:**
   ```bash
   npm run android:build:debug
   ```
   APK location: `apk/aisec-debug.apk` (copied from `android/app/build/outputs/apk/debug/app-debug.apk`)

2. **Build signed release APK for distribution:**
   ```bash
   npm run android:build
   ```
   APK location: `apk/aisec-release.apk` (copied from `android/app/build/outputs/apk/release/app-release.apk`)
   
   **Note:** The release build is now automatically signed. See [Android 16 Upgrade Guide](docs/ANDROID_16_UPGRADE.md) for signing configuration.

### Prerequisites for Android Build

- **Java Development Kit (JDK)** 17 (required for Android 16)
  - **✨ Auto-fix available:** If your system Java is incompatible, Gradle will automatically download JDK 17
- **Android SDK** with API level 36 (Android 16)
  - Install via Android Studio or command-line tools
  - **✨ Auto-setup available:** The build system automatically detects and configures your Android SDK
  - SDK location is auto-detected from common paths or environment variables
- **Gradle 9.1+** (included via wrapper, auto-downloaded on first build)
- **Android Gradle Plugin 9.0.0** (auto-configured)

### APK Signing Configuration

For production releases, configure your signing credentials:

**Option 1 - Environment Variables (CI/CD):**
```bash
export KEYSTORE_FILE=/path/to/keystore.jks
export KEYSTORE_PASSWORD=your_password
export KEY_ALIAS=your_alias
export KEY_PASSWORD=your_key_password
```

**Option 2 - Properties File (Local Dev):**
```bash
cp android/keystore.properties.example android/keystore.properties
# Edit keystore.properties with your credentials
```

If no signing config is provided, the build uses the debug keystore (not suitable for production).

For detailed Android build instructions, including:
- Android 16 compatibility changes
- Keystore generation
- Signing configuration
- Testing on devices/emulators
- Troubleshooting
- Distribution options

👉 See the complete [Android 16 Upgrade Guide](docs/ANDROID_16_UPGRADE.md)
👉 See the [Android Build Guide](docs/ANDROID_BUILD.md)

#### Building on Android (Termux)

You can also build the app directly on your Android device using Termux! The build system automatically detects Termux and applies necessary ARM64 compatibility fixes.

👉 See the [Termux Build Guide](docs/TERMUX_BUILD.md) for instructions

### Available Android Scripts

```bash
npm run android:sync        # Sync web build to Android
npm run android:open        # Open in Android Studio
npm run android:run         # Build and run on device
npm run android:build:debug # Build debug APK
npm run android:build       # Build signed release APK
```

## 📖 Usage

### First Time Setup

1. **Grant Microphone Permission**: On first launch, click **"Enable Call Screening"** 
2. Your device will prompt for microphone access - click **Allow/Grant**
3. Once permission is granted, the button will change to **"Start AI Secretary"**

### Starting Call Screening

1. Click **"Start AI Secretary"** to activate call screening mode
2. Configure your Swireit webhook to point to `POST /swireit/voice` on the backend and set `PUBLIC_URL`
3. Set `BACKEND_API_KEY` in both backend and frontend environments for authenticated API access
4. Speak the wake word to open the console and monitor live call transcripts (default: "Secretary")
5. The AI Secretary will greet callers and ask for their name and purpose
6. Watch the real-time transcription in the console as the conversation unfolds

### Making Decisions

When the AI completes screening, you'll see three action buttons:

- **✓ ACCEPT**: Connect to the caller directly
- **📧 VOICEMAIL**: Send the caller to voicemail (15-second recording)
- **➜ FORWARD**: Transfer the call to your forwarding number

### Managing Contacts

1. Open the **Settings** panel (gear icon)
2. Switch to the **Contacts** tab
3. Add contacts with name, phone number, and VIP status
4. VIP contacts receive personalized greetings
5. Set custom forwarding numbers for specific contacts

### Blocking Numbers

1. Navigate to **Settings → Contacts**
2. Switch to the **Blocked** section
3. Add phone numbers to automatically reject calls
4. Blocked calls appear in your call history

### Reviewing Call History

1. View call logs on the main dashboard
2. Click on any log to expand and see:
   - Full conversation transcript
   - Call status and timestamp
   - Voicemail playback (if recorded)
3. Use the search bar to filter logs

### Permission Management

#### Granting Permissions
- **First Time**: Click "Enable Call Screening" and allow microphone access when prompted
- **Desktop/Web**: Click "Allow" in the permission dialog
- **Android**: The system will request microphone permission - tap "Allow"

#### If Permission Denied
- **Web**: Click the lock icon in the address bar → Site Settings → Microphone → Allow
- **Android**: Go to Settings → Apps → AI Secretary → Permissions → Enable Microphone
- After granting in settings, return to the app and click "Grant Microphone Access"

#### Permission Status Indicators
- ✅ **Ready**: Green button shows "Start AI Secretary" - ready to screen calls
- ⚠️ **Permission Needed**: Blue button shows "Enable Call Screening" - click to request
- ❌ **Access Denied**: Red button shows "Grant Microphone Access" - permission denied, check settings

## ⚙️ Configuration

### Voice Settings

Choose from 5 AI voice personalities:
- **Kore** (Standard) - Balanced and professional
- **Zephyr** (Bright) - Energetic and friendly
- **Puck** (Fast) - Quick and efficient
- **Charon** (Deep) - Authoritative and calm
- **Fenrir** (Bold) - Confident and strong

### Audio Settings

- **Noise Suppression**: Reduce background noise
- **Echo Cancellation**: Eliminate audio feedback
- **Auto Gain Control**: Normalize volume levels

### Personal Information

- **Owner Name**: Customize how the AI refers to you
- **Forwarding Number**: Default number for call forwarding
- **Language Focus**: Set preferred language for transcription

## 🏗️ Project Structure

```
aisec/
├── App.tsx              # Main application component
├── index.tsx            # React entry point
├── types.ts             # TypeScript type definitions
├── utils/
│   └── audio-utils.ts   # Audio processing utilities
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
├── .env.local.example   # Environment template
└── README.md            # This file
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run ml:ingest:transcripts` - Upload transcript batches into AnythingLLM
- `npm run ml:ingest:transcripts:dry` - Parse transcripts without uploading
- `npm run ml:train:transcripts` - Generate a unigram transcript model JSON file

### Tech Stack

- **Frontend**: React 19.2 with TypeScript
- **Build Tool**: Vite 6.2
- **AI/ML**: Swireit Programmable Voice + AnythingLLM + Ollama
- **Audio**: Web Audio API
- **Styling**: Tailwind CSS (inline)
- **Icons**: Font Awesome

## 🔧 Troubleshooting

### Installation Issues

#### `patch-package` errors during `npm install`

If you encounter errors like:
```
**ERROR** Failed to apply patch for package @capacitor/cli
```

This typically occurs when `node_modules` is in an inconsistent state. To fix:

1. **Clean installation** (recommended):
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **If the issue persists**, ensure your Git client is configured to use LF line endings:
   ```bash
   git config core.autocrlf input
   git rm -rf .
   git reset --hard HEAD
   npm install
   ```

3. **Verify patch files** have LF line endings (for contributors):
   ```bash
   # On Unix/Linux/Mac
   dos2unix patches/*.patch
   
   # Or manually fix line endings in your editor
   ```

#### `MERGE_HEAD exists` or unfinished merge errors

If you see:
```
error: You have not concluded your merge (MERGE_HEAD exists).
fatal: Exiting because of unfinished merge.
```
You have a merge in progress. Resolve it by either:
- **Finish the merge**: resolve conflicts, then run `git add <files>` and `git commit`.
- **Abort the merge** (discard the in-progress merge): `git merge --abort`.

### Build Issues

See the [Android Build Guide](docs/ANDROID_BUILD.md) for Android-specific troubleshooting.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

For information about managing dependencies, see [DEPENDENCY_MANAGEMENT.md](docs/DEPENDENCY_MANAGEMENT.md).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security concerns, please review our [Security Policy](SECURITY.md).

## 🙏 Acknowledgments

- Powered by Swireit, AnythingLLM, and Ollama
- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Icons by [Font Awesome](https://fontawesome.com/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DaddyFilth/aisec/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DaddyFilth/aisec/discussions)

---

<div align="center">
Made with ❤️ by the AI Secretary Team
</div>

## 🤖 Transcript ingestion

Use the transcript ingestion utility to load conversation transcripts and optionally generate a unigram token model for ML workflows. See `docs/TRANSCRIPT_INGESTION.md` for JSON formats and options.
