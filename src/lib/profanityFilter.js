/**
 * Small curated blocklist, not exhaustive by design — this only needs to
 * catch someone typing a swear/slur as their display name, not moderate
 * arbitrary free text.
 */
const BLOCKLIST = [
  'nigger',
  'nigga',
  'chink',
  'spic',
  'kike',
  'gook',
  'wetback',
  'fag',
  'tranny',
  'retard',
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'ass',
  'bastard',
  'dick',
  'pussy',
  'whore',
  'slut',
];

const LEET_MAP = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', '$': 's', '@': 'a' };

function normalize(text) {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z]/g, '');
}

export function containsBlockedWord(text) {
  const normalized = normalize(text || '');
  if (!normalized) return false;
  return BLOCKLIST.some((word) => normalized.includes(word));
}
