import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { ProcessingQueue } from '../queue.js';
import { runMigrations } from '../migrations.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  
  // Create base schema first
  db.exec(`
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
  `);
  
  // Run migrations to add inbound_emails table
  runMigrations(db);
  
  return db;
}

describe('ProcessingQueue', () => {
  test('recoverInterrupted resets processing items', () => {
    const db = createTestDb();
    const queue = new ProcessingQueue(db);

    // Insert test emails with different statuses
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg1', 'user1@test.com', 'Test 1', 'Body 1', 'processing')
    `).run();
    
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg2', 'user2@test.com', 'Test 2', 'Body 2', 'processing')
    `).run();
    
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg3', 'user3@test.com', 'Test 3', 'Body 3', 'new')
    `).run();

    // Recover interrupted items
    const recovered = queue.recoverInterrupted();

    assert.strictEqual(recovered, 2, 'Should recover 2 processing items');

    // Verify statuses
    const processing = db.prepare(
      'SELECT COUNT(*) as count FROM inbound_emails WHERE status = ?'
    ).get('processing') as { count: number };
    
    const newItems = db.prepare(
      'SELECT COUNT(*) as count FROM inbound_emails WHERE status = ?'
    ).get('new') as { count: number };

    assert.strictEqual(processing.count, 0, 'No items should be in processing state');
    assert.strictEqual(newItems.count, 3, 'All recovered items should be in new state');

    db.close();
  });

  test('dequeue returns new items', () => {
    const db = createTestDb();
    const queue = new ProcessingQueue(db);

    // Insert test emails
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg1', 'user1@test.com', 'Test 1', 'Body 1', 'new')
    `).run();
    
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg2', 'user2@test.com', 'Test 2', 'Body 2', 'new')
    `).run();
    
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg3', 'user3@test.com', 'Test 3', 'Body 3', 'replied')
    `).run();

    // Dequeue items
    const items = queue.dequeue(5);

    assert.strictEqual(items.length, 2, 'Should dequeue 2 new items');
    assert.strictEqual(items[0].status, 'new');
    assert.strictEqual(items[1].status, 'new');

    db.close();
  });

  test('markProcessing/markReplied/markFailed status transitions', () => {
    const db = createTestDb();
    const queue = new ProcessingQueue(db);

    // Insert test email
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg1', 'user1@test.com', 'Test', 'Body', 'new')
    `).run();

    // Mark as processing
    queue.markProcessing('msg1');
    let item = db.prepare('SELECT status FROM inbound_emails WHERE message_id = ?')
      .get('msg1') as { status: string };
    assert.strictEqual(item.status, 'processing', 'Should be marked as processing');

    // Mark as replied
    queue.markReplied('msg1');
    let repliedItem = db.prepare('SELECT status, error FROM inbound_emails WHERE message_id = ?')
      .get('msg1') as { status: string; error: string | null };
    assert.strictEqual(repliedItem.status, 'replied', 'Should be marked as replied');
    assert.strictEqual(repliedItem.error, null, 'Error should be cleared');

    // Insert another email for failed test
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
      VALUES ('msg2', 'user2@test.com', 'Test 2', 'Body 2', 'processing')
    `).run();

    // Mark as failed
    queue.markFailed('msg2', 'Test error message');
    const failedItem = db.prepare(
      'SELECT status, error, retry_count FROM inbound_emails WHERE message_id = ?'
    ).get('msg2') as { status: string; error: string; retry_count: number };
    
    assert.strictEqual(failedItem.status, 'failed', 'Should be marked as failed');
    assert.strictEqual(failedItem.error, 'Test error message', 'Error message should be saved');
    assert.strictEqual(failedItem.retry_count, 1, 'Retry count should be incremented');

    db.close();
  });

  test('stats returns correct counts', () => {
    const db = createTestDb();
    const queue = new ProcessingQueue(db);

    // Insert test emails with different statuses
    db.prepare(`INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
                VALUES ('msg1', 'u1@test.com', 'T1', 'B1', 'new')`).run();
    db.prepare(`INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
                VALUES ('msg2', 'u2@test.com', 'T2', 'B2', 'new')`).run();
    db.prepare(`INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
                VALUES ('msg3', 'u3@test.com', 'T3', 'B3', 'processing')`).run();
    db.prepare(`INSERT INTO inbound_emails (message_id, from_email, subject, body, status, retry_count) 
                VALUES ('msg4', 'u4@test.com', 'T4', 'B4', 'failed', 1)`).run();
    db.prepare(`INSERT INTO inbound_emails (message_id, from_email, subject, body, status) 
                VALUES ('msg5', 'u5@test.com', 'T5', 'B5', 'replied')`).run();
    db.prepare(`INSERT INTO inbound_emails (message_id, from_email, subject, body, status, retry_count) 
                VALUES ('msg6', 'u6@test.com', 'T6', 'B6', 'failed', 3)`).run(); // Dead letter (max retries)

    const stats = queue.stats();

    assert.strictEqual(stats.new, 2, 'Should count 2 new items');
    assert.strictEqual(stats.processing, 1, 'Should count 1 processing item');
    assert.strictEqual(stats.failed, 1, 'Should count 1 failed item (eligible for retry)');
    assert.strictEqual(stats.replied, 1, 'Should count 1 replied item');
    assert.strictEqual(stats.deadLetter, 1, 'Should count 1 dead letter item (max retries reached)');

    db.close();
  });

  test('failed items eligible for retry', () => {
    const db = createTestDb();
    const queue = new ProcessingQueue(db);

    // Insert failed item with retry count < 3
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status, retry_count, processed_at) 
      VALUES ('msg1', 'user1@test.com', 'Test', 'Body', 'failed', 1, datetime('now', '-2 minutes'))
    `).run();

    // Insert failed item with retry count = 3 (should not be retried)
    db.prepare(`
      INSERT INTO inbound_emails (message_id, from_email, subject, body, status, retry_count, processed_at) 
      VALUES ('msg2', 'user2@test.com', 'Test 2', 'Body 2', 'failed', 3, datetime('now', '-2 minutes'))
    `).run();

    // Dequeue items
    const items = queue.dequeue(5);

    assert.strictEqual(items.length, 1, 'Should dequeue only 1 retryable item');
    assert.strictEqual(items[0].messageId, 'msg1', 'Should dequeue msg1 (retry count < 3)');
    assert.strictEqual(items[0].status, 'failed', 'Should be a failed item eligible for retry');

    db.close();
  });
});
