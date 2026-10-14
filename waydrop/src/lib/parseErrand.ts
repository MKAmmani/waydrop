/**
 * Turns "Bring my calculator from New Hall to the Main Library for 500"
 * into { item: "Calculator", from: "New Hall", to: "Main Library", amount: 500 }.
 * Runs on the phone; the backend can replace it later with the same output shape.
 */
export type Parsed = { item: string; from: string; to: string; amount: number | null };

const LEAD = /^(?:(?:please|pls|abeg|hey|hi)[,!\s]+)*(?:(?:i\s+need|i\s+want|can|could|help)\s+(?:someone\s+|somebody\s+|you\s+)*(?:to\s+)?)?(?:help\s+me\s+)?(?:bring|get|pick\s*up|fetch|carry|move|deliver|send|take|drop|collect|grab)\s+(?:me\s+)?/i;
const DET = /^(?:my|a|an|the|some|this|these|our)\s+/i;
const TO = '(?:(?:and\\s+)?(?:drop|deliver|bring|take)(?:\\s+it)?(?:\\s+off)?\\s+(?:to|at)|to)';

export function parseErrand(input: string): Parsed {
  let t = String(input || '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  let amount: number | null = null;
  const pats = [
    /\s*(?:\bfor\s+|\bpay(?:ing)?\s+)?(?:₦|\bngn\s*|\bn(?=\d))\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i,
    /\s*\b(?:for|pay(?:ing)?|at)\s+(\d[\d,]*(?:\.\d+)?)\s*(k|naira)?\b/i,
    /\s*\b(\d[\d,]*(?:\.\d+)?)\s*(k|naira)\b/i,
  ];
  for (const re of pats) {
    const m = t.match(re);
    if (m && m.index !== undefined) {
      amount = parseFloat(m[1].replace(/,/g, '')) * (m[2] && m[2].toLowerCase() === 'k' ? 1000 : 1);
      t = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).trim();
      break;
    }
  }
  const body = t.replace(/[,\s]+$/, '').replace(LEAD, '');
  let item = body, from = '', to = '', m: RegExpMatchArray | null;
  if ((m = body.match(new RegExp(`^(.*?)\\s+from\\s+(.+?)\\s+${TO}\\s+(.+)$`, 'i')))) [item, from, to] = [m[1], m[2], m[3]];
  else if ((m = body.match(new RegExp(`^(.*?)\\s+${TO}\\s+(.+?)\\s+from\\s+(.+)$`, 'i')))) [item, to, from] = [m[1], m[2], m[3]];
  else if ((m = body.match(/^(.*?)\s+from\s+(.+)$/i))) [item, from, to] = [m[1], m[2], 'here'];
  else if ((m = body.match(new RegExp(`^(.*?)\\s+${TO}\\s+(.+)$`, 'i')))) [item, from, to] = [m[1], 'here', m[2]];
  item = item.replace(LEAD, '').replace(DET, '').trim();
  item = item ? item[0].toUpperCase() + item.slice(1) : '';
  const clean = (s: string) => s.replace(/^the\s+/i, '').replace(/[.,;:!?]+$/, '').trim();
  return { item, from: clean(from), to: clean(to), amount };
}
