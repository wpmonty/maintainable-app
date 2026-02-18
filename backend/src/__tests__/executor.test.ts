import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { executeIntents } from '../executor.js';
import type { CheckinIntent, AddHabitIntent, RemoveHabitIntent, CorrectionIntent } from '../types.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  
  // Create schema
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      preferences TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_checkin_at TEXT
    );

    CREATE TABLE habits (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      display_name TEXT,
      unit TEXT,
      goal REAL,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      removed_at TEXT,
      UNIQUE(user_id, name)
    );

    CREATE TABLE checkins (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      habit_id TEXT NOT NULL REFERENCES habits(id),
      date TEXT NOT NULL,
      value REAL,
      status TEXT NOT NULL DEFAULT 'full',
      done INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, habit_id, date)
    );
  `);
  
  return db;
}

describe('Executor', () => {
  test('additive check-ins accumulate value for same habit, same day', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user1', 'test@example.com');
    
    // First check-in: water 2 glasses
    const intent1: CheckinIntent = {
      type: 'checkin',
      entries: [
        { habit: 'water', value: 2, unit: 'glasses', status: 'full' }
      ]
    };
    
    executeIntents(db, 'user1', [intent1], '2026-02-17');
    
    // Verify first check-in
    let checkin = db.prepare(`
      SELECT c.value, h.name 
      FROM checkins c 
      JOIN habits h ON h.id = c.habit_id 
      WHERE c.user_id = ? AND c.date = ?
    `).get('user1', '2026-02-17') as { value: number; name: string };
    
    assert.strictEqual(checkin.value, 2, 'First check-in should have value 2');
    assert.strictEqual(checkin.name, 'water', 'Habit name should be water');
    
    // Second check-in: water 3 more glasses (same day)
    const intent2: CheckinIntent = {
      type: 'checkin',
      entries: [
        { habit: 'water', value: 3, unit: 'glasses', status: 'full' }
      ]
    };
    
    executeIntents(db, 'user1', [intent2], '2026-02-17');
    
    // Verify accumulated value
    checkin = db.prepare(`
      SELECT c.value, h.name 
      FROM checkins c 
      JOIN habits h ON h.id = c.habit_id 
      WHERE c.user_id = ? AND c.date = ? AND h.name = ?
    `).get('user1', '2026-02-17', 'water') as { value: number; name: string };
    
    assert.strictEqual(checkin.value, 5, 'Value should accumulate to 5 (2 + 3)');
    
    db.close();
  });

  test('correction intent passes through', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user1', 'test@example.com');
    
    const intent: CorrectionIntent = {
      type: 'correction',
      claim: 'Actually I did 10 pushups, not 5'
    };
    
    const results = executeIntents(db, 'user1', [intent], '2026-02-17');
    
    assert.strictEqual(results.length, 1, 'Should return 1 result');
    assert.strictEqual(results[0].action, 'correction', 'Action should be correction');
    assert.strictEqual(results[0].success, true, 'Should succeed');
    assert.ok(results[0].detail?.includes('Actually I did 10 pushups, not 5'), 
              'Detail should contain the correction claim');
    
    db.close();
  });

  test('CRUD operations: add habit', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user1', 'test@example.com');
    
    const intent: AddHabitIntent = {
      type: 'add_habit',
      habits: [
        { name: 'meditation', unit: 'minutes', goal: 10 }
      ]
    };
    
    const results = executeIntents(db, 'user1', [intent], '2026-02-17');
    
    assert.strictEqual(results.length, 1, 'Should return 1 result');
    assert.strictEqual(results[0].action, 'add_habit', 'Action should be add_habit');
    assert.strictEqual(results[0].success, true, 'Should succeed');
    assert.ok(results[0].detail?.includes('meditation'), 'Detail should mention the habit');
    
    // Verify habit was created in DB
    const habit = db.prepare('SELECT * FROM habits WHERE user_id = ? AND name = ?')
      .get('user1', 'meditation') as any;
    
    assert.ok(habit, 'Habit should exist in database');
    assert.strictEqual(habit.name, 'meditation', 'Habit name should match');
    assert.strictEqual(habit.unit, 'minutes', 'Unit should match');
    assert.strictEqual(habit.goal, 10, 'Goal should match');
    assert.strictEqual(habit.active, 1, 'Habit should be active');
    
    db.close();
  });

  test('CRUD operations: remove habit', () => {
    const db = createTestDb();
    
    // Create test user and habit
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user1', 'test@example.com');
    db.prepare('INSERT INTO habits (id, user_id, name, display_name, active) VALUES (?, ?, ?, ?, ?)')
      .run('habit1', 'user1', 'running', 'Running', 1);
    
    const intent: RemoveHabitIntent = {
      type: 'remove_habit',
      habits: ['running']
    };
    
    const results = executeIntents(db, 'user1', [intent], '2026-02-17');
    
    assert.strictEqual(results.length, 1, 'Should return 1 result');
    assert.strictEqual(results[0].action, 'remove_habit', 'Action should be remove_habit');
    assert.strictEqual(results[0].success, true, 'Should succeed');
    
    // Verify habit was soft-deleted
    const habit = db.prepare('SELECT active, removed_at FROM habits WHERE id = ?')
      .get('habit1') as { active: number; removed_at: string | null };
    
    assert.strictEqual(habit.active, 0, 'Habit should be inactive');
    assert.ok(habit.removed_at !== null, 'removed_at should be set');
    
    db.close();
  });

  test('CRUD operations: reactivate removed habit', () => {
    const db = createTestDb();
    
    // Create test user and inactive habit
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user1', 'test@example.com');
    db.prepare(`INSERT INTO habits (id, user_id, name, display_name, active, removed_at) 
                VALUES (?, ?, ?, ?, ?, datetime('now'))`)
      .run('habit1', 'user1', 'yoga', 'Yoga', 0);
    
    // Try to add the same habit (should reactivate)
    const intent: AddHabitIntent = {
      type: 'add_habit',
      habits: [
        { name: 'yoga' }
      ]
    };
    
    const results = executeIntents(db, 'user1', [intent], '2026-02-17');
    
    assert.strictEqual(results.length, 1, 'Should return 1 result');
    assert.strictEqual(results[0].success, true, 'Should succeed');
    assert.ok(results[0].detail?.includes('Reactivated'), 'Should indicate reactivation');
    
    // Verify habit was reactivated
    const habit = db.prepare('SELECT active, removed_at FROM habits WHERE id = ?')
      .get('habit1') as { active: number; removed_at: string | null };
    
    assert.strictEqual(habit.active, 1, 'Habit should be active');
    assert.strictEqual(habit.removed_at, null, 'removed_at should be cleared');
    
    db.close();
  });

  test('Auto-create habit on first check-in', () => {
    const db = createTestDb();
    
    // Create test user (no habits yet)
    db.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run('user1', 'test@example.com');
    
    const intent: CheckinIntent = {
      type: 'checkin',
      entries: [
        { habit: 'pushups', value: 20, unit: 'reps', status: 'full' }
      ]
    };
    
    const results = executeIntents(db, 'user1', [intent], '2026-02-17');
    
    // Should have 2 results: auto-create + checkin
    assert.strictEqual(results.length, 2, 'Should return 2 results');
    assert.strictEqual(results[0].action, 'add_habit', 'First action should be add_habit');
    assert.ok(results[0].detail?.includes('Auto-created'), 'Should indicate auto-creation');
    assert.strictEqual(results[1].action, 'checkin', 'Second action should be checkin');
    
    // Verify habit and checkin were created
    const habit = db.prepare('SELECT * FROM habits WHERE user_id = ? AND name = ?')
      .get('user1', 'pushups') as any;
    
    assert.ok(habit, 'Habit should be auto-created');
    
    const checkin = db.prepare('SELECT * FROM checkins WHERE user_id = ? AND habit_id = ?')
      .get('user1', habit.id) as any;
    
    assert.ok(checkin, 'Check-in should be recorded');
    assert.strictEqual(checkin.value, 20, 'Check-in value should match');
    
    db.close();
  });
});
