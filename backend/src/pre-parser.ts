import type { ParseResult } from './types.js';

/**
 * Pre-parser: Fast heuristics for common short inputs.
 * Returns ParseResult if confident, null if input should go to LLM.
 * 
 * Design philosophy:
 * - Only match SHORT inputs (< 20 chars or < 5 words)
 * - Avoid false positives — better to pass to LLM than steal a check-in
 * - Match exact phrases, not substring matches
 */

// Exact match patterns (case-insensitive, after normalization)
const AFFIRM_PATTERNS = new Set([
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'ok',
  'okay',
  'absolutely',
  'let\'s do it',
  'lets do it',
  'sounds good',
  'go ahead',
  'go for it',
  'do it',
  'please',
  'yes please',
]);

const DECLINE_PATTERNS = new Set([
  'no',
  'nah',
  'nope',
  'no thanks',
  'no thank you',
  'never mind',
  'nevermind',
  'skip that',
  'don\'t',
  'dont',
  'not now',
  'not right now',
  'maybe later',
  'pass',
]);

const GREETING_PATTERNS = new Set([
  'hey',
  'hi',
  'hello',
  'yo',
  'sup',
  'howdy',
  'good morning',
  'good evening',
  'gm',
  'morning',
  'skip',
  'off day',
  'day off',
]);

const HELP_PATTERNS = new Set([
  'help',
  'what can you do',
  'how does this work',
  'what is this',
  'commands',
  'options',
  'features',
  '?',
]);

// Patterns that use startsWith (for "how do i ..." style)
const HELP_PREFIXES = [
  'how do i',
  'how can i',
];

/**
 * Normalize input for matching:
 * - Lowercase
 * - Trim whitespace
 * - Strip trailing punctuation (., !, ?)
 */
function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/, '');
}

/**
 * Check if input is "short enough" to pre-parse.
 * Threshold: <= 20 chars OR <= 6 words
 * (Slightly expanded to catch "how do i X" style help questions)
 */
function isShortInput(input: string): boolean {
  const charCount = input.length;
  const wordCount = input.split(/\s+/).filter(w => w.length > 0).length;
  return charCount <= 20 || wordCount <= 6;
}

/**
 * Pre-parse intent from user input.
 * Returns ParseResult if confident match, null otherwise.
 */
export function preParseIntent(input: string): ParseResult | null {
  // Check for single "?" before normalization (gets stripped otherwise)
  const trimmed = input.trim();
  if (trimmed === '?') {
    return { intents: [{ type: 'help' }] };
  }
  
  // Normalize
  const normalized = normalizeInput(input);
  
  // Empty/whitespace-only or single punctuation → greeting
  if (normalized.length === 0 || /^[.\-_~*]+$/.test(normalized)) {
    return { intents: [{ type: 'greeting' }] };
  }
  
  // Only match short inputs to avoid false positives
  if (!isShortInput(normalized)) {
    return null;
  }
  
  // Check affirm patterns
  if (AFFIRM_PATTERNS.has(normalized)) {
    return { intents: [{ type: 'affirm' }] };
  }
  
  // Check decline patterns
  if (DECLINE_PATTERNS.has(normalized)) {
    return { intents: [{ type: 'decline' }] };
  }
  
  // Check greeting patterns
  if (GREETING_PATTERNS.has(normalized)) {
    return { intents: [{ type: 'greeting' }] };
  }
  
  // Check help patterns (exact match)
  if (HELP_PATTERNS.has(normalized)) {
    return { intents: [{ type: 'help' }] };
  }
  
  // Check help patterns (prefix match)
  for (const prefix of HELP_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return { intents: [{ type: 'help' }] };
    }
  }
  
  // No match — pass to LLM
  return null;
}
