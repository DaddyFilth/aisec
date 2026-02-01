import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTranscriptUnigramModel } from '../server/transcript-model-utils.mjs';

describe('buildTranscriptUnigramModel', () => {
  it('builds a unigram model from transcript entries', () => {
    const model = buildTranscriptUnigramModel([
      { transcription: ['Hello world'] },
      { transcript: ['Hello again'] }
    ], { createdAt: '2024-01-01T00:00:00.000Z' });

    assert.equal(model.totalTranscripts, 2);
    assert.equal(model.totalTokens, 4);
    assert.deepEqual(model.vocabulary, {
      again: 1,
      hello: 2,
      world: 1
    });
    assert.equal(model.createdAt, '2024-01-01T00:00:00.000Z');
  });
});
