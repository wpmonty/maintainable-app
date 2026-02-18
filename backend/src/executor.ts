import Database from 'better-sqlite3';
import { findHabit, getUserHabits } from './db.js';
import type { Intent, ExecutionResult, CheckinIntent, AddHabitIntent, RemoveHabitIntent, UpdateHabitIntent, CorrectionIntent, AffirmIntent } from './types.js';

// Deterministic execution order per ARCHITECTURE.md
const EXEC_ORDER: Intent['type'][] = [
  'affirm', 'add_habit', 'remove_habit', 'update_habit', 'settings',
  'checkin', 'query', 'correction', 'greeting', 'help',
];

export function executeIntents(
  db: Database.Database,
  userId: string,
  intents: Intent[],
  date: string
): ExecutionResult[] {
  const results: ExecutionResult[] = [];

  // Sort intents by execution order
  const sorted = [...intents].sort(
    (a, b) => EXEC_ORDER.indexOf(a.type) - EXEC_ORDER.indexOf(b.type)
  );

  for (const intent of sorted) {
    switch (intent.type) {
      case 'affirm':
        results.push(execAffirm(db, userId, intent, date));
        break;
      case 'add_habit':
        results.push(...execAddHabit(db, userId, intent));
        break;
      case 'remove_habit':
        results.push(...execRemoveHabit(db, userId, intent));
        break;
      case 'update_habit':
        results.push(execUpdateHabit(db, userId, intent));
        break;
      case 'checkin':
        results.push(...execCheckin(db, userId, intent, date));
        break;
      case 'query':
        results.push({ action: 'query', success: true, detail: intent.question });
        break;
      case 'correction':
        results.push({ action: 'correction', success: true, detail: `User correction: ${(intent as CorrectionIntent).claim}` });
        break;
      case 'greeting':
        results.push({ action: 'greeting', success: true, detail: 'User greeted the assistant — respond warmly and mention habits if relevant' });
        break;
      case 'help':
        results.push({ action: 'help', success: true, detail: 'Help requested' });
        break;
      case 'settings':
        results.push({ action: 'settings', success: true, detail: 'Settings update noted' });
        break;
    }
  }

  return results;
}

function execAddHabit(db: Database.Database, userId: string, intent: AddHabitIntent): ExecutionResult[] {
  const results: ExecutionResult[] = [];

  for (const h of intent.habits) {
    const existing = findHabit(db, userId, h.name);

    if (existing && existing.active) {
      results.push({
        action: 'add_habit',
        success: false,
        detail: `"${h.name}" already exists`,
      });
      continue;
    }

    if (existing && !existing.active) {
      // Reactivate soft-deleted habit
      db.prepare('UPDATE habits SET active = 1, removed_at = NULL WHERE id = ?').run(existing.id);
      results.push({
        action: 'add_habit',
        success: true,
        detail: `Reactivated "${h.name}"`,
      });
      continue;
    }

    db.prepare(
      'INSERT INTO habits (user_id, name, display_name, unit, goal) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, h.name.toLowerCase(), h.name, h.unit ?? null, h.goal ?? null);

    results.push({
      action: 'add_habit',
      success: true,
      detail: `Added "${h.name}"${h.unit ? ` (${h.unit})` : ''}${h.goal ? ` goal: ${h.goal}` : ''}`,
    });
  }

  return results;
}

function execRemoveHabit(db: Database.Database, userId: string, intent: RemoveHabitIntent): ExecutionResult[] {
  const results: ExecutionResult[] = [];

  for (const name of intent.habits) {
    const habit = findHabit(db, userId, name);

    if (!habit || !habit.active) {
      results.push({
        action: 'remove_habit',
        success: false,
        detail: `"${name}" not found or already removed`,
      });
      continue;
    }

    db.prepare(
      "UPDATE habits SET active = 0, removed_at = datetime('now') WHERE id = ?"
    ).run(habit.id);

    results.push({
      action: 'remove_habit',
      success: true,
      detail: `Removed "${name}"`,
    });
  }

  return results;
}

function execUpdateHabit(db: Database.Database, userId: string, intent: UpdateHabitIntent): ExecutionResult {
  const habit = findHabit(db, userId, intent.habit);

  if (!habit || !habit.active) {
    return { action: 'update_habit', success: false, detail: `"${intent.habit}" not found` };
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (intent.goal !== undefined) {
    updates.push('goal = ?');
    params.push(intent.goal);
  }
  if (intent.unit !== undefined) {
    updates.push('unit = ?');
    params.push(intent.unit);
  }

  if (updates.length === 0) {
    return { action: 'update_habit', success: false, detail: 'No changes specified' };
  }

  params.push(habit.id);
  db.prepare(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return {
    action: 'update_habit',
    success: true,
    detail: `Updated "${intent.habit}"${intent.goal !== undefined ? ` goal: ${intent.goal}` : ''}${intent.unit ? ` unit: ${intent.unit}` : ''}`,
  };
}

function execCheckin(db: Database.Database, userId: string, intent: CheckinIntent, date: string): ExecutionResult[] {
  const results: ExecutionResult[] = [];

  for (const entry of intent.entries) {
    let habit = findHabit(db, userId, entry.habit);

    if (habit && !habit.active) {
      // Reactivate soft-deleted habit
      db.prepare('UPDATE habits SET active = 1, removed_at = NULL WHERE id = ?').run(habit.id);
      results.push({
        action: 'add_habit',
        success: true,
        detail: `Reactivated "${entry.habit}" (was removed)`,
      });
    } else if (!habit) {
      // Auto-create habit on first check-in
      db.prepare(
        'INSERT INTO habits (user_id, name, display_name, unit) VALUES (?, ?, ?, ?)'
      ).run(userId, entry.habit.toLowerCase(), entry.habit, entry.unit ?? null);

      habit = findHabit(db, userId, entry.habit)!;
      results.push({
        action: 'add_habit',
        success: true,
        detail: `Auto-created "${entry.habit}"${entry.unit ? ` (${entry.unit})` : ''}`,
      });
    }

    // UPSERT check-in (last value wins per day)
    const value = entry.value ?? null;
    const done = entry.status === 'skip' ? 0 : 1;

    // UPSERT check-in: accumulate numeric values, last-write-wins for status
    db.prepare(`
      INSERT INTO checkins (user_id, habit_id, date, value, status, done, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, habit_id, date)
      DO UPDATE SET 
        value = CASE 
          WHEN excluded.value IS NOT NULL AND checkins.value IS NOT NULL 
          THEN COALESCE(checkins.value, 0) + excluded.value
          ELSE COALESCE(excluded.value, checkins.value)
        END,
        status = excluded.status, 
        done = excluded.done, 
        note = excluded.note
    `).run(userId, habit.id, date, value, entry.status, done, entry.note ?? null);

    // Update user's last check-in timestamp
    db.prepare('UPDATE users SET last_checkin_at = ? WHERE id = ?').run(date, userId);

    const valueStr = value !== null
      ? `${value}${habit.unit ? ` ${habit.unit}` : ''}`
      : (done ? '✓' : '✗');

    const goalStr = habit.goal && value !== null
      ? (value >= habit.goal ? ' (goal met ✓)' : ` (goal: ${habit.goal})`)
      : '';

    results.push({
      action: 'checkin',
      success: true,
      detail: `${entry.habit}: ${valueStr}${goalStr}`,
    });
  }

  return results;
}

function execAffirm(db: Database.Database, userId: string, intent: AffirmIntent, date: string): ExecutionResult {
  // Look up the most recent unresolved pending action for this user
  const pendingAction = db
    .prepare(
      `SELECT id, action_type, action_data 
       FROM pending_actions 
       WHERE user_id = ? AND resolved_at IS NULL 
       ORDER BY created_at DESC 
       LIMIT 1`
    )
    .get(userId) as { id: string; action_type: string; action_data: string } | undefined;

  if (!pendingAction) {
    return {
      action: 'affirm',
      success: false,
      detail: 'No pending action to confirm',
    };
  }

  // Parse the action data
  let actionData: any;
  try {
    actionData = JSON.parse(pendingAction.action_data);
  } catch {
    return {
      action: 'affirm',
      success: false,
      detail: 'Invalid pending action data',
    };
  }

  // Execute the action based on type
  let executionResult: ExecutionResult;
  switch (pendingAction.action_type) {
    case 'add_habit':
      // Create an AddHabitIntent and execute it
      const addIntent: AddHabitIntent = {
        type: 'add_habit',
        habits: [actionData],
      };
      const addResults = execAddHabit(db, userId, addIntent);
      executionResult = addResults[0] || { action: 'add_habit', success: false, detail: 'Failed to add habit' };
      break;

    case 'remove_habit':
      // Create a RemoveHabitIntent and execute it
      const removeIntent: RemoveHabitIntent = {
        type: 'remove_habit',
        habits: [actionData.habit],
      };
      const removeResults = execRemoveHabit(db, userId, removeIntent);
      executionResult = removeResults[0] || { action: 'remove_habit', success: false, detail: 'Failed to remove habit' };
      break;

    default:
      executionResult = {
        action: 'affirm',
        success: false,
        detail: `Unknown action type: ${pendingAction.action_type}`,
      };
  }

  // Mark pending action as resolved
  db.prepare(
    `UPDATE pending_actions 
     SET resolved_at = datetime('now'), resolved_action = 'affirmed' 
     WHERE id = ?`
  ).run(pendingAction.id);

  return {
    action: 'affirm',
    success: executionResult.success,
    detail: `Confirmed: ${executionResult.detail}`,
  };
}
