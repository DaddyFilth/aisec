import { extractTranscriptLines } from './transcript-ingestion-utils.mjs';

const TOKEN_REGEX = /[a-z0-9']+/gi;

export const buildTranscriptUnigramModel = (entries, { createdAt = new Date().toISOString() } = {}) => {
  const tokenCounts = new Map();
  let totalTokens = 0;
  let totalTranscripts = 0;

  entries.forEach(entry => {
    const lines = extractTranscriptLines(entry);
    if (!lines.length) return;
    totalTranscripts += 1;
    lines.forEach(line => {
      const tokens = line.toLowerCase().match(TOKEN_REGEX) ?? [];
      tokens.forEach(token => {
        totalTokens += 1;
        tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
      });
    });
  });

  const vocabulary = {};
  [...tokenCounts.entries()]
    .sort(([aToken], [bToken]) => aToken.localeCompare(bToken))
    .forEach(([token, count]) => {
      vocabulary[token] = count;
    });

  return {
    version: 1,
    createdAt,
    totalTranscripts,
    totalTokens,
    vocabulary
  };
};
