# Swireit Usage Examples

## Example 1: Basic Voice Call

### Step 1: Start two clients

Open two browser windows at `http://localhost:3000`

**Window 1:**
- Client ID: `alice`
- Click "Connect"

**Window 2:**
- Client ID: `bob`
- Click "Connect"

### Step 2: Make a call

In Window 1 (Alice):
- Enter "bob" in the "Call To" field
- Click "Start Call"
- Allow microphone access when prompted

In Window 2 (Bob):
- Click "Answer" on the incoming call notification
- Allow microphone access when prompted

Now Alice and Bob can talk!

## Example 2: AI Agent Integration

### Test AI Responses

Try these messages in the AI Agent Tools section:

```
"Hello" → Greeting response
"I need help" → Help menu
"Transfer my call" → Transfer request
"Something else" → Clarification request
```

### Integrate with Free AI APIs

Edit `src/server.ts` to use Hugging Face (free tier):

```typescript
import fetch from 'node-fetch';

async function processWithAI(transcript: string, context: any) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_FREE_HF_TOKEN',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: transcript
        })
      }
    );
    
    const data = await response.json();
    return {
      intent: 'ai_generated',
      response: data[0]?.generated_text || 'I understand.',
      action: 'respond'
    };
  } catch (error) {
    // Fallback to rule-based
    return processWithRules(transcript);
  }
}
```

Get your free token at: https://huggingface.co/settings/tokens

## Example 3: Programmatic Call Control

### Using the REST API

```javascript
// Check server health
const health = await fetch('http://localhost:3000/api/health');
console.log(await health.json());
// Output: { status: 'healthy', activeClients: 2, activeCalls: 1 }

// Get active calls
const calls = await fetch('http://localhost:3000/api/calls');
console.log(await calls.json());
// Output: { calls: [...] }

// Process with AI
const aiResponse = await fetch('http://localhost:3000/api/ai/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: 'I want to speak to sales',
    context: { callerNumber: '+1234567890' }
  })
});
console.log(await aiResponse.json());
```

## Example 4: WebSocket Client

### Connect from Node.js

```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  // Register client
  ws.send(JSON.stringify({
    type: 'register',
    clientId: 'bot-agent-1'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
  
  if (message.type === 'incoming-call') {
    // Auto-answer calls
    ws.send(JSON.stringify({
      type: 'answer',
      callId: message.callId,
      answer: createAnswer() // Your WebRTC answer
    }));
  }
});
```

## Example 5: Custom Call Routing

Extend the server to add custom routing logic:

```typescript
// In src/server.ts, add after processWithAI function:

async function routeCall(transcript: string, callerId: string) {
  const intent = await processWithAI(transcript, {});
  
  switch (intent.intent) {
    case 'sales':
      return { target: 'sales-team', priority: 'high' };
    case 'support':
      return { target: 'support-team', priority: 'normal' };
    case 'emergency':
      return { target: 'on-call-manager', priority: 'urgent' };
    default:
      return { target: 'general-queue', priority: 'normal' };
  }
}

// Add new endpoint:
app.post('/api/route-call', async (req, res) => {
  const { transcript, callerId } = req.body;
  const route = await routeCall(transcript, callerId);
  res.json(route);
});
```

## Example 6: Integration with Local AI Models

Use free local AI models:

```bash
# Install Ollama (free, runs locally)
# 1) Download the installer script and review it before running:
curl -fsSL https://ollama.ai/install.sh -o install-ollama.sh
# 2) Inspect install-ollama.sh to ensure you trust it, then run:
sh install-ollama.sh

# Pull a model
ollama pull llama2

# Use in your app
```

```typescript
async function processWithLocalAI(transcript: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',
      prompt: `You are a helpful call center assistant. User says: "${transcript}". Respond helpfully.`,
      stream: false
    })
  });
  
  const data = await response.json();
  return {
    intent: 'ai_generated',
    response: data.response,
    action: 'respond'
  };
}
```

## Tips

1. **Free STUN/TURN servers**: Use Google's STUN servers (already configured)
2. **Scaling**: Run multiple instances behind a load balancer
3. **Security**: Always use HTTPS/WSS in production
4. **Monitoring**: Add logging with Winston or Pino
5. **Testing**: Use multiple browser tabs to test locally

## Production Deployment

See `docker-compose.yml` for easy deployment with Docker.

For cloud deployment (with free tiers):
- **Railway**: Generous free tier available  
- **Render**: 750 hours/month free
- **Fly.io**: Free tier with 3 VMs
- **Vercel**: Free for hobby projects (with serverless functions)
