/**
 * Normalize incoming DTMF/speech input to a comparable lowercase string.
 * @param {string | number | null | undefined} value
 * @returns {string}
 */
const normalizeInput = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Parse caller input to determine routing choice.
 * @param {string | number | null | undefined} digits
 * @param {string | null | undefined} speech
 * @returns {'1' | '2' | null}
 */
export const parseCallRoutingChoice = (digits, speech) => {
  const digitValue = normalizeInput(digits);
  if (digitValue === '1' || digitValue === '2') {
    return digitValue;
  }
  const spokenValue = normalizeInput(speech);
  if (!spokenValue) return null;
  if (/(?:^|\D)1(?:\D|$)|\bone\b/.test(spokenValue)) return '1';
  if (/(?:^|\D)2(?:\D|$)|\b(two|to)\b/.test(spokenValue)) return '2';
  return null;
};
