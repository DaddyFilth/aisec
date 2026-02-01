# Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Option 1: Local Development (Recommended for testing)

```bash
# 1. Clone the repository
git clone https://github.com/DaddyFilth/swireit.git
cd swireit

# 2. Install dependencies
npm install

# 3. Start the server
npm run dev
```

Open http://localhost:3000 in your browser!

### Option 2: Production Build

```bash
# Build and run
npm install
npm run build
npm start
```

### Option 3: Docker

```bash
# Build and run with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📞 Make Your First Call

1. **Open two browser tabs** at http://localhost:3000
2. **Tab 1**: Enter username "alice" → Click Connect
3. **Tab 2**: Enter username "bob" → Click Connect  
4. **Tab 1**: Enter "bob" in "Call To" → Click Start Call
5. **Tab 2**: Click Answer
6. **Talk!** 🎉

## 🤖 Test AI Features

In the AI Agent Tools section, try:
- "Hello" → Greeting
- "I need help" → Help menu
- "Transfer my call" → Transfer request

## 🔧 Configuration

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Available options:
- `PORT`: Server port (default: 3000)
- Add AI API keys if using external services

## 📚 Learn More

- Full documentation: `README.md`
- Usage examples: `examples/USAGE.md`
- API reference: See `/api/*` endpoints in `src/server.ts`

## 🆘 Troubleshooting

**Can't hear audio?**
- Allow microphone permissions in your browser
- Check browser console for errors
- Try using Chrome or Firefox

**Connection failed?**
- Ensure server is running on port 3000
- Check firewall settings
- For WSS, you need HTTPS

**Docker build fails?**
- Ensure Docker is installed and running
- Try: `docker-compose build --no-cache`

## 💡 What's Next?

- Deploy to the cloud (free tier available on Railway, Render, Fly.io)
- Add external AI integration (Hugging Face is free!)
- Customize the UI
- Add recording features
- Build a mobile app

## 🌟 Features You Get for FREE

✅ Unlimited voice calls  
✅ AI call handling  
✅ WebRTC technology  
✅ No time limits  
✅ No user limits  
✅ Full source code access  
✅ Commercial use allowed (MIT License)

Enjoy your free SignalWire alternative! 🎊
