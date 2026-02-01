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
  if (['1', 'one'].includes(spokenValue)) return '1';
  if (['2', 'two', 'to'].includes(spokenValue)) return '2';
  return null;
};
