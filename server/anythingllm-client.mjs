const DEFAULT_TIMEOUT_MS = 15000;

function buildHeaders(apiKey) {
  if (!apiKey) {
    throw new Error('ANYTHINGLLM_API_KEY is required.');
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
}

export async function sendChatMessage({ baseUrl, apiKey, workspaceSlug, message, sessionId, signal }) {
  if (!baseUrl) {
    throw new Error('ANYTHINGLLM_API_URL is required.');
  }
  if (!workspaceSlug) {
    throw new Error('ANYTHINGLLM_WORKSPACE_SLUG is required.');
  }
  const response = await fetch(`${baseUrl}/v1/workspace/${workspaceSlug}/chat`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    signal,
    body: JSON.stringify({
      message,
      sessionId
    })
  });
  if (!response.ok) {
    const messageText = await response.text();
    throw new Error(`AnythingLLM chat error: ${response.status} ${messageText}`);
  }
  return response.json();
}

export async function fetchChatHistory({ baseUrl, apiKey, workspaceSlug, sessionId, signal }) {
  if (!baseUrl) {
    throw new Error('ANYTHINGLLM_API_URL is required.');
  }
  if (!workspaceSlug) {
    throw new Error('ANYTHINGLLM_WORKSPACE_SLUG is required.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  try {
    const url = new URL(`${baseUrl}/v1/workspace/${workspaceSlug}/chats`);
    if (sessionId) {
      url.searchParams.set('sessionId', sessionId);
    }
    const response = await fetch(url.toString(), {
      headers: buildHeaders(apiKey),
      signal: combinedSignal
    });
    if (!response.ok) {
      const messageText = await response.text();
      throw new Error(`AnythingLLM history error: ${response.status} ${messageText}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
