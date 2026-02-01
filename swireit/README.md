# 📞 Swireit - Free Real-Time Call Platform

A completely free and open-source real-time call handling platform with AI agent tools, similar to SignalWire but without any costs.

## ✨ Features

- 🌐 **WebRTC Voice Calls** - Browser-based real-time audio communication
- 🤖 **AI Agent Tools** - Smart call handling with intent recognition
- 🔄 **Call Transfer** - Route and manage calls dynamically
- 📡 **WebSocket Signaling** - Fast and reliable connection management
- 💰 **100% Free** - No hidden costs, subscriptions, or API limits
- 🚀 **Easy Setup** - Get started in minutes

## 🎯 What You Get

Unlike paid services like SignalWire, Swireit provides:

1. **Real-time call handling** - WebRTC-based voice communication
2. **AI agent capabilities** - Intent recognition and automated responses
3. **Signaling server** - WebSocket-based call management
4. **Web interface** - Ready-to-use browser client
5. **REST API** - Programmatic call control
6. **Open source** - Modify and extend as needed

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Modern web browser with WebRTC support

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

The server will start on port 3000 (or PORT environment variable).

### Development Mode

```bash
npm run dev
```

## 📖 Usage

### Web Interface

1. Open http://localhost:3000 in your browser
2. Enter a client ID (username) and click "Connect"
3. Open another browser window/tab with a different client ID
4. Enter the other client's ID and click "Start Call"
5. The other client will receive an incoming call notification

### API Endpoints

**Health Check**
```bash
GET /api/health
```

**Get Active Calls**
```bash
GET /api/calls
```

**AI Agent Processing**
```bash
POST /api/ai/process
Content-Type: application/json

{
  "transcript": "Hello, I need help",
  "context": {}
}
```

### WebSocket Protocol

Connect to `ws://localhost:3000` and send:

**Register Client**
```json
{
  "type": "register",
  "clientId": "user123"
}
```

**Make a Call**
```json
{
  "type": "call",
  "to": "user456",
  "offer": <RTCSessionDescription>
}
```

## 🤖 AI Agent Features

The platform includes a basic AI agent that can:

- Recognize greetings and respond appropriately
- Understand help requests
- Detect transfer/forward intents
- Provide contextual responses

### Extending AI Capabilities

You can integrate free AI services:

- **Hugging Face** - Free inference API
- **OpenAI Free Tier** - Limited free tokens
- **Local Models** - Run models like Llama locally
- **Rasa** - Open-source conversational AI

### AISec (AI Secretary) Integration

Swireit can forward AI processing to the AISec backend (https://github.com/DaddyFilth/aisec) for advanced call screening.

1. Clone and start AISec from the repo:
   - `git clone https://github.com/DaddyFilth/aisec.git`
   - `cd aisec`
   - Follow the AISec README to configure and run the service (the default endpoint is `/api/ai/process`).
2. Add the following to your `.env` file in this repo:

```env
AISEC_API_URL=http://localhost:8080/api/ai/process
AISEC_API_KEY=your_aisec_api_key
AISEC_TIMEOUT_MS=5000
```

3. Restart Swireit so it picks up the AISec settings.

Swireit will call AISec when `AISEC_API_URL` is set, and fall back to the built-in rules if AISec is unavailable.

Example integration in `src/server.ts`:

```typescript
import fetch from 'node-fetch';

async function processWithAI(transcript: string) {
  // Example: Use Hugging Face free API (no cost, no API key required for basic usage)
  const response = await fetch(
    'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: transcript })
    }
  );
  return await response.json();
}
```

## 🏗️ Architecture

```
┌─────────────┐         WebSocket         ┌─────────────┐
│   Client A  │◄──────Signaling──────────►│   Server    │
└─────────────┘                            └─────────────┘
       │                                          │
       │            WebRTC Audio                  │
       │◄─────────Direct P2P────────────►│        │
       │                                  │        │
┌─────────────┐                     ┌─────────────┐
│   Client B  │                     │  AI Agent   │
└─────────────┘                     └─────────────┘
```

## 🔧 Configuration

Create a `.env` file:

```env
PORT=3000
```

## 🌟 Use Cases

- **Customer Support** - AI-powered call routing
- **Conference Calling** - Multi-party voice chat
- **Voice Assistants** - Build custom voice bots
- **Call Centers** - Free alternative to expensive platforms
- **Testing** - WebRTC development and testing

## 🆚 Comparison with SignalWire

| Feature | Swireit | SignalWire |
|---------|---------|------------|
| Voice Calls | ✅ Free | 💰 Paid |
| AI Integration | ✅ Free | 💰 Paid |
| WebRTC | ✅ Yes | ✅ Yes |
| Cost | 💚 $0 | 💸 Usage-based |
| Open Source | ✅ Yes | ❌ No |
| Self-Hosted | ✅ Yes | ❌ No |

## 🔐 Security Notes

For production use:

1. Add authentication/authorization
2. Use HTTPS/WSS for encryption
3. Implement rate limiting
4. Add input validation
5. Use secure TURN servers for NAT traversal

## 📝 License

MIT License - Use freely for any purpose

## 🤝 Contributing

Contributions welcome! This is a free alternative to expensive platforms.

## 🎓 Learn More

- [WebRTC Documentation](https://webrtc.org/)
- [WebSocket Protocol](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Free AI APIs](https://huggingface.co/inference-api)

## 💡 Future Enhancements

- [ ] Recording capabilities
- [ ] Group calling (3+ participants)
- [ ] Screen sharing
- [ ] Advanced AI models integration
- [ ] Call analytics dashboard
- [ ] SIP gateway integration
- [ ] Mobile app support

---

Built with ❤️ as a free alternative to expensive call platforms
