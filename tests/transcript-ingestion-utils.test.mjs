import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildTranscriptBatches,
  extractTranscriptLines,
  formatTranscriptEntry,
  normalizeTranscriptPayload
} from '../server/transcript-ingestion-utils.mjs';

describe('extractTranscriptLines', () => {
  it('extracts lines from various transcript shapes', () => {
    assert.deepEqual(extractTranscriptLines(' hello '), ['hello']);
    assert.deepEqual(extractTranscriptLines({ transcript: ['User: hi', 'Agent: hello'] }), ['User: hi', 'Agent: hello']);
    assert.deepEqual(extractTranscriptLines({ messages: [{ role: 'User', content: 'Hi' }] }), ['User: Hi']);
    assert.deepEqual(extractTranscriptLines({ text: 'Single line' }), ['Single line']);
  });
});

describe('formatTranscriptEntry', () => {
  it('formats transcript entry with header and lines', () => {
    const formatted = formatTranscriptEntry({ id: 'call-1', transcription: ['Hello'] }, 0);
    assert.equal(formatted, 'Transcript call-1\nHello');
  });
});

describe('normalizeTranscriptPayload', () => {
  it('normalizes transcript arrays from object payloads', () => {
    const payload = { transcripts: [{ text: 'hello' }] };
    assert.deepEqual(normalizeTranscriptPayload(payload), payload.transcripts);
  });
});

describe('buildTranscriptBatches', () => {
  it('creates batches and counts skipped entries', () => {
    const entries = [
      { id: '1', transcription: ['A'] },
      { id: '2', transcription: ['B'] },
      { id: '3', transcription: ['C'] },
      { id: '4', transcription: [] }
    ];
    const { batches, skipped } = buildTranscriptBatches(entries, 2);
    assert.equal(skipped, 1);
    assert.equal(batches.length, 2);
    assert.equal(batches[0].count, 2);
    assert.equal(batches[1].count, 1);
  });
});
