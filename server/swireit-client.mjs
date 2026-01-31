import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let swireitModule;

try {
  swireitModule = require('../swireit');
} catch (error) {
  if (error?.code === 'MODULE_NOT_FOUND') {
    throw new Error('Swireit submodule not found. Run `git submodule update --init --recursive`.');
  }
  if (error?.code !== 'ERR_REQUIRE_ESM') {
    throw error;
  }
  const resolved = require.resolve('../swireit');
  swireitModule = await import(pathToFileURL(resolved).href);
}

const swireit = swireitModule.default ?? swireitModule;

const normalizeOptions = (options = {}) => ({
  swireitSpaceUrl: options.swireitSpaceUrl ?? options.spaceUrl
});

function createClient(projectId, apiToken, options = {}) {
  if (typeof swireit === 'function') {
    return swireit(projectId, apiToken, normalizeOptions(options));
  }
  if (typeof swireit.createClient === 'function') {
    return swireit.createClient(projectId, apiToken, normalizeOptions(options));
  }
  throw new Error('Swireit module does not expose createClient.');
}

function createVoiceResponse() {
  if (typeof swireit.createVoiceResponse === 'function') {
    return swireit.createVoiceResponse();
  }
  if (swireit?.twiml?.VoiceResponse) {
    return new swireit.twiml.VoiceResponse();
  }
  throw new Error('Swireit module does not expose VoiceResponse.');
}

function validateRequest(apiToken, signature, url, params) {
  if (typeof swireit?.validateRequest !== 'function') {
    throw new Error('Swireit module does not expose validateRequest.');
  }
  return swireit.validateRequest(apiToken, signature, url, params);
}

export default {
  createClient,
  createVoiceResponse,
  validateRequest
};
