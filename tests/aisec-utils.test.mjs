import assert from 'node:assert/strict';
import { normalizeAisecTimeout, isValidAisecPrompt, DEFAULT_AISEC_TIMEOUT_MS } from '../server/aisec-utils.mjs';

assert.equal(normalizeAisecTimeout(undefined), DEFAULT_AISEC_TIMEOUT_MS);
assert.equal(normalizeAisecTimeout(''), DEFAULT_AISEC_TIMEOUT_MS);
assert.equal(normalizeAisecTimeout('0'), DEFAULT_AISEC_TIMEOUT_MS);
assert.equal(normalizeAisecTimeout('-5'), DEFAULT_AISEC_TIMEOUT_MS);
assert.equal(normalizeAisecTimeout('5000'), 5000);
assert.equal(normalizeAisecTimeout('250'), 250);

assert.equal(isValidAisecPrompt(''), false);
assert.equal(isValidAisecPrompt('   '), false);
assert.equal(isValidAisecPrompt(123), false);
assert.equal(isValidAisecPrompt('hello'), true);
