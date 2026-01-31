<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# AI Secretary 🤖📞

**An intelligent call screening assistant powered by Google Gemini AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Contributing](#contributing)

</div>

---

## 📖 Overview

AI Secretary is an intelligent call screening application that uses Google's Gemini AI to interact with callers, ask for their name and purpose, and provide you with the information you need to decide whether to:
- **Accept the call** and connect directly
- **Send to voicemail** to record a message
- **Forward the call** to another number
- **Block** unwanted callers automatically

## ✨ Features

### 🎯 Core Functionality
- **AI-Powered Call Screening**: Gemini AI converses with callers to identify them and their purpose
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
- **Responsive Design**: Works on desktop and mobile devices

## 🎬 Demo

View your app in AI Studio: https://ai.studio/apps/drive/129UWr-WSACDH_B1WBLuIyoni4AVryZ4e

## 🚀 Installation

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **Gemini API Key** - Get yours from [Google AI Studio](https://ai.google.dev/)
- **Microphone access** in your browser

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

3. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## 📖 Usage

### Starting a Call

1. Click the **"SIMULATE CALL"** button to initiate a test call
2. Grant microphone permissions when prompted
3. The AI Secretary will answer and greet the caller
4. Watch the real-time transcription in the console

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

### Tech Stack

- **Frontend**: React 19.2 with TypeScript
- **Build Tool**: Vite 6.2
- **AI/ML**: Google Gemini AI (Live API)
- **Audio**: Web Audio API
- **Styling**: Tailwind CSS (inline)
- **Icons**: Font Awesome

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

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

- Powered by [Google Gemini AI](https://ai.google.dev/)
- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Icons by [Font Awesome](https://fontawesome.com/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DaddyFilth/aisec/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DaddyFilth/aisec/discussions)

---

<div align="center">
Made with ❤️ by the AI Secretary Team
</div>
