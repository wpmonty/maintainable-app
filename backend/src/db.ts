import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createDb(path?: string): Database.Database {
  const dbPath = path ?? join(__dirname, '..', 'data', 'maintainable.db');
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      email TEXT NOT NULL UNIQUE,
      display_name TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      credits_remaining INTEGER NOT NULL DEFAULT 5,
      preferences TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_checkin_at TEXT
    );

    CREATE TABLE IF NOT EXISTS habits (
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

    CREATE TABLE IF NOT EXISTS checkins (
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

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT REFERENCES users(id),
      direction TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      parsed_intents TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      amount_usd REAL NOT NULL,
      credits_purchased INTEGER NOT NULL,
      tx_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON checkins(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON checkins(habit_id, date);
    CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, active);
    CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id, created_at);
  `);
}

// ── Helper queries ──

export function getOrCreateUser(db: Database.Database, email: string): { id: string; isNew: boolean } {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (existing) return { id: existing.id, isNew: false };

  const stmt = db.prepare('INSERT INTO users (email) VALUES (?) RETURNING id');
  const row = stmt.get(email) as { id: string };
  return { id: row.id, isNew: true };
}

export function getUserHabits(db: Database.Database, userId: string) {
  return db.prepare(
    'SELECT id, name, display_name, unit, goal FROM habits WHERE user_id = ? AND active = 1 ORDER BY sort_order, created_at'
  ).all(userId) as Array<{ id: string; name: string; display_name: string | null; unit: string | null; goal: number | null }>;
}

export function findHabit(db: Database.Database, userId: string, name: string) {
  const normalized = name.toLowerCase().trim();
  return db.prepare(
    'SELECT id, name, display_name, unit, goal, active FROM habits WHERE user_id = ? AND name = ?'
  ).get(userId, normalized) as { id: string; name: string; display_name: string | null; unit: string | null; goal: number | null; active: number } | undefined;
}

export function getTodayCheckins(db: Database.Database, userId: string, date: string) {
  return db.prepare(`
    SELECT c.*, h.name as habit_name, h.unit, h.goal
    FROM checkins c
    JOIN habits h ON h.id = c.habit_id
    WHERE c.user_id = ? AND c.date = ?
  `).all(userId, date) as Array<{
    id: string; habit_id: string; date: string; value: number | null;
    done: number | null; note: string | null; habit_name: string;
    unit: string | null; goal: number | null;
  }>;
}

export function getWeekCheckins(db: Database.Database, userId: string, startDate: string, endDate: string) {
  return db.prepare(`
    SELECT c.date, c.value, c.done, h.name as habit_name, h.goal
    FROM checkins c
    JOIN habits h ON h.id = c.habit_id
    WHERE c.user_id = ? AND c.date >= ? AND c.date <= ?
    ORDER BY c.date
  `).all(userId, startDate, endDate) as Array<{
    date: string; value: number | null; done: number | null;
    habit_name: string; goal: number | null;
  }>;
}
