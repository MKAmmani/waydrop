/**
 * Turns errand text into structured errand data.
 * Supports Move Errands ("Bring my calculator from New Hall to Main Library for 500")
 * and Buy For Me Errands ("Buy 6 bottles of water, anywhere is fine. I'm at the stadium, Block B").
 */
import { ITEM_GUESS, type BuyItem } from './buyCatalog.ts';

export type ParsedBuy = {
  buy: boolean;
  items: BuyItem[];
  any: boolean;
  shop: string;
  to: string;
};

export type Parsed = {
  item: string;
  from: string;
  to: string;
  amount: number | null;
  kind?: 'move' | 'buy';
  buyDetails?: ParsedBuy;
};

const NUM: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  dozen: 12,
};

const cap = (x: string) => (x ? x[0].toUpperCase() + x.slice(1) : x);

/**
 * Parser for buy requests from Batch 3B (03B_Buy_For_Me.html)
 * E.g. "Buy 6 bottles of water, anywhere is fine. I'm at the stadium, Block B"
 */
export function parseBuy(t: string): ParsedBuy {
  const m = t.match(/\b(buy|get me|bring me|grab me|purchase|i need|we need|get us|buy us|help me buy)\b\s+(?:me\s+|us\s+)?(.*)/i);
  if (!m) return { buy: false, items: [], any: true, shop: '', to: '' };

  const body = m[2].split(/\s*(?:\bfrom\b|\bi'?m\b|\bi am\b|\bwe'?re\b|\bdeliver|\bbring it\b|\banywhere\b|\bany shop\b|[.;!]|\bfor\s*(?:₦|n\d|\d))/i)[0];
  const parts = body
    .split(/\s*,\s*|\s+and\s+|\s*\+\s*/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1 && !/^(is fine|pls|please)$/i.test(x));

  const items: BuyItem[] = parts
    .map((raw) => {
      let q = 1;
      let p = raw;
      const qm = p.match(/^(half a dozen|a dozen|\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|dozen)\s+/i);
      if (qm) {
        const w = qm[1].toLowerCase();
        q = +w || ({ 'a dozen': 12, 'half a dozen': 6 }[w] ?? NUM[w] ?? 1);
        p = p.slice(qm[0].length);
      }
      p = p
        .replace(/^(?:bottles?|packs?|pieces?|cans?|sachets?|loaves?|cartons?|crates?|plates?|wraps?|pairs?|bags?|tubes?)\s+of\s+/i, '')
        .replace(/^(?:some|my|the|new)\s+/i, '')
        .trim();

      const key = Object.keys(ITEM_GUESS)
        .sort((a, b) => b.length - a.length)
        .find((k) => p.toLowerCase().includes(k));
      const g = key ? ITEM_GUESS[key] : null;

      return {
        name: g ? g[0] : cap(p),
        qty: q,
        est: g ? g[1] : null,
        ic: g ? g[2] : 'bag',
        det: '',
        photo: false,
      };
    })
    .filter((it) => it.name);

  const fm = t.match(/\bfrom\s+([A-Za-z0-9' ]+?)(?:[,.;]|\s+(?:i'?m|and|to|for)\b|$)/i);
  const any = /anywhere|any shop|any kiosk|wherever/i.test(t) || !fm;
  const tm = t.match(/(?:i'?m at|i am at|we'?re at|deliver to)\s+(?:the\s+)?([A-Za-z0-9 ,']+?)(?:[.;!]|$)/i);

  return {
    buy: items.length > 0,
    items,
    any,
    shop: !any && fm ? cap(fm[1].trim().replace(/^the\s+/i, '')) : '',
    to: tm ? cap(tm[1].trim()) : '',
  };
}

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
  let item = body;
  let from = '';
  let to = '';
  let m: RegExpMatchArray | null;

  if ((m = body.match(new RegExp(`^(.*?)\\s+from\\s+(.+?)\\s+${TO}\\s+(.+)$`, 'i')))) [item, from, to] = [m[1], m[2], m[3]];
  else if ((m = body.match(new RegExp(`^(.*?)\\s+${TO}\\s+(.+?)\\s+from\\s+(.+)$`, 'i')))) [item, to, from] = [m[1], m[2], m[3]];
  else if ((m = body.match(/^(.*?)\s+from\s+(.+)$/i))) [item, from, to] = [m[1], m[2], 'here'];
  else if ((m = body.match(new RegExp(`^(.*?)\\s+${TO}\\s+(.+)$`, 'i')))) [item, from, to] = [m[1], 'here', m[2]];

  item = item.replace(LEAD, '').replace(DET, '').trim();
  item = item ? item[0].toUpperCase() + item.slice(1) : '';
  const clean = (s: string) => s.replace(/^the\s+/i, '').replace(/[.,;:!?]+$/, '').trim();

  return { item, from: clean(from), to: clean(to), amount };
}
