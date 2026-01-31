export const DEFAULT_AISEC_TIMEOUT_MS = 5000;

export const normalizeAisecTimeout = (value) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AISEC_TIMEOUT_MS;
};

export const isValidAisecPrompt = (prompt) => (
  typeof prompt === 'string' && prompt.trim().length > 0
);
