import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import twilio from 'twilio';
import { WebSocketServer } from 'ws';
import { callOllama } from './ollama-client.mjs';
import { fetchChatHistory, sendChatMessage } from './anythingllm-client.mjs';

dotenv.config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const PORT = process.env.PORT || 8080;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_CALLER_ID = process.env.TWILIO_CALLER_ID;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
const ANYTHINGLLM_API_URL = process.env.ANYTHINGLLM_API_URL;
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;
const ANYTHINGLLM_WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE_SLUG;
const PUBLIC_URL = process.env.PUBLIC_URL;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.warn('Twilio credentials are not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
}

const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/call' });
const wsClients = new Set();

const broadcast = (payload) => {
  const data = JSON.stringify(payload);
  wsClients.forEach(client => {
    if (client.readyState !== 1) return;
    const subscription = client.subscription || '*';
    if (subscription === '*' || !payload.callId || subscription === payload.callId) {
      client.send(data);
    }
  });
};

wss.on('connection', (socket) => {
  socket.subscription = '*';
  wsClients.add(socket);
  socket.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString());
      if (payload.type === 'subscribe') {
        socket.subscription = payload.callId || '*';
      }
    } catch (error) {
      console.warn('Invalid websocket message', error);
    }
  });
  socket.on('close', () => {
    wsClients.delete(socket);
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/twilio/voice', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const caller = req.body.From || 'Unknown caller';
  const callSid = req.body.CallSid || `call-${Date.now()}`;
  broadcast({ type: 'call.start', callId: callSid, from: caller });
  response.gather({
    input: 'speech',
    action: '/twilio/voice/handle',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US'
  }).say(`Hello. Please tell me how I can help. This call is being handled by AI secretary.`);
  response.say('We did not receive a response. Goodbye.');
  response.hangup();
  res.type('text/xml');
  res.send(response.toString());
});

app.post('/twilio/voice/handle', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  const transcript = req.body.SpeechResult || '';
  const caller = req.body.From || 'Unknown caller';
  const callSid = req.body.CallSid || `call-${Date.now()}`;

  try {
    if (!ANYTHINGLLM_API_URL || !ANYTHINGLLM_API_KEY || !ANYTHINGLLM_WORKSPACE_SLUG || !OLLAMA_API_URL) {
      response.say('Service configuration is incomplete. Please try again later.');
      response.hangup();
      res.type('text/xml');
      return res.send(response.toString());
    }
    if (!transcript) {
      response.say('I did not catch that. Please try again later.');
      response.hangup();
      res.type('text/xml');
      return res.send(response.toString());
    }

    broadcast({ type: 'transcript', callId: callSid, text: transcript });

    await sendChatMessage({
      baseUrl: ANYTHINGLLM_API_URL,
      apiKey: ANYTHINGLLM_API_KEY,
      workspaceSlug: ANYTHINGLLM_WORKSPACE_SLUG,
      message: `Caller ${caller}: ${transcript}`,
      sessionId: callSid
    });

    const history = await fetchChatHistory({
      baseUrl: ANYTHINGLLM_API_URL,
      apiKey: ANYTHINGLLM_API_KEY,
      workspaceSlug: ANYTHINGLLM_WORKSPACE_SLUG,
      sessionId: callSid
    });

    const prompt = [
      'You are an AI secretary. Summarize the caller intent and propose next steps for the owner.',
      `Caller said: ${transcript}`,
      `Conversation history: ${JSON.stringify(history)}`
    ].join('\n');

    const reply = await callOllama({
      baseUrl: OLLAMA_API_URL,
      model: OLLAMA_MODEL,
      prompt
    });

    const assistantReply = reply || 'Thank you. Please hold while I notify the owner.';
    broadcast({ type: 'assistant', callId: callSid, text: assistantReply });
    broadcast({ type: 'handoff', callId: callSid });

    response.say(assistantReply);
    response.redirect('/twilio/voice/hold');
  } catch (error) {
    console.error('Twilio handler error:', error);
    response.say('We encountered a system error. Please try again later.');
    response.hangup();
  }

  res.type('text/xml');
  res.send(response.toString());
});

app.post('/twilio/voice/hold', (_req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  response.pause({ length: 60 });
  response.redirect('/twilio/voice/hold');
  res.type('text/xml');
  res.send(response.toString());
});

app.post('/api/orchestrator-webhook', async (req, res) => {
  try {
    const { transcript, sessionId } = req.body || {};
    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }
    if (!ANYTHINGLLM_API_URL || !ANYTHINGLLM_API_KEY || !ANYTHINGLLM_WORKSPACE_SLUG || !OLLAMA_API_URL) {
      return res.status(500).json({ error: 'AI services not configured' });
    }
    const chatPayload = await sendChatMessage({
      baseUrl: ANYTHINGLLM_API_URL,
      apiKey: ANYTHINGLLM_API_KEY,
      workspaceSlug: ANYTHINGLLM_WORKSPACE_SLUG,
      message: transcript,
      sessionId
    });

    const reply = await callOllama({
      baseUrl: OLLAMA_API_URL,
      model: OLLAMA_MODEL,
      prompt: transcript
    });
    if (sessionId) {
      broadcast({ type: 'assistant', callId: sessionId, text: reply });
    }

    res.json({ chat: chatPayload, response: reply });
  } catch (error) {
    console.error('Orchestrator webhook error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/anythingllm/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }
    const allowedTypes = [
      'application/pdf',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!req.file.mimetype || (!req.file.mimetype.startsWith('text/') && !allowedTypes.includes(req.file.mimetype))) {
      return res.status(400).json({ error: 'Unsupported document type.' });
    }
    if (!ANYTHINGLLM_API_URL || !ANYTHINGLLM_API_KEY || !ANYTHINGLLM_WORKSPACE_SLUG) {
      return res.status(500).json({ error: 'AnythingLLM is not configured' });
    }
    const response = await fetch(`${ANYTHINGLLM_API_URL}/v1/document/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ANYTHINGLLM_API_KEY}`
      },
      body: (() => {
        const form = new FormData();
        form.append('file', new Blob([req.file.buffer]), req.file.originalname);
        form.append('addToWorkspaces', ANYTHINGLLM_WORKSPACE_SLUG);
        return form;
      })()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AnythingLLM document upload failed: ${response.status} ${text}`);
    }

    const payload = await response.json();
    res.json(payload);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Document upload failed.' });
  }
});

app.post('/api/twilio/outbound', async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ error: 'Twilio client not configured' });
  }
  const { to, url } = req.body || {};
  if (!to || !url) {
    return res.status(400).json({ error: 'to and url are required' });
  }
  try {
    const call = await twilioClient.calls.create({
      to,
      from: TWILIO_CALLER_ID,
      url
    });
    res.json({ sid: call.sid });
  } catch (error) {
    console.error('Twilio outbound error:', error);
    res.status(500).json({ error: 'Failed to start outbound call' });
  }
});

app.post('/api/twilio/answer', async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ error: 'Twilio client not configured' });
  }
  const { callId, to } = req.body || {};
  if (!callId || !to) {
    return res.status(400).json({ error: 'callId and to are required' });
  }
  if (!PUBLIC_URL) {
    return res.status(500).json({ error: 'PUBLIC_URL is not configured' });
  }
  try {
    await twilioClient.calls(callId).update({
      twiml: `<Response><Dial>${to}</Dial></Response>`
    });
    res.json({ status: 'connected' });
  } catch (error) {
    console.error('Twilio answer error:', error);
    res.status(500).json({ error: 'Failed to connect call' });
  }
});

app.post('/api/twilio/voicemail', async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ error: 'Twilio client not configured' });
  }
  const { callId } = req.body || {};
  if (!callId) {
    return res.status(400).json({ error: 'callId is required' });
  }
  try {
    await twilioClient.calls(callId).update({
      twiml: '<Response><Say>Please leave a message after the tone.</Say><Record maxLength="30" /></Response>'
    });
    res.json({ status: 'voicemail' });
  } catch (error) {
    console.error('Twilio voicemail error:', error);
    res.status(500).json({ error: 'Failed to send to voicemail' });
  }
});

app.post('/api/twilio/forward', async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ error: 'Twilio client not configured' });
  }
  const { callId, to } = req.body || {};
  if (!callId || !to) {
    return res.status(400).json({ error: 'callId and to are required' });
  }
  try {
    await twilioClient.calls(callId).update({
      twiml: `<Response><Dial>${to}</Dial></Response>`
    });
    res.json({ status: 'forwarded' });
  } catch (error) {
    console.error('Twilio forward error:', error);
    res.status(500).json({ error: 'Failed to forward call' });
  }
});

server.listen(PORT, () => {
  console.log(`AI Secretary backend listening on ${PORT}`);
});
