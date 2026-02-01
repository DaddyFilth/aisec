import { createServer } from 'http';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import swireit from './swireit-client.mjs';
import { parseCallRoutingChoice } from './swireit-routing.mjs';
import { WebSocketServer } from 'ws';
import { callOllama } from './ollama-client.mjs';
import { fetchChatHistory, sendChatMessage } from './anythingllm-client.mjs';
import { normalizeAisecTimeout, isValidAisecPrompt } from './aisec-utils.mjs';

dotenv.config();

const app = express();
app.set('trust proxy', true);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const PORT = process.env.PORT || 8080;
const SWIREIT_PROJECT_ID = process.env.SWIREIT_PROJECT_ID;
const SWIREIT_API_TOKEN = process.env.SWIREIT_API_TOKEN;
const SWIREIT_SPACE_URL = process.env.SWIREIT_SPACE_URL;
const SWIREIT_CALLER_ID = process.env.SWIREIT_CALLER_ID;
const SWIREIT_SCREENING_NUMBER = process.env.SWIREIT_SCREENING_NUMBER;
const SWIREIT_FORWARD_NUMBER = process.env.SWIREIT_FORWARD_NUMBER;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
const ANYTHINGLLM_API_URL = process.env.ANYTHINGLLM_API_URL;
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;
const ANYTHINGLLM_WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE_SLUG;
const PUBLIC_URL = process.env.PUBLIC_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;
const AISEC_API_URL = process.env.AISEC_API_URL;
const AISEC_API_KEY = process.env.AISEC_API_KEY;
const AISEC_TIMEOUT_MS = normalizeAisecTimeout(process.env.AISEC_TIMEOUT_MS);
const SWIREIT_VALIDATE_WEBHOOKS = process.env.SWIREIT_VALIDATE_WEBHOOKS !== 'false';
const SWIREIT_TWIML_URL = process.env.SWIREIT_TWIML_URL;
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

const isValidApiKey = (providedKey) => {
  if (!BACKEND_API_KEY || !providedKey) return false;
  const expected = Buffer.from(BACKEND_API_KEY);
  const actual = Buffer.from(providedKey);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
};

const requireApiKey = (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const apiKey = req.headers['x-api-key'] || bearer;
  if (!BACKEND_API_KEY) {
    return res.status(500).json({ error: 'BACKEND_API_KEY is not configured' });
  }
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

const validateSwireitRequest = (req, res, next) => {
  if (!SWIREIT_VALIDATE_WEBHOOKS) return next();
  if (!SWIREIT_API_TOKEN) {
    return res.status(500).send('Swireit API token not configured');
  }
  const signature = req.headers['x-swireit-signature'];
  const url = PUBLIC_URL
    ? `${PUBLIC_URL}${req.originalUrl}`
    : `${req.protocol}://${req.headers.host}${req.originalUrl}`;
  const isValid = swireit.validateRequest(SWIREIT_API_TOKEN, signature, url, req.body);
  if (!isValid) {
    return res.status(403).send('Invalid Swireit signature');
  }
  return next();
};

const validatePhone = (value) => PHONE_REGEX.test(value || '');

const validateCallId = (value) => /^(CA[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(value || '');

if (!SWIREIT_PROJECT_ID || !SWIREIT_API_TOKEN || !SWIREIT_SPACE_URL) {
  console.warn('Swireit credentials are not configured. Set SWIREIT_PROJECT_ID, SWIREIT_API_TOKEN, and SWIREIT_SPACE_URL.');
}

const swireitClient = SWIREIT_PROJECT_ID && SWIREIT_API_TOKEN && SWIREIT_SPACE_URL
  ? swireit.createClient(SWIREIT_PROJECT_ID, SWIREIT_API_TOKEN, { swireitSpaceUrl: SWIREIT_SPACE_URL })
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

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  const apiKey = url.searchParams.get('apiKey') || request.headers['x-api-key'];
  if (!isValidApiKey(apiKey)) {
    socket.close(1008, 'Unauthorized');
    return;
  }
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

app.get('/api/config', (_req, res) => {
  res.json({
    swireit: {
      enabled: Boolean(swireitClient),
      projectIdConfigured: Boolean(SWIREIT_PROJECT_ID),
      apiTokenConfigured: Boolean(SWIREIT_API_TOKEN),
      spaceUrlConfigured: Boolean(SWIREIT_SPACE_URL),
      callerIdConfigured: Boolean(SWIREIT_CALLER_ID),
      twimlUrlConfigured: Boolean(SWIREIT_TWIML_URL),
      screeningNumber: SWIREIT_SCREENING_NUMBER ?? null,
      forwardingNumber: SWIREIT_FORWARD_NUMBER ?? null
    },
    aisec: {
      url: AISEC_API_URL,
      configured: Boolean(AISEC_API_KEY)
    },
    services: {
      ollama: Boolean(OLLAMA_API_URL),
      anythingllm: Boolean(ANYTHINGLLM_API_URL && ANYTHINGLLM_API_KEY && ANYTHINGLLM_WORKSPACE_SLUG)
    }
  });
});

app.post('/swireit/voice', validateSwireitRequest, async (req, res) => {
  const response = swireit.createVoiceResponse();
  const caller = req.body.From || 'Unknown caller';
  const callId = req.body.CallId || req.body.CallID || req.body.CallSid || `call-${Date.now()}`;
  broadcast({ type: 'call.start', callId, from: caller });
  const forwardMessage = SWIREIT_FORWARD_NUMBER ? ` to ${SWIREIT_FORWARD_NUMBER}.` : '.';
  response.gather({
    input: 'speech dtmf',
    action: '/swireit/voice/route',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US',
    hints: 'one, two, 1, 2',
    numDigits: 1
  }).say(`Hello. Say or press 1 for AI screening, or 2 to forward${forwardMessage}`);
  response.say('We did not receive a response. Goodbye.');
  response.hangup();
  res.type('text/xml');
  res.send(response.toString());
});

app.post('/swireit/voice/route', validateSwireitRequest, async (req, res) => {
  const response = swireit.createVoiceResponse();
  const callId = req.body.CallId || req.body.CallID || req.body.CallSid || `call-${Date.now()}`;
  const choice = parseCallRoutingChoice(req.body.Digits, req.body.SpeechResult);
  if (choice === '2') {
    if (!SWIREIT_FORWARD_NUMBER || !validatePhone(SWIREIT_FORWARD_NUMBER)) {
      response.gather({
        input: 'speech',
        action: '/swireit/voice/handle',
        method: 'POST',
        speechTimeout: 'auto',
        language: 'en-US'
      }).say('Forwarding is not configured. Please tell me how I can help.');
      response.say('We did not receive a response. Goodbye.');
      response.hangup();
    } else {
      broadcast({ type: 'call.forwarding', callId, to: SWIREIT_FORWARD_NUMBER });
      response.say('Connecting you now.');
      response.dial(SWIREIT_FORWARD_NUMBER);
    }
    res.type('text/xml');
    return res.send(response.toString());
  }
  if (choice !== '1') {
    response.say('Please say or press 1 or 2.');
    response.redirect('/swireit/voice');
    res.type('text/xml');
    return res.send(response.toString());
  }
  response.gather({
    input: 'speech',
    action: '/swireit/voice/handle',
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US'
  }).say('Please tell me how I can help. This call is being handled by AI secretary.');
  response.say('We did not receive a response. Goodbye.');
  response.hangup();
  res.type('text/xml');
  return res.send(response.toString());
});

app.post('/swireit/voice/handle', validateSwireitRequest, async (req, res) => {
  const response = swireit.createVoiceResponse();
  const transcript = req.body.SpeechResult || '';
  const caller = req.body.From || 'Unknown caller';
  const callId = req.body.CallId || req.body.CallID || req.body.CallSid || `call-${Date.now()}`;

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

    broadcast({ type: 'transcript', callId, text: transcript });

    await sendChatMessage({
      baseUrl: ANYTHINGLLM_API_URL,
      apiKey: ANYTHINGLLM_API_KEY,
      workspaceSlug: ANYTHINGLLM_WORKSPACE_SLUG,
      message: `Caller ${caller}: ${transcript}`,
      sessionId: callId
    });

    const history = await fetchChatHistory({
      baseUrl: ANYTHINGLLM_API_URL,
      apiKey: ANYTHINGLLM_API_KEY,
      workspaceSlug: ANYTHINGLLM_WORKSPACE_SLUG,
      sessionId: callId
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
    broadcast({ type: 'assistant', callId, text: assistantReply });
    broadcast({ type: 'handoff', callId });

    response.say(assistantReply);
    response.redirect('/swireit/voice/hold');
  } catch (error) {
    console.error('Swireit handler error:', error);
    response.say('We encountered a system error. Please try again later.');
    response.hangup();
  }

  res.type('text/xml');
  res.send(response.toString());
});

app.post('/swireit/voice/hold', validateSwireitRequest, (_req, res) => {
  const response = swireit.createVoiceResponse();
  response.pause({ length: 60 });
  response.redirect('/swireit/voice/hold');
  res.type('text/xml');
  res.send(response.toString());
});

app.post('/api/orchestrator-webhook', requireApiKey, async (req, res) => {
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

app.post('/api/ai/process', requireApiKey, async (req, res) => {
  try {
    if (!AISEC_API_URL || !AISEC_API_KEY) {
      return res.status(500).json({ error: 'AISEC API is not configured' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    const { prompt, sessionId, metadata } = req.body;
    if (!isValidAisecPrompt(prompt)) {
      return res.status(400).json({ error: 'prompt must be a non-empty string' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AISEC_TIMEOUT_MS);
    try {
      const response = await fetch(AISEC_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AISEC_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          sessionId,
          metadata
        })
      });
      if (!response.ok) {
        console.error('AISEC API error response:', response.status);
        return res.status(502).json({ error: 'AISEC API request failed' });
      }
      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        console.error('AISEC API invalid JSON response:', error);
        return res.status(502).json({ error: 'Invalid JSON response from AISEC API' });
      }
      return res.json(payload);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'AISEC API timeout'
      : error instanceof TypeError
        ? 'AISEC API connection failed'
        : 'AISEC API request failed';
    console.error('AISEC API error:', error);
    return res.status(500).json({ error: message });
  }
});

app.post('/api/anythingllm/documents', requireApiKey, upload.single('file'), async (req, res) => {
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

app.post('/api/swireit/outbound', requireApiKey, async (req, res) => {
  if (!swireitClient) {
    return res.status(500).json({ error: 'Swireit client not configured' });
  }
  const { to } = req.body || {};
  if (!to) {
    return res.status(400).json({ error: 'to is required' });
  }
  if (!validatePhone(to)) {
    return res.status(400).json({ error: 'Invalid destination phone number' });
  }
  if (!SWIREIT_TWIML_URL) {
    return res.status(400).json({ error: 'Swireit TwiML URL not configured' });
  }
  try {
    const call = await swireitClient.calls.create({
      to,
      from: SWIREIT_CALLER_ID,
      url: SWIREIT_TWIML_URL
    });
    res.json({ callId: call.sid });
  } catch (error) {
    console.error('Swireit outbound error:', error);
    res.status(500).json({ error: 'Failed to start outbound call' });
  }
});

app.post('/api/swireit/answer', requireApiKey, async (req, res) => {
  if (!swireitClient) {
    return res.status(500).json({ error: 'Swireit client not configured' });
  }
  const { callId, to } = req.body || {};
  if (!validateCallId(callId) || !validatePhone(to)) {
    return res.status(400).json({ error: 'callId and valid E.164 phone are required' });
  }
  try {
    const response = swireit.createVoiceResponse();
    response.dial(to);
    await swireitClient.calls(callId).update({ response: response.toString() });
    res.json({ status: 'connected' });
  } catch (error) {
    console.error('Swireit answer error:', error);
    res.status(500).json({ error: 'Failed to connect call' });
  }
});

app.post('/api/swireit/voicemail', requireApiKey, async (req, res) => {
  if (!swireitClient) {
    return res.status(500).json({ error: 'Swireit client not configured' });
  }
  const { callId } = req.body || {};
  if (!validateCallId(callId)) {
    return res.status(400).json({ error: 'callId is required' });
  }
  try {
    const response = swireit.createVoiceResponse();
    response.say('Please leave a message after the tone.');
    response.record({ maxLength: 30 });
    await swireitClient.calls(callId).update({ response: response.toString() });
    res.json({ status: 'voicemail' });
  } catch (error) {
    console.error('Swireit voicemail error:', error);
    res.status(500).json({ error: 'Failed to send to voicemail' });
  }
});

app.post('/api/swireit/forward', requireApiKey, async (req, res) => {
  if (!swireitClient) {
    return res.status(500).json({ error: 'Swireit client not configured' });
  }
  const { callId, to } = req.body || {};
  if (!validateCallId(callId) || !validatePhone(to)) {
    return res.status(400).json({ error: 'callId and valid E.164 phone are required' });
  }
  try {
    const response = swireit.createVoiceResponse();
    response.dial(to);
    await swireitClient.calls(callId).update({ response: response.toString() });
    res.json({ status: 'forwarded' });
  } catch (error) {
    console.error('Swireit forward error:', error);
    res.status(500).json({ error: 'Failed to forward call' });
  }
});

server.listen(PORT, () => {
  console.log(`AI Secretary backend listening on ${PORT}`);
});
