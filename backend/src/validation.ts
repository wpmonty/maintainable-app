import type { ParseResult, Intent, CheckinEntry } from './types.js';

const MAX_HABIT_NAME = 50;
const MAX_VALUE = 10000;
const MAX_NOTE = 500;
const VALID_STATUSES = ['full', 'partial', 'skip'];
const HABIT_NAME_RE = /^[a-z0-9 _-]+$/;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateParseResult(result: ParseResult): { valid: ParseResult; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const validIntents: Intent[] = [];

  for (const intent of result.intents) {
    const intentErrors = validateIntent(intent);
    if (intentErrors.length === 0) {
      validIntents.push(sanitizeIntent(intent));
    } else {
      errors.push(...intentErrors);
    }
  }

  return {
    valid: { intents: validIntents },
    errors,
  };
}

function validateIntent(intent: Intent): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (intent.type) {
    case 'checkin':
      for (const entry of intent.entries ?? []) {
        if (!entry.habit || typeof entry.habit !== 'string') {
          errors.push({ field: 'checkin.habit', message: 'Missing habit name' });
          continue;
        }
        if (entry.habit.length > MAX_HABIT_NAME) {
          errors.push({ field: 'checkin.habit', message: `Habit name too long: ${entry.habit.slice(0, 20)}...` });
        }
        if (!HABIT_NAME_RE.test(entry.habit)) {
          errors.push({ field: 'checkin.habit', message: `Invalid habit name chars: ${entry.habit.slice(0, 20)}` });
        }
        if (entry.value !== undefined && entry.value !== null) {
          if (typeof entry.value !== 'number' || isNaN(entry.value)) {
            errors.push({ field: 'checkin.value', message: `Non-numeric value for ${entry.habit}` });
          } else if (entry.value < 0 || entry.value > MAX_VALUE) {
            errors.push({ field: 'checkin.value', message: `Value out of range for ${entry.habit}: ${entry.value}` });
          }
        }
        if (entry.status && !VALID_STATUSES.includes(entry.status)) {
          errors.push({ field: 'checkin.status', message: `Invalid status for ${entry.habit}: ${entry.status}` });
        }
      }
      break;

    case 'add_habit':
      for (const h of intent.habits ?? []) {
        if (!h.name || typeof h.name !== 'string') {
          errors.push({ field: 'add_habit.name', message: 'Missing habit name' });
        } else if (h.name.length > MAX_HABIT_NAME || !HABIT_NAME_RE.test(h.name)) {
          errors.push({ field: 'add_habit.name', message: `Invalid habit name: ${h.name.slice(0, 20)}` });
        }
      }
      break;

    case 'remove_habit':
      for (const name of intent.habits ?? []) {
        if (!name || typeof name !== 'string' || name.length > MAX_HABIT_NAME) {
          errors.push({ field: 'remove_habit.name', message: `Invalid habit name: ${String(name).slice(0, 20)}` });
        }
      }
      break;

    case 'update_habit':
      if (!intent.habit || typeof intent.habit !== 'string') {
        errors.push({ field: 'update_habit.habit', message: 'Missing habit name' });
      }
      if (intent.goal !== undefined && (typeof intent.goal !== 'number' || intent.goal < 0 || intent.goal > MAX_VALUE)) {
        errors.push({ field: 'update_habit.goal', message: `Invalid goal: ${intent.goal}` });
      }
      break;

    // greeting, help, query, settings — no dangerous fields
  }

  return errors;
}

function sanitizeIntent(intent: Intent): Intent {
  switch (intent.type) {
    case 'checkin':
      return {
        ...intent,
        entries: intent.entries.map(e => ({
          ...e,
          habit: e.habit.slice(0, MAX_HABIT_NAME).toLowerCase().trim(),
          note: e.note ? e.note.slice(0, MAX_NOTE) : undefined,
          status: VALID_STATUSES.includes(e.status) ? e.status : 'full',
        })),
      };
    case 'add_habit':
      return {
        ...intent,
        habits: intent.habits.map(h => ({
          ...h,
          name: h.name.slice(0, MAX_HABIT_NAME).toLowerCase().trim(),
        })),
      };
    case 'remove_habit':
      return {
        ...intent,
        habits: intent.habits.map(h => h.slice(0, MAX_HABIT_NAME).toLowerCase().trim()),
      };
    default:
      return intent;
  }
}
