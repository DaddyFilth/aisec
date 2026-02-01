export const DEFAULT_TRANSCRIPT_BATCH_SIZE = 50;

const getStringValue = (value) => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const formatMessage = (message) => {
  if (typeof message === 'string') return getStringValue(message);
  if (!message || typeof message !== 'object') return null;
  const text = getStringValue(
    message.text ?? message.content ?? message.message ?? message.transcript
  );
  if (!text) return null;
  const role = getStringValue(message.role ?? message.speaker ?? message.author ?? message.from);
  return role ? `${role}: ${text}` : text;
};

export const extractTranscriptLines = (entry) => {
  if (typeof entry === 'string') {
    const text = getStringValue(entry);
    return text ? [text] : [];
  }
  if (!entry || typeof entry !== 'object') return [];
  const candidates = [entry.transcription, entry.transcript, entry.lines, entry.utterances];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const lines = candidate.map(formatMessage).filter(Boolean);
      if (lines.length > 0) return lines;
    }
  }
  if (Array.isArray(entry.messages)) {
    const lines = entry.messages.map(formatMessage).filter(Boolean);
    if (lines.length > 0) return lines;
  }
  if (Array.isArray(entry.conversation)) {
    const lines = entry.conversation.map(formatMessage).filter(Boolean);
    if (lines.length > 0) return lines;
  }
  const text = getStringValue(entry.text ?? entry.content ?? entry.message);
  return text ? [text] : [];
};

export const formatTranscriptEntry = (entry, index) => {
  const lines = extractTranscriptLines(entry);
  if (!lines.length) return null;
  const id = typeof entry === 'object' && entry
    ? getStringValue(entry.id ?? entry.callId ?? entry.sessionId ?? entry.call_id)
    : null;
  const timestamp = typeof entry === 'object' && entry
    ? getStringValue(entry.timestamp ?? entry.createdAt ?? entry.startedAt)
    : null;
  const headerBase = id ? `Transcript ${id}` : `Transcript ${index + 1}`;
  const header = timestamp ? `${headerBase} (${timestamp})` : headerBase;
  return `${header}\n${lines.join('\n')}`;
};

export const normalizeTranscriptPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.transcripts)) return payload.transcripts;
    if (Array.isArray(payload.calls)) return payload.calls;
  }
  throw new Error('Transcript payload must be an array or contain transcripts/calls arrays.');
};

export const buildTranscriptBatches = (entries, batchSize = DEFAULT_TRANSCRIPT_BATCH_SIZE) => {
  const batches = [];
  let current = [];
  let skipped = 0;
  entries.forEach((entry, index) => {
    const formatted = formatTranscriptEntry(entry, index);
    if (!formatted) {
      skipped += 1;
      return;
    }
    current.push(formatted);
    if (current.length >= batchSize) {
      batches.push({
        index: batches.length,
        count: current.length,
        text: current.join('\n\n')
      });
      current = [];
    }
  });
  if (current.length) {
    batches.push({
      index: batches.length,
      count: current.length,
      text: current.join('\n\n')
    });
  }
  return { batches, skipped };
};
