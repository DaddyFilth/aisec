const normalizeInput = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

export const parseCallRoutingChoice = (digits, speech) => {
  const digitValue = normalizeInput(digits);
  if (digitValue === '1' || digitValue === '2') {
    return digitValue;
  }
  const spokenValue = normalizeInput(speech);
  if (!spokenValue) return null;
  if (spokenValue.includes('1') || spokenValue.includes('one')) return '1';
  if (spokenValue.includes('2') || spokenValue.includes('two') || spokenValue.includes('to') || spokenValue.includes('too')) return '2';
  return null;
};
