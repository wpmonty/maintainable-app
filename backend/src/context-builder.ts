import Database from 'better-sqlite3';
import { getUserHabits, getTodayCheckins, getWeekCheckins } from './db.js';
import type { ExecutionResult } from './types.js';

/**
 * Build structured context block for the response LLM.
 * All data comes from DB queries — no hallucination possible for facts.
 */
export function buildStructuredContext(
  db: Database.Database,
  userId: string,
  date: string,
  executionResults: ExecutionResult[],
  originalMessage: string
): string {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  const habits = getUserHabits(db, userId);
  const todayCheckins = getTodayCheckins(db, userId, date);

  // Calculate week range (Mon-today)
  const today = new Date(date);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const weekStart = monday.toISOString().split('T')[0];
  const weekCheckins = getWeekCheckins(db, userId, weekStart, date);

  // Days since first check-in
  const firstCheckin = db.prepare(
    'SELECT MIN(date) as first_date FROM checkins WHERE user_id = ?'
  ).get(userId) as { first_date: string | null } | undefined;
  const daysSinceStart = firstCheckin?.first_date
    ? Math.floor((today.getTime() - new Date(firstCheckin.first_date).getTime()) / 86400000) + 1
    : 1;

  // Build sections
  const sections: string[] = [];

  // USER PROFILE
  sections.push(`USER PROFILE:
  Name: ${user.display_name || user.email.split('@')[0]}
  Tracking since: ${firstCheckin?.first_date || date} (${daysSinceStart} days)
  Active habits: ${habits.map(h => h.name + (h.goal ? ` (goal: ${h.goal}${h.unit ? ' ' + h.unit : ''})` : '')).join(', ') || 'none yet'}`);

  // TODAY'S CHECK-IN
  if (todayCheckins.length > 0) {
    const lines = todayCheckins.map(c => {
      const valueStr = c.value !== null
        ? `${c.value}${c.unit ? ' ' + c.unit : ''}`
        : (c.done ? '✓' : '✗');
      const goalStr = c.goal && c.value !== null
        ? (c.value >= c.goal ? ' (goal met ✓)' : ` (goal: ${c.goal})`)
        : '';
      const status = (c as any).status || (c.done ? 'full' : 'skip');
      return `  ${c.habit_name}: ${valueStr} [${status}]${goalStr}`;
    });

    // Show habits not reported today
    const reportedHabits = new Set(todayCheckins.map(c => c.habit_name));
    for (const h of habits) {
      if (!reportedHabits.has(h.name)) {
        lines.push(`  ${h.name}: (not reported)`);
      }
    }

    sections.push(`TODAY'S CHECK-IN:\n${lines.join('\n')}`);
  } else {
    sections.push(`TODAY'S CHECK-IN:\n  No check-ins recorded yet today.`);
  }

  // THIS WEEK
  if (weekCheckins.length > 0) {
    const byHabit: Record<string, Array<{ date: string; value: number | null; done: number | null; goal: number | null }>> = {};
    for (const c of weekCheckins) {
      if (!byHabit[c.habit_name]) byHabit[c.habit_name] = [];
      byHabit[c.habit_name].push(c);
    }

    const weekLines: string[] = [];
    for (const [habit, entries] of Object.entries(byHabit)) {
      const values = entries.map(e => e.value !== null ? String(e.value) : (e.done ? '✓' : '✗'));
      const numericValues = entries.filter(e => e.value !== null).map(e => e.value!);
      const avg = numericValues.length > 0
        ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(1)
        : null;
      const goalMet = entries[0]?.goal
        ? numericValues.filter(v => v >= entries[0].goal!).length
        : null;

      let line = `  ${habit}: ${values.join(', ')}`;
      if (avg) line += ` (avg ${avg}`;
      if (goalMet !== null) line += `, goal met ${goalMet}/${entries.length} days`;
      if (avg || goalMet !== null) line += ')';
      weekLines.push(line);
    }

    sections.push(`THIS WEEK (${weekStart} to ${date}):\n${weekLines.join('\n')}`);
  }

  // WHAT JUST HAPPENED
  const actionLines = executionResults
    .filter(r => r.success)
    .map(r => `  - ${r.detail}`);
  if (actionLines.length > 0) {
    sections.push(`WHAT JUST HAPPENED:\n${actionLines.join('\n')}`);
  }

  // ORIGINAL MESSAGE (for Call 2 to notice patterns)
  sections.push(`USER'S ORIGINAL MESSAGE:\n  "${originalMessage}"`);

  return sections.join('\n\n');
}
