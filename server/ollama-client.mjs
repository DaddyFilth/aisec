const DEFAULT_MODEL = 'llama3.1';

export async function callOllama({ baseUrl, model = DEFAULT_MODEL, prompt, system, signal }) {
  if (!baseUrl) {
    throw new Error('OLLAMA_API_URL is required.');
  }
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      prompt,
      system,
      stream: false
    })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Ollama error: ${response.status} ${message}`);
  }
  const payload = await response.json();
  return payload.response?.trim() || '';
}
