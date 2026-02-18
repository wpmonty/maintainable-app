import Database from 'better-sqlite3';
import type { ParsedEmail } from './email-client.js';

/**
 * Processing queue backed by the inbound_emails table.
 * 
 * Flow:
 * 1. Email discovered → INSERT with status='new' (done in email-client.ts)
 * 2. Queue picks up 'new' items → sets status='processing'
 * 3. Success → status='replied'
 * 4. Error → status='failed', error message saved
 * 5. On restart → any 'processing' items are reset to 'new' (interrupted work)
 * 6. Retry: 'failed' items can be retried up to MAX_RETRIES times
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60_000; // 1 minute between retries

export interface QueueItem {
  id: string;
  messageId: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: string;
  retryCount: number;
  error: string | null;
  receivedAt: string;
}

export class ProcessingQueue {
  constructor(private db: Database.Database) {}

  /**
   * On startup: reset any 'processing' items back to 'new'.
   * These were interrupted by a restart.
   */
  recoverInterrupted(): number {
    const result = this.db.prepare(`
      UPDATE inbound_emails 
      SET status = 'new' 
      WHERE status = 'processing'
    `).run();
    return result.changes;
  }

  /**
   * Get next batch of items to process.
   * Includes 'new' items and 'failed' items eligible for retry.
   */
  dequeue(limit: number = 5): QueueItem[] {
    return this.db.prepare(`
      SELECT id, message_id as messageId, from_email as fromEmail, 
             subject, body, status, 
             COALESCE(retry_count, 0) as retryCount, 
             error, received_at as receivedAt
      FROM inbound_emails 
      WHERE status = 'new' 
         OR (status = 'failed' AND COALESCE(retry_count, 0) < ? 
             AND datetime(processed_at, '+' || (COALESCE(retry_count, 0) + 1) || ' minutes') <= datetime('now'))
      ORDER BY received_at ASC
      LIMIT ?
    `).all(MAX_RETRIES, limit) as QueueItem[];
  }

  /**
   * Mark an item as processing.
   */
  markProcessing(messageId: string): void {
    this.db.prepare(`
      UPDATE inbound_emails 
      SET status = 'processing' 
      WHERE message_id = ?
    `).run(messageId);
  }

  /**
   * Mark an item as successfully replied.
   */
  markReplied(messageId: string): void {
    this.db.prepare(`
      UPDATE inbound_emails 
      SET status = 'replied', processed_at = datetime('now'), error = NULL 
      WHERE message_id = ?
    `).run(messageId);
  }

  /**
   * Mark an item as failed, increment retry count.
   */
  markFailed(messageId: string, error: string): void {
    this.db.prepare(`
      UPDATE inbound_emails 
      SET status = 'failed', 
          error = ?, 
          processed_at = datetime('now'),
          retry_count = COALESCE(retry_count, 0) + 1
      WHERE message_id = ?
    `).run(error, messageId);
  }

  /**
   * Get queue stats.
   */
  stats(): { new: number; processing: number; failed: number; replied: number; deadLetter: number } {
    const rows = this.db.prepare(`
      SELECT 
        status,
        CASE WHEN status = 'failed' AND COALESCE(retry_count, 0) >= ? THEN 'dead_letter' ELSE status END as effective_status,
        COUNT(*) as count
      FROM inbound_emails 
      GROUP BY effective_status
    `).all(MAX_RETRIES) as Array<{ effective_status: string; count: number }>;

    const result = { new: 0, processing: 0, failed: 0, replied: 0, deadLetter: 0 };
    for (const row of rows) {
      switch (row.effective_status) {
        case 'new': result.new = row.count; break;
        case 'processing': result.processing = row.count; break;
        case 'failed': result.failed = row.count; break;
        case 'replied': result.replied = row.count; break;
        case 'dead_letter': result.deadLetter = row.count; break;
      }
    }
    return result;
  }
}
