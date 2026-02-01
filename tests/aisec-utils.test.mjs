import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeAisecTimeout, isValidAisecPrompt, DEFAULT_AISEC_TIMEOUT_MS } from '../server/aisec-utils.mjs';
import { parseCallRoutingChoice } from '../server/swireit-routing.mjs';

describe('normalizeAisecTimeout', () => {
  it('falls back to default for invalid values', () => {
    assert.equal(normalizeAisecTimeout(undefined), DEFAULT_AISEC_TIMEOUT_MS);
    assert.equal(normalizeAisecTimeout(''), DEFAULT_AISEC_TIMEOUT_MS);
    assert.equal(normalizeAisecTimeout('0'), DEFAULT_AISEC_TIMEOUT_MS);
    assert.equal(normalizeAisecTimeout('-5'), DEFAULT_AISEC_TIMEOUT_MS);
  });

  it('returns parsed timeout for valid values', () => {
    assert.equal(normalizeAisecTimeout('5000'), 5000);
    assert.equal(normalizeAisecTimeout('250'), 250);
  });
});

describe('isValidAisecPrompt', () => {
  it('rejects empty or non-string prompts', () => {
    assert.equal(isValidAisecPrompt(''), false);
    assert.equal(isValidAisecPrompt('   '), false);
    assert.equal(isValidAisecPrompt(123), false);
  });

  it('accepts non-empty strings', () => {
    assert.equal(isValidAisecPrompt('hello'), true);
  });
});

describe('parseCallRoutingChoice', () => {
  it('returns digit choice for DTMF input', () => {
    assert.equal(parseCallRoutingChoice('1', ''), '1');
    assert.equal(parseCallRoutingChoice('2', undefined), '2');
  });

  it('returns choice for spoken input', () => {
    assert.equal(parseCallRoutingChoice(undefined, 'one'), '1');
    assert.equal(parseCallRoutingChoice(undefined, 'two'), '2');
    assert.equal(parseCallRoutingChoice(undefined, 'to'), '2');
    assert.equal(parseCallRoutingChoice(undefined, 'press 1'), '1');
    assert.equal(parseCallRoutingChoice(undefined, 'option two please'), '2');
  });

  it('returns null for invalid input', () => {
    assert.equal(parseCallRoutingChoice(undefined, ''), null);
    assert.equal(parseCallRoutingChoice('9', 'maybe'), null);
    assert.equal(parseCallRoutingChoice(undefined, 'tone'), null);
  });
});
