import crypto from 'crypto';

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderAttributes(attributes = {}) {
  return Object.entries(attributes)
    .filter(([, val]) => val !== undefined && val !== null)
    .map(([key, val]) => ` ${key}="${escapeXml(val)}"`)
    .join('');
}

export function createVoiceResponse() {
  const actions = [];
  const response = {
    say(text) {
      if (text) actions.push(`<Say>${escapeXml(text)}</Say>`);
      return response;
    },
    gather(options = {}) {
      const gatherActions = [];
      const gatherResponse = {
        say(text) {
          if (text) gatherActions.push(`<Say>${escapeXml(text)}</Say>`);
          return gatherResponse;
        }
      };
      actions.push(() => `<Gather${renderAttributes(options)}>${gatherActions.join('')}</Gather>`);
      return gatherResponse;
    },
    record(options = {}) {
      actions.push(`<Record${renderAttributes(options)} />`);
      return response;
    },
    dial(number) {
      actions.push(`<Dial>${escapeXml(number)}</Dial>`);
      return response;
    },
    pause(options = {}) {
      actions.push(`<Pause${renderAttributes(options)} />`);
      return response;
    },
    redirect(url) {
      if (url) actions.push(`<Redirect>${escapeXml(url)}</Redirect>`);
      return response;
    },
    hangup() {
      actions.push('<Hangup />');
      return response;
    },
    toString() {
      const rendered = actions
        .map(entry => (typeof entry === 'function' ? entry() : entry))
        .join('');
      return `<?xml version="1.0" encoding="UTF-8"?><Response>${rendered}</Response>`;
    }
  };

  return response;
}

export function validateRequest(apiToken, signature, url, params) {
  if (!apiToken || !signature || !url) return false;
  const data = Object.entries(params || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((message, [key, value]) => `${message}${key}${value}`, url);
  const digest = crypto
    .createHmac('sha256', apiToken)
    .update(data)
    .digest('base64');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createClient(projectId, apiToken, options = {}) {
  const baseUrl = options.swireitSpaceUrl?.replace(/\/$/, '');
  const hasAuth = Boolean(projectId && apiToken);

  const request = async (path, payload) => {
    if (!baseUrl) {
      throw new Error('Swireit API URL not configured');
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(hasAuth ? { Authorization: `Bearer ${apiToken}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Swireit API error: ${response.status} ${message}`);
    }
    return response.json();
  };

  return {
    calls: {
      create({ to, from, url }) {
        return request('/api/calls', { to, from, url });
      },
      update(callId, { response }) {
        return request(`/api/calls/${encodeURIComponent(callId)}`, { response });
      }
    }
  };
}

export default {
  createVoiceResponse,
  validateRequest,
  createClient
};
