import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  description: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Baseline schema',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        tier TEXT NOT NULL DEFAULT 'free',
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
    `,
  },
  {
    version: 2,
    description: 'Add inbound_emails table for email daemon tracking',
    sql: `
      CREATE TABLE IF NOT EXISTS inbound_emails (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        message_id TEXT NOT NULL UNIQUE,
        from_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        error TEXT,
        received_at TEXT NOT NULL DEFAULT (datetime('now')),
        processed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(status, received_at);
      CREATE INDEX IF NOT EXISTS idx_inbound_emails_message_id ON inbound_emails(message_id);
    `,
  },
  {
    version: 3,
    description: 'Add retry_count to inbound_emails for processing queue',
    sql: `
      ALTER TABLE inbound_emails ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 4,
    description: 'Add pending_actions table for affirm→action pipeline',
    sql: `
      CREATE TABLE IF NOT EXISTS pending_actions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        user_id TEXT NOT NULL REFERENCES users(id),
        action_type TEXT NOT NULL,
        action_data TEXT NOT NULL,
        suggested_in_email_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT,
        resolved_action TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_pending_actions_user_unresolved 
        ON pending_actions(user_id, created_at) 
        WHERE resolved_at IS NULL;
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  // Create schema_version table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Get current schema version
  const currentVersionRow = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number | null };
  const currentVersion = currentVersionRow?.version ?? 0;

  // Run pending migrations
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    return;
  }

  console.log(`[migrations] Running ${pendingMigrations.length} pending migration(s)...`);

  for (const migration of pendingMigrations) {
    console.log(`[migrations] Applying v${migration.version}: ${migration.description}`);
    
    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description
      );
    })();

    console.log(`[migrations] ✓ v${migration.version} applied`);
  }

  console.log(`[migrations] All migrations complete. Current version: ${migrations[migrations.length - 1].version}`);
}
