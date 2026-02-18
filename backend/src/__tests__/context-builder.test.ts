import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { buildStructuredContext } from '../context-builder.js';
import type { ExecutionResult } from '../types.js';

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

describe('Context Builder', () => {
  test('includes unchecked habits section when query intent present', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
      .run('user1', 'test@example.com', 'Test User');
    
    // Create habits
    db.prepare('INSERT INTO habits (id, user_id, name, display_name, unit, goal) VALUES (?, ?, ?, ?, ?, ?)')
      .run('habit1', 'user1', 'water', 'Water', 'glasses', 8);
    db.prepare('INSERT INTO habits (id, user_id, name, display_name, unit) VALUES (?, ?, ?, ?, ?)')
      .run('habit2', 'user1', 'running', 'Running', 'minutes');
    db.prepare('INSERT INTO habits (id, user_id, name, display_name) VALUES (?, ?, ?, ?)')
      .run('habit3', 'user1', 'meditation', 'Meditation');
    
    // Add check-in for water only
    db.prepare('INSERT INTO checkins (user_id, habit_id, date, value, done) VALUES (?, ?, ?, ?, ?)')
      .run('user1', 'habit1', '2026-02-17', 5, 1);
    
    // Build context with query intent
    const executionResults: ExecutionResult[] = [
      { action: 'query', success: true, detail: 'How am I doing today?' }
    ];
    
    const context = buildStructuredContext(
      db,
      'user1',
      '2026-02-17',
      executionResults,
      'How am I doing today?'
    );
    
    // Verify unchecked habits section is present
    assert.ok(context.includes('HABITS NOT YET CHECKED IN TODAY'), 
              'Should include unchecked habits section for query intent');
    assert.ok(context.includes('running'), 
              'Should list running as unchecked');
    assert.ok(context.includes('meditation'), 
              'Should list meditation as unchecked');
    assert.ok(!context.includes('water') || context.indexOf('water') < context.indexOf('HABITS NOT YET CHECKED IN TODAY'),
              'Water should not be in unchecked section (it was checked in)');
    
    db.close();
  });

  test('does not include unchecked habits section without query intent', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
      .run('user1', 'test@example.com', 'Test User');
    
    // Create habits
    db.prepare('INSERT INTO habits (id, user_id, name, display_name) VALUES (?, ?, ?, ?)')
      .run('habit1', 'user1', 'water', 'Water');
    db.prepare('INSERT INTO habits (id, user_id, name, display_name) VALUES (?, ?, ?, ?)')
      .run('habit2', 'user1', 'running', 'Running');
    
    // Add check-in for water only
    db.prepare('INSERT INTO checkins (user_id, habit_id, date, value, done) VALUES (?, ?, ?, ?, ?)')
      .run('user1', 'habit1', '2026-02-17', 8, 1);
    
    // Build context without query intent (just checkin)
    const executionResults: ExecutionResult[] = [
      { action: 'checkin', success: true, detail: 'water: 8' }
    ];
    
    const context = buildStructuredContext(
      db,
      'user1',
      '2026-02-17',
      executionResults,
      'water 8'
    );
    
    // Verify unchecked habits section is NOT present
    assert.ok(!context.includes('HABITS NOT YET CHECKED IN TODAY'), 
              'Should not include unchecked habits section without query intent');
    
    db.close();
  });

  test('shows today\'s check-ins correctly', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
      .run('user1', 'test@example.com', 'Test User');
    
    // Create habits with goals
    db.prepare('INSERT INTO habits (id, user_id, name, display_name, unit, goal) VALUES (?, ?, ?, ?, ?, ?)')
      .run('habit1', 'user1', 'water', 'Water', 'glasses', 8);
    db.prepare('INSERT INTO habits (id, user_id, name, display_name, unit, goal) VALUES (?, ?, ?, ?, ?, ?)')
      .run('habit2', 'user1', 'running', 'Running', 'minutes', 30);
    
    // Add check-ins for today
    db.prepare('INSERT INTO checkins (user_id, habit_id, date, value, status, done) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user1', 'habit1', '2026-02-17', 8, 'full', 1); // Goal met
    db.prepare('INSERT INTO checkins (user_id, habit_id, date, value, status, done) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user1', 'habit2', '2026-02-17', 20, 'full', 1); // Goal not met
    
    // Add check-in for yesterday (should not appear)
    db.prepare('INSERT INTO checkins (user_id, habit_id, date, value, status, done) VALUES (?, ?, ?, ?, ?, ?)')
      .run('user1', 'habit1', '2026-02-16', 6, 'full', 1);
    
    // Build context
    const executionResults: ExecutionResult[] = [];
    const context = buildStructuredContext(
      db,
      'user1',
      '2026-02-17',
      executionResults,
      'water 8, running 20'
    );
    
    // Verify today's check-ins section
    assert.ok(context.includes('TODAY\'S CHECK-IN'), 
              'Should include today\'s check-in section');
    assert.ok(context.includes('water: 8 glasses'), 
              'Should show water check-in with value and unit');
    assert.ok(context.includes('(goal met ✓)'), 
              'Should indicate water goal was met');
    assert.ok(context.includes('running: 20 minutes'), 
              'Should show running check-in');
    assert.ok(context.includes('(goal: 30)'), 
              'Should show running goal not met');
    
    db.close();
  });

  test('shows empty state when no check-ins today', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
      .run('user1', 'test@example.com', 'Test User');
    
    // Create habits but no check-ins
    db.prepare('INSERT INTO habits (id, user_id, name, display_name) VALUES (?, ?, ?, ?)')
      .run('habit1', 'user1', 'water', 'Water');
    
    // Build context
    const executionResults: ExecutionResult[] = [];
    const context = buildStructuredContext(
      db,
      'user1',
      '2026-02-17',
      executionResults,
      'hello'
    );
    
    // Verify empty state
    assert.ok(context.includes('TODAY\'S CHECK-IN'), 
              'Should include today\'s check-in section');
    assert.ok(context.includes('No check-ins recorded yet today'), 
              'Should show empty state message');
    
    db.close();
  });

  test('includes execution results in context', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
      .run('user1', 'test@example.com', 'Test User');
    
    // Build context with execution results
    const executionResults: ExecutionResult[] = [
      { action: 'add_habit', success: true, detail: 'Added "meditation" (minutes) goal: 10' },
      { action: 'checkin', success: true, detail: 'water: 8 glasses (goal met ✓)' }
    ];
    
    const context = buildStructuredContext(
      db,
      'user1',
      '2026-02-17',
      executionResults,
      'add meditation 10 minutes, water 8'
    );
    
    // Verify execution results section
    assert.ok(context.includes('WHAT JUST HAPPENED'), 
              'Should include execution results section');
    assert.ok(context.includes('Added "meditation"'), 
              'Should show add habit result');
    assert.ok(context.includes('water: 8 glasses'), 
              'Should show checkin result');
    
    db.close();
  });

  test('includes original message in context', () => {
    const db = createTestDb();
    
    // Create test user
    db.prepare('INSERT INTO users (id, email, display_name) VALUES (?, ?, ?)')
      .run('user1', 'test@example.com', 'Test User');
    
    const originalMessage = 'water 8, ran 20 minutes';
    
    const context = buildStructuredContext(
      db,
      'user1',
      '2026-02-17',
      [],
      originalMessage
    );
    
    // Verify original message is included
    assert.ok(context.includes('USER\'S ORIGINAL MESSAGE'), 
              'Should include original message section');
    assert.ok(context.includes(originalMessage), 
              'Should include the actual message text');
    
    db.close();
  });
});
